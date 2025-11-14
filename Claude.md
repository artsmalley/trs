# TRS - Toyota Research System

## Quick Start

**Dev Server**: http://localhost:3000 (should be running)
```bash
npm run dev
```

## Current Status

**Phase**: 2 - Agent Implementation (CRITICAL ISSUE DISCOVERED)
**Deployed**: https://trs-mocha.vercel.app ✅
**Working**: Research ✅ | Upload (mostly working) ⚠️ | Browse ✅ | Images ✅
**BROKEN**: Query Corpus ❌ - Token limit exceeded with 36+ documents (see Critical Issues)
**Next**: Fix RAG architecture → Fix upload bugs → Continue corpus upload
**Complete**: 3.5/6 agents (Research, Upload, Browse, Images; Query broken)
**File Upload**: Up to 100MB client-side, smart queue ✅
**Known Limitations**:
- ~50MB Gemini metadata extraction limit (Google API limitation)
- Files >50MB upload successfully but need manual metadata entry
**Major Discovery**: File Search supports images (undocumented Google API feature!) - Multimodal RAG enabled!

## Environment Setup

```bash
cp .env.example .env.local
```

Required keys:
- `GOOGLE_AI_API_KEY` - Gemini API key
- `GOOGLE_CUSTOM_SEARCH_API_KEY` - For Research Agent
- `GOOGLE_CUSTOM_SEARCH_ENGINE_ID` - For Research Agent
- `KV_REDIS_URL` - Auto-created when connecting Vercel Redis database
- `BLOB_READ_WRITE_TOKEN` - Auto-created when connecting Vercel Blob storage

## Project Structure

```
app/
  api/              ← API routes for all agents + utilities
  page.tsx          ← Main UI with 6 tabs (Research, Upload, Browse, Outline, Analyze, Editor)
components/
  agents/           ← 4 agents complete (Research, Upload, Browse/Query, Images integrated)
lib/
  gemini.ts         ← Gemini 2.5 Flash client
  vision-analysis.ts ← Gemini Vision API for image analysis
  blob-storage.ts   ← Vercel Blob upload/download/delete
  file-search.ts    ← Google File Search integration
  kv.ts             ← Vercel KV (Redis) operations
  types.ts          ← TypeScript definitions
```

## Tech Stack

- Next.js 16 + TypeScript
- Tailwind CSS v3 + Shadcn/ui (NOTE: v4 causes build issues - stay on v3)
- Google Gemini 2.5 Flash + Vision (reads PDFs directly, analyzes images)
- Vercel Blob for universal file storage (documents + images)
- Google File Search for multimodal RAG (documents + images - UNDOCUMENTED FEATURE!)
- Gemini Vision API for image content analysis (OCR, objects, concepts)
- ioredis + Vercel Redis for metadata persistence
- Google Custom Search API for web search
- react-dropzone for file uploads

## ⚠️ CRITICAL: Gemini Model Policy

**ALWAYS USE: `gemini-2.5-flash`** (current stable model)

**NEVER USE:**
- ❌ `gemini-1.5-*` (deprecated, inferior performance)
- ❌ `gemini-2.0-*` (deprecated, being phased out)
- ❌ `gemini-2.2-*` (does not exist)
- ❌ Any `-exp` experimental models (unstable)

**Why this matters:**
Claude's training data is dated. When encountering errors, Claude may incorrectly assume older models (1.5, 2.0) are "more stable" - this is almost never the case. Google deprecates older models because they don't work as well.

**Migration path:**
- Current: `gemini-2.5-flash` (stable, production-ready)
- Future: `gemini-3.0-flash` (when available via API key in ~2 weeks)

**If you see model errors:**
1. Check model name is exactly `gemini-2.5-flash`
2. Do NOT downgrade to 1.5 or 2.0
3. Check Google AI Studio for current model availability

## RAG Implementation

**Uses Google File Search** - a fully managed RAG system built into Gemini API that handles embeddings, storage, and grounding automatically. No separate vector database (Pinecone, Weaviate, etc.) needed.

