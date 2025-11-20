# Next Steps

## Current Status (Session 22 - COMPLETE ✅)

**Latest**: Session 22 - Citation Fix Complete ✅ | UI text wrapping fixed | FileId matching solution restored citations for all 241 documents | Considering Supabase migration

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
- ✅ **Query Corpus (Session 21 - SIMPLIFIED)** - Strict citations, corpus-only, no UI constraints
- ✅ **Search Web (Session 21 - NEW)** - Google Search for generic web knowledge
- ✅ **Draft Agent (Session 18)** - NEW! Outline → Full Article Generation ✅
  - Two-step workflow: Generate Outline → Edit → Generate Draft
  - 6 article types, 5 lengths, 4 tones
  - Inline/Footnote citations (endnotes removed)
  - Skip to Draft option
  - Copy/download markdown
  - Working perfectly with 123-document corpus

### What's Working ✅ (Continued)
- ✅ **Analyze Agent (Session 19 - REDESIGNED)** - TRS Database Validation ✅
  - Drag/drop article input (paste textarea removed)
  - Custom focus field (optional)
  - TRS database validation: Surfaces alternatives, identifies gaps
  - Analytical tone: "TRS also contains..." not "You should..."
  - Fixed scalability: Now handles 165+ documents
  - Under 500 words, focused on what's IN the corpus
  - **User feedback:** "I think it is good enough" ✅
- ✅ **Quality Classification System (Session 20)** - 4-Tier Document Quality ✅
  - Conservative auto-classification: .txt files → Tier 3, PDFs → Tier 2 (default)
  - Quality Review UI in Browse tab (collapsible tier sections, batch save)
  - Tier selection on upload (mandatory field)
  - Automatic agent prioritization: Tier 1+2 prioritized, Tier 3 for context, Tier 4 for dates only
  - **Results:** 204 documents classified (38 PDFs to review, 146 .txt auto-classified, 20 timelines)
  - **Impact:** 81% reduction in manual review burden, improved RAG quality

### Known Issues ⚠️
- ⚠️ **~50MB Gemini limit** - Metadata extraction fails for files >50MB
  - **IMPORTANT**: Files still upload and index successfully!
  - **Workaround**: Use Edit Metadata button ✅
- ✅ **Analyze Agent output too verbose** (Session 18 - FIXED Session 19)
  - Was returning thousands of words (unreadable)
  - Redesigned for TRS database validation (analytical, not prescriptive)
  - Now under 500 words, surfaces alternatives ✅
- ✅ **Corpus size scalability** (Session 19 - FIXED)
  - 165 documents caused empty responses (bloated prompt with all metadata)
  - Removed corpus context from system instruction (File Search already has access)
  - Now handles 165+ documents successfully ✅

### Corpus Status
- **241 documents** in File Search Store (quality classified!)
- **Citations working** for all documents (Session 22 - FileId matching solution) ✅
- User completed Tier 1 PDF review ✅

---

## Immediate Priorities - Session 23 (Next Week)

### 🎯 PRIORITY #1: Consider Supabase Migration (TBD)

**Status**: Working solution exists (fileId matching), migration under consideration

**Current State** (Session 22 - WORKING ✅):
- Citations restored using fileId string matching
- All 241 documents have working citations
- Format: `[Yoshino1985, p.1, 2, 3]` at end of paragraphs
- **User feedback**: "Ok this works as a temporary countermeasure"

