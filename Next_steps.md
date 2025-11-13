# Next Steps

## ✅ COMPLETED: UI Scaffold Phase

All 7 agent UIs are now complete and functional with mock data!

### What's Working
- ✅ All 7 tabs visible and navigable
- ✅ All agents have complete UI shells
- ✅ Mock data flowing through all components
- ✅ File upload (documents + images)
- ✅ Chat interfaces (Summary, Outline)
- ✅ Citation displays (Summary, Analyze)
- ✅ Review dashboards (Upload, Image Upload)

## Immediate Priorities - Phase 2

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

### CURRENT PRIORITIES: Implement Remaining 3 Priority Agents

**Status**: 3/7 agents complete (Research, Upload, Summary) ✅ | 1 deferred (Images) ⏸️

**Images Agent**: DEFERRED until Gemini 3.0 release (File Search doesn't support images yet). Shows "coming soon" UI.

**Remaining Priority Agents** (by implementation order):

### Priority 1: Analyze Agent (~2 hours)
- [ ] Implement `/api/analyze` for citation finding
- [ ] Accept claim + citation type (quote, example, data)
- [ ] Query approved documents corpus (like Summary Agent)
- [ ] Find relevant supporting citations
- [ ] Calculate relevance scores
- [ ] Return citations with context and excerpts
- [ ] Wire up UI controls (claim input, type selector)
- [ ] Test with actual research claims

**Outcome**: Citation finding functional for supporting research claims

### Priority 2: Outline Agent (~3 hours) - MOST COMPLEX
- [ ] Implement `/api/outline` for article structure generation
- [ ] Accept topic + optional outline hints
- [ ] Query corpus for coverage assessment
- [ ] Generate hierarchical outline (levels 1-3)
- [ ] Assess coverage per section (strong/moderate/weak/missing)
- [ ] Support interactive refinement via chat
- [ ] Allow section drilling and expansion
- [ ] Export to Markdown
- [ ] Test with various article topics

**Outcome**: AI-powered article outlining with corpus coverage analysis

### Priority 3: Editor Agent (~2 hours)
- [ ] Implement `/api/editor` for text refinement
- [ ] Accept text content for analysis
- [ ] Generate suggestions in 5 categories:
  - [ ] Terminology (check against corpus terms)
  - [ ] Citations (suggest where to add)
  - [ ] Clarity (improve readability)
  - [ ] Structure (reorganize flow)
  - [ ] Style (professional academic tone)
- [ ] Provide original vs. suggested diffs
- [ ] Support apply individual or apply all
- [ ] Wire up split-view UI
- [ ] Test with draft research text

**Outcome**: AI-powered text editing with corpus-aware suggestions

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

**Last Updated**: 2025-11-12
**Session**: 6 - Images Agent deferred (Gemini 3.0 pending), focus on Analyze/Outline/Editor
