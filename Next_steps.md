# Next Steps

## Current Status (Session 11 - Evening)

**Latest**: Session 11 - Debugging upload bugs, discovered Gemini 50MB limit, tested with real corpus files

### What's Working ✅
- ✅ Research Agent - 228 curated terms, targeted search (J-STAGE, Patents, Scholar)
- ✅ Upload Agent Core - Client-side Blob upload (up to 100MB), smart queue, file indexing
  - Client-side Blob upload (bypasses 4.5MB limit)
  - Smart queue with size-based concurrency (未然防止)
  - Bulk upload warnings (3+ large files or >100MB)
  - Pending review persistence (survives navigation/refresh)
  - Files upload to File Search successfully (fully indexed and queryable!)
  - Timeout increased to 120s
- ✅ Browse/Query Agent - Browse with filters + RAG queries citing BOTH documents AND images
- ✅ Images Agent - Full multimodal RAG (File Search grounding + Vision metadata)
- ✅ Download functionality for all file types
- ✅ Delete flow from Browse tab (Blob + File Search + Redis)
- ✅ Image thumbnails and previews
- ✅ Vision Analysis (OCR, objects, concepts) - Gemini 2.5 Flash

### Known Issues ⚠️
- 🐛 **Edit Metadata "Save" button not working** - Can't persist manual metadata edits during review
- 🐛 **Reject button not working** - Can't delete failed uploads from review queue (cache issue?)
- ⚠️ **~50MB Gemini limit** - Metadata extraction fails for files >50MB (known Google API limitation)
  - **IMPORTANT**: Files still upload and index successfully! Only metadata display is affected.
  - Workaround: Compress PDFs in Adobe Acrobat or manually enter metadata (once Save button fixed)

## Immediate Priorities - Session 12 (Tomorrow Morning)

### 🐛 CRITICAL: Fix Upload Agent Bugs (~1 hour)

**Bug 1: Wire Up Edit Metadata Save Button** (Priority: HIGH)
- [ ] Connect "Save Changes" button to API endpoint
- [ ] Update metadata in Redis
- [ ] Refresh Review Dashboard after save
- [ ] Test: Edit metadata → Save → Verify changes persist
- **Why critical**: Blocks manual metadata entry for 50MB+ files

**Bug 2: Fix Reject Button** (Priority: MEDIUM)
- [ ] Verify deployment is complete (check Vercel dashboard)
- [ ] Hard refresh browser to clear JavaScript cache
- [ ] Test delete functionality in incognito mode
- [ ] Debug: Check Network tab for actual endpoint being called
- [ ] If still broken: Investigate why `/api/corpus/delete` isn't working
- **Workaround exists**: Approve → Delete from Browse tab

---

### 📊 Continue Corpus Upload (~30 minutes)

**User Tasks:**
1. **Compress large PDFs** (>50MB files)
   - Use Adobe Acrobat: File → Save As → Optimized PDF
   - Target: Reduce to <50MB for auto-metadata extraction
   - Expected: 50-80% size reduction on scanned documents

2. **Upload compressed files**
   - Re-upload TTR Vol64, Vol66, etc. (compressed versions)
   - Upload remaining Toyota research PDFs
   - Review and approve files with successful metadata extraction

3. **Manual metadata for password-protected files**
   - Use Edit Metadata for files that can't be extracted
   - Copy-paste prepared metadata (like TTR Vol64 example)
   - Save and approve (once Save button fixed)

**Expected Result:**
- 10-20 files uploaded successfully
- Mix of auto-extracted and manual metadata
- Ready for RAG testing

---

### 🧪 Test RAG Queries with Real Corpus (~30 minutes)

**Go to Browse/Query tab → "Query Corpus" section**

**Test Questions:**
1. "What are Toyota's 3 pillars of production?"
2. "Summarize QC circle activities mentioned in the documents"
3. "Find examples of kaizen implementation"
4. "Explain TNGA powertrain development approach"
5. "What production engineering techniques are discussed?"

**Evaluate:**
- ✅ Are citations accurate? (correct page numbers, file names)
- ✅ Are responses grounded in uploaded documents?
- ✅ Does it cite multiple sources when relevant?
- ✅ Are Japanese terms handled correctly?
- ✅ Image references working? (if any images uploaded)

**Document findings** - What works well? What needs improvement?

---

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
- Ready to implement in Session 13

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
