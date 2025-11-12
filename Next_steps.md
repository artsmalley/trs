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

### CURRENT: Vercel Deployment & KV Setup
- [ ] Push code to GitHub
- [ ] Connect GitHub repo to Vercel
- [ ] Deploy to Vercel
- [ ] Create Vercel KV database in dashboard
- [ ] Add KV credentials to Vercel environment variables
- [ ] Add Google AI API key to Vercel environment variables
- [ ] Add Google Custom Search credentials to Vercel environment variables
- [ ] Implement metadata persistence in KV
- [ ] Test upload flow in production

**Outcome**: TRS deployed and functional with persistent metadata storage

### Option 2: Implement Summary Agent (Requires Option 1 first)
- [ ] Study File Search documentation
- [ ] Implement `/api/summary` backend:
  - [ ] Gemini + File Search grounding
  - [ ] Citation extraction from responses
  - [ ] Conversation history management
- [ ] Test RAG queries against uploaded documents
- [ ] Verify citation accuracy

**Outcome**: Full RAG workflow functional

### Option 3: Study & Prototype First
- [ ] Deep-dive File Search documentation
- [ ] Create isolated prototype script:
  - [ ] Upload test document
  - [ ] Query with grounding
  - [ ] Extract citations
- [ ] Understand File Search capabilities/limitations
- [ ] Return to Option 1 with knowledge

**Outcome**: Informed implementation decisions

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
**Session**: 3 - Research Agent V1 & Upload Agent Complete, Ready for Vercel Deployment
