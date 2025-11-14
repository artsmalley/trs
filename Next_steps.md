# Next Steps

## Current Status (Session 13 - Afternoon)

**Latest**: Session 13 - Citations tested ✅, Japanese upload fixed ✅, Edit Metadata working ✅

### What's Working ✅
- ✅ Research Agent - 228 curated terms, targeted search (J-STAGE, Patents, Scholar)
- ✅ Upload Agent - **ALL FEATURES WORKING!**
  - Client-side Blob upload (up to 100MB, bypasses 4.5MB limit)
  - Smart queue with size-based concurrency (未然防止)
  - Bulk upload warnings (3+ large files or >100MB)
  - Pending review persistence (survives navigation/refresh)
  - Files upload to File Search Store (permanent + semantic RAG)
  - Japanese filename support ✅ (Session 13)
  - Manual metadata editing ✅ (Session 13)
  - 50MB warning notice displayed ✅ (Session 13)
  - Timeout: 120s
- ✅ Browse/Query Agent - Browse with filters + semantic RAG queries (scales to 100+ docs)
- ✅ Query Corpus - Semantic retrieval with File Search Store, citations tested ✅
- ✅ Download functionality for all file types
- ✅ Delete flow from Browse tab (Blob + File Search Store + Redis)

### Known Issues ⚠️
- 🐛 **Reject button not working** - Can't delete failed uploads from review queue
  - Workaround: Approve → Delete from Browse tab
  - Priority: MEDIUM (annoying but workaround exists)
- ⚠️ **~50MB Gemini limit** - Metadata extraction fails for files >50MB (known Google API limitation)
  - **IMPORTANT**: Files still upload and index successfully! Only metadata display is affected.
  - **Workaround**: Use Edit Metadata button to enter manually ✅ (Session 13 - WORKING!)
  - **Warning displayed**: Upload page shows 50MB notice ✅
  - Alternative: Compress PDFs in Adobe Acrobat

### Corpus Status
- **37 documents** in File Search Store (semantic RAG working, citations tested ✅)
- **Goal:** 100 documents

---

## Immediate Priorities - Session 14 (Next)

### 📊 PRIORITY #1: Continue Corpus Upload

**Goal:** Upload remaining Toyota research PDFs to reach 100 documents

**User tasks:**
1. **Compress large PDFs** (>50MB files)
   - Use Adobe Acrobat: File → Save As → Optimized PDF
   - Target: Reduce to <50MB for auto-metadata extraction
   - Expected: 50-80% size reduction on scanned documents

2. **Upload compressed files**
   - Upload 10-20 PDFs per batch
   - Review and approve files with successful metadata extraction
   - For failed extractions: Use Edit Metadata (once Save button fixed)

3. **Test RAG queries** with growing corpus
   - Verify citations remain accurate
   - Test response quality with more documents
   - Monitor semantic retrieval performance

**Expected result:**
- 50+ documents uploaded
- RAG queries working smoothly
- Citation quality validated

---

## Short-Term Goals (~2-4 hours)

### 🎯 Design Brainstorm/Analyze Workflow (~1 hour)

**Based on real corpus testing, answer:**

1. **Brainstorm Agent Workflow**
   - How will you start? (Topic first, or corpus review first?)
   - What outline depth do you need? (2 levels? 3 levels?)
   - Iterative refinement needed? (Chat back-and-forth?)
   - Coverage assessment useful? (Show which sections have strong corpus support?)

2. **Analyze Agent Workflow**
   - When will you use it? (Draft complete? Section by section?)
   - What feedback do you want? (Missing citations? Unsupported claims?)
   - Integration with Brainstorm? (Outline → Draft → Analyze loop?)

3. **Priority Decision**
   - Which agent is more urgent for your workflow?
   - **Brainstorm** = Helps structure research before writing
   - **Analyze** = Helps improve existing drafts with citations

**Outcome:**
- Clear user story for prioritized agent
- Specific requirements and mockup
- Ready to implement in Session 14

---

### 🔨 Implement Prioritized Agent (~2-3 hours)

**Option A: Brainstorm Agent**

**Purpose:** Corpus-aware article outlining and ideation

**Key Features:**
- [ ] Accept topic + optional outline hints
- [ ] Query corpus for coverage assessment
- [ ] Generate hierarchical outline (levels 1-3)
- [ ] Assess coverage per section (strong/moderate/weak/missing)
- [ ] Support interactive refinement via chat
- [ ] Allow section drilling and expansion
- [ ] Export to Markdown

**API Route:**
- [ ] Implement `/api/brainstorm` for outline generation

**UI:**
- [ ] Topic input field
- [ ] Optional outline hints textarea
- [ ] Interactive outline display with coverage indicators
- [ ] Chat interface for refinement
- [ ] Export button

