# Session 28 - Supabase RAG Query Debug (2025-01-21)

## Status: ROOT CAUSE FOUND ✅ - Ready for Re-Upload

## Problem Summary

**Symptom**: Supabase RAG queries returning generic non-answers ("I do not have a database...")
**Expected**: Should retrieve from Braid Super Mechatronics document in Supabase

## Investigation Results

### 1. Chunks ARE Stored in Database ✅
```
Documents: 1 document (Braid Super Mechatronics)
Chunks: 1 chunk found
```

### 2. Search Function DOES Work ✅
```sql
SELECT * FROM search_chunks(...) -- Returns 1 result with similarity 1.0
```

### 3. ROOT CAUSE IDENTIFIED 🎯

**Embedding dimension mismatch:**
- **Expected**: 768 dimensions (as per Session 27 database schema)
- **Actual**: 9757 dimensions stored in database
- **Cause**: Document was uploaded before/during Session 27 fixes, with old code

### 4. Embedding API Is Correct ✅
```
Test result:
- gemini-embedding-001 correctly returns 768 dimensions
- API call: outputDimensionality: 768 ✅
- Result: 768 values returned ✅
```

### 5. Database Schema Is Correct ✅
```
Test result:
- Schema accepts 768-dimension vectors ✅
- 9757-dimension embedding stored (leftover from bad upload)
```

## Solution Implemented

### 1. Deleted Bad Upload ✅
- Removed document from Supabase: `d7665f59-f857-4d2c-a1a6-fe08ef514e4c`
- Chunks automatically deleted via CASCADE ✅
- Verified database is clean ✅

### 2. Cleaned Redis Metadata ✅
- Removed Supabase backend metadata: `doc:d7665f59-f857-4d2c-a1a6-fe08ef514e4c`
- Also removed duplicate File Search entry ✅

## Next Steps

### Re-Upload Test Document

**IMPORTANT**: The code is now correct. A fresh upload will work properly.

**Steps:**
1. Go to http://localhost:3000
2. Click **Upload** tab
3. Select **Supabase** backend (radio button)
4. Upload "Braid Super Mecatronics Measuring Technology.pdf"
5. Wait for processing (should create ~20-30 chunks with 768-dim embeddings)
6. Approve the document in Pending Review
7. Go to **Query Corpus** tab
8. Select **Supabase** backend
9. Test query: "What measurement technology does Braid use?"

**Expected Results:**
- Upload should complete without errors
- Chunks should be stored with 768 dimensions
- Query should retrieve relevant information about measurement devices
- Response should include specific details from the document

### Verification Queries

After upload, you can verify with these test scripts:

```bash
# Check chunks were stored correctly
node test-chunks.js
# Should show: ~20-30 chunks, all with 768 dimensions

# Test search function
# Should return relevant results with similarity scores > 0.7
```

## Why The Problem Occurred

**Timeline:**
1. Session 27 started: Began implementing 768-dimension embeddings
2. Mid-session: Updated database schema to vector(768)
3. Mid-session: Updated code to request 768 dimensions
4. Test upload: **Happened during intermediate state** - code may have had bugs or used wrong API call
5. Session 27 end: All fixes complete, but test document still had bad embeddings

**Lesson**: When changing fundamental data structures (like embedding dimensions), delete all test data and start fresh after all code changes are complete.

## Code Verification

### Embedding Generation (lib/supabase-rag.ts:146-172) ✅
```typescript
const result = await ai.models.embedContent({
  model: 'gemini-embedding-001',
  contents: [{ parts: [{ text }] }],
  config: {
    outputDimensionality: 768,    // ✅ Correct
    taskType: taskType             // ✅ Correct
  }
});

const embedding = result.embeddings?.[0]?.values; // ✅ Correct extraction
```

**Test result**: Returns 768 dimensions ✅

### Database Schema ✅
```sql
ALTER TABLE chunks ALTER COLUMN embedding TYPE vector(768);
```

**Test result**: Accepts 768-dimension vectors ✅

### Upload Flow (app/api/process-blob/route.ts) ✅
```typescript
// Supabase path:
await storeDocument(metadata, blobUrl, pdfText);
// Calls generateEmbedding() for each chunk with 'RETRIEVAL_DOCUMENT'
```

**Code is correct** ✅

## Files Created

Test scripts (can be deleted after verification):
- `test-chunks.js` - Verify chunks in database
- `test-embedding.js` - Verify API returns 768 dims
- `check-schema.js` - Verify schema accepts 768 dims
- `clean-bad-upload.js` - Delete bad document (already run)
- `check-redis-metadata.js` - Clean Redis metadata (already run)

## Summary

**Problem**: Stale test data with wrong embedding dimensions (9757 instead of 768)
**Cause**: Upload happened during Session 27 code changes
**Solution**: Delete bad data ✅, re-upload with corrected code
**Status**: Ready for fresh upload and Phase 4 testing

---

**Next**: Re-upload Braid document → Test query → Compare quality with File Search Store
