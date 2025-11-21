# Supabase Migration Plan - TRS Parallel RAG System

**Date**: 2025-01-20 (Session 24)
**Status**: READY FOR IMPLEMENTATION
**Approach**: Parallel systems with UI toggles (keep File Search + add Supabase)

---

## Executive Summary

### What We're Building
- **Parallel RAG system** running File Search and Supabase side-by-side
- **UI toggles** for upload (choose storage) and query (choose backend)
- **Manual upload workflow** - User uploads 20-40 docs to Supabase for testing
- **Empirical quality comparison** before committing long-term

### Key Technical Decisions (Based on Nov 2025 Research)

**Embedding Model**: Google gemini-embedding-001
- **Why**: SOTA multilingual (68.3 MTEB), better for English+Japanese corpus
- **Dimensions**: 1536 (safe middle ground, 98-99% performance)
- **Rationale**: Matryoshka embeddings - 1536 retains nearly all semantic nuance while being more efficient
- **Cost**: ~$0.30 for 241 docs (negligible)

**Architecture**: Supabase PostgreSQL + pgvector
- **Why**: Direct foreign keys, no fragile string parsing, full transparency
- **Storage**: Parallel to File Search (not replacing)
- **Citations**: Clean SQL joins, no fileId matching gymnastics

**Migration Strategy**: Phased, manual upload
- **Phase 1**: Supabase infrastructure setup
- **Phase 2**: Backend API routes (dual-path)
- **Phase 3**: UI toggles (upload + query)
- **Phase 4**: User uploads 20-40 docs, tests quality

---

## Background & Research Findings

### Why Consider Migration?

**Current System** (Google File Search Store):
- ✅ Works well, 241 documents indexed
- ✅ Citations working (via fileId matching workaround)
- ❌ **Fragile architecture**: String parsing to match chunks to documents
- ❌ **Opaque system**: No control over chunk metadata
- ❌ **Vendor lock-in**: Can't extract data, limited debugging

**Supabase Alternative**:
- ✅ **Direct foreign keys**: `chunks.document_id → documents.id`
- ✅ **Full transparency**: SQL queries, visible data
- ✅ **Flexibility**: Custom filtering, complex queries
- ✅ **Industry standard**: PostgreSQL + pgvector
- ✅ **Better debugging**: pgAdmin, SQL console

### Cross-Verification Research (Nov 2025)

**Methodology**: Verified migration assumptions with both OpenAI and Gemini

#### Finding 1: Gemini Embedding Model (Not text-embedding-004)
- **Current flagship**: gemini-embedding-001 (July 2025 release)
- **Performance**: 68.3 MTEB Multilingual (SOTA)
- **Comparison**: Beats OpenAI on multilingual benchmarks
- **Relevance**: TRS corpus is English + Japanese technical terms

#### Finding 2: No "Gemini 3.0 Embedding"
- Gemini 3.0 = generation models (Pro/Flash) only
- Embedding models = separate product line
- gemini-embedding-001 is current best

#### Finding 3: Experimental Design Matters
- **Critical insight** (from Gemini verification): Changing architecture AND embedding model simultaneously = two-variable problem
- **Better approach**: Test same embeddings in different architectures first
- **This plan**: Uses Gemini embeddings in both systems → isolates architecture effect

#### Finding 4: Cost is Negligible
- OpenAI 3-small: $0.12 (241 docs)
- OpenAI 3-large: $0.78 (241 docs)
- Gemini embedding-001: ~$0.60 (241 docs)
- **Conclusion**: Optimize for quality, not cost (<$1 difference)

#### Finding 5: Japanese Performance
- OpenAI: Good multilingual, English-focused training
- Gemini: Excellent multilingual, explicit Japanese optimization
- **For Toyota technical terms**: Gemini likely better

---

## Architecture Overview

### Three-Layer Storage (Unchanged from File Search Architecture)

