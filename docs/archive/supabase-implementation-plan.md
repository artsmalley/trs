# Supabase Migration Plan - TRS RAG System

**Date**: 2025-01-19
**Status**: PLANNING PHASE
**Start Date**: TBD (~1 week)
**Estimated Effort**: 4-6 hours
**Estimated Cost**: ~$0.15 in API fees

---

## Executive Summary

**Goal**: Migrate from Google File Search Store to Supabase PostgreSQL + pgvector for better control, transparency, and citation reliability.

**Approach**: Re-process 241 existing documents (141 PDFs + 100 URL contents) with custom chunking and embeddings.

**Strategy**: Keep Google File Search Store as backup, implement A/B testing to validate quality improvements.

**Key Benefits**:
- Clean foreign key relationships (no fragile string matching)
- Quality tier filtering during retrieval
- Full transparency and debuggability
- Advanced features (hybrid search, reranking, metadata filtering)
- No vendor lock-in

**Tradeoffs**:
- 4-6 hours migration effort
- Full corpus re-processing required
- Expected 10-20% quality improvement (not revolutionary)

---

## Current Architecture (3-Layer)

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: Vercel Blob                                │
│ - Original PDFs (141 files)                         │
│ - URL content as .txt (100 files)                   │
│ - Permanent storage for downloads                   │
│ - Cost: ~$0.10/GB stored                            │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ Layer 2: Google File Search Store (CURRENT RAG)     │
│ - Chunked + embedded text (opaque)                  │
│ - 500 token chunks, 50 overlap (no control)         │
│ - Google's embedding model (black box)              │
│ - Semantic retrieval (top 5-10 chunks)              │
│ - PROBLEM: Fragile citation matching (fileId)       │
│ - PROBLEM: No quality tier filtering                │
│ - PROBLEM: No debugging/transparency                │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ Layer 3: Redis (Vercel KV)                          │
│ - Document metadata (title, authors, year, etc.)    │
│ - Approval workflow status (pending/approved)       │
│ - File references (blobUrl, fileId)                 │
│ - Rate limiting (IP → request counts)               │
│ - Quality tier assignments                          │
└─────────────────────────────────────────────────────┘
```

**Data Flow**:
```
Upload: PDF → Blob → File Search (upload) → Extract metadata → Redis
Query:  Redis (approved docs) → File Search (retrieve) → Gemini → User
```

---

## Proposed Architecture (Simplified)

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: Vercel Blob (UNCHANGED)                    │
│ - Original files for downloads                      │
│ - Keep existing 241 files                           │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ Layer 2: Supabase PostgreSQL + pgvector (NEW RAG)   │
│                                                      │
│ ┌────────────────────────────────────────────────┐  │
│ │ documents TABLE                                 │  │
│ │ - id, title, authors, citation_key, year       │  │
│ │ - quality_tier, track, status                  │  │
│ │ - file_type (pdf/url), source_url, blob_url    │  │
│ │ - summary, keywords, created_at                │  │
│ └────────────────────────────────────────────────┘  │
│                    ↓                                 │
│ ┌────────────────────────────────────────────────┐  │
│ │ chunks TABLE                                    │  │
│ │ - id, document_id (FK), chunk_index            │  │
│ │ - text, page_number                            │  │
│ │ - embedding VECTOR(1536)                       │  │
│ │ - created_at                                   │  │
│ └────────────────────────────────────────────────┘  │
│                                                      │
│ BENEFITS:                                            │
│ - Direct foreign keys (chunk → document)            │
│ - Quality tier filtering in SQL                     │
│ - Full transparency (inspect chunks/embeddings)     │
│ - Custom metadata per chunk                         │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ Layer 3: Redis (MINIMAL - rate limiting only)       │
│ - Rate limiting only (existing code works)          │
│ - OR: Migrate to PostgreSQL (slower, more effort)   │
└─────────────────────────────────────────────────────┘
```

