# Query Corpus Token Limit - Critical Architecture Flaw

**Issue ID**: CRITICAL-001
**Discovered**: 2025-11-13, 11:00 PM (Session 11)
**Status**: **BLOCKING** - Breaks core RAG functionality
**Priority**: **P0 - Critical**
**Assignee**: Session 12 (Tomorrow Morning)

---

## Background

### System Overview
The Toyota Research System (TRS) is designed to:
- Support a corpus of **100 documents** (5-50MB PDFs each)
- Enable semantic search and RAG queries across the entire corpus
- Provide citations with page numbers and direct quotes

### Current Implementation
Query Corpus (`/api/summary`) currently:
1. Fetches all approved documents from Redis
2. Sends **ALL document files** to Gemini API via File Search fileUri
3. Gemini reads all files and generates response with citations

**This worked fine with small corpus (<20 documents).**

### What Changed
- User uploaded 36 documents (mix of 5-50MB PDFs)
- Total corpus size: ~1M+ tokens
- Query Corpus started returning 500 errors

---

## Problem Definition

### Error Message
```
POST /api/summary 500 in 48s

Summary API error: Error: [GoogleGenerativeAI Error]:
Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent:
[400 Bad Request] The input token count exceeds the maximum number of tokens allowed 1048576.
```

### Symptoms
- ❌ Query Corpus returns 500 error
- ❌ No RAG responses generated
- ❌ System unusable for research queries
- ❌ Completely blocks 100-document goal

### Impact
- **User Impact**: Cannot query research corpus (core functionality broken)
- **Business Impact**: System non-functional at production scale
- **Timeline Impact**: Blocks all downstream agents (Brainstorm, Analyze)

---

## Goal

**Primary Goal**: Support 100 documents in corpus with RAG queries working efficiently

**Success Criteria**:
1. RAG queries work with 100+ documents
2. Response time < 30 seconds for typical query
3. Citation quality maintained (page numbers, direct quotes)
4. Scalable to 200+ documents in future

**Non-Goals**:
- Don't need instant responses (10-30s is acceptable)
- Don't need perfect semantic ranking (top 5-10 relevant docs is fine)
- Don't need to support 1000+ document corpus yet

---

## Root Cause Analysis

### Technical Root Cause

**Code location**: `app/api/summary/route.ts`, lines 131-143

```typescript
// BROKEN: Sends ALL approved documents to Gemini
const currentMessage: any = {
  role: "user",
  parts: [
    { text: query },
    // Add ALL approved document files for Gemini to read
    ...approvedDocs.map((doc) => ({
      fileData: {
        mimeType: getMimeType(doc),
        fileUri: doc.fileUri,  // ← Sends EVERY file!
      },
    })),
  ],
};
```

### Why This Breaks

**Gemini's Token Limit**: 1,048,576 tokens (1M tokens)

**Corpus Size Calculation**:
- 36 documents × ~30,000 tokens/doc (average) = **1,080,000 tokens**
- Exceeds 1M token limit by 7.5%

**With 100 documents**:
- 100 documents × 30,000 tokens = **3,000,000 tokens**
- Exceeds limit by 3x!

### Why This Design Was Chosen

**Original assumption**: Small corpus (5-10 documents)
- 10 documents × 30,000 tokens = 300,000 tokens ✅ (well within limit)
- Seemed reasonable for initial implementation
- **Mistake**: Didn't account for stated 100-document goal

**Lack of semantic retrieval**:
- No document ranking/filtering implemented
- No embeddings or vector search
- Just dump everything and let Gemini sort it out

---

## Current Behavior

### What Works
- ✅ Files upload successfully to Google File Search
- ✅ Metadata stored in Redis (36 documents)
- ✅ Browse tab displays all documents
- ✅ Individual files are indexed and searchable (in theory)

### What's Broken
- ❌ Query Corpus with 36+ documents
- ❌ Any RAG functionality
- ❌ Cannot cite sources or generate research answers

### Breakpoint
- Works: ≤ 20-25 documents (~600-750K tokens)
- Breaks: ≥ 30-35 documents (~900-1050K tokens)
- Target: 100 documents (3M tokens - 3x over limit)

