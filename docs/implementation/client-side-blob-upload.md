# Client-Side Blob Upload Implementation Guide

**Status:** Planning Complete - Ready for Implementation
**Priority:** High (Blocks large file uploads)
**Estimated Effort:** 7-9 hours across 4 sessions
**Risk Level:** Low (Production-proven solution)

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Root Cause Analysis](#root-cause-analysis)
3. [Solution Architecture](#solution-architecture)
4. [Implementation Phases](#implementation-phases)
5. [Session Breakdown](#session-breakdown)
6. [Testing Procedures](#testing-procedures)
7. [Troubleshooting Guide](#troubleshooting-guide)
8. [Rollback Procedures](#rollback-procedures)

---

## Problem Statement

### Current Issue

**Error:** HTTP 413 "Payload Too Large" when uploading PDFs > 4.5MB

**Impact:**
- 20% of important research documents cannot be uploaded
- Blocks completion of Upload Agent functionality
- Users must manually compress files before upload

**Example:**
```
User uploads 15MB PDF → HTTP 413 error
User uploads 50MB presentation → HTTP 413 error
```

### Why This Matters

Research papers, technical presentations, and scanned documents often exceed 4.5MB. The system must handle files up to 50-100MB to be production-ready for academic research workflows.

---

## Root Cause Analysis

### The Real Culprit: Vercel Serverless Functions

**NOT a Next.js limitation** - It's Vercel's platform constraint.

```
Current Upload Flow:
Browser (15MB PDF)
  ↓ [HTTP POST with file in body]
  ↓
Vercel Serverless Function ← ❌ 4.5MB body size limit (HARD CAP)
  ↓
Google File Search + Blob + Redis
```

### What Doesn't Work

❌ `experimental.serverActions.bodySizeLimit: '50mb'` - Only applies to Server Actions, not API routes
❌ `api.bodyParser.sizeLimit` - Doesn't exist in App Router
❌ Increasing timeout/memory - Doesn't affect body size
❌ Custom middleware - Still hits function limit

### Why It's Hard Coded

Vercel enforces a 4.5MB request body limit for serverless functions to:
- Prevent memory overflow in lambda functions
- Ensure consistent cold start performance
- Protect shared infrastructure from abuse

**This limit cannot be increased for API routes in App Router.**

---

## Solution Architecture

### New Upload Flow (Client-Side Blob)

```
Browser (50MB PDF)
  ↓ [Direct upload via @vercel/blob/client]
  ↓
Vercel Blob Storage ← ✅ No serverless function involved
  ↓ [Returns blobUrl: "https://xyz.blob.vercel-storage.com/file.pdf"]
  ↓
Browser sends ONLY blobUrl (100 bytes) to API
  ↓
Vercel Serverless Function ← ✅ Tiny payload, no limit hit
  ↓ [Fetches file from Blob URL]
  ↓
Google File Search (RAG) + Redis (metadata)
```

### Key Insight

**The large file never passes through the serverless function as a request body.**

Instead:
1. Client uploads directly to Blob (CDN upload, very fast)
2. Client sends only the URL to the serverless function
3. Function fetches file from Blob URL (internal Vercel network)
4. Function processes file (File Search, metadata extraction)

---

## Architecture Comparison

### Before (Current - Broken for >4.5MB)

```
┌─────────┐
│ Browser │
└────┬────┘
     │ 15MB PDF via FormData
     ↓
┌────────────────────┐
│ /api/upload        │ ← ❌ HTTP 413 HERE
│ (Serverless Fn)    │
└────┬───────────────┘
     │
     ├─→ File Search (RAG queries)
     ├─→ Vercel Blob (downloads)
     └─→ Redis (metadata)
```

### After (Proposed - Works for any size)

```
┌─────────┐
│ Browser │
└────┬────┘
     │ 15MB PDF
     ↓
┌──────────────┐
│ Vercel Blob  │ ← Direct upload (no function)
└──────┬───────┘
       │ Returns blobUrl
       ↓
┌─────────┐
│ Browser │
└────┬────┘
     │ POST {blobUrl: "https://..."} ← Only 100 bytes
     ↓
┌──────────────────────┐
│ /api/process-blob    │ ← ✅ No size limit
│ (Serverless Fn)      │
└────┬─────────────────┘
     │ fetch(blobUrl) to get file
     ↓
     ├─→ File Search (RAG)
     └─→ Redis (metadata)
```

### Storage Model (Final State)

| Storage | Content | Purpose | Cost |
|---------|---------|---------|------|
| **Google File Search** | Full PDF | RAG queries, grounding, citations | Free (2GB) |
| **Vercel Blob** | Full PDF | Downloads, thumbnails | Pro: $20/mo (100GB) |
| **Redis** | Metadata only | Search, filter, display | Free (30MB) |

**Note:** Files stored in BOTH File Search and Blob because:
- File Search: AI queries (expires after 48h per Google's policy)
- Blob: Permanent storage for user downloads

---

## Implementation Phases

### Phase 1: Core Upload Flow (Session 1)

**Goal:** Get basic client-side upload working for documents

**Tasks:**
1. Create `/api/blob-token/route.ts` - Token generation endpoint
2. Create `/api/process-blob/route.ts` - Processing endpoint
3. Update `components/agents/upload-agent.tsx` - Client upload
4. Deploy and test with 10MB PDF

**Files Created:**
- `app/api/blob-token/route.ts` (~20 lines)
- `app/api/process-blob/route.ts` (~60 lines)

**Files Modified:**
- `components/agents/upload-agent.tsx` (~40 lines)

**Success Criteria:**
- ✅ 10MB PDF uploads without 413 error
- ✅ File queryable in File Search RAG
- ✅ Metadata stored in Redis
- ✅ File downloadable via Blob URL

**Estimated Time:** 2-3 hours

---

### Phase 2: Image Support + Error Handling (Session 2)

**Goal:** Extend to images and add robust error handling

**Tasks:**
1. Add image detection in client upload
2. Route images through Vision API after Blob upload
3. Implement Blob cleanup on File Search failure
4. Add retry logic with exponential backoff
5. Test with large images (25MB PNG)

**Files Modified:**
- `app/api/process-blob/route.ts` - Add Vision API routing
- `components/agents/upload-agent.tsx` - Add retry logic

**Success Criteria:**
- ✅ Images process via Vision API
- ✅ Orphaned Blobs deleted on failure
- ✅ Network failures auto-retry 3x

**Estimated Time:** 2 hours

---

### Phase 3: Large File Support + Progress (Session 3)

**Goal:** Handle very large files with multipart and progress tracking

**Tasks:**
1. Enable `multipart: true` for files > 5MB
2. Implement two-phase progress UI
3. Add upload cancellation (AbortController)
4. Test with 50MB, 100MB files

**Files Modified:**
- `components/agents/upload-agent.tsx` - Progress tracking

**Success Criteria:**
- ✅ Large files upload in chunks
- ✅ Progress shows: "Uploading 45%... Processing with AI"
- ✅ User can cancel uploads

**Estimated Time:** 2 hours

---

### Phase 4: Polish + Edge Cases (Session 4)

**Goal:** Handle edge cases and production readiness

**Tasks:**
1. Add unique filename generation client-side
2. Implement concurrent upload queue (max 5)
3. Add user-facing error messages
4. Update documentation
5. Deprecate old `/api/upload` route

**Files Modified:**
- `components/agents/upload-agent.tsx` - Queue logic
- `Claude.md` - Architecture update
- `Next_steps.md` - Mark complete

**Success Criteria:**
- ✅ Duplicate filenames handled
- ✅ Bulk uploads queued properly
- ✅ Clear error messages
- ✅ Documentation complete

**Estimated Time:** 1-2 hours

---

## Session Breakdown

### Session 1: Core Upload Flow

**Start Context:**
- Review `app/api/upload/route.ts` (current flow)
- Review `components/agents/upload-agent.tsx` (current UI)
- Review `lib/file-search.ts` (File Search upload)

**Implementation Steps:**

#### 1. Create Token Generation Endpoint

**File:** `app/api/blob-token/route.ts`

```typescript
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  const jsonResponse = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async (pathname) => {
      // Single-user app, minimal auth
      // Could add IP whitelist or env check here

      return {
        allowedContentTypes: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'text/plain',
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
        ],
        maximumSizeInBytes: 100 * 1024 * 1024, // 100MB max
      };
    },
    onUploadCompleted: async ({ blob, tokenPayload }) => {
      console.log('✅ Blob upload completed:', blob.url);
      // Optional: Trigger processing webhook here
    },
  });

  return NextResponse.json(jsonResponse);
}
```

#### 2. Create Processing Endpoint

**File:** `app/api/process-blob/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { uploadToFileSearch } from '@/lib/file-search';
import { extractMetadataFromFile } from '@/lib/metadata-extraction';
import { storeDocumentMetadata } from '@/lib/kv';
import { del as deleteBlob } from '@vercel/blob';

export async function POST(req: NextRequest) {
  let blobUrl: string | null = null;

  try {
    const { blobUrl: url, fileName, mimeType } = await req.json();
    blobUrl = url;

    if (!blobUrl || !fileName || !mimeType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log(`📥 Processing Blob: ${fileName} from ${blobUrl}`);

    // Step 1: Fetch file from Blob URL
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch Blob: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Step 2: Upload to File Search (existing logic)
    const uploadedFile = await uploadToFileSearch(
      buffer,
      fileName,
      mimeType,
      fileName
    );

    // Step 3: Extract metadata with Gemini (existing logic)
    const metadata = await extractMetadataFromFile(
      uploadedFile.uri,
      mimeType,
      fileName
    );

    // Step 4: Store in Redis (existing logic)
    const documentMetadata = {
      fileId: uploadedFile.name,
      fileUri: uploadedFile.uri,
      fileName,
      mimeType,
      blobUrl,
      fileType: 'document',
      ...metadata,
      status: 'pending_review',
      uploadedAt: new Date().toISOString(),
      approvedAt: null,
    };

    await storeDocumentMetadata(documentMetadata.fileId, documentMetadata);

    console.log(`✅ Processed successfully: ${fileName}`);

    return NextResponse.json({
      success: true,
      fileId: documentMetadata.fileId,
      extractedMetadata: documentMetadata,
    });

  } catch (error) {
    console.error('❌ Processing failed:', error);

    // Cleanup: Delete orphaned Blob if processing failed
    if (blobUrl) {
      try {
        await deleteBlob(blobUrl);
        console.log('🗑️ Cleaned up orphaned Blob');
      } catch (cleanupError) {
        console.error('Failed to cleanup Blob:', cleanupError);
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}
```

#### 3. Update Upload Component

**File:** `components/agents/upload-agent.tsx`

Find the file upload logic and replace with:

```typescript
'use client'; // Add if not present

import { upload } from '@vercel/blob/client';

// Inside your component, modify the upload handler:
async function handleFileUpload(file: File) {
  try {
    setUploading(true);
    setUploadStatus('Uploading to storage...');

    // Step 1: Upload to Blob (client-side, direct)
    const blob = await upload(file.name, file, {
      access: 'public',
      handleUploadUrl: '/api/blob-token',
      multipart: file.size > 5 * 1024 * 1024, // Use multipart for >5MB
    });

    console.log('✅ Blob uploaded:', blob.url);
    setUploadStatus('Processing with AI...');

    // Step 2: Trigger server-side processing
    const response = await fetch('/api/process-blob', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blobUrl: blob.url,
        fileName: file.name,
        mimeType: file.type,
      }),
    });

    if (!response.ok) {
      throw new Error('Processing failed');
    }

    const result = await response.json();
    console.log('✅ Processing complete:', result);

    setUploadStatus('Complete!');
    // Refresh document list or show success message

  } catch (error) {
    console.error('❌ Upload failed:', error);
    setUploadStatus(`Error: ${error.message}`);
  } finally {
    setUploading(false);
  }
}
```

#### 4. Deploy and Test

```bash
# Commit changes
git add .
git commit -m "Add client-side Blob upload (Phase 1)"
git push

# Wait for Vercel deployment
# Test at https://trs-mocha.vercel.app
```

**Test Cases:**
- [ ] Upload 2MB PDF (should work with old AND new flow)
- [ ] Upload 10MB PDF (only works with new flow)
- [ ] Upload 25MB PDF (stress test)
- [ ] Check File Search: Query the document via Browse/Query agent
- [ ] Check Redis: Metadata should be stored
- [ ] Check Blob: File should be downloadable

**Session 1 Complete When:**
- ✅ All test cases pass
- ✅ No 413 errors for large files
- ✅ Files accessible via RAG queries
- ✅ Ready for Session 2 (images + error handling)

---

### Session 2: Image Support + Error Handling

**Start Context:**
- Review `app/api/process-blob/route.ts` (from Session 1)
- Review `lib/vision-analysis.ts` (existing Vision API)

**Implementation Steps:**

#### 1. Add Image Detection

Modify `/api/process-blob/route.ts`:

```typescript
// After fetching buffer...
const isImage = mimeType.startsWith('image/');

if (isImage) {
  // Route to Vision API
  const visionAnalysis = await analyzeImageWithVision(buffer, mimeType, fileName);
  const metadata = extractMetadataFromVision(visionAnalysis, fileName);

  // Still upload to File Search (hybrid approach)
  const uploadedFile = await uploadToFileSearch(buffer, fileName, mimeType, fileName);

  documentMetadata = {
    fileId: uploadedFile.name,
    fileUri: uploadedFile.uri,
    fileName,
    mimeType,
    blobUrl,
    fileType: 'image',
    ...metadata,
    visionAnalysis,
    status: 'pending_review',
    uploadedAt: new Date().toISOString(),
    approvedAt: null,
  };
} else {
  // Existing document flow
}
```

#### 2. Add Retry Logic

Modify client upload in `upload-agent.tsx`:

```typescript
async function uploadWithRetry(file: File, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/blob-token',
        multipart: file.size > 5 * 1024 * 1024,
      });
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      console.log(`Retry ${attempt}/${maxRetries} after ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
```

#### 3. Test Image Upload

```bash
# Deploy Session 2 changes
git commit -m "Add image support + retry logic (Phase 2)"
git push
```

**Test Cases:**
- [ ] Upload 10MB JPG
- [ ] Upload 25MB PNG
- [ ] Verify Vision analysis stored
- [ ] Verify File Search grounding works
- [ ] Simulate network error (should retry)
- [ ] Verify orphaned Blob cleanup

**Session 2 Complete When:**
- ✅ Images process correctly
- ✅ Retry logic handles failures
- ✅ No orphaned Blobs after errors

---

### Session 3: Large File Support + Progress

**Start Context:**
- Review `components/agents/upload-agent.tsx` (current upload UI)

**Implementation Steps:**

#### 1. Add Progress Tracking

```typescript
const [uploadProgress, setUploadProgress] = useState<number>(0);

const blob = await upload(file.name, file, {
  access: 'public',
  handleUploadUrl: '/api/blob-token',
  multipart: true,
  onUploadProgress: ({ percentage, loaded, total }) => {
    // Upload phase is 0-50% of total progress
    const uploadPhase = (percentage / 100) * 50;
    setUploadProgress(uploadPhase);
    console.log(`Uploaded ${loaded}/${total} bytes (${percentage}%)`);
  },
});

// Processing phase is 50-100%
setUploadProgress(50);
setUploadStatus('Processing with AI...');

const response = await fetch('/api/process-blob', ...);

setUploadProgress(100);
```

#### 2. Add Cancellation

```typescript
const [abortController, setAbortController] = useState<AbortController | null>(null);

function handleCancel() {
  if (abortController) {
    abortController.abort();
    setUploading(false);
    setUploadStatus('Cancelled');
  }
}

// In upload function:
const controller = new AbortController();
setAbortController(controller);

const blob = await upload(file.name, file, {
  access: 'public',
  handleUploadUrl: '/api/blob-token',
  multipart: true,
  signal: controller.signal, // Pass abort signal
});
```

#### 3. Test Large Files

**Test Cases:**
- [ ] Upload 50MB PDF with progress tracking
- [ ] Upload 100MB file (if Pro account)
- [ ] Cancel mid-upload and verify cleanup
- [ ] Verify progress UI shows accurate percentages

**Session 3 Complete When:**
- ✅ Large files upload with progress
- ✅ Cancellation works and cleans up
- ✅ UI shows accurate status

---

### Session 4: Polish + Documentation

**Implementation Steps:**

1. **Unique Filenames:**
   - Generate client-side: `${Date.now()}-${file.name}`
   - Prevents collisions

2. **Upload Queue:**
   - Limit concurrent uploads to 5
   - Queue remaining uploads

3. **Error Messages:**
   - User-friendly error text
   - "Upload failed - would you like to retry?"

4. **Documentation:**
   - Update `Claude.md` with new architecture
   - Update `Next_steps.md` to mark complete
   - Add code comments

**Session 4 Complete When:**
- ✅ All edge cases handled
- ✅ Documentation updated
- ✅ Ready for production use

---

## Testing Procedures

### Pre-Deployment Checklist

**Before each deployment:**
- [ ] Run `npm run build` locally
- [ ] Fix any TypeScript errors
- [ ] Check console for warnings
- [ ] Verify `.env.local` has all keys

### Test Suite (Per Session)

**Session 1 Tests:**
- [ ] Upload 2MB PDF → should work
- [ ] Upload 10MB PDF → should work (new flow)
- [ ] Upload 25MB PDF → should work
- [ ] Query uploaded document → should return results
- [ ] Download document → should work
- [ ] Check Redis for metadata → should exist

**Session 2 Tests:**
- [ ] Upload 10MB JPG → should process with Vision API
- [ ] Upload 25MB PNG → should work
- [ ] Kill network mid-upload → should retry and succeed
- [ ] Cause File Search to fail → Blob should be cleaned up
- [ ] Check Vision analysis in modal → should display

**Session 3 Tests:**
- [ ] Upload 50MB file → progress bar should show
- [ ] Upload 100MB file → multipart should work
- [ ] Cancel mid-upload → should stop and cleanup
- [ ] Upload queue test → 20 files should queue properly

**Session 4 Tests:**
- [ ] Upload files with same name → should not collide
- [ ] Bulk upload 20 files → should queue and process
- [ ] Trigger all error scenarios → should show clear messages
- [ ] Review documentation → should be complete

---

## Troubleshooting Guide

### Issue: "Token generation failed"

**Symptoms:** Client gets 403 or 401 error

**Causes:**
- `BLOB_READ_WRITE_TOKEN` not set in environment
- Vercel env vars not synced

**Solution:**
```bash
vercel env pull
# Restart dev server or redeploy
```

---

### Issue: "onUploadCompleted not firing"

**Symptoms:** Blob uploads but processing never starts

**Causes:**
- Running on localhost (webhooks can't reach localhost)
- Webhook URL not configured

**Solution (Local Dev):**
```bash
# Use ngrok
ngrok http 3000

# Set env var
VERCEL_BLOB_CALLBACK_URL=https://abc123.ngrok-free.app
```

**Solution (Production):**
- Deploy to Vercel - webhooks work automatically

---

### Issue: "Orphaned Blob files"

**Symptoms:** Storage quota increasing but files not in Redis

**Causes:**
- Processing failed after Blob upload
- Cleanup logic not executed

**Solution:**
- Check error logs in Vercel dashboard
- Implement periodic cleanup job:

```typescript
// app/api/cleanup-orphans/route.ts
import { list, del } from '@vercel/blob';
import { listAllDocuments } from '@/lib/kv';

export async function GET() {
  const blobs = await list();
  const docs = await listAllDocuments();
  const docUrls = new Set(docs.map(d => d.blobUrl));

  for (const blob of blobs.blobs) {
    if (!docUrls.has(blob.url)) {
      await del(blob.url);
      console.log('Deleted orphan:', blob.url);
    }
  }

  return Response.json({ cleaned: 'success' });
}
```

---

### Issue: "413 error still occurring"

**Symptoms:** Large files still get 413

**Causes:**
- Client not using new upload flow
- Old API route still being called

**Debug:**
- Check browser Network tab
- Should see POST to `/api/blob-token`, not `/api/upload`
- Verify `@vercel/blob/client` is imported

---

### Issue: "Progress bar stuck at 50%"

**Symptoms:** Upload shows 50% then hangs

**Causes:**
- Processing endpoint crashed
- Network timeout

**Debug:**
- Check Vercel function logs
- Check File Search API response
- Add timeout to processing fetch:

```typescript
const response = await fetch('/api/process-blob', {
  method: 'POST',
  body: JSON.stringify({ blobUrl, fileName, mimeType }),
  signal: AbortSignal.timeout(60000), // 60s timeout
});
```

---

## Rollback Procedures

### Emergency Rollback (5 minutes)

If client-side upload breaks production:

```bash
# Revert to previous commit
git revert HEAD
git push

# Or use Vercel dashboard
# Go to Deployments → Previous deployment → Promote to Production
```

### Gradual Rollback (Feature Flag)

If you implemented feature flag:

```typescript
// Set in .env.local
USE_CLIENT_SIDE_UPLOAD=false

// In code
const uploadStrategy = process.env.USE_CLIENT_SIDE_UPLOAD === 'true'
  ? clientSideUpload
  : serverSideUpload;
```

### Partial Rollback (Hybrid Mode)

Keep both flows active:

```typescript
if (file.size > 4.5 * 1024 * 1024) {
  // Use client-side for large files
  await clientSideUpload(file);
} else {
  // Use server-side for small files (faster)
  await serverSideUpload(file);
}
```

---

## Success Metrics

### Phase 1 Success
- ✅ 0 HTTP 413 errors for files < 50MB
- ✅ Upload latency < 30s for 25MB files
- ✅ 100% File Search grounding success rate

### Phase 2 Success
- ✅ Images process correctly with Vision API
- ✅ < 1% orphaned Blob files
- ✅ Network errors auto-retry successfully

### Phase 3 Success
- ✅ Files up to 100MB upload successfully
- ✅ Progress tracking shows accurate percentages
- ✅ Upload cancellation works reliably

### Phase 4 Success
- ✅ All edge cases handled gracefully
- ✅ Clear error messages for all failure modes
- ✅ Documentation complete and accurate

---

## Additional Resources

### Official Documentation
- [Vercel Blob Client Uploads](https://vercel.com/docs/storage/vercel-blob/client-upload)
- [Google File API](https://ai.google.dev/gemini-api/docs/file-search)
- [Next.js App Router](https://nextjs.org/docs/app)

### Code Examples
- [Vercel Blob Starter](https://vercel.com/templates/next.js/blob-starter)
- [Multipart Upload Example](https://vercel.com/docs/storage/vercel-blob/using-blob-sdk#upload-a-file-with-multipart-support)

### Support Channels
- Vercel Discord: #blob-storage
- GitHub Issues: `vercel/next.js`

---

## Session Handoff Template

```markdown
## Session X Handoff

**Date:** YYYY-MM-DD
**Duration:** X hours
**Phase:** X

### What Was Completed
- [x] Task 1
- [x] Task 2
- [x] Task 3

### What Was NOT Completed
- [ ] Task 4 (reason)
- [ ] Task 5 (blocked by...)

### Issues Encountered
1. Issue description
   - Attempted solution
   - Final resolution

### Next Session TODO
1. Complete remaining Phase X tasks
2. Begin Phase X+1 if Phase X is complete
3. Specific files to review: ...

### Files Modified This Session
- `path/to/file1.ts` - Description
- `path/to/file2.tsx` - Description

### Testing Results
- Test case 1: ✅ Pass
- Test case 2: ❌ Fail (needs fixing)

### Notes for Next Session
- Remember to check X
- Don't forget to test Y
- Consider refactoring Z

### Context for AI
"Review the implementation in `app/api/process-blob/route.ts` and continue from Phase X, Task Y. Focus on error handling and Blob cleanup logic."
```

---

**End of Implementation Guide**

*This document will be updated as implementation progresses. Check git history for latest changes.*