**MAJOR DISCOVERY (Session 9):** File Search supports images! This is an undocumented Google API feature that enables true multimodal RAG. Gemini can ground on visual content from images, not just text.

**Hybrid Architecture for Images:**
- Vercel Blob: Display/download
- File Search: RAG queries with citations
- Vision API: OCR, objects, concepts metadata
- Redis: Stores both fileUri and visionAnalysis

**Citation System** - Production-ready academic citations:
- AI-powered family name extraction (handles Japanese vs Western name order)
- Title-based fallback for documents without authors
- Format: `[FamilyName2024, p.5]` or `[TitleKeywords]`
- Page-specific references with direct quotes
- **Works for both documents AND images!**

## 6 Active Agents (1 Eliminated)

1. **Research** ✅ COMPLETE - 228 curated terms, Google Custom Search, targeted search (J-STAGE, Patents, Scholar)
2. **Upload** ⚠️ MOSTLY WORKING - Client-side Blob upload, smart queue, supports up to 100MB, ~50MB Gemini limit for metadata extraction (see Known Issues)
3. **Browse** ✅ COMPLETE - Sorting, infinite scroll, image thumbnails, type filter, file details modal
4. **Query Corpus** ❌ BROKEN - Token limit exceeded with 36+ documents (see Critical Issues)
5. **Images** ✅ COMPLETE - Hybrid integration: File Search grounding + Vision API metadata (OCR, objects, concepts)
6. **Brainstorm** 🔨 TODO - Corpus-aware ideation and outlining assistant (renamed from Outline)
7. **Analyze** 🔨 TODO - Draft article reviewer that finds corpus support
8. **Editor** ❌ ELIMINATED - Use external tools (Claude.ai, Gemini, ChatGPT) for final polish

**Next Session**: **PRIORITY #1**: Fix RAG architecture (token limit) → Fix upload bugs → Continue corpus upload

## Upload Agent Architecture (Session 10 - Production-Ready!)

**Client-Side Blob Upload** - Bypasses 4.5MB serverless function limit:
- Browser uploads directly to Vercel Blob (up to 100MB)
- Server processes from Blob URL (no body size limit!)
- Two-phase progress: Upload (10-50%) → Processing (50-100%)
- Multipart upload for files >5MB

**Smart Queue System** (未然防止 - mizen boushi):
- Size-based concurrency: Small files (<10MB): 5 concurrent, Medium (10-30MB): 3 concurrent, Large (>30MB): 2 concurrent
- Bulk upload warning: 3+ large files or >100MB total triggers confirmation dialog
- Queue status card: Shows "Processing: 2" and "Queued: 5" with dynamic limits
- Prevents browser crashes and API rate limits

**Pending Review Persistence**:
- Files survive navigation, page refreshes, browser sessions
- Badge counter on Upload tab shows pending count (refreshes every 10s)
- Load pending files from Redis on mount

**UX Polish**:
- Processing Queue shows only active files (queued/processing)
- Completed files move to Review Dashboard
- File sizes displayed (e.g., "45.2MB")
- Blue pulsing dot for active uploads
- Memory optimization (clears raw files after upload)

**Tested & Validated**:
- ✅ Files up to 100MB upload to Blob successfully
- ✅ Bulk uploads (10+ files) queue properly
- ✅ Vercel Pro timeout (120s) handles processing
- ✅ No HTTP 413 errors, no crashes, smooth UX

## 🚨 CRITICAL ISSUES (Session 11 - End)

### ❌ Query Corpus Broken - Token Limit Exceeded

**Discovered**: End of Session 11 (2025-11-13, 11 PM)

**Error**:
```
[400 Bad Request] The input token count exceeds the maximum number of tokens allowed 1,048,576.
```

