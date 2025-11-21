# TRS V2 Transition Plan: Railway + Supabase Architecture

**Status**: Planning (V1 stays on File Search Store)
**Decision Date**: 2025-01-21
**Target**: Fresh build on Railway (Week of 2025-01-27)

---

## Executive Summary

After attempting to migrate from Google File Search Store to Supabase within the existing Vercel/Next.js architecture, we discovered **fundamental incompatibility** between serverless environments and PDF text extraction libraries.

**Decision**:
- **V1 (Current)**: Continue using Vercel + File Search Store (working, 241 documents)
- **V2 (Future)**: Build separate "Toyota Corpus Service" on Railway with full control

This document outlines why the migration failed, what we learned, and how to build V2 correctly.

---

## Table of Contents

1. [Background: What We Tried](#background-what-we-tried)
2. [Why It Failed: The Serverless Problem](#why-it-failed-the-serverless-problem)
3. [Current State: V1 Production](#current-state-v1-production)
4. [Limitations That Motivated Migration](#limitations-that-motivated-migration)
5. [V2 Architecture: The Right Way](#v2-architecture-the-right-way)
6. [Tech Stack Recommendations](#tech-stack-recommendations)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Migration Strategy: Parallel Development](#migration-strategy-parallel-development)
9. [Cost Analysis](#cost-analysis)
10. [Decision Matrix](#decision-matrix)
11. [Next Steps](#next-steps)

---

## Background: What We Tried

### Initial Goal
Migrate from Google File Search Store to Supabase PostgreSQL + pgvector to gain:
- **Transparent citations**: SQL JOIN instead of fragile fileId string matching
- **Full control**: Manual corpus curation, fix OCR errors
- **Better chunking**: Custom semantic boundaries

### Sessions 24-28: Supabase Migration Attempt

**Session 24**: Infrastructure setup ✅
- Created Supabase project with pgvector
- Deployed schema (documents + chunks tables)
- 768-dimension embeddings (gemini-embedding-001)

**Session 25**: Backend API integration ✅
- Created `lib/supabase-rag.ts`
- Updated `/api/process-blob` for dual-path support
- Build verified: 0 TypeScript errors

**Session 26**: UI toggles ✅
- Backend selector radio buttons
- Document counts by backend
- Visual indicators

**Session 27-28**: Text extraction debugging ❌
- **Problem**: Gemini LLM only extracted 16% of PDF text (16K chars vs 100K+ expected)
- **Root cause**: LLMs are probabilistic, optimized for Q&A not full-text extraction
- **Attempted fixes**:
  1. ✗ `pdfjs-dist` → Web worker bundling issues
  2. ✗ `pdf-parse` → ESM/CommonJS import errors
  3. ✗ Dynamic imports → Module resolution failures

**Conclusion**: Cannot reliably extract PDF text in Next.js serverless environment.

---

## Why It Failed: The Serverless Problem

### The Fundamental Mismatch

We tried to run **deterministic PDF parsing** in a **serverless edge runtime**. These are incompatible:

| Requirement | PDF Libraries Need | Next.js Serverless Provides |
|-------------|-------------------|----------------------------|
| **Runtime** | Traditional Node.js | Edge runtime (limited APIs) |
| **Dependencies** | Native binaries (canvas) | Pure JavaScript only |
| **Workers** | Web Workers / threads | No worker support |
| **Filesystem** | Synchronous file ops | Minimal, async-only |
| **Module System** | CommonJS | ESM (fragile interop) |
| **Execution Time** | Unbounded | 10s (Hobby), 300s (Pro) |

### Specific Failures

**Attempt 1: pdfjs-dist**
```
Error: Setting up fake worker failed: "Cannot find module 'pdf.worker.mjs'"
```
- Designed for browser (needs web workers)
- Next.js/Turbopack can't bundle worker files correctly
- Setting `GlobalWorkerOptions.workerSrc = ''` doesn't disable worker requirement

**Attempt 2: pdf-parse**
```
TypeError: pdf is not a function
Error: (0, __TURBOPACK__imported__module__...) is not a function
```
- CommonJS module in ESM context
- Has native dependencies (canvas, native bindings)
- `serverExternalPackages` config doesn't fix module resolution
- Dynamic import fails due to module structure

**Attempt 3: Gemini LLM for extraction**
```
Expected: 100,000+ characters
Actual: 16,282 characters (16% of content)
```
- LLMs are "lazy" - summarize instead of extract verbatim
- 8K token output limit prevents full extraction
- Japanese text may trigger translation instead of transcription
- Probabilistic model for deterministic task = wrong tool

### The Core Insight

**You cannot do heavy PDF processing in a serverless function.** The platform constraints are architectural, not bugs to be fixed.

---

## Current State: V1 Production

### What's Working (File Search Store)

✅ **Production Ready**
- 241 documents successfully indexed
- Semantic RAG working reliably
- Citations functional (fileId matching)
- Japanese text preserved accurately
- Zero token limit issues (99.77% reduction vs Files API)

✅ **Performance**
- Query speed: <2s average
- No serverless timeouts
- Scales to 1000+ documents
- Automatic chunking (500 tokens/chunk, 50 overlap)

✅ **User Experience**
- Upload Agent: Client-side blob (up to 100MB)
- Quality tiers: 4-tier classification system
- Browse Agent: Search, filter, sort, delete
- Query Corpus: Strict citations, semantic retrieval

### Current Limitations

⚠️ **Opacity**
- Can't see how Google chunks documents
- Can't verify chunking logic
- Black box citation matching

⚠️ **Control**
- Can't manually fix OCR errors in corpus
- Can't adjust chunking strategy
- Can't edit existing document text

⚠️ **Citations**
- Relies on fileId string matching (fragile)
- Chunk titles derived from temp file paths
- No SQL JOIN for relationships
- Workaround works but feels brittle

⚠️ **Debugging**
- Limited visibility into why results returned
- Can't inspect chunk boundaries
- Can't trace citation logic

### Verdict: Good Enough for V1

The File Search Store limitations are **architectural constraints**, not blockers. For a single-user research system with 241 documents, it's working well.

---

## Limitations That Motivated Migration

### 1. Citation Fragility (Session 22)

**Problem**: Citations depend on parsing chunk titles like `upload-1763588882831.pdf` and matching to documents where `fileId.includes(normalizedTitle)`.

**Impact**:
- Works for all 241 documents ✅
- But relies on Google's fileId format staying consistent
- No direct foreign key relationships
- Fails silently if Google changes file naming

**V2 Solution**: SQL foreign keys (`chunks.document_id → documents.id`)

### 2. Corpus Curation

**Problem**: Can't manually edit text in File Search Store.

**Example Use Cases**:
- Fix OCR errors ("Kaizon" → "Kaizen")
- Add missing context to unclear passages
- Merge duplicate near-identical chunks
- Annotate documents with expert notes

**V2 Solution**: Direct Postgres access, `UPDATE chunks SET text = ...`

### 3. Semantic Chunking

**Problem**: File Search Store chunks by token count (500 tokens, 50 overlap). No semantic boundaries.

**Impact**:
- May split mid-sentence or mid-concept
- Loses document structure (headings, sections)
- Can't preserve "definition + example" blocks

**V2 Solution**: Chunk by markdown headers, preserve structure

### 4. Japanese Language Optimization

**Problem**: Generic chunking may not respect Japanese text flow (vertical text, mixed scripts).

**Impact**: Unknown (File Search works well, but could be better)

**V2 Solution**: LlamaParse with `language: "ja"` flag, Japanese-aware chunking

---

## V2 Architecture: The Right Way

### Design Principles

1. **Decouple Manufacturing from Showroom**
   - Heavy processing (PDF → chunks) on Railway (no time limits)
   - Fast queries (search + display) on Vercel (low latency)

2. **Use Each Platform's Strengths**
   - Vercel: Global CDN, instant deploys, great for UI
   - Railway: Traditional Node/Python, long-running jobs, full control

3. **Own Your Data**
   - Raw text in Postgres (Supabase)
   - Full schema control
   - SQL debugging, manual edits

4. **Transparent Pipeline**
   - PDF → markdown (LlamaParse)
   - Markdown → chunks (semantic boundaries)
   - Chunks → embeddings (OpenAI/Google)
   - Store with full metadata (document, page, section, heading)

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│ LAYER 1: Ingestion (Railway)                            │
│ - PDF upload endpoint                                   │
│ - LlamaParse API (PDF → markdown)                       │
│ - Semantic chunking (by headers)                        │
│ - Embedding generation (OpenAI/Google)                  │
│ - Supabase storage (chunks + metadata)                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ LAYER 2: Corpus & Retrieval (Supabase)                  │
│ - PostgreSQL + pgvector                                 │
│ - Tables: documents, sections, chunks, embeddings       │
│ - Vector similarity search                              │
│ - SQL queries for citations                             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ LAYER 3: Application (Vercel)                           │
│ - Next.js UI (existing)                                 │
│ - Calls Railway API for search                          │
│ - Displays results with citations                       │
│ - User interactions                                     │
└─────────────────────────────────────────────────────────┘
```

### Data Flow: Ingestion

```
1. User uploads PDF
   ↓
2. Railway receives file
   ↓
3. Call LlamaParse API
   POST https://api.cloud.llamaindex.ai/api/parsing/upload
   params: { language: "ja", resultType: "markdown" }
   ↓
4. Parse markdown structure
   # Heading 1 → section
   ## Heading 2 → subsection
   Paragraphs → chunks (keep definition + example together)
   ↓
5. Generate embeddings
   OpenAI: text-embedding-3-large (1536 dims)
   OR Google: gemini-embedding-001 (768 dims)
   ↓
6. Store in Supabase
   INSERT INTO documents (title, file_url, ...)
   INSERT INTO sections (document_id, heading, ...)
   INSERT INTO chunks (section_id, text, embedding, page_num, ...)
```

### Data Flow: Query

```
1. User asks question (JP/EN)
   ↓
2. Vercel calls Railway API
   POST /search
   { query: "What is Hansei?", topK: 5 }
   ↓
3. Railway generates query embedding
   ↓
4. Supabase vector search
   SELECT
     c.text,
     c.page_number,
     s.heading,
     d.title
   FROM chunks c
   JOIN sections s ON c.section_id = s.id
   JOIN documents d ON s.document_id = d.id
   ORDER BY c.embedding <-> query_embedding
   LIMIT 5
   ↓
5. Railway returns chunks + metadata
   [
     {
       text: "...",
       source: "Toyota_TPS_Manual.pdf",
       page: 42,
       section: "3.1 Hansei and Reflection"
     }
   ]
   ↓
6. Vercel sends to LLM with context
   System: "Answer using ONLY these sources. Cite as [Source, p.X]"
   ↓
7. Display answer with clickable citations
```

---

## Tech Stack Recommendations

### Synthesized from Two Expert Viewpoints

| Component | Recommendation | Why? | Alternatives |
|-----------|---------------|------|--------------|
| **Frontend** | Vercel + Next.js | Already built, fast CDN, zero change | N/A (keep current) |
| **Backend/Worker** | Railway | Real Node.js, no timeouts, $5-10/mo | Render, Fly.io |
| **Database** | Supabase (Postgres + pgvector) | SQL control, good tooling, $25/mo | Self-hosted Postgres + pgvector |
| **PDF Parsing** | LlamaParse (Llama Cloud API) | Japanese support (`language: "ja"`), markdown output, table/layout handling | Google Document AI (more expensive) |
| **Embeddings** | OpenAI text-embedding-3-large | Strong bilingual JP/EN, 1536 dims | Google gemini-embedding-001 (768 dims) |
| **LLM (Reasoning)** | OpenAI GPT-5.1 Thinking | Best reasoning, chain-of-thought | Gemini 2.5 Flash (faster, cheaper) |
| **Storage (Files)** | Vercel Blob | Already integrated | S3, Cloudflare R2 |
| **Metadata** | Vercel KV (Redis) | Already integrated, fast | Upstash Redis |

### Railway Service Tech Stack

**Option A: Node.js/TypeScript** (Recommended for you)
```typescript
// Familiar stack, same as Vercel
- Framework: Express or Fastify
- Language: TypeScript
- PDF: LlamaParse API (REST)
- Embeddings: OpenAI Node SDK
- Database: Supabase client
```

**Option B: Python/FastAPI** (Alternative)
```python
# Better ML ecosystem, more PDF tools
- Framework: FastAPI
- Language: Python 3.11+
- PDF: LlamaParse Python SDK
- Embeddings: OpenAI Python SDK
- Database: Supabase Python client
```

### Recommended: Node.js

**Reasoning**:
- Same language as Vercel (code reuse)
- You're already proficient in TypeScript
- LlamaParse has good Node.js SDK
- OpenAI Node SDK is mature
- Can reuse types from existing codebase

---

## Implementation Roadmap

### Phase 1: Railway Setup (Week 1)

**Goal**: Get basic service running

**Tasks**:
1. Create Railway project
   - Connect GitHub repo (new branch: `railway-service`)
   - Configure Node.js environment
   - Set environment variables

2. Create basic API structure
   ```
   railway-service/
   ├── src/
   │   ├── routes/
   │   │   ├── ingest.ts      # POST /ingest
   │   │   ├── search.ts      # POST /search
   │   │   └── health.ts      # GET /health
   │   ├── services/
   │   │   ├── llamaparse.ts  # PDF → markdown
   │   │   ├── chunker.ts     # Markdown → chunks
   │   │   ├── embeddings.ts  # Chunks → vectors
   │   │   └── supabase.ts    # Database operations
   │   ├── types/
   │   │   └── index.ts       # Shared types
   │   └── index.ts           # Express app
   ├── package.json
   └── tsconfig.json
   ```

3. Deploy "Hello World" endpoint
   - Verify Railway deployment works
   - Test from Postman/curl
   - Check logs

**Time Estimate**: 2-4 hours

### Phase 2: LlamaParse Integration (Week 1)

**Goal**: PDF → markdown extraction working

**Tasks**:
1. Sign up for LlamaParse API
   - Get API key from https://cloud.llamaindex.ai
   - Check pricing (free tier available)

2. Implement PDF upload endpoint
   ```typescript
   POST /ingest
   Content-Type: multipart/form-data
   Body: { file: File, language: 'ja' }
   ```

3. Call LlamaParse
   ```typescript
   import LlamaParseClient from 'llamaparse';

   const client = new LlamaParseClient({ apiKey: process.env.LLAMAPARSE_API_KEY });

   const result = await client.parse({
     file: pdfBuffer,
     language: 'ja',
     resultType: 'markdown',
     splitByPage: true,
   });

   const markdown = result.markdown;
   ```

4. Test with Braid PDF (30MB)
   - Verify full text extraction
   - Expect >100K characters
   - Check Japanese character fidelity

**Time Estimate**: 3-5 hours

### Phase 3: Semantic Chunking (Week 1)

**Goal**: Markdown → structured chunks

**Tasks**:
1. Parse markdown structure
   ```typescript
   interface ParsedDocument {
     title: string;
     sections: Section[];
   }

   interface Section {
     heading: string;
     level: number; // 1 = #, 2 = ##, etc.
     content: string;
     chunks: Chunk[];
     pageNumber?: number;
   }

   interface Chunk {
     text: string;
     pageNumber?: number;
     offset: number;
   }
   ```

2. Implement chunking strategy
   - **By Header**: Split on `#`, `##`, `###`
   - Keep 1-3 paragraphs per chunk (~500-1000 tokens)
   - Preserve "definition + example" blocks
   - Add metadata: heading, page, section

3. Test chunking quality
   - Verify chunks are semantically coherent
   - Check Japanese text isn't split mid-word
   - Ensure page numbers preserved

**Time Estimate**: 4-6 hours

### Phase 4: Embeddings + Supabase (Week 1-2)

**Goal**: Store chunks with vectors in Supabase

**Tasks**:
1. Generate embeddings
   ```typescript
   import OpenAI from 'openai';

   const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

   const response = await openai.embeddings.create({
     model: 'text-embedding-3-large',
     input: chunk.text,
   });

   const embedding = response.data[0].embedding; // 1536 dims
   ```

2. Store in Supabase
   ```typescript
   // Insert document
   const { data: doc } = await supabase
     .from('documents')
     .insert({ title, file_url, metadata })
     .select()
     .single();

   // Insert sections
   for (const section of sections) {
     const { data: sec } = await supabase
       .from('sections')
       .insert({ document_id: doc.id, heading: section.heading })
       .select()
       .single();

     // Insert chunks with embeddings
     for (const chunk of section.chunks) {
       await supabase
         .from('chunks')
         .insert({
           section_id: sec.id,
           text: chunk.text,
           embedding: chunk.embedding,
           page_number: chunk.pageNumber,
         });
     }
   }
   ```

3. Test ingestion end-to-end
   - Upload Braid PDF
   - Verify in Supabase dashboard:
     - 1 document row
     - ~5-10 section rows
     - 40-50 chunk rows with vectors

**Time Estimate**: 4-6 hours

### Phase 5: Search Endpoint (Week 2)

**Goal**: Query endpoint with vector search

**Tasks**:
1. Implement search
   ```typescript
   POST /search
   Body: { query: string, topK: number }

   // Generate query embedding
   const queryEmbedding = await generateEmbedding(query);

   // Vector search in Supabase
   const { data: chunks } = await supabase.rpc('search_chunks', {
     query_embedding: queryEmbedding,
     match_count: topK,
   });

   // Return chunks with metadata
   return chunks.map(c => ({
     text: c.text,
     source: c.documents.title,
     page: c.page_number,
     section: c.sections.heading,
     similarity: c.similarity,
   }));
   ```

2. Create Supabase RPC function
   ```sql
   CREATE OR REPLACE FUNCTION search_chunks(
     query_embedding vector(1536),
     match_count int
   )
   RETURNS TABLE (
     id uuid,
     text text,
     page_number int,
     similarity float,
     section_id uuid,
     -- Join section and document info
   )
   LANGUAGE sql
   AS $$
     SELECT
       c.id,
       c.text,
       c.page_number,
       1 - (c.embedding <=> query_embedding) AS similarity,
       c.section_id
     FROM chunks c
     ORDER BY c.embedding <=> query_embedding
     LIMIT match_count;
   $$;
   ```

3. Test search quality
   - Query: "What is Hansei?"
   - Verify relevant chunks returned
   - Check Japanese queries work
   - Compare to File Search results

**Time Estimate**: 3-4 hours

### Phase 6: Vercel Integration (Week 2)

**Goal**: Connect existing UI to Railway backend

**Tasks**:
1. Add Railway URL to Vercel env
   ```bash
   RAILWAY_API_URL=https://your-service.railway.app
   ```

2. Create new API route in Vercel
   ```typescript
   // app/api/corpus-v2/route.ts
   export async function POST(req: NextRequest) {
     const { query, topK } = await req.json();

     // Call Railway service
     const response = await fetch(`${process.env.RAILWAY_API_URL}/search`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ query, topK }),
     });

     const chunks = await response.json();

     // Format for LLM
     const context = chunks.map(c =>
       `[${c.source}, p.${c.page}, "${c.section}"]\n${c.text}`
     ).join('\n\n');

     // Send to Gemini/GPT with citations
     // ... existing RAG logic
   }
   ```

3. Add UI toggle
   ```typescript
   // components/agents/browse-query-agent.tsx
   <RadioGroup value={backend} onValueChange={setBackend}>
     <Radio value="file_search">File Search (V1)</Radio>
     <Radio value="railway">Railway Corpus (V2)</Radio>
   </RadioGroup>
   ```

4. Test side-by-side comparison
   - Same query to both backends
   - Compare answer quality
   - Compare citation accuracy
   - Check response time

**Time Estimate**: 2-3 hours

### Phase 7: Production Readiness (Week 3+)

**Goal**: Harden for real use

**Tasks**:
- Error handling, retries
- Rate limiting
- Authentication (shared secret)
- Monitoring/logging
- Backup strategy
- Migration script (241 docs from File Search → Railway)

**Time Estimate**: 8-12 hours

---

## Migration Strategy: Parallel Development

### "Strangler Fig" Pattern

Like a strangler fig tree that grows around an existing tree, gradually replacing it:

**Phase 1: Both Systems Live**
```
User Query
    ↓
Toggle Switch (UI)
    ↓
├── V1 Path: Vercel → File Search Store → Gemini
│   (Current production, stable)
│
└── V2 Path: Vercel → Railway → Supabase → GPT
    (Experimental, being validated)
```

**Phase 2: Comparison Mode**
- Run same query through both backends
- Display both results side-by-side
- User feedback: which is better?
- Collect metrics:
  - Answer quality
  - Citation accuracy
  - Response time
  - Cost per query

**Phase 3: Gradual Shift**
- Default to V2 when quality proven
- Keep V1 as fallback
- Monitor for regressions

**Phase 4: V1 Deprecation**
- Once V2 stable for 2-4 weeks
- Archive File Search Store documents
- Remove V1 code paths

### Risk Mitigation

**Low Risk**:
- V1 stays untouched (production keeps working)
- V2 is additive (new code, new infrastructure)
- Can abandon V2 if it doesn't work out
- No data loss (241 docs stay in File Search)

**Rollback Plan**:
- If V2 fails: just remove UI toggle
- If Railway has issues: V1 keeps serving users
- If cost too high: can pause Railway, V1 continues

---

## Cost Analysis

### Current V1 Costs (Monthly)

| Service | Cost | Notes |
|---------|------|-------|
| Vercel Pro | $20 | Serverless functions, hosting |
| Vercel Blob | ~$5 | 241 PDFs stored |
| Vercel KV | ~$5 | Redis metadata |
| Gemini API | ~$10 | Metadata extraction, RAG queries |
| Google File Search Store | $0 | Free tier (permanent storage) |
| **Total V1** | **~$40/mo** | |

### Projected V2 Costs (Monthly)

| Service | Cost | Notes |
|---------|------|-------|
| Vercel Pro | $20 | (unchanged) |
| Vercel Blob | ~$5 | (unchanged) |
| Vercel KV | ~$5 | (unchanged) |
| **Railway** | **$5-10** | Starter plan, Node.js service |
| **Supabase** | **$25** | Pro plan (already have) |
| **LlamaParse API** | **$10-30** | One-time for 241 docs, then $1-2/doc |
| **OpenAI Embeddings** | **$5-10** | text-embedding-3-large, one-time for 241 docs |
| OpenAI GPT API | ~$10 | (replaces Gemini for queries) |
| **Total V2** | **~$85-105/mo** | **+$45-65/mo vs V1** |

### V2 Cost Breakdown

**One-Time Ingestion** (241 documents):
- LlamaParse: 241 docs × $0.10 = **$24**
- OpenAI Embeddings: ~10,000 chunks × $0.00013/1K tokens = **$10**
- **Total one-time**: ~$34

**Ongoing** (per month):
- Railway service: $5-10
- Supabase: $25 (already paying)
- New doc ingestion: ~5 docs/mo × $0.10 = $0.50
- Query costs: Similar to current

### Cost Optimization Options

1. **Use Gemini embeddings** instead of OpenAI
   - gemini-embedding-001: Free tier (limited)
   - Reduces embedding costs to ~$0

2. **Self-host PDF parsing** on Railway
   - Use pdf-parse (works in Railway Node.js)
   - Eliminates LlamaParse API cost
   - Trade-off: Less Japanese optimization

3. **Mix backends**
   - V1 for casual queries (free File Search)
   - V2 for high-value queries requiring citations
   - Optimize for value, not volume

4. **Downgrade Supabase** after testing
   - Free tier: 500MB database, 2GB bandwidth
   - Might be sufficient for 241 docs
   - Saves $25/mo

**Optimized V2**: Could run for **$45-55/mo** (+$5-15 vs V1) with cost-conscious choices.

---

## Decision Matrix

### Should You Build V2?

| Factor | V1 (File Search) | V2 (Railway) | Winner |
|--------|------------------|--------------|--------|
| **Works Today** | ✅ 241 docs, stable | ❌ Doesn't exist yet | V1 |
| **Development Time** | 0 hours | 40-60 hours | V1 |
| **Monthly Cost** | $40 | $85-105 | V1 |
| **Citation Quality** | ⚠️ Fragile fileId matching | ✅ SQL foreign keys | V2 |
| **Corpus Control** | ❌ Can't edit text | ✅ Full SQL access | V2 |
| **Semantic Chunking** | ❌ Token-based | ✅ Header-based | V2 |
| **Japanese Optimization** | ⚠️ Generic | ✅ Language-aware | V2 |
| **Debugging** | ❌ Black box | ✅ Full transparency | V2 |
| **Scalability** | ✅ To 1000+ docs | ✅ Unlimited | Tie |
| **Maintenance** | ✅ Zero-ops | ⚠️ Self-managed | V1 |

### Recommendation

**For V1 Launch**: Stick with File Search Store
- It's working well enough
- Zero additional development
- Focus on user feedback, content quality

**For V2 (Future)**: Build Railway service when:
- You have 40-60 hours to invest
- You need manual corpus curation
- Citation fragility becomes a real problem
- You want section-level granularity
- You're ready to self-manage infrastructure

### Trigger Points for V2

Build V2 when you encounter:
1. **File Search citation breaks**: Google changes fileId format
2. **OCR errors accumulate**: Need to manually fix corpus
3. **Citation complaints**: Users need page+section precision
4. **Scale issues**: >500 documents in File Search
5. **Business justification**: Revenue/users justify $45-65/mo extra cost

---

## Next Steps

### Immediate (This Week)

1. **Clean up failed migration** ✅
   - [ ] Remove `pdfjs-dist` dependency
   - [ ] Remove `pdf-parse` dependency
   - [ ] Revert `next.config.ts` (remove serverExternalPackages)
   - [ ] Revert `lib/pdf-loader.ts` (delete file)
   - [ ] Update `app/api/process-blob/route.ts` (remove Supabase path temporarily)
   - [ ] Update `CLAUDE.md` (document why migration deferred)
   - [ ] Test build: `npm run build` (verify 0 errors)

2. **Document decision** ✅
   - [x] Create `transition_plan.md` (this document)
   - [ ] Update `Next_steps.md` (V2 planning added to roadmap)
   - [ ] Add to `docs/progress/` (Session 28 final notes)

3. **Return to V1 stability**
   - [ ] Deploy to Vercel (clean state)
   - [ ] Verify 241 documents still working
   - [ ] Test upload, query, browse workflows
   - [ ] Confirm citations working with fileId matching

### Next Week (V2 Kickoff)

1. **Railway setup**
   - [ ] Create Railway account
   - [ ] Create new project: "toyota-corpus-service"
   - [ ] Deploy "Hello World" Node.js app
   - [ ] Verify deployment, check logs

2. **LlamaParse evaluation**
   - [ ] Sign up for LlamaParse API
   - [ ] Test with 1-2 sample PDFs
   - [ ] Verify Japanese text quality
   - [ ] Check markdown structure
   - [ ] Evaluate cost for 241 docs

3. **Architecture decisions**
   - [ ] Node.js vs Python? (recommend Node.js)
   - [ ] OpenAI vs Gemini embeddings? (recommend OpenAI for quality)
   - [ ] Chunking strategy details?
   - [ ] Schema design for Supabase tables?

### Month 1 (V2 Alpha)

- [ ] Complete Phase 1-5 (ingestion pipeline)
- [ ] Ingest 5-10 test documents
- [ ] Verify search quality
- [ ] Compare to V1 results

### Month 2 (V2 Beta)

- [ ] Complete Phase 6 (Vercel integration)
- [ ] Ingest all 241 documents
- [ ] Side-by-side comparison mode
- [ ] User testing

### Month 3+ (V2 Production)

- [ ] Harden for production (error handling, monitoring)
- [ ] Gradual traffic shift (V2 becomes default)
- [ ] V1 deprecation (when stable)

---

## Key Takeaways

### What We Learned

1. **Serverless has limits**: Can't do heavy compute in edge functions
2. **LLMs aren't OCR**: Probabilistic models ≠ deterministic extraction
3. **Platform matters**: Right tool for the job (Railway vs Vercel)
4. **Decouple concerns**: Manufacturing (Railway) ≠ Showroom (Vercel)
5. **Parallel development**: Don't rewrite, strangle gradually

### What's Working (V1)

- Google File Search Store is solid for 95% of use cases
- Citations work (fragile but functional)
- Japanese text preserved accurately
- Scales to hundreds of documents
- Zero-ops maintenance

### Why V2 is Worth It (Eventually)

- **Control**: Full corpus ownership, manual curation
- **Transparency**: SQL debugging, visible chunking
- **Quality**: Semantic boundaries, Japanese-aware parsing
- **Flexibility**: Can swap components (embeddings, chunking, LLM)
- **Future-proof**: Own the data layer, not locked into Google

### When to Build V2

**Not yet** if:
- V1 meeting your needs
- Don't have 40-60 hours
- Cost-sensitive ($45-65/mo increase)
- Want to focus on content, not infrastructure

**Yes** if:
- Citation fragility causing real problems
- Need manual corpus editing
- Want section-level precision
- Ready to self-manage backend
- Business justifies infrastructure investment

---

## Appendix: Technical References

### Supabase Schema (V2)

```sql
-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  citation_name TEXT,
  year INTEGER,
  track TEXT,
  language TEXT,
  document_type TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sections table
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  heading TEXT NOT NULL,
  level INTEGER, -- 1 = #, 2 = ##, etc.
  page_number INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Chunks table
CREATE TABLE chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  embedding VECTOR(1536), -- or VECTOR(768) for Gemini
  page_number INTEGER,
  offset INTEGER,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX ON sections(document_id);
CREATE INDEX ON chunks(section_id);
CREATE INDEX ON chunks USING ivfflat (embedding vector_cosine_ops);
```

### LlamaParse API Example

```typescript
import LlamaParseClient from 'llamaparse';

const client = new LlamaParseClient({
  apiKey: process.env.LLAMAPARSE_API_KEY,
});

async function parsePDF(pdfBuffer: Buffer) {
  const result = await client.parse({
    file: pdfBuffer,
    language: 'ja', // Japanese optimization
    resultType: 'markdown', // Get structured output
    splitByPage: true, // Keep page boundaries
    targetPages: undefined, // Parse all pages
  });

  return result.markdown;
}
```

### OpenAI Embeddings Example

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large', // 1536 dimensions
    input: text,
  });

  return response.data[0].embedding;
}

// Batch processing for efficiency
async function generateEmbeddings(texts: string[]) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: texts, // Up to 2048 texts per request
  });

  return response.data.map(d => d.embedding);
}
```

### Railway Deployment

```yaml
# railway.yml
version: 2

services:
  toyota-corpus-service:
    source: .
    build:
      command: npm run build
    start:
      command: npm start
    env:
      NODE_ENV: production
      PORT: 3001
      LLAMAPARSE_API_KEY: ${LLAMAPARSE_API_KEY}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_KEY: ${SUPABASE_KEY}
```

---

**Document Version**: 1.0
**Last Updated**: 2025-01-21
**Author**: TRS Development Team
**Status**: Living document (update as V2 progresses)