**Layer 1: Vercel Blob** (unchanged)
- Original PDFs and text files
- Permanent storage for downloads
- Referenced by both File Search and Supabase

**Layer 2: Vector Storage** (DUAL SYSTEMS)
- **Option A**: File Search Store (current, 241 docs)
- **Option B**: Supabase pgvector (new, user uploads subset)
- Both index same content from Blob

**Layer 3: Redis (KV)** (enhanced)
- Metadata for all documents
- Add `storageBackend` field: 'file_search' | 'supabase'
- Approval workflow unchanged

### Data Flow Comparison

**File Search Path** (current):
```
Upload → Blob → File Search Store → Redis metadata
Query → Redis (which docs?) → File Search tool → Gemini → Citations (fileId matching)
```

**Supabase Path** (new):
```
Upload → Blob → Supabase (chunk + embed) → Redis metadata
Query → Redis (which docs?) → Supabase (similarity search) → Gemini → Citations (SQL join)
```

---

## Database Schema Design

### Supabase Tables

#### `documents` Table
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metadata
  title TEXT NOT NULL,
  citation_key TEXT NOT NULL UNIQUE, -- e.g., 'Yoshino1985'
  authors TEXT[],
  year INTEGER,
  track TEXT, -- PD, PE, TPS, Cross-Cutting, History
  summary TEXT,
  keywords TEXT[],

  -- Quality classification
  quality_tier INTEGER CHECK (quality_tier BETWEEN 1 AND 4),
  tier_label TEXT,

  -- Storage references
  blob_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT,

  -- Source tracking
  source_url TEXT, -- For URL-ingested documents

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_citation_key ON documents(citation_key);
CREATE INDEX idx_documents_track ON documents(track);
CREATE INDEX idx_documents_quality_tier ON documents(quality_tier);
```

#### `chunks` Table
```sql
CREATE TABLE chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key relationship (NO STRING PARSING NEEDED!)
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Chunk content
  text TEXT NOT NULL,
  page_number INTEGER, -- Extracted from PDF
  chunk_index INTEGER, -- Position within document

  -- Vector embedding (1536 dimensions for gemini-embedding-001)
  embedding VECTOR(1536) NOT NULL,

  -- Metadata for retrieval
  token_count INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chunks_document_id ON chunks(document_id);
CREATE INDEX idx_chunks_page_number ON chunks(page_number);