**Problem**:
- Current architecture sends **ALL documents** to Gemini on every query
- With 36 documents (mix of 5-50MB PDFs) = 1M+ tokens = CRASH
- Query Corpus completely broken with current corpus size
- **Blocks the core RAG functionality of the entire system**

**Root Cause**:
- No semantic retrieval implemented
- Code dumps entire corpus into Gemini's context window:
  ```typescript
  // BROKEN: Sends ALL 36 files!
  ...approvedDocs.map((doc) => ({
    fileData: { fileUri: doc.fileUri }
  }))
  ```

**Impact**:
- ❌ Cannot query corpus with 36+ documents
- ❌ Completely blocks 100-document goal stated from day 1
- ❌ RAG system non-functional at production scale

**Solutions Under Investigation** (Session 12):
1. Google File Search Corpus API (proper semantic retrieval)
2. Manual embeddings + vector similarity filtering
3. Temporary limit to top 10 relevant docs (quick hack)

**See**: `docs/issues/query-corpus-token-limit.md` for detailed analysis

---

## Known Issues (Session 11)

### 🐛 Upload Agent Bugs

**1. Edit Metadata "Save" Button Not Working**
- Issue: Save button in Edit Metadata dialog doesn't persist changes
- Impact: Can't edit AI-extracted metadata during review
- Workaround: Approve files → Edit in Browse tab (not yet implemented)
- Priority: HIGH - Needed for manual metadata entry on failed extractions

**2. Reject Button Not Working**
- Issue: Reject button fails to delete files from review queue
- Error: Calls wrong endpoint or cache issue
- Impact: Can't delete failed uploads during review
- Workaround: Approve → Delete from Browse tab
- Priority: MEDIUM - Annoying but workaround exists

### ⚠️ Known Limitations

**3. ~50MB Gemini Metadata Extraction Limit**
- Issue: Gemini API has undocumented ~50-52MB limit for PDF processing
- Source: Known Google API limitation (contradicts 2GB documented limit)
- Impact: Files >50MB upload successfully but metadata extraction fails
- Behavior:
  - ✅ File uploads to Blob
  - ✅ File uploads to File Search (fully indexed and queryable!)
  - ❌ Metadata extraction fails
  - ⚠️ Shows "Metadata extraction failed. Please review manually."
- **IMPORTANT**: Files are still fully queryable in RAG - only metadata display is affected
- Workaround: Manually enter metadata using Edit Metadata dialog (once Save button is fixed)
- Solutions to explore:
  - Compress PDFs in Adobe Acrobat (can reduce 50-80% for scanned docs)
  - Skip metadata extraction for 50MB+ files, mark for manual review
  - Add bulk metadata editor in Browse tab

## Key Design Decisions

- No authentication (single user on desktop)
- AI-assisted metadata with human review workflow
- Gemini 2.5 Flash for all operations (upgrade to 3.0 when available)
- **Hybrid multimodal RAG architecture** (DISCOVERED in Session 9):
  - Vercel Blob: Universal storage for ALL files (documents + images)
  - Google File Search: Multimodal RAG for documents AND images (undocumented feature!)
  - Gemini Vision API: Content analysis metadata (OCR, objects, concepts)
  - Redis: Stores both fileUri (File Search) and visionAnalysis (Vision API)
- **Client-side Blob upload** (Session 10): Bypasses 4.5MB limit, supports up to 100MB
- **Unified upload**: One page accepts any file type, smart routing handles the rest
- Session-based conversations (no persistence initially)

## Documentation

- `TRS_Concept.md` - Original specification
- `Next_steps.md` - Current work queue and priorities
- `research_terms.md` - Master list of Japanese/English search terms for Research Agent
- `docs/progress/` - Session logs by date (completed work)
- `docs/implementation/` - **Implementation guides for complex features** (step-by-step plans)
  - `client-side-blob-upload.md` - Fix large file upload (HTTP 413)
- `README.md` - Full project documentation

## Common Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint check
```

## Getting Context Quickly

Read this file + `Next_steps.md` + latest progress log in `docs/progress/`
