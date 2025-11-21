# Next Steps

## Current Status (Session 29 - V1 Stable, V2 Planned)

**Latest**: Session 29 - Cleanup Complete ✅ | Supabase V1 migration abandoned | V2 planned for Railway | Documentation updated | Build verified (0 errors) | **System back to stable baseline**

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
  - Working perfectly with 241-document corpus

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
  - **Results:** 241 documents classified (Tier 1 sources identified, manual PDF review complete)
  - **Impact:** RAG quality improved with authoritative source prioritization

### Known Issues ⚠️
- ⚠️ **~50MB Gemini limit** - Metadata extraction fails for files >50MB
  - **IMPORTANT**: Files still upload and index successfully!
  - **Workaround**: Use Edit Metadata button ✅
- ⚠️ **File Search Store Opacity** - Limited control over chunk metadata
  - Citations require fragile fileId string matching
  - **Current workaround**: Working for all 241 documents ✅
  - **Future**: V2 on Railway with full control (see transition_plan.md)

### Corpus Status
- **241 documents** in File Search Store (quality classified across 4 tiers!)
- **Tier 1 classifications complete** ✅ - Ex-Toyota primary sources identified and prioritized
- **Citations working** for all documents (Session 22 - FileId matching solution) ✅

---

## Immediate Priorities

### 🎯 PRIORITY #1: Editorial Agent (Optional - Final Agent)

**Status:** 6/6 core agents working (Session 21) ✅ | Editorial is optional 7th agent

**Decision Point:** Assess if Editorial Agent adds value or if external tools (Claude, ChatGPT) are sufficient.

**Purpose:** Final polish for structure, grammar, and clarity (no external fact-checking)

**Estimated Time:** 1-2 hours (simpler than Analyze - no corpus interaction)

---

### 📊 PRIORITY #2: Continue Corpus Expansion

**Current:** 241 documents
**Goal:** 300+ documents

**Sources:**
- Toyota history pages (more to ingest)
- Additional PDFs from research
- Technical reports
- Internal documents

---

## Short-Term Goals (~2-4 hours)

### 🔨 Optional: Complete Editorial Agent

**Goal:** Draft → Analyze → Editorial workflow

**Steps:**
1. ✅ Draft Agent (COMPLETE)
2. ✅ Analyze Agent (COMPLETE)
3. 🔨 Editorial Agent (OPTIONAL - BUILD if needed)
4. 🧪 Test full workflow end-to-end
5. 📝 Document best practices for users

**Expected workflow:**
1. User enters topic in Draft Agent → Generate outline → Edit → Generate draft
2. User edits draft offline with personal insights
3. User pastes edited draft into Analyze Agent → Review corpus-based feedback
4. User revises based on feedback
5. (Optional) User pastes revised draft into Editorial Agent → Review writing quality
6. User does final polish
7. Article complete!

---

## Medium-Term Goals (~4-6 hours)

### Polish & Documentation
- [ ] Comprehensive testing with full workflow
- [ ] Performance optimization (if needed)
- [ ] Error recovery testing
- [ ] Documentation for end users
- [ ] Video walkthrough of workflow

### Optional Improvements
- [ ] Corpus statistics dashboard
- [ ] Search within corpus (full-text)
- [ ] Bulk metadata editing
- [ ] Export corpus to JSON/CSV
- [ ] API rate limit monitoring

---

## Long-Term: V2 Architecture (Future)

**Status:** V1 stable with File Search Store | V2 planned for Railway

**Why V2:**
- Serverless incompatible with traditional PDF parsing libraries
- Need deterministic text extraction (LlamaParse, not LLMs)
- Want full control over chunking, embeddings, citations
- Direct SQL foreign key relationships (no string parsing)

**V2 Stack:**
- Railway: Traditional Node.js runtime
- Supabase: PostgreSQL + pgvector for RAG
- LlamaParse: Deterministic PDF text extraction
- Gemini embeddings: Same as V1 (gemini-embedding-001, 768 dims)

**Migration Pattern:**
- "Strangler Fig" - Keep V1 running, build V2 fresh, gradually shift

**See:** `transition_plan.md` for comprehensive 600+ line implementation roadmap (7 phases, 40-60 hours)

---

## Completed (Session 29) ✅ - V1 Cleanup & Documentation