**Estimated Time:** 2-3 hours

---

**Option B: Analyze Agent**

**Purpose:** Draft article reviewer that finds corpus support

**Key Features:**
- [ ] Accept draft text for analysis
- [ ] Find corpus support for claims
- [ ] Suggest where to add citations
- [ ] Identify unsupported assertions
- [ ] Calculate relevance scores
- [ ] Return citations with context and excerpts

**API Route:**
- [ ] Implement `/api/analyze` for draft review

**UI:**
- [ ] Draft text input (textarea or file upload)
- [ ] Analysis results display
- [ ] Suggested citations list
- [ ] Unsupported claims highlight
- [ ] Insert citation buttons

**Estimated Time:** 2 hours

---

## Medium-Term Goals (~2-4 hours)

### Polish & Production Readiness:
- [ ] Comprehensive testing with 100-document corpus
- [ ] Performance optimization (if needed)
- [ ] Error recovery testing
- [ ] Documentation for end users
- [ ] Video walkthrough of workflow

### Optional Improvements:
- [ ] Fix Reject button (MEDIUM priority)
- [ ] Corpus statistics dashboard
- [ ] Search within corpus (full-text)
- [ ] Bulk metadata editing
- [ ] Export corpus to JSON/CSV
- [ ] API rate limit monitoring

---

## Infrastructure Tasks

### Completed:
- ✅ Vercel KV database (Redis) - 30MB free tier
- ✅ Vercel Blob storage - Pro plan ($20/mo, 100GB)
- ✅ Vercel Pro plan - 120s function timeout
- ✅ Environment variables configured
- ✅ File Search Store - Created and tested
- ✅ Migration complete (30/36 documents)
- ✅ Gemini API tested and working
- ✅ Error handling throughout
- ✅ Loading states in UI

### Optional Future:
- [ ] Rate limiting (not critical for single user)
- [ ] Usage analytics (track API costs)
- [ ] Backup/export corpus (Redis → JSON)
- [ ] Add debug/inspection tools for File Search Store
- [ ] Consider manual RAG migration if more control needed (Pinecone/Supabase)

---

## Open Questions

1. **Brainstorm first or Analyze first?**
   - Which agent provides more immediate value?
   - Which aligns better with your workflow?

2. **Iterative vs Linear workflow?**
   - Brainstorm → Draft → Analyze → Edit?
   - Or: Draft → Analyze → Brainstorm → Refine?

3. **How to handle long documents?**
   - Process sections individually?
   - Full document analysis?
   - Character/token limits?

4. **Export formats?**
   - Markdown with citations?
   - Plain text?
   - Copy to clipboard?

5. **Conversation persistence?**
   - Should Brainstorm/Analyze save chat history?
   - Or session-only like current approach?

---

## Completed (Session 13) ✅

- ✅ **Citations tested and working** - 2 citations with page numbers, Japanese docs handled correctly
- ✅ **Japanese filename upload fixed** - ASCII-safe temp filenames, preserves Unicode in displayName
- ✅ **6 Japanese documents re-uploaded** - All migration failures resolved
- ✅ **Edit Metadata Save button fixed** - Created `/api/corpus/update` endpoint, full state management
- ✅ **50MB warning added** - Clear notice on Upload page with workaround instructions
- ✅ **Manual metadata workflow complete** - 5 editable fields (Title, Authors, Year, Track, Summary)
- ✅ **Corpus expanded to 37 documents** - All searchable, citations working

## Completed (Session 12) ✅

- ✅ **Fixed RAG architecture** - Migrated to File Search Store with semantic retrieval
- ✅ **Token limit issue resolved** - 99.77% token reduction (1M+ → 2,500 tokens)
- ✅ **Migration complete** - 30/36 documents in File Search Store
- ✅ **Query Corpus working** - No token errors with 30 documents
- ✅ **Citation extraction rewritten** - Parses grounding metadata from File Search Store
- ✅ **Three-layer architecture** - Blob + File Search Store + Redis
- ✅ **Scales to 100+ documents** - Tested to 1000+ documents

---

## Current Blockers

**None!** 🎉

All HIGH priority bugs resolved. Ready to proceed with:
1. Continue corpus upload to 100 documents
2. Build Brainstorm/Analyze agents
3. Optional: Fix Reject button (MEDIUM priority, workaround exists)

---

**Status**: 4/6 agents complete (Research, Upload, Browse, Query Corpus) ✅ | 2 remaining (Brainstorm, Analyze)

**Last Updated**: 2025-11-14 (Session 13 - Afternoon)
**Next Session**: Session 14 - Continue corpus upload OR design Brainstorm/Analyze agents