**Why Consider Migration?**:
- **Current limitation**: Fragile fileId string parsing (depends on Google's format)
- **Better control**: Supabase would provide direct foreign key relationships
- **Already have account**: $25/month plan with existing RAG database
- **User priority**: Customization > speed

**Supabase Benefits**:
- Full control over chunk metadata (store citation_key directly)
- Direct foreign keys: `chunk.document_id → document.id`
- No string parsing needed
- Better debugging and transparency
- SQL flexibility for complex queries
- Industry-standard tools

**Migration Effort**: ~4-6 hours
- Create tables (documents, chunks)
- Re-process 241 documents (chunk + embed)
- Update API routes (replace File Search calls with Supabase queries)
- Test citation extraction

**Decision Point**: User wants time to reflect and plan
- This week: Continue with fileId matching (working)
- Next week+: Evaluate Supabase migration based on priorities

**See**: `citation.md` for detailed analysis

---

### 🎯 PRIORITY #2: Editorial Agent (Optional - Final Agent)

**Status:** 7/7 agents working (Session 21) ✅ | Editorial is last agent (optional)

**Decision Point:** Assess if Editorial Agent adds value or if external tools (Claude, ChatGPT) are sufficient.

**Purpose:** Final polish for structure, grammar, and clarity (no external fact-checking)

**Estimated Time:** 1-2 hours (simpler than Analyze - no corpus interaction)

---

### 🎯 PRIORITY #2: Fine-Tune Tier 1 Classifications

**Status:** 38 PDFs in Tier 2 need review

**User's task:**
1. Review 38 PDFs in Tier 2 (High Quality)
2. Identify ex-Toyota primary sources
3. Promote to Tier 1 (Authoritative)
4. Test query quality improvement

**Current Status:**
- 204 documents classified automatically
- 146 .txt files correctly classified as Tier 3
- User can focus on just 38 PDFs (81% reduction in work)

---

### 🎯 PRIORITY #2: Build Editorial Agent (Final Agent!) - OPTIONAL

**Note:** May not be needed. External LLMs (Claude, ChatGPT) handle this well.

**Decision Point:** After corpus is built to 200+ documents, assess if Editorial Agent adds value or if external tools are sufficient.

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

## Completed (Session 22) ✅ - Citation Fix Complete

### UI Polish
- ✅ **Query Input Text Wrapping Fixed** - Changed Input to Textarea
  - Applied to Query Corpus and Search Web tabs
  - 3-row textarea with proper wrapping

### Citation Fix - FileId Matching Solution
- ✅ **Root Cause Identified** - Session 13 regression broke citations
  - Unicode fix stripped filenames from chunk titles
  - All 241 documents affected (no way to match chunks to documents)
- ✅ **Solution Implemented** - FileId matching approach
  - Discovered fileId in Redis contains normalized chunk title
  - Implemented string matching: `fileId.includes(normalizedTitle)`
  - Works for all 241 existing documents
- ✅ **Results** - Citations restored ✅
  - Format: `[Yoshino1985, p.1, 2, 3]` at end of paragraphs
  - No re-upload needed
  - User satisfied: "Ok this works as a temporary countermeasure"

### Documentation
- ✅ **Updated citation.md** - Session 22 Resolution section
  - Full timeline (Session 12 → 13 regression → 22 fix)
  - FileId matching implementation details
  - Supabase migration comparison
- ✅ **Updated CLAUDE.md** - Known Issues section
  - Added File Search Store limitations
  - Documented current workaround
  - Noted Supabase migration consideration
- ✅ **Created Session 22 progress doc** - Comprehensive session log
- ✅ **Updated Next_steps.md** - This file

### Code Cleanup
- ✅ **Removed DEBUG statements** - Cleaned up console logging
  - Removed from `app/api/summary/route.ts`
  - Removed from `lib/inject-citations.ts`

### Files Modified
1. `components/agents/browse-query-agent.tsx` - Textarea
2. `components/agents/web-search-agent.tsx` - Textarea
3. `app/api/summary/route.ts` - FileId matching + cleanup
4. `lib/inject-citations.ts` - Cleanup
5. `citation.md` - Session 22 resolution
6. `CLAUDE.md` - Known issues update
7. `docs/progress/2025-01-19-Session22.md` - New session doc
8. `Next_steps.md` - Status update

---

## Completed (Session 21) ✅

### Bug Fixes
- ✅ **Reject Button Fixed** - Now properly deletes from File Search Store + Blob + Redis
  - Added deleteDocumentFromStore() for File Search Store documents
  - Detects both `corpora/` (File Search Store) and `files/` (Files API) prefixes
  - No more orphaned files in storage
- ✅ **Follow-up Queries Fixed** - Removed 1000-char limit on history messages
  - Assistant responses often exceed 1000 chars (4-6 paragraphs)
  - History validation now allows any length (already trusted content)
  - Multi-turn conversations now work correctly

### Architectural Pivot: Two-Tab Architecture
- ✅ **Query Corpus + Search Web Separated** - Independent tabs to highlight knowledge gap
  - **User Insight:** "The google search of the internet will always return the perceived common answer but not the best facts and details."
  - Query Corpus: Strict citations, corpus-only responses, specific facts
  - Search Web: Google Search, generic web knowledge, surface-level principles
- ✅ **UI Simplified** - Removed Mode/Length/Custom Instructions from both tabs
  - User has full control through detailed prompts
  - No UI constraints interfering with citations
- ✅ **Strict Citation Enforcement** - "You MUST cite EVERY factual claim"
  - Corpus queries now return full citations like `[History2012, p.1]`
  - Prevents model from using training data instead of corpus
- ✅ **Anti-Duplication Instruction** - Single cohesive response, no redundant lists
- ✅ **7 Tabs Total** - Research, Upload, Browse, Query Corpus, Search Web, Draft, Analyze, (Editor optional)

### Results
- **Corpus Query**: Specific dates, names, tools with full citations
- **Web Search**: Generic principles, no primary sources
- **Impact**: System demonstrates hidden knowledge gap in TRS database

- ✅ **Documentation Updated** - Session 21 progress log, CLAUDE.md, Next_steps.md

---

## Completed (Session 20) ✅

- ✅ **Quality Classification System built** - 4-tier document quality (Session 20)
  - Added classification schema to DocumentMetadata (qualityTier, tierLabel, autoClassified, classifiedAt)
  - Conservative auto-classification logic (lib/classify-documents.ts)
  - Bulk classification API (/api/corpus/classify-all)
  - Quality Review UI in Browse tab (collapsible tiers, batch save, search/filter)
  - Tier selection on upload (mandatory field in Pending Review)
  - Agent prompt updates (Query, Draft, Analyze) - automatic tier prioritization
  - API fix: /api/corpus/list now returns classification fields
  - **Results:** 204 documents classified (38 Tier 2, 146 Tier 3, 20 Tier 4)
  - **User insight:** All .txt files are web-ingested → auto-classify as Tier 3
  - **Impact:** 81% reduction in manual review (38 PDFs vs 204 documents)
- ✅ **Documentation complete** - Session 20 progress log, CLAUDE.md, Next_steps.md updated

---

## Completed (Session 19) ✅

- ✅ **Analyze Agent redesigned** - TRS database validation (Session 19)
  - Removed paste textarea (drag/drop only)
  - Reframed as "TRS Database Validation" not "Writing Coach"
  - Analytical tone: "TRS also contains..." not "You should..."
  - Surfaces alternatives from corpus
  - Fixed scalability: Removed bloated corpus context from prompt
  - Now handles 165+ documents
  - Concise output (~500 words)
  - User feedback: "I think it is good enough" ✅
- ✅ **Corpus scalability fixed** - 165 documents working (Session 19)
  - Removed redundant corpus metadata from system instruction
  - File Search tool already has access to all documents
  - Dramatically reduced prompt size
- ✅ **Documentation complete** - Session 19 progress log, CLAUDE.md updated

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

**None!** ✅

All core agents working:
- Research ✅
- Upload ✅
- Browse/Query ✅
- Draft ✅
- Analyze ✅

**Focus:** Build corpus to 200+ documents (History, PD, PE materials)

---

**Status**: 7/7 agents working | Quality Classification ✅ | Security hardened ✅ | **240 documents** ✅ | Two-tab architecture ✅ | **Citation issue identified** ⚠️

**Last Updated**: 2025-01-18 (Session 22 - UI Polish + Citation Investigation)

**Next Session**: Session 23 - **Fix Citation & Duplication (1-2 hours)** → Solution ready in citation.md
