# Next Steps

## ✅ COMPLETED: 4/6 Agents Functional

Research, Upload (with images), Browse/Query, and Images agents are complete and deployed!

**Latest**: Session 8 completed Unified Blob Storage - documents + images in one system with smart routing

### What's Working
- ✅ Research Agent - 228 curated terms, targeted search (J-STAGE, Patents, Scholar)
- ✅ Upload Agent - Unified docs+images upload, Vision analysis, Blob storage
- ✅ Browse/Query Agent - Browse with filters + RAG queries with citations
- ✅ Images Agent - Integrated into Upload, Vision API, searchable content
- ✅ Download functionality for all file types
- ✅ Delete flow (Blob + File Search + Redis)
- ✅ Image thumbnails and previews

## Immediate Priorities - Phase 2

### 🔨 NEXT: Session 9 - Debug & Test
- [ ] Debug image type filter (showing 0 results issue)
- [ ] Re-upload test files (24 QC Circle JPEGs + 1 PDF)
- [ ] Test Vision analysis quality (OCR, objects, concepts)
- [ ] Verify downloads and type filter working
- [ ] Begin Brainstorm Agent implementation if time permits

### ✅ COMPLETED: Session 2 (2025-11-12)
- ✅ Documentation standardization to "File Search" terminology
- ✅ RAG strategy documentation added
- ✅ Research terms integration (research_terms.md)
- ✅ Environment setup (.env.local with API key)
- ✅ Build error fixes (Tailwind v4→v3, TypeScript, imports)
- ✅ UI enhancement (professional blue theme, gradient header)

### ✅ COMPLETED: Session 3 - Research Agent V1 (2025-11-12)
- ✅ Cascading dropdown UI (categories → terms)
- ✅ 228 curated Japanese/English terms from research_terms.md
- ✅ Multi-select term picker with search
- ✅ Google Custom Search API integration
- ✅ Web search results display (5 per page)
- ✅ Load More pagination
- ✅ Targeted search buttons (J-STAGE, Patents, Scholar, Google JP)
- ✅ Dual search modes (guided + free-form)
- ✅ Blue theme styling throughout

**Outcome**: Research Agent V1 FUNCTIONING - Successfully found 4 high-quality Japanese articles that regular Google search missed. Bypasses SEO/ad corruption.

### ✅ COMPLETED: Session 3 - Upload Agent Implementation (2025-11-12)
- ✅ Set up `.env.local` with Google AI API key
- ✅ Install PDF/DOCX text extraction libraries (pdf-parse, mammoth)
- ✅ Implement `/api/upload` backend:
  - ✅ Text extraction from PDF/DOCX/TXT
  - ✅ Gemini metadata extraction (real API call)
  - ✅ Upload to File Search (Google Gemini File API)
  - ⏳ Store metadata in Vercel KV (next step)
- ✅ Created text extraction utility (`lib/text-extraction.ts`)
- ✅ Created AI metadata extraction (`lib/metadata-extraction.ts`)
- ✅ Created File Search integration (`lib/file-search.ts`)
- ✅ Updated API route with full pipeline

**Outcome**: Upload pipeline functional - extracts text, generates metadata, uploads to File Search. Documents stored in Google's cloud, ready for RAG queries.

### ✅ COMPLETED: Session 4 - Vercel Deployment & Upload Agent Fix (2025-11-12)

**Vercel Deployment:**
- ✅ Connected GitHub repo to Vercel
- ✅ Deployed to https://trs-mocha.vercel.app
- ✅ Created Vercel Redis database (30MB free tier)
- ✅ Configured environment variables (KV_REDIS_URL, API keys)
- ✅ Switched from @vercel/kv to ioredis (direct Redis connection)

**Upload Agent Fix:**
- ✅ Diagnosed pdf-parse DOMMatrix error in serverless
- ✅ Removed text extraction - Gemini reads PDFs directly
- ✅ Updated metadata extraction to use Gemini file reading API
- ✅ Simplified flow: Upload → Gemini reads → Metadata → Redis
- ✅ Tested in production - Upload working perfectly!

**Outcome**: Upload Agent V1 FULLY FUNCTIONAL in production. Documents upload successfully, Gemini extracts accurate metadata, stored in Redis, displayed in Review Dashboard.

### ✅ COMPLETED: Session 5 - Approve Button & Summary Agent V1 (2025-11-12)

**Approve Button Workflow:**
- ✅ Wired up approve button in Upload Agent
- ✅ Created handleApprove() function with API call
- ✅ Files automatically removed from review dashboard after approval
- ✅ Status updates: pending_review → approved in Redis
- ✅ Tested end-to-end workflow successfully

**Summary Agent V1:**
- ✅ Implemented RAG queries using approved documents from Redis
- ✅ Metadata-based grounding (title, summary, keywords, track, year)
- ✅ Conversation history support (multi-turn dialogues)
- ✅ Citation extraction with `[1]`, `[2]` format
- ✅ Document sidebar showing referenced files
- ✅ Citation cards with excerpts and titles
- ✅ Handles empty corpus gracefully
- ✅ Tested with Toyota production engineering document

**Corpus Management:**
- ✅ Implemented /api/corpus/list with filtering (status, track, year)
- ✅ Real-time document listing from Redis