**Data Flow**:
```
Upload: PDF → Blob → Extract → Chunk → Embed → Supabase (documents + chunks)
Query:  Supabase (vector search WHERE quality_tier <= 2) → Gemini → User
```

---

## Migration Strategy

### Phase 0: Preparation (30 min)
**Goal**: Set up Supabase database and tables

1. **Create Supabase database** (or use existing)
2. **Enable pgvector extension**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

3. **Create documents table**:
   ```sql
   CREATE TABLE documents (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     title TEXT NOT NULL,
     authors TEXT[],
     citation_key TEXT UNIQUE,
     citation_name TEXT,
     quality_tier INTEGER DEFAULT 2,
     tier_label TEXT,
     auto_classified BOOLEAN DEFAULT false,
     track TEXT,
     year INTEGER,
     file_type TEXT, -- 'pdf' or 'url'
     file_name TEXT,
     source_url TEXT, -- Original URL for url-ingested content
     blob_url TEXT NOT NULL, -- Link to Vercel Blob
     mime_type TEXT,
     status TEXT DEFAULT 'approved', -- 'pending' | 'approved' | 'rejected'
     summary TEXT,
     keywords TEXT[],
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

   CREATE INDEX idx_documents_status ON documents(status);
   CREATE INDEX idx_documents_quality_tier ON documents(quality_tier);
   CREATE INDEX idx_documents_track ON documents(track);
   ```

4. **Create chunks table**:
   ```sql
   CREATE TABLE chunks (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
     chunk_index INTEGER NOT NULL,
     text TEXT NOT NULL,
     page_number INTEGER, -- From PDFs, NULL for URLs
     embedding VECTOR(1536) NOT NULL, -- OpenAI text-embedding-3-small
     created_at TIMESTAMP DEFAULT NOW(),
     UNIQUE(document_id, chunk_index)
   );

   CREATE INDEX idx_chunks_document_id ON chunks(document_id);
   CREATE INDEX idx_chunks_embedding ON chunks USING ivfflat (embedding vector_cosine_ops);
   ```

5. **Set up Supabase client in project**:
   ```bash
   npm install @supabase/supabase-js
   ```

6. **Add env vars** to `.env.local`:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

---

### Phase 1: Re-ingestion Pipeline (2-3 hours)

**Goal**: Process all 241 documents from Vercel Blob into Supabase

#### 1.1 Create Utility Functions

**File**: `lib/supabase-rag.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

// Chunk text (500 tokens, 50 overlap)
export async function chunkText(
  text: string,
  chunkSize: number = 500,
  overlap: number = 50
): Promise<string[]> {
  // Simple word-based chunking
  // TODO: Consider semantic chunking or sentence-boundary chunking
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    chunks.push(chunk);
  }

  return chunks;
}

// Generate embeddings for chunks
export async function generateEmbeddings(
  chunks: string[]
): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: chunks,
  });

  return response.data.map(d => d.embedding);
}

// Insert document + chunks into Supabase
export async function insertDocument(
  metadata: any,
  chunks: string[],
  embeddings: number[][]
) {
  // Insert document
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({
      title: metadata.title,
      authors: metadata.authors,
      citation_key: metadata.citationKey,
      citation_name: metadata.citationName,
      quality_tier: metadata.qualityTier,
      tier_label: metadata.tierLabel,
      auto_classified: metadata.autoClassified,
      track: metadata.track,
      year: metadata.year,
      file_type: metadata.fileType,
      file_name: metadata.fileName,
      source_url: metadata.source,
      blob_url: metadata.blobUrl,
      mime_type: metadata.mimeType,
      status: 'approved',
      summary: metadata.summary,
      keywords: metadata.keywords,
    })
    .select()
    .single();

  if (docError) throw docError;

  // Insert chunks
  const chunkInserts = chunks.map((text, idx) => ({
    document_id: doc.id,
    chunk_index: idx,
    text,
    page_number: metadata.pageNumbers?.[idx] || null,
    embedding: embeddings[idx],
  }));

  const { error: chunksError } = await supabase
    .from('chunks')
    .insert(chunkInserts);

  if (chunksError) throw chunksError;

  return doc;
}
```

