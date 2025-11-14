# Next Steps

## ✅ COMPLETED: Upload Agent Production-Ready!

Research, Upload, Browse/Query, and Images agents are complete, tested, and deployed!

**Latest**: Session 10 - Upload Agent is PRODUCTION-READY! Client-side Blob upload (up to 100MB), smart queue, tested with 50MB files.

### What's Working
- ✅ Research Agent - 228 curated terms, targeted search (J-STAGE, Patents, Scholar)
- ✅ Upload Agent - **PRODUCTION-READY!** Client-side Blob upload, smart queue, up to 100MB per file
  - Client-side Blob upload (bypasses 4.5MB limit)
  - Smart queue with size-based concurrency (未然防止)
  - Bulk upload warnings (3+ large files or >100MB)
  - Pending review persistence (survives navigation/refresh)
  - Badge counter on Upload tab
  - Processing Queue UX (shows only active files)
  - Tested with 50MB files successfully
- ✅ Browse/Query Agent - Browse with filters + RAG queries citing BOTH documents AND images
- ✅ Images Agent - Full multimodal RAG (File Search grounding + Vision metadata)
- ✅ Download functionality for all file types
- ✅ Delete flow (Blob + File Search + Redis)
- ✅ Image thumbnails and previews
- ✅ Vision Analysis (OCR, objects, concepts) - Gemini 2.5 Flash

## Immediate Priorities - Phase 2

### 📊 TONIGHT: Upload Real Corpus

**User Task:**
- Upload research PDFs (Toyota production, manufacturing, quality)
- Build real corpus for testing
- Validate upload system with production data

**Expected:**
- Mix of small (2-5MB) and large (10-50MB) files
- Smart queue will manage concurrency
- Files will persist in Redis for approval tomorrow

---

### 🧪 TOMORROW: Test & Design Workflow (Session 11)

**Morning - Test with Real Corpus:**
1. **Approve uploaded files** - Review AI-extracted metadata
2. **Test Browse tab** - Verify all files appear, sorting works
3. **Test Query Corpus** - Run real research questions:
   - "What are Toyota's 3 pillars of production?"
   - "Summarize QC circle activities"
   - "Find examples of kaizen implementation"
4. **Evaluate RAG quality** - Are citations accurate? Responses helpful?

**Afternoon - Design Brainstorm/Analyze Workflow:**

**Key Questions to Answer:**
1. **How will you use Brainstorm Agent?**
   - Start with topic → Generate outline?
   - Review corpus first → Then brainstorm?
   - Iterative: Brainstorm → Query → Refine?

2. **How will you use Analyze Agent?**
   - Write draft first → Then analyze?
   - Write section by section → Analyze each?
   - Continuous feedback loop?

3. **Integration with Editor:**
   - Export from TRS → Edit in Claude.ai?
   - Copy/paste workflow?
   - What format? (Markdown, plain text?)

**Outcome:**
- Clear workflow documented
- Prioritize Brainstorm OR Analyze (which first?)
- Specific requirements for each agent

---

## 🔮 FUTURE: Remaining Agents (~4-6 hours total)

### Priority 1: Brainstorm Agent (~2-3 hours)

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

**Testing:**
- [ ] Test with various article topics
- [ ] Verify corpus coverage assessment
- [ ] Validate export format

**Estimated Time:** 2-3 hours

---

### Priority 2: Analyze Agent (~2 hours)

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

**Testing:**
- [ ] Test with draft research text
- [ ] Verify citation suggestions are relevant
- [ ] Test with various claim types

**Estimated Time:** 2 hours

---

### ❌ ELIMINATED: Editor Agent

**Reason:** Use external tools (Claude.ai, Gemini, ChatGPT) for final text polish. No need to rebuild text editing capabilities.

**Workflow:**
- Brainstorm → Generate outline in TRS
- Analyze → Find corpus support in TRS
- **Editor → Copy to Claude.ai/Gemini for final polish**

---

## Infrastructure Tasks

### Completed:
- ✅ Vercel KV database (Redis) - 30MB free tier
- ✅ Vercel Blob storage - Pro plan ($20/mo, 100GB)
- ✅ Vercel Pro plan - 60s function timeout
- ✅ Environment variables configured
- ✅ Gemini API tested and working
- ✅ Error handling throughout
- ✅ Loading states in UI

### Optional Future:
- [ ] Rate limiting (not critical for single user)
- [ ] Usage analytics (track API costs)
- [ ] Backup/export corpus (Redis → JSON)

---

## Open Questions (To Answer Tomorrow)

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

## Dependencies Needed

### All Set! ✅
- Google AI API key - ✅ Working
- Vercel KV database - ✅ Created
- Vercel Blob storage - ✅ Pro plan active
- Vercel Pro plan - ✅ 60s timeout configured
- Test documents - ✅ Uploading tonight

---

## Current Blockers

**None!** 🎉

Ready to proceed with:
1. Upload corpus tonight
2. Test & design workflow tomorrow
3. Implement Brainstorm/Analyze agents

---

## Phase 3 Goals (After Agent Implementation)

### Polish & Production Readiness:
- [ ] Comprehensive testing with full corpus
- [ ] Performance optimization (if needed)
- [ ] Error recovery testing
- [ ] Documentation for end users
- [ ] Video walkthrough of workflow

### Stretch Goals:
- [ ] Corpus statistics dashboard
- [ ] Search within corpus (full-text)
- [ ] Bulk metadata editing
- [ ] Export corpus to JSON/CSV
- [ ] API rate limit monitoring

---

**Status**: 4/6 agents complete (Research, Upload, Browse/Query, Images) ✅ | 2 remaining (Brainstorm, Analyze) | 1 eliminated (Editor) ❌

---

**Last Updated**: 2025-11-13 (Session 10 - Evening)
**Next Session**: Session 11 - Test with real corpus + Design Brainstorm/Analyze workflow