**Outcome**: Summary Agent V1 WORKING. Full RAG workflow functional: Upload → Review → Approve → Query with AI-powered answers and citations.

### ✅ COMPLETED: Session 7 - RAG Citation System + Browse UX (2025-11-13)

**RAG Quality Improvements:**
- ✅ Fixed file grounding (reads full document content, not just metadata)
- ✅ Added page-specific citations with direct quotes
- ✅ AI-powered family name extraction (handles Japanese/Western names)
- ✅ Title-based citation keys for documents without authors
- ✅ Format: `[Takami2014, p.11]` - production-ready academic citations

**Browse Documents UX:**
- ✅ Sorting dropdown (7 options: title, date, year, author)
- ✅ Infinite scroll (20 documents per batch)
- ✅ Document detail modal (full metadata, all keywords)
- ✅ Download API route (documents file storage limitation)

**Outcome**: RAG system now provides verifiable, academic-quality citations. Browse scales to 100+ documents with professional UX.

### ✅ COMPLETED: Session 8 - Unified Blob Storage (2025-11-13)

**Unified Storage Architecture:**
- ✅ Vercel Blob storage for ALL files (documents + images)
- ✅ Smart routing: Documents → File Search (RAG), Images → Vision API (analysis)
- ✅ Download functionality for all file types
- ✅ Image upload with Vision analysis (OCR, objects, concepts)
- ✅ Image thumbnails and type filter in Browse tab
- ✅ Multi-layer deletion (Blob + File Search + Redis)
- ✅ Backward compatibility (mimeType fallback)
- ✅ Clear-all utility endpoint for testing

**New Libraries:**
- `lib/blob-storage.ts` - Upload/delete/filename generation
- `lib/vision-analysis.ts` - Gemini Vision integration

**Known Issue:**
- ⚠️ Image type filter shows 0 results (metadata migration issue - needs re-upload in Session 9)

**Outcome**: Images Agent COMPLETE (integrated into Upload). 4/6 agents functional. Unified storage enables downloads and searchable image content.

---

**Status**: 4/6 agents complete (Research, Upload w/ Images, Browse/Query, Images) ✅ | 2 remaining (Brainstorm, Analyze) | 1 eliminated (Editor) ❌

---

### ✅ COMPLETED: Priority 0 - Unified Blob Storage

See Session 8 above for full details. Images Agent integrated into Upload agent.

---

**Remaining Priority Agents** (2/6 remaining):

### Priority 1: Brainstorm Agent (~2-3 hours) - NEXT
- [ ] Implement `/api/brainstorm` for article structure generation
- [ ] Accept topic + optional outline hints
- [ ] Query corpus for coverage assessment
- [ ] Generate hierarchical outline (levels 1-3)
- [ ] Assess coverage per section (strong/moderate/weak/missing)
- [ ] Support interactive refinement via chat
- [ ] Allow section drilling and expansion
- [ ] Export to Markdown
- [ ] Test with various article topics

**Outcome**: Corpus-aware ideation and outlining assistant

### Priority 2: Analyze Agent (~2 hours)
- [ ] Implement `/api/analyze` for draft review
- [ ] Accept draft text for analysis
- [ ] Find corpus support for claims
- [ ] Suggest where to add citations
- [ ] Identify unsupported assertions
- [ ] Calculate relevance scores
- [ ] Return citations with context and excerpts
- [ ] Wire up UI controls
- [ ] Test with draft research text

**Outcome**: Draft article reviewer that finds corpus support

### ❌ ELIMINATED: Editor Agent
**Reason**: Use external tools (Claude.ai, Gemini, ChatGPT) for final text polish. No need to rebuild text editing capabilities.

## Phase 2 Goals (After Scaffold)

### Summary Agent Implementation
- [ ] Implement RAG query with File Search grounding
- [ ] Citation extraction and formatting
- [ ] Conversation history management
- [ ] Document filtering (by track, year, language)
- [ ] Export conversation functionality

### Upload Agent Real Implementation
- [ ] PDF/DOCX text extraction library integration
- [ ] Gemini prompt for metadata extraction (Japanese + English)
- [ ] File Search upload integration
- [ ] Vercel KV metadata storage
- [ ] Review dashboard approval workflow

## Infrastructure Tasks

- [ ] Set up Vercel KV database
- [ ] Configure environment variables for production
- [ ] Test Gemini API key and rate limits
- [ ] Decide on error handling strategy
- [ ] Add loading states throughout UI

## Open Questions

1. Should we build all UI shells first or go deep on one agent?
2. When to set up Vercel KV (now or later)?
3. Which agent to implement first after scaffold?
4. How to handle long-running document processing (>10min)?

## Dependencies Needed

- Google AI API key (get from https://makersuite.google.com/app/apikey)
- Vercel KV database (create in Vercel dashboard when ready)
- Test documents (PDF/DOCX) for upload testing
- Japanese + English Toyota docs for RAG testing

## Current Blockers

None - ready to proceed in any direction

---

**Last Updated**: 2025-11-13
**Session**: 8 - Unified Blob Storage implemented, Images Agent complete (4/6 agents functional)