#### 1.2 Create Migration Script

**File**: `scripts/migrate-to-supabase.ts`

```typescript
import { listAllDocuments } from '@/lib/kv';
import { chunkText, generateEmbeddings, insertDocument } from '@/lib/supabase-rag';
import pdf from 'pdf-parse';

async function migrateAllDocuments() {
  console.log('Starting migration...');

  // Get all approved documents from Redis
  const allDocs = await listAllDocuments();
  const approvedDocs = allDocs.filter(doc => doc.status === 'approved');

  console.log(`Found ${approvedDocs.length} approved documents`);

  let processed = 0;
  let failed = 0;

  for (const doc of approvedDocs) {
    try {
      console.log(`Processing ${doc.fileName}...`);

      // Download file from Blob
      const fileBuffer = await fetch(doc.blobUrl).then(r => r.arrayBuffer());

      // Extract text based on file type
      let text: string;
      if (doc.fileType === 'document' && doc.mimeType === 'application/pdf') {
        // PDF
        const pdfData = await pdf(Buffer.from(fileBuffer));
        text = pdfData.text;
      } else if (doc.source) {
        // URL-ingested .txt file
        text = new TextDecoder().decode(fileBuffer);
      } else {
        throw new Error(`Unknown file type: ${doc.fileType}`);
      }

      // Chunk text
      const chunks = await chunkText(text);

      // Generate embeddings (batch API call)
      const embeddings = await generateEmbeddings(chunks);

      // Insert to Supabase
      await insertDocument(doc, chunks, embeddings);

      processed++;
      console.log(`✅ ${doc.fileName} (${processed}/${approvedDocs.length})`);

    } catch (error) {
      failed++;
      console.error(`❌ Failed to process ${doc.fileName}:`, error);
    }
  }

  console.log(`\nMigration complete!`);
  console.log(`Processed: ${processed}`);
  console.log(`Failed: ${failed}`);
}

// Run migration
migrateAllDocuments().catch(console.error);
```

**Run migration**:
```bash
# Test on 10 documents first
npm run migrate:supabase -- --limit 10

# Run full migration
npm run migrate:supabase
```

**Expected time**: 2-3 hours for 241 documents (API rate limits + processing)

---

### Phase 2: Update API Routes (1-2 hours)

#### 2.1 Create Supabase Query Function

**File**: `lib/supabase-rag.ts` (add to existing)

```typescript
// Vector search with quality tier filtering
export async function searchCorpus(
  query: string,
  options: {
    qualityTierMax?: number; // Only retrieve docs with tier <= this
    track?: string; // Filter by track
    limit?: number; // Number of chunks to return
  } = {}
): Promise<Array<{ chunk: any; document: any; score: number }>> {
  const { qualityTierMax = 4, track, limit = 10 } = options;

  // Generate query embedding
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;

  // Build query
  let rpcQuery = supabase.rpc('search_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: 0.5, // Minimum similarity
    match_count: limit,
    quality_tier_max: qualityTierMax,
  });

  if (track) {
    rpcQuery = rpcQuery.eq('track', track);
  }

  const { data, error } = await rpcQuery;

  if (error) throw error;

  return data;
}
```