-- Vector similarity search index (HNSW for fast approximate search)
CREATE INDEX idx_chunks_embedding ON chunks
USING hnsw (embedding vector_cosine_ops);
```

### Similarity Search Function

```sql
CREATE OR REPLACE FUNCTION search_chunks(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_quality_tiers INT[] DEFAULT NULL
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  citation_key TEXT,
  title TEXT,
  page_number INTEGER,
  text TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS chunk_id,
    c.document_id,
    d.citation_key,
    d.title,
    c.page_number,
    c.text,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM chunks c
  JOIN documents d ON c.document_id = d.id
  WHERE
    (filter_quality_tiers IS NULL OR d.quality_tier = ANY(filter_quality_tiers))
    AND (1 - (c.embedding <=> query_embedding)) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## Phased Implementation Plan

### Phase 1: Supabase Infrastructure Setup
**Goal**: Create database, test connection
**Estimated Time**: 1-2 hours

#### Tasks:
1. **Create Supabase Project**
   - Log into Supabase dashboard
   - Create new project: "TRS"
   - Region: Choose closest to user
   - Note project URL and API keys

2. **Environment Variables**
   Add to `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
   SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
   ```

3. **Database Setup**
   - Enable pgvector extension:
     ```sql
     CREATE EXTENSION IF NOT EXISTS vector;
     ```
   - Create `documents` table (schema above)
   - Create `chunks` table (schema above)
   - Create `search_chunks` function (SQL above)

4. **Install Dependencies**
   ```bash
   npm install @supabase/supabase-js
   ```

5. **Create Supabase Client**
   New file: `lib/supabase-client.ts`
   ```typescript
   import { createClient } from '@supabase/supabase-js';

   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
   const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

   export const supabase = createClient(supabaseUrl, supabaseKey);
   ```

6. **Test Connection**
   Create simple test script to verify:
   - Connection works
   - Can insert test document
   - Can query with pgvector
   - Delete test data

#### Deliverable:
- ✅ Supabase project created
- ✅ Database schema deployed
- ✅ Connection tested and working
- ✅ Ready for Phase 2

---

### Phase 2: Backend API Integration
**Goal**: Add Supabase storage path to APIs
**Estimated Time**: 2-3 hours

#### Tasks:

**1. Create RAG Functions** (`lib/supabase-rag.ts`)

Key functions needed:
- `chunkText(text: string)` - Split into 500-token chunks with 50-token overlap
- `generateEmbedding(text: string)` - Call gemini-embedding-001 API (1536d)
- `storeDocument(metadata, chunks)` - Insert into Supabase
- `searchSimilarChunks(queryEmbedding, filters)` - Call search_chunks function
- `extractCitations(chunks)` - Build citation list from SQL results (EASY!)

Example:
```typescript
export async function generateEmbedding(text: string): Promise<number[]> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'embedding-001' });

  const result = await model.embedContent({
    content: text,
    taskType: 'RETRIEVAL_DOCUMENT',
    outputDimensionality: 1536
  });

  return result.embedding.values;
}

export async function storeDocument(
  metadata: DocumentMetadata,
  blobUrl: string,
  pdfText: string
) {
  // 1. Insert document
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({
      title: metadata.title,
      citation_key: metadata.citationKey,
      authors: metadata.authors,
      year: metadata.year,
      track: metadata.track,
      summary: metadata.summary,
      keywords: metadata.keywords,
      quality_tier: metadata.qualityTier,
      tier_label: metadata.tierLabel,
      blob_url: blobUrl,
      file_name: metadata.fileName,
      source_url: metadata.source
    })
    .select()
    .single();

  if (docError) throw docError;

  // 2. Chunk text
  const chunks = chunkText(pdfText);

  // 3. Generate embeddings & store chunks
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await generateEmbedding(chunk.text);

    await supabase.from('chunks').insert({
      document_id: doc.id,
      text: chunk.text,
      page_number: chunk.pageNumber,
      chunk_index: i,
      embedding: embedding,
      token_count: chunk.tokenCount
    });
  }

  return doc.id;
}

export async function searchCorpus(
  query: string,
  qualityTiers?: number[]
): Promise<SearchResult[]> {
  // 1. Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // 2. Search similar chunks
  const { data: results, error } = await supabase.rpc('search_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: 10,
    filter_quality_tiers: qualityTiers
  });

  if (error) throw error;

  // 3. Build citations (EASY! Direct from SQL results)
  return results.map(r => ({
    chunkId: r.chunk_id,
    documentId: r.document_id,
    citationKey: r.citation_key, // Already available!
    title: r.title,
    pageNumber: r.page_number,
    text: r.text,
    similarity: r.similarity
  }));
}
```

**2. Update Upload API** (`/api/process-blob/route.ts`)

Add `backend` parameter:
```typescript
export async function POST(request: Request) {
  const formData = await request.formData();
  const blobUrl = formData.get('blobUrl') as string;
  const backend = formData.get('backend') as string || 'file_search';

  // ... existing code for metadata extraction ...

  if (backend === 'supabase') {
    // NEW PATH
    const documentId = await storeDocument(metadata, blobUrl, pdfText);
    await storeMetadataInRedis({ ...metadata, storageBackend: 'supabase' });
  } else {
    // EXISTING FILE SEARCH PATH (unchanged)
    const fileSearchResult = await uploadToFileSearchStore(blobUrl);
    await storeMetadataInRedis({ ...metadata, storageBackend: 'file_search' });
  }

  return Response.json({ success: true });
}
```

**3. Update URL Processing** (`/api/process-url/route.ts`)

Same dual-path logic as process-blob

**4. Update Query API** (`/api/summary/route.ts`)

Add `backend` parameter:
```typescript
export async function POST(request: Request) {
  const { query, history, backend = 'file_search' } = await request.json();

  if (backend === 'supabase') {
    // NEW PATH
    const chunks = await searchCorpus(query);

    // Build context from chunks
    const context = chunks.map(c =>
      `[${c.citationKey}, p.${c.pageNumber}]\n${c.text}`
    ).join('\n\n');

    // Query Gemini with context (no File Search tool)
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: query }] }],
      systemInstruction: `Answer using this context:\n\n${context}`
    });

    // Citations already extracted from SQL results!
    const citations = chunks.map(c => ({
      citationKey: c.citationKey,
      title: c.title,
      pageNumber: c.pageNumber,
      excerpt: c.text.substring(0, 200)
    }));

    return Response.json({
      answer: result.text,
      citations,
      backend: 'supabase'
    });
  } else {
    // EXISTING FILE SEARCH PATH (unchanged)
    // ... current code ...
  }
}
```

#### Deliverable:
- ✅ Dual-path APIs working
- ✅ Can upload to either backend
- ✅ Can query either backend
- ✅ Citations working via SQL (no string parsing!)

---

### Phase 3: UI Toggles
**Goal**: User controls for backend selection
**Estimated Time**: 1-2 hours

#### Tasks:

**1. Upload Agent Toggle** (`components/agents/upload-agent.tsx`)

Add storage backend selector:
```tsx
// In UploadSection component
<div className="mb-4">
  <Label>Storage Backend</Label>
  <RadioGroup value={storageBackend} onValueChange={setStorageBackend}>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="file_search" id="file_search" />
      <Label htmlFor="file_search">
        File Search Store (Current - 241 docs)
      </Label>
    </div>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="supabase" id="supabase" />
      <Label htmlFor="supabase">
        Supabase (Testing - PostgreSQL + pgvector)
      </Label>
    </div>
  </RadioGroup>
  <p className="text-sm text-muted-foreground mt-2">
    Choose where to store this document. Select Supabase to test the new system.
  </p>
</div>
```

Pass to API:
```tsx
const handleUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('blobUrl', blobUrl);
  formData.append('backend', storageBackend); // NEW

  const response = await fetch('/api/process-blob', {
    method: 'POST',
    body: formData
  });
};
```

Show backend in Pending Review:
```tsx
<Badge variant={doc.storageBackend === 'supabase' ? 'default' : 'secondary'}>
  {doc.storageBackend === 'supabase' ? 'Supabase' : 'File Search'}
</Badge>
```

**2. Query Corpus Toggle** (`components/agents/browse-query-agent.tsx`)

Add backend selector:
```tsx
<div className="mb-4">
  <Label>Query Backend</Label>
  <Select value={queryBackend} onValueChange={setQueryBackend}>
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="file_search">
        File Search Store (241 documents)
      </SelectItem>
      <SelectItem value="supabase">
        Supabase PostgreSQL (Testing subset)
      </SelectItem>
    </SelectContent>
  </Select>
  <p className="text-sm text-muted-foreground mt-2">
    Test the same query on both backends to compare quality.
  </p>
</div>
```

Pass to API:
```tsx
const response = await fetch('/api/summary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query,
    history,
    backend: queryBackend // NEW
  })
});
```

Show active backend in results:
```tsx
<div className="text-sm text-muted-foreground mb-2">
  Results from: <Badge>{backend === 'supabase' ? 'Supabase' : 'File Search'}</Badge>
</div>
```

**3. Browse Agent Indicators** (`components/agents/browse-query-agent.tsx`)

Add backend column/badge:
```tsx
<Badge variant={doc.storageBackend === 'supabase' ? 'default' : 'secondary'}>
  {doc.storageBackend === 'supabase' ? 'Supabase' : 'File Search'}
</Badge>
```

Optional: Filter by backend
```tsx
<Select value={filterBackend} onValueChange={setFilterBackend}>
  <SelectItem value="all">All Backends</SelectItem>
  <SelectItem value="file_search">File Search Only</SelectItem>
  <SelectItem value="supabase">Supabase Only</SelectItem>
</Select>
```

#### Deliverable:
- ✅ Upload backend selection working
- ✅ Query backend selection working
- ✅ Backend indicators in Browse tab
- ✅ User can test both systems side-by-side

---

### Phase 4: User Testing
**Goal**: Manual upload subset, compare quality
**Estimated Time**: User-paced

#### Process:

**1. Upload Test Documents (User Action)**
- Select 20-40 representative documents from corpus
- Upload via Upload Agent with "Supabase" backend selected
- Approve and classify (same workflow)

**2. Comparative Testing (User Action)**

For each test query:
- Run query with "File Search" backend
- Run same query with "Supabase" backend
- Compare side-by-side

Evaluation criteria:
- **Retrieval Relevance**: Did it find the right chunks?
- **Answer Quality**: Factually accurate? Well-grounded?
- **Citation Quality**: Proper format? Correct sources?
- **Japanese Performance**: Handles Toyota terms well?

**3. Decision Matrix**

| Scenario | Outcome | Decision |
|----------|---------|----------|
| Supabase clearly better | Quality + citations improved | Full migration: Upload all 241 docs to Supabase, deprecate File Search |
| About the same | Similar quality, better citations | Keep Supabase for better architecture, gradual migration |
| File Search better | Current system sufficient | Keep File Search, delete Supabase project, save $10/month |

#### Deliverable:
- Empirical data on quality differences
- Clear decision on long-term architecture
- No regrets - tested before committing

---

## Cost Analysis

### One-Time Costs

**Embedding Generation** (for 241 documents):
- Text extraction: ~6M tokens × $0 (already paid via Blob storage)
- Gemini embedding-001 (1536d): ~6M tokens × $0.05/1M = **$0.30**
- **Total one-time**: ~$0.30

### Monthly Costs

**Supabase**:
- Pro plan base: $25/month (already paying)
- TRS project: $10/month (Micro compute)
- **Total Supabase**: $35/month

**If keep both systems running**:
- Supabase: $35/month
- File Search Store: $0 (free tier sufficient)
- Vercel Blob: ~$5/month (existing)
- Vercel KV (Redis): ~$5/month (existing)
- **Total during testing**: ~$45/month

**After decision**:
- If migrate to Supabase: $35/month (delete File Search)
- If keep File Search: $25/month (delete Supabase)

### Cost Comparison to Pre-Cleanup

**Before Session 23**: $85/month (orphaned Supabase projects)
**After cleanup**: $55/month (3 active projects)
**With TRS on Supabase**: $65/month (still $20/month cheaper!)

---

## Technical Specifications

### Embedding Configuration

**Model**: gemini-embedding-001
**Dimensions**: 1536 (safe middle ground)
**Rationale**:
- Matryoshka Representation Learning: First 1536 dims retain 98-99% of semantic information
- Balances nuance (technical Toyota terms) with efficiency
- Same dimensionality as OpenAI text-embedding-3-small

**API Call**:
```typescript
const model = genAI.getGenerativeModel({ model: 'embedding-001' });
const result = await model.embedContent({
  content: text,
  taskType: 'RETRIEVAL_DOCUMENT', // vs RETRIEVAL_QUERY for queries
  outputDimensionality: 1536 // Recommended: 768, 1536, or 3072
});
```

**Why 1536 over 768 or 3072**:
- **768**: 95-98% performance, very efficient (good for general content)
- **1536**: 98-99% performance, excellent for technical content ⭐ **CHOSEN**
- **3072**: 100% performance, maximum nuance (overkill for most cases)

### Chunking Strategy

**Match File Search Store settings**:
- **Chunk size**: 500 tokens
- **Overlap**: 50 tokens
- **Page tracking**: Extract from `--- PAGE X ---` markers in PDF text

Example:
```typescript
function chunkText(text: string): Chunk[] {
  const chunks: Chunk[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);

  let currentChunk = '';
  let tokenCount = 0;
  let currentPage = 1;

  for (const sentence of sentences) {
    // Check for page markers
    const pageMatch = sentence.match(/---\s*PAGE\s+(\d+)\s*---/);
    if (pageMatch) {
      currentPage = parseInt(pageMatch[1]);
      continue;
    }

    const sentenceTokens = estimateTokens(sentence);

    if (tokenCount + sentenceTokens > 500 && currentChunk.length > 0) {
      // Save chunk
      chunks.push({
        text: currentChunk,
        pageNumber: currentPage,
        tokenCount: tokenCount
      });

      // Start new chunk with overlap
      const overlapText = getLastNTokens(currentChunk, 50);
      currentChunk = overlapText + sentence;
      tokenCount = 50 + sentenceTokens;
    } else {
      currentChunk += sentence + ' ';
      tokenCount += sentenceTokens;
    }
  }

  // Save final chunk
  if (currentChunk.length > 0) {
    chunks.push({
      text: currentChunk,
      pageNumber: currentPage,
      tokenCount: tokenCount
    });
  }

  return chunks;
}
```

### Citation Extraction

**With Supabase (CLEAN!)**:
```typescript
// Results already have citation_key from SQL join!
function extractCitations(searchResults: SearchResult[]): Citation[] {
  return searchResults.map(result => ({
    citationKey: result.citation_key, // Direct from database
    title: result.title,              // Direct from database
    pageNumber: result.page_number,   // Direct from database
    excerpt: result.text.substring(0, 200),
    similarity: result.similarity
  }));
}

// Format for display
function formatCitation(citation: Citation): string {
  return `[${citation.citationKey}, p.${citation.pageNumber}]`;
}
```

**Compare to File Search (FRAGILE)**:
```typescript
// Current workaround - string parsing and matching
const normalizedTitle = chunkTitle.replace(/-/g, '').replace(/\./g, '');
const matchedDoc = approvedDocs.find(doc => {
  return doc.fileId && doc.fileId.includes(normalizedTitle);
});
// Fragile! Depends on Google's fileId format
```

---

## Risk Assessment & Mitigation

### Risk 1: Supabase Quality Worse Than File Search
**Likelihood**: Low (Gemini embeddings are SOTA multilingual)
**Impact**: Medium (wasted development time)
**Mitigation**: Phase 4 testing with 20-40 docs BEFORE full migration
**Rollback**: Keep File Search running, delete Supabase project

### Risk 2: Japanese Technical Terms Not Handled Well
**Likelihood**: Low (Gemini optimized for multilingual)
**Impact**: Medium (defeats purpose of upgrade)
**Mitigation**: Test specifically with Toyota terms during Phase 4
**Rollback**: Same as Risk 1

### Risk 3: Implementation Bugs/Issues
**Likelihood**: Medium (new code, complex system)
**Impact**: Low (phased approach catches issues early)
**Mitigation**:
- Phase 1: Test connection before building APIs
- Phase 2: Test each API route independently
- Phase 3: Test UI toggles thoroughly
- Phase 4: User validates before full migration

### Risk 4: Cost Overrun
**Likelihood**: Very low (well-defined costs)
**Impact**: Low ($10/month if keep Supabase)
**Mitigation**: Budget already approved ($65/month total)
**Rollback**: Delete Supabase project, lose ~$10 for testing period

### Risk 5: Data Migration Complexity
**Likelihood**: N/A (no automatic migration)
**Impact**: N/A
**Mitigation**: Manual upload of test subset only
**Note**: User correctly identified - can't extract from File Search programmatically

---

## Success Criteria

### Phase 1 Complete When:
- ✅ Supabase project created and accessible
- ✅ Database schema deployed (documents + chunks tables)
- ✅ pgvector extension enabled
- ✅ search_chunks function working
- ✅ Test connection successful

### Phase 2 Complete When:
- ✅ Can upload to Supabase via /api/process-blob
- ✅ Can upload to Supabase via /api/process-url
- ✅ Can query Supabase via /api/summary
- ✅ Citations extracted correctly (SQL join)
- ✅ File Search path still works (unchanged)

### Phase 3 Complete When:
- ✅ Upload Agent shows backend toggle
- ✅ Query Corpus shows backend selector
- ✅ Browse Agent shows backend indicators
- ✅ UI state persists across navigation

### Phase 4 Complete When:
- ✅ User uploaded 20-40 test documents
- ✅ Tested 10+ queries on both backends
- ✅ Quality comparison complete
- ✅ Decision made: keep Supabase, keep File Search, or keep both

### Final Success:
- User satisfied with system architecture
- Citations working reliably
- Quality meets or exceeds File Search
- Transparent, debuggable, maintainable

---

## Timeline Estimate

### Total Development Time: 6-8 hours

**Phase 1**: 1-2 hours (setup and testing)
**Phase 2**: 2-3 hours (API integration)
**Phase 3**: 1-2 hours (UI toggles)
**Phase 4**: User-paced (testing and evaluation)

### Suggested Schedule

**Session 24 (Tonight)**: Phase 1
- Set up Supabase project
- Create database schema
- Test connection
- Deliverable: Working database

**Session 25 (Next available)**: Phase 2
- Implement RAG functions
- Update API routes
- Test dual-path upload/query
- Deliverable: Backend working

**Session 26 (Next available)**: Phase 3
- Add UI toggles
- Test user flow
- Deliverable: Full system working

**Session 27+ (User-paced)**: Phase 4
- User uploads test docs
- User tests queries
- Compare quality
- Make decision

---

## Post-Migration Considerations

### If Supabase Wins (Full Migration)

**Next steps**:
1. Upload remaining 220+ documents to Supabase
2. Update default backend to 'supabase'
3. Deprecate File Search (mark as legacy)
4. Eventually delete File Search Store (after confidence period)

**Benefits**:
- Better architecture
- Cleaner citations
- Full transparency
- Industry-standard tools

### If File Search Wins (Keep Current)

**Next steps**:
1. Delete Supabase project
2. Remove Supabase code (keep in git history)
3. Continue with File Search
4. Accept fileId matching as acceptable

**Benefits**:
- Proven working system
- Lower development complexity
- Save $10/month
- No migration effort

### If Both Have Value (Parallel Long-Term)

**Unlikely, but possible**:
- Keep both for different use cases
- File Search: Managed simplicity
- Supabase: Advanced queries, custom filtering
- Cost: $65/month (still cheaper than pre-cleanup)

---

## Open Questions

1. **Embedding dimensionality**: Confirmed 1536 (safe middle ground, 98-99% performance)
2. **Migration strategy**: Confirmed manual upload (can't extract from File Search)
3. **Timeline**: Confirmed phased approach at user's pace
4. **Cost**: Confirmed $65/month total (approved)
5. **Quality comparison**: To be determined in Phase 4 testing

---

## Conclusion

This plan provides a **low-risk, empirical approach** to evaluating Supabase as an alternative to Google File Search Store.

**Key strengths**:
- ✅ Parallel systems (no data loss)
- ✅ Manual testing before commitment
- ✅ Phased implementation (catch issues early)
- ✅ Clear success criteria
- ✅ Easy rollback if needed

**Expected outcome**:
- Better citations (direct SQL joins vs string parsing)
- Transparent architecture (SQL queries vs opaque File Search)
- Potentially better quality (Gemini embeddings SOTA multilingual)
- Data-driven decision (not assumptions)

**Ready to begin Phase 1 when user is available.**

---

**Last Updated**: 2025-01-20
**Next Session**: Session 24 - Phase 1 Implementation