---

## Countermeasure Investigation

### Option 1: Google File Search Corpus API ⭐ RECOMMENDED

**Approach**: Use Google's built-in semantic retrieval

**How it works**:
1. Create a File Search Corpus (collection)
2. Upload all documents to the corpus
3. Query asks Gemini to ground on corpus (not individual files)
4. **Google automatically retrieves top N relevant chunks**
5. Gemini only sees relevant subset (under token limit)

**Pros**:
- ✅ Built-in semantic retrieval (no manual embeddings)
- ✅ Scales to 1000s of documents automatically
- ✅ Maintained by Google (updates, improvements)
- ✅ Proper RAG architecture

**Cons**:
- ⚠️ Requires migration of existing 36 files
- ⚠️ New API to learn (Corpus API vs Files API)
- ⚠️ Unknown: Does it support multimodal (images)?

**Effort Estimate**: 4-6 hours
- Research Corpus API (1 hour)
- Implement corpus creation/management (2 hours)
- Migrate existing files (1 hour)
- Update query logic (1 hour)
- Testing (1 hour)

**Resources**:
- [File Search Documentation](https://ai.google.dev/gemini-api/docs/file-search)
- [Corpus API Reference](https://ai.google.dev/api/caching#Corpus)

---

### Option 2: Manual Semantic Filtering

**Approach**: Build custom retrieval system

**How it works**:
1. Generate embeddings for each document (Gemini Embeddings API)
2. Store embeddings in Redis or local vector DB
3. On query: Generate query embedding
4. Compute cosine similarity, rank documents
5. Send top 5-10 relevant docs to Gemini

**Pros**:
- ✅ Full control over retrieval logic
- ✅ Can optimize for specific use case (Toyota research)
- ✅ No migration needed (works with current file structure)

**Cons**:
- ❌ More complex to build/maintain
- ❌ Need to manage embeddings ourselves
- ❌ Slower (embedding generation takes time)
- ❌ Additional API costs (embedding generation)

**Effort Estimate**: 6-8 hours
- Research embedding API (1 hour)
- Implement embedding generation (2 hours)
- Build similarity search (2 hours)
- Update query logic (1 hour)
- Optimize and test (2 hours)

**Resources**:
- [Gemini Embeddings API](https://ai.google.dev/gemini-api/docs/embeddings)

---

### Option 3: Quick Hack - Document Limit

**Approach**: Cap number of documents sent to Gemini

**How it works**:
1. Filter to top N documents (e.g., 10 most recent, or random sample)
2. Send only those to Gemini
3. Add disclaimer: "Searched 10 of 36 documents"

**Pros**:
- ✅ Fast to implement (30 minutes)
- ✅ Unblocks testing immediately
- ✅ No migration needed

**Cons**:
- ❌ Not a real solution (misses relevant docs)
- ❌ Poor user experience (incomplete results)
- ❌ Doesn't scale to 100 documents
- ❌ Defeats purpose of comprehensive corpus

**Effort Estimate**: 0.5 hours

**Use case**: Temporary workaround while building proper solution

---

### Option 4: Hybrid Approach (Quick + Long-term)

**Phase 1** (0.5 hours): Implement Option 3 (quick hack)
- Unblocks testing immediately
- User can continue corpus upload

**Phase 2** (4-6 hours): Implement Option 1 (Corpus API)
- Research and build proper solution
- Migrate when ready
- Remove cap

**Pros**:
- ✅ Unblocks user immediately
- ✅ Builds toward proper solution
- ✅ Parallel work possible

**Cons**:
- ⚠️ Two implementations needed
- ⚠️ Migration still required

---

## Recommended Solution

### Primary Recommendation: **Option 1 (Corpus API)**

**Rationale**:
1. **Proper RAG architecture**: Built-in semantic retrieval
2. **Scales to 100+ documents**: No manual token management
3. **Google-maintained**: Updates and improvements automatic
4. **Future-proof**: Designed for large-scale RAG

**Implementation Plan** (Session 12):
1. **Research** (1 hour): Read Corpus API docs, examples
2. **Prototype** (1 hour): Test corpus creation with 5 files
3. **Migration** (2 hours): Update upload to use corpus, migrate 36 files
4. **Query Update** (1 hour): Change query to use corpus grounding
5. **Testing** (1 hour): Verify citations, quality with full corpus

**Total Effort**: 6 hours (full session)

### Fallback Plan: **Option 4 (Hybrid)**

If Corpus API research reveals blockers (e.g., no multimodal support):
1. Implement Option 3 quick hack (30 mins) - unblocks user
2. Build Option 2 manual filtering (6-8 hours) - next session

---

## Migration Path

### For Existing 36 Documents

**If using Corpus API (Option 1)**:
1. Create new corpus in Google File Search
2. Iterate through 36 files in Redis
3. Re-upload each to corpus (fileUri might be reusable?)
4. Update Redis metadata with corpus references
5. Test queries work with migrated files
6. Delete old individual file uploads (optional, cleanup)

**If using Manual Filtering (Option 2)**:
1. Generate embeddings for all 36 documents
2. Store embeddings in Redis
3. No file migration needed

---

## Testing Plan

### Test Cases

**TC1: Small Query (Under Limit)**
- Query: "What is kaizen?"
- Expected: Top 3-5 relevant docs returned
- Time: < 10 seconds

**TC2: Broad Query (Needs Many Docs)**
- Query: "Summarize Toyota production engineering practices"
- Expected: 8-10 relevant docs returned
- Time: < 30 seconds

**TC3: Specific Query (Narrow)**
- Query: "What are the specifications of TNGA 2.5L engine?"
- Expected: 1-2 highly relevant docs
- Time: < 10 seconds

**TC4: 100 Document Corpus**
- Prerequisite: Upload to 100 docs
- Query: Any research question
- Expected: Works without token errors
- Time: < 30 seconds

### Verification Criteria
- ✅ No token limit errors
- ✅ Citations include page numbers
- ✅ Responses grounded in actual corpus
- ✅ Top N docs are semantically relevant
- ✅ Response quality maintained vs current (when working)

---

## Timeline

### Session 12 (Tomorrow Morning)
- **8:00 AM**: Start session, review this document
- **8:15 AM**: Research Corpus API / Make decision on approach
- **8:30 AM**: Begin implementation
- **11:30 AM**: Testing with 36 documents
- **12:00 PM**: Deploy fix to Vercel

### Follow-up (Session 13)
- Continue corpus upload to 100 documents
- Test scalability
- Optimize retrieval if needed

---

## Open Questions

1. **Does Corpus API support images?**
   - Current system: Multimodal RAG (docs + images)
   - Risk: Corpus API might only support text documents
   - Action: Research this first before committing to Option 1

2. **Can we reuse existing fileUri references?**
   - Files already uploaded to File Search individually
   - Can they be added to corpus without re-upload?
   - Or do we need to re-upload everything?

3. **How many documents can corpus retrieve?**
   - If Gemini can only see top 5 relevant docs, is that enough?
   - For broad queries, might need 10-15 docs
   - What's the retrieval limit?

4. **Embedding costs for Option 2?**
   - 100 documents × embedding cost = ?
   - Is this within budget?

5. **Migration downtime?**
   - Will user lose access during migration?
   - Can we migrate incrementally?

---

## References

- [Google File Search Documentation](https://ai.google.dev/gemini-api/docs/file-search)
- [Corpus API Reference](https://ai.google.dev/api/caching#Corpus)
- [Gemini Embeddings API](https://ai.google.dev/gemini-api/docs/embeddings)
- [Medium: Uploading Large Files to Gemini](https://medium.com/google-cloud/uploading-large-files-to-gemini-with-google-apps-script-overcoming-50-mb-limit-6ea63204ee81)

---

## Decision Log

**2025-11-13, 11:45 PM**: Issue documented, solution research pending

**Next Decision Point**: Session 12 start - Choose between Option 1 (Corpus API) or Option 4 (Hybrid) based on research

---

**Last Updated**: 2025-11-13, 11:45 PM
**Next Review**: Session 12 start (Tomorrow morning)
