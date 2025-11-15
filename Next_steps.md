# Next Steps

## Current Status (Session 18 - Partial Complete)

**Latest**: Session 18 - Draft Agent complete ✅ | Analyze Agent built but debugging empty Gemini response ⚠️

### What's Working ✅
- ✅ **Security (Session 15)** - Production-ready protection ✅
  - Rate limiting: 10-20 req/hour per IP (custom sliding window)
  - Prompt injection protection (15+ patterns blocked)
  - Input validation (length limits, SSRF protection, path traversal prevention)
  - Dangerous endpoints protected (clear-all requires token, migrate requires env flag)
  - Security headers (CSP, HSTS, X-Frame-Options, etc.)
  - CORS configured (domain whitelisting)
  - Test suite created (`test/security-test.sh`)
- ✅ **Research Agent (Session 16 - REDESIGNED)** - ALL FEATURES WORKING!
  - 228 curated terms with accurate 4-level hierarchy
  - Searchable browser interface with bilingual toggle
- ✅ **Upload Agent (Session 17 - URL INGESTION SIMPLIFIED)** - ALL FEATURES WORKING!
  - Client-side Blob upload (up to 100MB)
  - URL ingestion via Jina.ai Reader (text storage)
  - Duplicate URL detection, queue system
- ✅ **Browse/Query Agent** - Browse with filters + semantic RAG queries
- ✅ **Query Corpus** - Customizable controls (Mode, Length, Custom Instructions)
- ✅ **Draft Agent (Session 18)** - NEW! Outline → Full Article Generation ✅
  - Two-step workflow: Generate Outline → Edit → Generate Draft
  - 6 article types, 5 lengths, 4 tones
  - Inline/Footnote citations (endnotes removed)
  - Skip to Draft option
  - Copy/download markdown
  - Working perfectly with 123-document corpus

### In Progress ⚠️
- ⚠️ **Analyze & Cite Agent (Session 18)** - Built but needs debugging
  - Drag/drop + paste article input ✅
  - 5-category analysis framework designed ✅
  - API endpoint created ✅
  - **Issue:** Gemini returning empty feedback (0 characters)
  - Detailed logging added to diagnose (finishReason, safetyRatings, usageMetadata)
  - **Next Session:** Review logs and fix empty response issue

### Known Issues ⚠️
- 🐛 **Reject button not working** - Can't delete failed uploads from review queue
  - Workaround: Approve → Delete from Browse tab
  - Priority: MEDIUM (annoying but workaround exists)
- ⚠️ **~50MB Gemini limit** - Metadata extraction fails for files >50MB
  - **IMPORTANT**: Files still upload and index successfully!
  - **Workaround**: Use Edit Metadata button ✅
- 🐛 **Analyze Agent empty response** (NEW - Session 18)
  - Gemini returns 0 characters of feedback
  - May be token limit, safety filter, or tool configuration issue
  - Priority: HIGH (blocks Analyze Agent functionality)

### Corpus Status
- **123 documents** in File Search Store (up from 37 in Session 17!)
- **Goal:** Continue to 200+ documents

---

## Immediate Priorities - Session 19 (Next)

### 🔥 PRIORITY #1: Fix Analyze Agent Empty Response (URGENT)

**Status:** API complete, debugging empty Gemini response

**What needs to happen:**
1. **Review detailed Gemini logs** (finishReason, safetyRatings, usageMetadata)
   - Check if safety filters blocking content
   - Check if token limit exceeded
   - Check if tool configuration issue
2. **Identify root cause** and implement fix:
   - If token limit: Simplify system instruction or reduce corpus context
   - If safety filter: Adjust prompting to avoid triggers
   - If tool issue: Debug File Search Store integration
3. **Test with various article lengths**
   - Short (500 words)
   - Medium (1200 words)
   - Long (2000+ words)
4. **Validate feedback quality**
   - Ensure 5 categories are addressed
   - Check citation suggestions
   - Verify corpus references

**Expected outcome:**
- Analyze Agent returns categorized feedback
- User can fact-check articles against corpus
- Citation suggestions working
- Full workflow functional: Draft → Edit → Analyze → Revise

---

### 🎯 PRIORITY #2: Build Editorial Agent (Final Agent!)

**Purpose:** Final polish for structure, grammar, and clarity (no external fact-checking)

**Scope:**
- **Content Review:** Argument flow, paragraph coherence, transitions
- **Structure Review:** Intro strength, conclusion effectiveness, logical gaps
- **Grammar/Style:** Sentence clarity, passive voice, wordiness, typos
- **Readability:** Sentence variety, paragraph length, jargon explanation
- **Tone Consistency:** Match target style (academic, journalistic, etc.)

**What NOT to do:**
- ❌ External fact-checking (corpus is source of truth)
- ❌ Add new content
- ❌ Rewrite (suggestions only)

