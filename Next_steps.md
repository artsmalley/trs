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

### NEXT IMMEDIATE: Update Research Page UI
- [ ] Review current Research Agent UI
- [ ] Update styling to match new blue theme
- [ ] Ensure research_terms.md integration is clear
- [ ] Test search term generation flow
- [ ] Verify mock data display

**Outcome**: Research Agent visually consistent with new design

### Option 1: Implement Upload Agent (Next priority after Research UI)
- ✅ Set up `.env.local` with Google AI API key
- [ ] Install PDF/DOCX text extraction libraries (pdf-parse, mammoth)
- [ ] Implement `/api/upload` backend:
  - [ ] Text extraction from PDF/DOCX/TXT
  - [ ] Gemini metadata extraction (real API call)
  - [ ] Upload to File Search
  - [ ] Store metadata in Vercel KV
- [ ] Test full upload → review → approve workflow
- [ ] Upload 5-10 test documents

**Outcome**: Documents in corpus, ready for RAG queries

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
**Session**: 2