### Supabase V1 Migration Cleanup
- ✅ **Documented migration failure** - Created `transition_plan.md` (600+ lines)
  - Why serverless incompatible with PDF parsing
  - Why LLMs unsuitable for deterministic text extraction
  - V2 architecture on Railway + Supabase + LlamaParse
  - 7-phase implementation roadmap
  - Cost analysis and decision matrix
- ✅ **Backend cleanup** - Removed failed Supabase code
  - Uninstalled pdfjs-dist and pdf-parse
  - Deleted lib/pdf-loader.ts and lib/text-extraction.ts
  - Reverted next.config.ts (removed serverExternalPackages)
  - Reverted app/api/process-blob/route.ts (removed backend parameter)
- ✅ **Frontend cleanup** - Removed all backend selection UI
  - upload-agent.tsx: Removed Storage Backend selector
  - browse-query-agent.tsx: Removed Query Backend selector
  - Removed all backend state, refs, badges
  - Build verified: 0 TypeScript errors ✅
- ✅ **Documentation updated**
  - CLAUDE.md: Updated migration status, removed Supabase V1 sections
  - Next_steps.md: This file (cleaned up)
  - Referenced transition_plan.md for V2 future work
- ✅ **Dev server restarted** - Changes now visible in browser

### Key Learnings Documented
- **Architectural incompatibility**: Serverless edge runtime vs traditional Node.js libraries
- **Wrong tool for job**: Probabilistic LLMs vs deterministic text extraction
- **Physical limitation**: Gemini 8K token output limit can't extract 30k+ token PDFs
- **Solution**: Build V2 on Railway with proper runtime environment

### Time to Complete
- **Estimated**: 2-3 hours
- **Actual**: ~2 hours
- **Result**: Clean V1 baseline + comprehensive V2 plan

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
- ✅ **Updated CLAUDE.md** - Known Issues section
- ✅ **Created Session 22 progress doc**

---

## Completed (Session 21) ✅

### Bug Fixes
- ✅ **Reject Button Fixed** - Now properly deletes from File Search Store + Blob + Redis
- ✅ **Follow-up Queries Fixed** - Removed 1000-char limit on history messages

### Architectural Pivot: Two-Tab Architecture
- ✅ **Query Corpus + Search Web Separated** - Independent tabs to highlight knowledge gap
  - Query Corpus: Strict citations, corpus-only responses, specific facts
  - Search Web: Google Search, generic web knowledge, surface-level principles
- ✅ **UI Simplified** - Removed Mode/Length/Custom Instructions from both tabs
- ✅ **Strict Citation Enforcement** - "You MUST cite EVERY factual claim"
- ✅ **7 Tabs Total** - Research, Upload, Browse, Query Corpus, Search Web, Draft, Analyze, (Editor optional)

---

## Completed (Session 20) ✅

- ✅ **Quality Classification System built** - 4-tier document quality
  - Added classification schema to DocumentMetadata
  - Conservative auto-classification logic
  - Bulk classification API
  - Quality Review UI in Browse tab
  - Tier selection on upload
  - Agent prompt updates (automatic tier prioritization)
  - **Results:** 241 documents classified, Tier 1 sources identified

---

## Completed (Session 19) ✅

- ✅ **Analyze Agent redesigned** - TRS database validation
  - Removed paste textarea (drag/drop only)
  - Reframed as "TRS Database Validation" not "Writing Coach"
  - Analytical tone: "TRS also contains..." not "You should..."
  - Fixed scalability: Removed bloated corpus context from prompt
  - Now handles 165+ documents
  - Concise output (~500 words)

---

## Completed (Session 18) ✅

- ✅ **Draft Agent built** - Complete outline → draft workflow
  - Two-step workflow: Generate Outline → Edit → Generate Draft
  - 6 article types, 5 lengths, 4 tones
  - Citation styles: Inline, Footnotes
  - Copy/download markdown
  - Works perfectly with 241-document corpus
- ✅ **Analyze Agent built** - Corpus validation framework

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
- Search Web ✅

**V1 Status**: Stable, production-ready, 241 documents, citations working

**V2 Status**: Planned for future, see transition_plan.md

---

**Status**: 6/6 core agents working | Quality Classification ✅ | Security hardened ✅ | **241 documents** ✅ | Citations working ✅ | **V1 stable** ✅ | **V2 planned** 📋

**Last Updated**: 2025-01-21 (Session 29 - Cleanup complete, V1 stable, V2 documented)

**Next Session**: Session 30 - Optional: Build Editorial Agent OR Continue corpus expansion to 300+ documents
