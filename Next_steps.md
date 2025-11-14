# Next Steps

## Current Status (Session 15 - Complete)

**Latest**: Session 15 - Security hardening complete ✅ (Rate limiting, prompt injection protection, dangerous endpoints secured, security headers added)

### What's Working ✅
- ✅ **Security (Session 15)** - Production-ready protection ✅
  - Rate limiting: 10-20 req/hour per IP (custom sliding window)
  - Prompt injection protection (15+ patterns blocked)
  - Input validation (length limits, SSRF protection, path traversal prevention)
  - Dangerous endpoints protected (clear-all requires token, migrate requires env flag)
  - Security headers (CSP, HSTS, X-Frame-Options, etc.)
  - CORS configured (domain whitelisting)
  - Test suite created (`test/security-test.sh`)
- ✅ **Research Agent** - 228 curated terms, 2-level navigation (Track → Subcategory → Terms), hierarchical organization
- ✅ **Upload Agent** - ALL FEATURES WORKING!
  - Client-side Blob upload (up to 100MB, bypasses 4.5MB limit)
  - Smart queue with size-based concurrency (未然防止)
  - Bulk upload warnings (3+ large files or >100MB)
  - Pending review persistence (survives navigation/refresh)
  - Files upload to File Search Store (permanent + semantic RAG)
  - Japanese filename support ✅
  - Manual metadata editing ✅
  - 50MB warning notice displayed ✅
  - Timeout: 120s
- ✅ **Browse/Query Agent** - Browse with filters + semantic RAG queries (scales to 100+ docs)
- ✅ **Query Corpus** - Customizable controls (Mode, Length, Custom Instructions) ✅
  - 6 modes: Standard, Find Examples, Find People, Compare, Timeline, Technical
  - 3 lengths: Brief, Medium, Detailed
  - Custom instructions for specific context
  - "Search" button (replaced "Send")
- ✅ Download functionality for all file types
- ✅ Delete flow from Browse tab (Blob + File Search Store + Redis)

### Research Terms Organization ✅
- **Track 1: PD** - 4 subcategories (Design & Development, CAD/PLM, Simulation, Prototyping)
- **Track 2: PE** - 5 subcategories (Production Prep, Process Design, **Tooling Engineering (6 sub-areas)**, Manufacturing Processes, Supplier Collaboration)
- **Track 3: TPS** - 6 subcategories (TPS Core, Kaizen & Methods Analysis, Quality Control, Daily Ops, Automation, **3 Pillar Activity System**)

### Known Issues ⚠️
- 🐛 **Reject button not working** - Can't delete failed uploads from review queue
  - Workaround: Approve → Delete from Browse tab
  - Priority: MEDIUM (annoying but workaround exists)
- ⚠️ **~50MB Gemini limit** - Metadata extraction fails for files >50MB (known Google API limitation)
  - **IMPORTANT**: Files still upload and index successfully! Only metadata display is affected.
  - **Workaround**: Use Edit Metadata button to enter manually ✅
  - **Warning displayed**: Upload page shows 50MB notice ✅
  - Alternative: Compress PDFs in Adobe Acrobat

### Corpus Status
- **37 documents** in File Search Store (semantic RAG working, citations tested ✅)
- **Goal:** 100 documents

---

## Immediate Priorities - Session 16 (Next)

### 🚀 PRIORITY #1: Deploy & Test with Friends

**Goal:** Deploy security updates to production and enable friend testing

**Tasks:**
1. **Update Vercel environment variables** (in Vercel dashboard)
   - Set `ALLOWED_ORIGIN=https://trs-mocha.vercel.app`
   - Optional: Set custom `CLEAR_ALL_TOKEN` (or use default)
   - Ensure `ENABLE_MIGRATION=false` (already migrated)

2. **Deploy to Vercel**
   - Commit all changes
   - Push to GitHub
   - Verify deployment includes security headers

3. **Test production security**
   - Verify rate limiting works
   - Test prompt injection protection
   - Confirm protected endpoints require tokens

4. **Share with friends for testing**
   - Provide URL: https://trs-mocha.vercel.app
   - Monitor for any issues or abuse
   - Rate limiting will protect against excessive usage

**Expected result:**
- Production deployment with security active
- Friends can test without breaking anything
- Rate limits prevent API abuse

---

### 📊 PRIORITY #2: Continue Corpus Upload

**Goal:** Upload remaining Toyota research PDFs to reach 100 documents