**Implementation Plan:**
1. Create `/app/api/editorial/route.ts`
   - Similar structure to Analyze Agent
   - Focus on writing quality, not content validation
   - No File Search tool needed (doesn't query corpus)
2. Create `/components/agents/editorial-agent.tsx`
   - Drag/drop + paste article input
   - Categorized feedback display
   - Copy/download suggestions
3. Test with articles from Draft Agent
4. Integrate into workflow

**Estimated Time:** 1-2 hours (simpler than Analyze - no corpus interaction)

---

## Short-Term Goals (~2-4 hours)

### 🔨 Complete 3-Agent Article Workflow

**Goal:** Draft → Analyze → Editorial all working

**Steps:**
1. ✅ Draft Agent (COMPLETE)
2. ⚠️ Analyze Agent (FIX EMPTY RESPONSE)
3. 🔨 Editorial Agent (BUILD)
4. 🧪 Test full workflow end-to-end
5. 📝 Document best practices for users

**Expected workflow:**
1. User enters topic in Draft Agent → Generate outline → Edit → Generate draft
2. User edits draft offline with personal insights
3. User pastes edited draft into Analyze Agent → Review corpus-based feedback
4. User revises based on feedback
5. User pastes revised draft into Editorial Agent → Review writing quality
6. User does final polish
7. Article complete!

---

### 📊 Continue Corpus Expansion

**Current:** 123 documents
**Goal:** 200+ documents

**Sources:**
- Toyota history pages (75+)
- Additional PDFs from research
- Technical reports
- Internal documents

---

## Medium-Term Goals (~4-6 hours)

### Polish & Documentation
- [ ] Comprehensive testing with full workflow
- [ ] Performance optimization (if needed)
- [ ] Error recovery testing
- [ ] Documentation for end users
- [ ] Video walkthrough of workflow

### Optional Improvements
- [ ] Fix Reject button (MEDIUM priority)
- [ ] Corpus statistics dashboard
- [ ] Search within corpus (full-text)
- [ ] Bulk metadata editing
- [ ] Export corpus to JSON/CSV
- [ ] API rate limit monitoring

---

## Open Questions for Next Session

1. **Analyze Agent Debugging:**
   - What does Gemini finishReason show?
   - Are safety filters blocking the response?
   - Is the token limit being exceeded?

2. **Editorial Agent Scope:**
   - Should it check consistency with corpus? (Or leave that to Analyze?)
   - How detailed should grammar feedback be?
   - Include style guide recommendations?

3. **Workflow Integration:**
   - Should agents remember previous steps?
   - Export/import between agents?
   - Or keep session-based as is?

---

## Completed (Session 18) ✅

- ✅ **Draft Agent built** - Complete outline → draft workflow
  - Created `/app/api/draft/route.ts` (250+ lines)
  - Created `/components/agents/draft-agent.tsx` (400+ lines)
  - Two-step workflow: Generate Outline → Edit → Generate Draft
  - 6 article types: Research, Opinion, Technical, Historical, Case Study, Executive
  - 5 lengths: 500/800/1200/1500/2000 words
  - 4 tones: Academic, Journalistic, Technical, Executive
  - Citation styles: Inline, Footnotes (endnotes removed for being too long)
  - Advanced options: Target audience, key points
  - "Skip to Draft" option for quick generation
  - Progressive disclosure UI (3 steps)
  - Copy/download markdown
  - **Testing:** Works perfectly with 123-document corpus
- ✅ **Analyze Agent built** - Corpus validation framework complete
  - Created `/app/api/analyze/route.ts` (200+ lines)
  - Updated `/components/agents/analyze-agent.tsx` (290+ lines)
  - Drag & drop file upload (.txt, .md)
  - Or paste article text directly
  - 5-category analysis framework:
    1. Fact-Checking (verify claims)
    2. Better Examples (suggest stronger evidence)
    3. Citation Suggestions (where needed)
    4. Unsupported Claims (flag gaps)
    5. Coverage Gaps (missed opportunities)
  - **Issue:** Gemini returning empty feedback (debugging in Session 19)
- ✅ **New sanitization function** - `sanitizeArticle()` for long-form content
  - Added to `lib/sanitize.ts`
  - Max length: 50,000 characters (~10,000 words)
  - More lenient than `sanitizeCustomInstructions` (500 char limit)
  - Still checks prompt injection but allows articles
- ✅ **Debugging infrastructure** - Detailed logging for empty response issue
  - Server logs feedback length
  - Logs Gemini result object (finishReason, safetyRatings, usageMetadata)
  - Client logs response data
  - Empty feedback fallback UI with explanation
- ✅ **UI updates**
  - Renamed "Outline" tab → "Draft" tab
  - Updated component imports
  - Added label component (shadcn)
  - Collapsible advanced options
- ✅ **Citation style refinement** - Removed endnotes option
  - Endnotes generated massive bibliographies (longer than article)
  - Kept Inline (default) and Footnotes
  - Improved user experience for corpus-heavy content
- ✅ **Documentation complete** - Session 18 progress log, CLAUDE.md updated

---

## Completed (Session 17) ✅

- ✅ URL ingestion simplified (text storage, no PDF conversion)
- ✅ History track added
- ✅ IP whitelist for solo dev
- ✅ Source URL display in Browse tab
- ✅ Deployment size reduced by 60MB

---

## Current Blockers

1. **Analyze Agent Empty Response** (HIGH PRIORITY)
   - Gemini returns 0 characters
   - Blocks full workflow testing
   - Needs debugging with logs in Session 19

**Other than that:** Ready to build Editorial Agent and complete 6-agent system! 🎉

---

**Status**: 5/6 agents (Research, Upload, Browse/Query, Draft ✅, Analyze ⚠️) | Editorial remaining 🔨 | Security hardened ✅ | 123 documents ✅

**Last Updated**: 2025-11-15 (Session 18 - Draft Agent Complete, Analyze Agent Debugging)

**Next Session**: Session 19 - Fix Analyze Agent empty response → Build Editorial Agent → Complete 3-agent article workflow