**Create RPC function in Supabase**:
```sql
CREATE OR REPLACE FUNCTION search_chunks(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  quality_tier_max INT
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  text TEXT,
  page_number INT,
  score FLOAT,
  citation_key TEXT,
  title TEXT,
  quality_tier INT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS chunk_id,
    c.document_id,
    c.text,
    c.page_number,
    1 - (c.embedding <=> query_embedding) AS score,
    d.citation_key,
    d.title,
    d.quality_tier
  FROM chunks c
  JOIN documents d ON c.document_id = d.id
  WHERE d.status = 'approved'
    AND d.quality_tier <= quality_tier_max
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

#### 2.2 Create New API Endpoint

**File**: `app/api/summary-v2/route.ts` (new endpoint for A/B testing)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { searchCorpus } from "@/lib/supabase-rag";
import { checkRateLimit, getClientIdentifier, rateLimitPresets } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req);
    const rateLimitCheck = await checkRateLimit(identifier, rateLimitPresets.summary);
    if (!rateLimitCheck.allowed) {
      return rateLimitCheck.response!;
    }

    const { query } = await req.json();
    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Search corpus with quality tier filtering
    const results = await searchCorpus(query, {
      qualityTierMax: 2, // Prioritize Tier 1+2 sources
      limit: 10,
    });

    // Build context from chunks
    const context = results
      .map((r, idx) =>
        `[${idx + 1}] ${r.document.citation_key}, p.${r.chunk.page_number || 'N/A'}: ${r.chunk.text}`
      )
      .join('\n\n');

    // Build citation map
    const citationMap = new Map();
    results.forEach(r => {
      const key = r.document.citation_key;
      if (!citationMap.has(key)) {
        citationMap.set(key, {
          citationKey: key,
          title: r.document.title,
          pages: new Set(),
        });
      }
      if (r.chunk.page_number) {
        citationMap.get(key).pages.add(r.chunk.page_number);
      }
    });

    // Query Gemini with context
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Context from TRS corpus:\n\n${context}\n\nUser question: ${query}\n\nAnswer using ONLY the context above. Cite sources using [CitationKey, p.#] format.`
            }
          ]
        }
      ],
    });

    const answer = result.text || "";

    // Build citations array
    const citations = Array.from(citationMap.values()).map(c => ({
      citationKey: c.citationKey,
      title: c.title,
      pages: Array.from(c.pages).sort((a, b) => a - b),
    }));

    return NextResponse.json({
      answer,
      citations,
      sourceEngine: 'supabase', // For A/B testing tracking
      resultCount: results.length,
    });

  } catch (error) {
    console.error("Summary V2 API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
```

#### 2.3 Update Upload Pipeline

**File**: `app/api/process-blob/route.ts` (modify to dual-write)

Add function to also insert into Supabase when processing new uploads:

```typescript
// After File Search Store upload (keep as backup)
await uploadToFileSearchStore(blobUrl, fileName);

// Also insert to Supabase (new primary)
const text = await extractText(blobBuffer);
const chunks = await chunkText(text);
const embeddings = await generateEmbeddings(chunks);
await insertDocument(metadata, chunks, embeddings);
```

---

### Phase 3: A/B Testing Setup (30 min)

#### 3.1 Add Toggle in Browse Query Agent

**File**: `components/agents/browse-query-agent.tsx`

```typescript
const [useSupabase, setUseSupabase] = useState(false);

// In UI, add toggle:
<div className="flex items-center gap-2">
  <Switch
    checked={useSupabase}
    onCheckedChange={setUseSupabase}
  />
  <label>Use Supabase RAG (experimental)</label>
</div>

// In query function:
const endpoint = useSupabase ? '/api/summary-v2' : '/api/summary';
```

#### 3.2 Track Comparison Metrics

Add logging to compare:
- Response quality (manual assessment)
- Citation accuracy
- Response time
- Retrieved chunk relevance

**Example test queries**:
1. "What is the Shusa system?"
2. "Find examples of PE tooling from the 1990s"
3. "Compare TPS implementations at NUMMI vs Toyota Japan"
4. "What role did Kiichiro Toyoda play in developing JIT?"

**Metrics to track**:
```
Query: "What is the Shusa system?"

Google File Search Store:
- Response time: 2.3s
- Citations: [Fujimoto2007, p.5; History2012]
- Chunk count: 8
- Quality: ⭐⭐⭐⭐ (good, but some Tier 3 sources)

Supabase (Tier 1+2 only):
- Response time: 1.8s
- Citations: [Fujimoto2007, p.5, 12; Clark1991, p.30]
- Chunk count: 6
- Quality: ⭐⭐⭐⭐⭐ (excellent, only authoritative sources)
```

---

### Phase 4: Validation & Cutover (1 hour)

#### 4.1 Validation Checklist

- [ ] All 241 documents migrated successfully
- [ ] Chunk counts match expected (verify sample)
- [ ] Embeddings generated correctly (spot check similarity)
- [ ] Citation extraction works (test 10 queries)
- [ ] Quality tier filtering works (compare Tier 1+2 vs All)
- [ ] Performance acceptable (response time < 3s)
- [ ] A/B testing shows equal or better results

#### 4.2 Gradual Cutover

**Week 1**: A/B testing (manual toggle)
- Keep Google as default
- Test Supabase with toggle
- Compare results

**Week 2**: Supabase as default (if validation passes)
- Make Supabase default in UI
- Keep Google as fallback option
- Monitor error rates

**Week 3**: Google deprecation (if Supabase stable)
- Remove Google File Search Store upload from new documents
- Keep existing data as read-only backup
- Update docs

**Week 4**: Full cutover
- Remove Google integration entirely (or keep as emergency backup)
- Supabase is primary RAG system

---

## Cost Analysis

### One-Time Migration Costs

**Embedding generation**:
- 241 documents × ~50 pages × ~1000 tokens/page = ~12M tokens
- OpenAI text-embedding-3-small: $0.02 per 1M tokens
- **Total: ~$0.24**

**Time investment**:
- 4-6 hours total (mostly scripting + validation)

### Ongoing Costs

**Supabase** (already paying $25/month):
- Pro plan includes unlimited databases
- Sufficient for TRS use case (241 docs, low query volume)
- No additional cost

**OpenAI API** (new expense):
- Embeddings for new uploads: ~$0.01 per 50-page PDF
- Expected: ~5 uploads/month = ~$0.05/month
- Negligible

**Vercel Blob** (unchanged):
- Continue storing original files
- ~$0.10/GB stored

**Redis** (included in Vercel):
- Keep for rate limiting (or migrate to PostgreSQL)
- No additional cost

**Total incremental cost**: ~$0.05/month (negligible)

---

## Benefits vs. Tradeoffs

### Benefits

**1. Citation Reliability** ⭐⭐⭐⭐⭐
- Clean foreign keys: `chunk.document_id → document.citation_key`
- No fragile string parsing (fileId matching eliminated)
- 100% reliable citation extraction

**2. Quality Tier Filtering** ⭐⭐⭐⭐⭐
- SQL: `WHERE quality_tier <= 2` (only Tier 1+2 sources)
- Eliminates timeline/background noise
- Big quality improvement for research use case

**3. Transparency & Debugging** ⭐⭐⭐⭐⭐
- Inspect chunks: `SELECT * FROM chunks WHERE document_id = ...`
- View embeddings, similarity scores
- Debug bad retrieval easily

**4. Future Advanced Features** ⭐⭐⭐⭐
- Hybrid search (semantic + keyword)
- Reranking (Cohere, Voyage)
- Custom metadata filtering
- Cross-document references

**5. No Vendor Lock-in** ⭐⭐⭐⭐
- Industry-standard PostgreSQL + pgvector
- Can migrate to self-hosted, AWS RDS, etc.
- Not dependent on Google's API changes

**6. Professional Architecture** ⭐⭐⭐⭐
- Clean database design
- Standard SQL queries
- Easier to maintain and extend

### Tradeoffs

**1. Migration Effort** ⚠️
- 4-6 hours of work
- Full corpus re-processing required
- Risk of migration bugs

**2. Complexity** ⚠️
- More moving parts (chunking, embedding, querying)
- Need to understand pgvector
- Requires OpenAI API key

**3. Answer Quality** ⚠️
- Expected improvement: 10-20% (not revolutionary)
- Biggest wins are infrastructure, not output quality
- May not be worth it if current system "good enough"

**4. Ongoing Maintenance** ⚠️
- OpenAI API dependency (embeddings)
- Need to monitor embedding costs
- PostgreSQL query optimization

---

## Implementation Timeline

### Week 0: Preparation (Before Starting)
- Review this plan
- Decide on migration date
- Set up Supabase database
- Add OpenAI API key to env vars

### Week 1: Migration
**Day 1** (2 hours):
- Create Supabase tables
- Write migration script
- Test on 10 documents

**Day 2** (2 hours):
- Run full migration (241 documents)
- Validate data integrity
- Create new API endpoint

**Day 3** (1 hour):
- Add A/B testing toggle
- Test both systems side-by-side

### Week 2: Validation
- Use both systems for all queries
- Compare results manually
- Track metrics (quality, speed, citations)
- Identify any issues

### Week 3: Decision Point
**Option A: Cutover to Supabase**
- Make Supabase default
- Keep Google as backup
- Monitor for issues

**Option B: Stay with Google**
- If quality improvement not worth effort
- Keep Supabase as backup for future
- Continue with fileId citation workaround

### Week 4: Finalize
- Remove fallback system (if stable)
- Update documentation
- Archive migration scripts

---

## A/B Testing Plan

### Test Queries (Representative Sample)

**1. Basic Fact Retrieval**
- "What is the Shusa system?"
- "When was NUMMI founded?"
- Expected: Both systems should perform equally

**2. Quality Tier Filtering** (Supabase advantage)
- "Find authoritative sources on PE tooling from ex-Toyota experts"
- Query Supabase with `qualityTierMax: 1`
- Expected: Supabase returns only Tier 1 sources, Google mixes tiers

**3. Complex Multi-Document**
- "Compare TPS implementations at NUMMI vs Toyota Japan"
- Expected: Both should retrieve relevant chunks

**4. Specific Examples** (critical test)
- "Find examples of kaizen events in PE from the 1990s"
- Expected: Supabase with tier filtering should surface better sources

**5. Timeline/Historical** (Google disadvantage)
- "What role did Kiichiro Toyoda play in developing JIT?"
- Expected: Google may return Tier 4 timelines, Supabase focuses on Tier 1+2

### Metrics to Compare

| Metric | Google | Supabase | Winner |
|--------|--------|----------|--------|
| Response time | 2.3s avg | 1.8s avg | ? |
| Citation accuracy | Fragile (fileId) | Reliable (FK) | ✅ Supabase |
| Quality tier control | None | SQL filtering | ✅ Supabase |
| Answer quality | Baseline | +10-20%? | ? |
| Transparency | Black box | Full visibility | ✅ Supabase |
| Maintenance | Opaque errors | Debug queries | ✅ Supabase |

### Decision Criteria

**Migrate to Supabase if:**
- ✅ Answer quality equal or better (measured across 20+ queries)
- ✅ Citations 100% reliable (no matching failures)
- ✅ Quality tier filtering provides clear benefit
- ✅ Response time acceptable (< 3s avg)
- ✅ No major bugs during validation week

**Stay with Google if:**
- ❌ Answer quality worse (surprising, but possible)
- ❌ Migration introduces too many bugs
- ❌ Performance unacceptable
- ❌ Effort not worth 10-20% improvement

---

## Backup & Rollback Strategy

### Keep Google File Search Store as Backup

**Why:**
- Zero-cost insurance policy
- Can A/B test indefinitely
- Instant rollback if Supabase issues

**How:**
1. Don't delete File Search Store data
2. Keep `/api/summary` endpoint (Google) working
3. Add toggle in UI to switch between systems
4. Monitor both for 2-4 weeks

**Rollback procedure** (if Supabase fails):
1. Toggle UI back to Google
2. Investigate Supabase issue
3. Fix and re-test
4. Try again when stable

**Long-term:**
- After 1 month of stable Supabase: Stop uploading to Google (saves API calls)
- After 3 months: Deprecate Google endpoint entirely
- After 6 months: Delete File Search Store data (if confident)

---

## Open Questions

### 1. Chunking Strategy
**Current plan**: 500 tokens, 50 overlap (matches Google)

**Alternatives to consider:**
- Semantic chunking (chunk by section headings, not fixed tokens)
- Sentence-boundary chunking (respect sentence structure)
- Larger chunks (1000 tokens) with more overlap (100 tokens)

**Decision**: Start with 500/50, optimize later if needed

### 2. Embedding Model
**Current plan**: OpenAI text-embedding-3-small ($0.02/1M tokens)

**Alternatives:**
- text-embedding-3-large (better quality, 10x cost)
- Cohere embed-english-v3.0 (comparable quality)
- Voyage voyage-2 (specialized for retrieval)

**Decision**: Start with text-embedding-3-small, A/B test others if quality insufficient

### 3. Reranking
**Current plan**: No reranking (pgvector cosine similarity only)

**Future enhancement:**
- Add Cohere rerank after retrieval
- Re-score top 20 chunks, return top 10
- Improves relevance for complex queries

**Decision**: Implement in Phase 2 if A/B testing shows quality issues

### 4. Rate Limiting
**Current plan**: Keep Redis for rate limiting

**Alternative:** Migrate to PostgreSQL
```sql
CREATE TABLE rate_limits (
  identifier TEXT,
  endpoint TEXT,
  count INTEGER,
  window_start TIMESTAMP
);
```

**Decision**: Keep Redis (optimized for this use case, existing code works)

---

## Success Criteria

**Migration is successful if:**

1. ✅ All 241 documents migrated without data loss
2. ✅ Citations 100% reliable (no fileId matching failures)
3. ✅ Quality tier filtering works (SQL: `WHERE quality_tier <= 2`)
4. ✅ Answer quality equal or better (measured across 20+ test queries)
5. ✅ Response time < 3s average
6. ✅ No critical bugs during 2-week validation period
7. ✅ User satisfied with results (A/B testing confirms improvement)

**Migration is a failure if:**

1. ❌ Data loss or corruption during migration
2. ❌ Answer quality worse than Google
3. ❌ Performance unacceptable (>5s response time)
4. ❌ Critical bugs that can't be fixed quickly
5. ❌ Effort/complexity not worth 10-20% quality gain

---

## Next Steps

**Before starting migration (~1 week from now):**

1. ✅ Review this plan
2. ✅ Decide if benefits worth effort (4-6 hours + ongoing maintenance)
3. ✅ Set up Supabase database (or confirm existing DB can be used)
4. ✅ Add OpenAI API key to environment
5. ✅ Schedule migration window (low-traffic time)

**Day of migration:**

1. Run migration script (test on 10 docs first!)
2. Validate data integrity
3. Create new API endpoint
4. Add A/B testing toggle
5. Test both systems side-by-side

**Post-migration:**

1. Use A/B testing for 1-2 weeks
2. Compare quality, speed, citations
3. Decide: Cutover to Supabase OR stay with Google
4. Update documentation

---

## Conclusion

**Bottom line:**
- Migration is feasible (4-6 hours, ~$0.15 cost)
- Benefits: Better architecture, citation reliability, quality tier filtering
- Tradeoffs: Effort, complexity, modest quality improvement (10-20%)
- Strategy: Keep Google as backup, A/B test, gradual cutover

**Recommendation:**
- Proceed with migration if you value:
  - Citation reliability (fragile fileId matching eliminated)
  - Quality tier filtering (big win for research)
  - Transparency and control (debugging, optimization)
  - Professional architecture (no vendor lock-in)

- Stay with Google if:
  - Current quality "good enough" for now
  - 4-6 hours effort not worth 10-20% improvement
  - Prefer simplicity over control
  - fileId citation workaround acceptable

**Decision point:** Review in ~1 week, decide based on priorities and available time.

---

**Document created**: 2025-01-19
**Status**: Planning phase
**Next review**: TBD (~1 week)