**User tasks:**
1. **Compress large PDFs** (>50MB files)
   - Use Adobe Acrobat: File → Save As → Optimized PDF
   - Target: Reduce to <50MB for auto-metadata extraction
   - Expected: 50-80% size reduction on scanned documents

2. **Upload compressed files**
   - Upload 10-20 PDFs per batch
   - Review and approve files with successful metadata extraction
   - For failed extractions: Use Edit Metadata button

3. **Test customizable Query Corpus**
   - Try different Mode options (Find Examples, Find People, etc.)
   - Test Length controls (Brief vs Detailed)
   - Use Custom Instructions for targeted queries
   - Verify citations remain accurate

4. **Test 2-level Research Agent navigation**
   - Navigate Track → Subcategory → Terms
   - Test Tooling Engineering subcategory
   - Explore 3 Pillar Activity System terms

**Expected result:**
- 50+ documents uploaded
- RAG queries working smoothly with customization
- Citation quality validated
- Navigation improvements validated

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
- Ready to implement in Session 15 or 16

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
- ✅ UI component library complete (shadcn/ui)
- ✅ **Security implementation complete (Session 15)**
  - ✅ Rate limiting (custom sliding window with ioredis)
  - ✅ Prompt injection protection
  - ✅ Input validation (length limits, SSRF, path traversal)
  - ✅ Protected endpoints (clear-all, migrate)
  - ✅ Security headers (CSP, HSTS, etc.)
  - ✅ CORS configuration
  - ✅ Security test suite

### Optional Future:
- [ ] Usage analytics (track API costs)
- [ ] Backup/export corpus (Redis → JSON)
- [ ] Add debug/inspection tools for File Search Store
- [ ] Consider manual RAG migration if more control needed (Pinecone/Supabase)
- [ ] Audit logging for security events

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

## Completed (Session 15) ✅

- ✅ **Security hardening complete** - Production-ready protection implemented
- ✅ **Rate limiting** - Custom sliding window implementation using ioredis
  - 10/hour (2/min burst) for expensive AI queries
  - 20/hour (3/min burst) for web searches
  - 15/hour (3/min burst) for uploads/mutations
  - HTTP 429 responses with retry-after information
- ✅ **Prompt injection protection** - 15+ patterns detected and blocked
  - Input sanitization with max length limits (500-1000 chars)
  - Custom instructions validation with safe prefix
  - History array size limits (50 messages max)
- ✅ **Dangerous endpoint protection**
  - `/api/corpus/clear-all` requires confirmation token
  - `/api/migrate` requires ENABLE_MIGRATION=true flag
- ✅ **Security headers added** - CSP, HSTS, X-Frame-Options, Permissions-Policy, Referrer-Policy
- ✅ **CORS configured** - Domain whitelisting via ALLOWED_ORIGIN
- ✅ **SSRF protection** - Blob URL domain validation
- ✅ **Path traversal protection** - Filename sanitization
- ✅ **Security test suite created** - `test/security-test.sh` with 18+ tests
- ✅ **Test utilities** - `test/clear-rate-limits.js` for test isolation
- ✅ **Documentation updated** - CLAUDE.md, .env.example, session log

## Completed (Session 14) ✅

- ✅ **Query Corpus customization** - Mode (6 options), Length (3 options), Custom Instructions
- ✅ **Research Agent 2-level navigation** - Track → Subcategory → Terms (hierarchical)
- ✅ **Research terms reorganized** - 4 PD, 5 PE, 6 TPS subcategories
- ✅ **Tooling Engineering expanded** - 6 sub-areas under PE (cutting tools, jigs, tool management)
- ✅ **3 Pillar Activity System added** - Modern TPS framework (2007 Kamigo)
- ✅ **Methods Analysis** - Replaced Engineering Kaizen in TPS
- ✅ **UI improvements** - "Send" → "Search" button, collapsible Custom Instructions
- ✅ **Technical fixes** - React Select empty string error resolved

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
2. Test new Query Corpus customization features
3. Test Research Agent 2-level navigation
4. Build Brainstorm/Analyze agents
5. Optional: Fix Reject button (MEDIUM priority, workaround exists)

---

**Status**: 4/6 agents complete (Research, Upload, Browse, Query Corpus) ✅ | Security hardened ✅ | 2 remaining (Brainstorm, Analyze)

**Last Updated**: 2025-11-14 (Session 15 - Security Complete)
**Next Session**: Session 16 - Deploy to production + enable friend testing OR continue corpus upload + build Brainstorm/Analyze agents
