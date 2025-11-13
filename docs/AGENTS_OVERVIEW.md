# TRS Agents Overview

Complete guide to all 7 agents in the Toyota Research System, their purposes, workflows, and use cases.

---

## 🔍 Phase 1: Research & Document Collection

### 1. Research Agent ✅ WORKING
**Purpose**: Find high-quality Japanese and English research papers that regular search engines miss

**Key Features**:
- 228 curated bilingual search terms organized by category:
  - Safety (衝突安全, crash safety, etc.)
  - Autonomous Driving (自動運転, ADAS, etc.)
  - EV/Battery (電気自動車, battery technology, etc.)
  - Production Engineering (生産技術, manufacturing, etc.)
  - TPS/Kaizen (カイゼン, lean manufacturing, etc.)
- Dual search modes:
  - **Guided**: Category → Term dropdown selection
  - **Free-form**: Direct query input
- Targeted search buttons for specialized databases:
  - J-STAGE (Japanese academic papers)
  - Google Patents (patent documents)
  - Google Scholar (academic research)
  - Google JP (Japanese web results)
- Pagination with "Load More" for deep searches

**Workflow**:
1. Select category and search terms OR enter free-form query
2. Click search or use targeted database button
3. Review results (5 per page)
4. Download relevant papers/documents
5. Upload to system via Upload Agent

**Why It's Better Than Regular Google**:
- Bypasses SEO spam and ads
- Access to academic databases (J-STAGE)
- Bilingual term matching
- Specialized patent search
- Curated terminology from Toyota domain experts

**Use Case Example**:
> You're researching Toyota's die machining innovations. Select "Production Engineering" → "金型加工 (die machining)" → Search J-STAGE. Get 4 high-quality Japanese academic papers that don't appear in regular Google results.

---

## 📤 Phase 2: Document Processing

### 2. Upload Agent ✅ WORKING
**Purpose**: Process documents and extract structured metadata for corpus building

**Key Features**:
- Drag-and-drop file upload (PDF, DOCX, TXT)
- Gemini reads files directly (no external parsing libraries)
- AI-powered metadata extraction:
  - Title (auto-generated if missing)
  - Authors (extracted from document)
  - Year (publication/creation year)
  - Track classification (PE, PD, TPS, Cross-Cutting, Unknown)
  - Language detection (Japanese, English, Mixed)
  - Keywords (5-10 relevant terms, bilingual)
  - Summary (2-3 sentence abstract)
  - Document type (Academic Paper, Company Report, Technical Document, Patent, Other)
  - Confidence level (high, medium, low)
- Review dashboard with:
  - Edit Metadata dialog for corrections
  - Approve workflow (pending_review → approved)
  - Status tracking in Redis
- Approved documents automatically added to queryable corpus

**Workflow**:
1. Drag PDF/DOCX/TXT file into upload zone
2. System uploads to Gemini Files API
3. AI extracts metadata (30-60 seconds)
4. Review extracted metadata in dashboard
5. Edit if needed (correct track, add context notes)
6. Click "Approve" to add to corpus
7. Document now queryable by Summary/Analyze/Outline agents

**Track Classifications**:
- **PD**: Product Development (CAD, PLM, simulation, design)
- **PE**: Production Engineering (equipment, process design, tooling, jigs, 生産技術)
- **TPS**: Toyota Production System (kaizen, quality control, lean, 品質管理)
- **Cross-Cutting**: Management, digital transformation, organizational

**Use Case Example**:
> Upload "Production Engineering Strategies at Toyota (2014).pdf" → AI extracts: Title, Author (Tatsuro Takami), Year (2014), Track (PE), Language (English), Keywords (TPS, metalworking, forging, stamping, jidoka, JIT) → Review → Approve → Document now searchable

---

### 3. Images Agent 🔨 NOT IMPLEMENTED YET
**Purpose**: Extract text and technical information from diagrams, charts, and technical drawings

**Planned Features**:
- Image upload (PNG, JPG, GIF, WEBP)
- Gemini Vision API analysis:
  - Diagram type identification (flowchart, organizational chart, technical drawing, etc.)
  - OCR text extraction from images
  - Component/element identification
  - Relationship mapping
- Metadata generation:
  - Title/caption inference
  - Tags (process flow, equipment diagram, etc.)
  - Technical keywords
  - Description generation
- Review and approve workflow (same as Upload Agent)
- Converted text added to corpus for RAG queries

**Planned Workflow**:
1. Upload image file
2. Vision analysis extracts visual elements and text
3. Review extracted metadata
4. Approve to convert to text document
5. Text document added to corpus

**Use Case Example**:
> Upload Toyota assembly line flowchart diagram → Vision API identifies: process flow, 15 stations, quality checkpoints → Extracts text labels in Japanese → Generates description → Approve → Now queryable as "Toyota Assembly Process Flow Document"

**Why This Matters**:
- Many Toyota documents contain critical diagrams
- Manual transcription is time-consuming
- Vision AI can extract text + understand visual relationships
- Makes visual information searchable

---

## 💬 Phase 3: Querying & Analysis

### 4. Summary Agent ✅ WORKING
**Purpose**: Query the approved document corpus with natural language and get AI-powered answers with citations

**Key Features**:
- RAG (Retrieval-Augmented Generation) queries on approved documents
- Context-aware responses based on corpus metadata
- Conversation history support (multi-turn dialogues)
- Automatic citation extraction (`[1]`, `[2]` format)
- Document sidebar showing referenced files
- Citation cards with:
  - Document title
  - Excerpt from summary
  - Source reference
- Handles empty corpus gracefully
- ~2-3 second response time

**Current Implementation** (V1):
- Metadata-based RAG (uses summaries, keywords, titles)
- Queries all approved documents from Redis
- Gemini 2.0 Flash with conversation history
- Citations extracted via regex pattern matching

**Future Enhancement** (V2):
- File Search stores with full document chunking
- Vector search for semantic retrieval
- Exact quote extraction with page numbers
- Better grounding with document snippets

**Workflow**:
1. Ask natural language question about Toyota research
2. AI searches approved documents
3. Generates answer based on relevant documents
4. Shows citations and referenced documents
5. Continue conversation with follow-up questions

**Use Case Example**:
> **Q**: "What are Toyota's main production engineering strategies?"
>
> **A**: "Based on the provided document, the main production engineering strategies at Toyota are deeply rooted in the Toyota Production System (TPS) [1]. This encompasses:
> - Jidoka (automation with a human touch)
> - Just-in-time (JIT) production
> - Continuous improvement (kaizen)
> - Metalworking innovations (forging, stamping)
> - Focus on ryouhin joken (good product condition)"
>
> **Citations**: [1] Production engineering strategies and metalworking at Toyota Motor Corporation (Tatsuro Takami, 2014)

**Follow-up Question**:
> "What is ryouhin joken?" → AI finds relevant context and explains the concept

---

### 5. Analyze Agent 🔨 NOT IMPLEMENTED YET
**Purpose**: Find supporting citations from the corpus for specific research claims

**Planned Features**:
- Claim input field
- Citation type selector:
  - **Quotes**: Direct quotations supporting the claim
  - **Examples**: Case studies or examples demonstrating the claim
  - **Data**: Statistics, measurements, numerical evidence
- Search corpus for relevant supporting evidence
- Relevance scoring (high, medium, low)
- Citation cards with:
  - Full excerpt/quote
  - Context (surrounding text)
  - Source document + page number
  - Relevance explanation
- Copy citation button (formatted for academic papers)
- Export all citations to Markdown

**Planned Workflow**:
1. Enter research claim (e.g., "TPS improves manufacturing efficiency")
2. Select citation type (quotes, examples, or data)
3. AI searches approved documents
4. Returns 5-10 relevant citations with relevance scores
5. Click to copy formatted citation
6. Export all to include in research paper

**Use Case Example**:
> **Claim**: "Toyota's jidoka principle reduces defect rates"
> **Type**: Data
>
> **Results**:
> 1. "Implementation of jidoka reduced defect rates by 47% in stamping operations" (PE Report 2014, p.23) - **High relevance**
> 2. "Quality control data showed 3.2 sigma improvement after jidoka implementation" (TPS Study 2015, p.89) - **High relevance**
> 3. Example: Forging line jidoka case study with before/after metrics - **Medium relevance**

**Why This Matters**:
- Speeds up research paper writing
- Finds supporting evidence automatically
- Ensures claims are backed by corpus documents
- Maintains academic rigor

---

## 📝 Phase 4: Writing & Editing

### 6. Outline Agent 🔨 NOT IMPLEMENTED YET (MOST COMPLEX)
**Purpose**: Generate hierarchical article outlines based on corpus coverage and assess knowledge gaps

**Planned Features**:
- Topic input field
- Optional outline hints/structure
- Corpus coverage assessment per section:
  - **Strong**: 5+ relevant documents, comprehensive coverage
  - **Moderate**: 2-4 documents, partial coverage
  - **Weak**: 1 document, minimal coverage
  - **Missing**: No relevant documents, knowledge gap
- Hierarchical outline generation (levels 1-3):
  - Level 1: Main sections (Introduction, Methods, Results, etc.)
  - Level 2: Subsections
  - Level 3: Key points
- Interactive refinement:
  - Click section to expand
  - Chat to request more detail
  - Regenerate specific sections
- Coverage visualization (badges/colors)
- Export to Markdown

**Planned Workflow**:
1. Enter article topic (e.g., "Toyota's approach to production automation")
2. AI queries corpus for relevant documents
3. Generates outline with coverage assessment
4. Review outline - identify gaps (sections with "Missing" or "Weak" coverage)
5. Use Research Agent to find more documents for weak areas
6. Upload and approve new documents
7. Regenerate outline with better coverage
8. Export final outline to Markdown

**Use Case Example**:
> **Topic**: "Evolution of Toyota Production System from 1990-2020"
>
> **Generated Outline**:
> 1. Introduction [Strong - 8 documents]
>    1.1 Origins of TPS [Strong - 5 docs]
>    1.2 Core Principles [Strong - 6 docs]
>
> 2. 1990s Developments [Moderate - 3 documents]
>    2.1 Globalization Challenges [Weak - 1 doc] ⚠️
>    2.2 Supplier Integration [Moderate - 2 docs]
>
> 3. 2000s Digital Transformation [Missing - 0 documents] ⚠️ KNOWLEDGE GAP
>
> 4. 2010s Automation Advances [Strong - 7 documents]
>    4.1 Robotics Integration [Strong - 4 docs]
>    4.2 Industry 4.0 Adoption [Moderate - 3 docs]
>
> 5. 2020 and Beyond [Weak - 1 document] ⚠️
>
> **Action Items**:
> - Search for documents on "Toyota digital transformation 2000s"
> - Find more sources on "Toyota globalization 1990s"
> - Research "Toyota future production strategies 2020"

**Why This Is Powerful**:
- Identifies knowledge gaps BEFORE writing
- Ensures comprehensive coverage
- Guides research efforts efficiently
- Creates well-structured outlines
- Prevents incomplete research papers

---

### 7. Editor Agent 🔨 NOT IMPLEMENTED YET
**Purpose**: AI-powered text refinement with corpus-aware suggestions across 5 categories

**Planned Features**:
- Split-view UI:
  - Left: Text editor (input)
  - Right: Suggestions panel
- 5 suggestion categories:
  1. **📖 Terminology**: Check against corpus vocabulary, suggest corrections
  2. **📚 Citation**: Suggest where to add citations, recommend relevant documents
  3. **💡 Clarity**: Improve readability, simplify complex sentences
  4. **🏗️ Structure**: Reorganize paragraphs, improve flow
  5. **✨ Style**: Professional academic tone, consistent voice
- Original vs. suggested diff view with highlighting
- Apply individual suggestion or apply all
- Word count tracker
- Clear/reset button
- Export refined text

**Planned Workflow**:
1. Paste draft text into editor
2. Click "Analyze" button
3. AI generates suggestions across 5 categories
4. Review each suggestion:
   - See original vs. suggested side-by-side
   - Read explanation for each change
5. Apply individual suggestions or apply all
6. Copy refined text or export to file

**Use Case Example**:
> **Original Text**:
> "Toyota makes cars using their TPS system which is very efficient and helps them produce quality vehicles."
>
> **Suggestions**:
>
> 1. **📖 Terminology** (Line 1):
>    - Original: "TPS system"
>    - Suggested: "Toyota Production System (TPS)"
>    - Reason: Avoid redundancy (system system), spell out first use
>
> 2. **📚 Citation** (Line 1):
>    - Suggested insertion point: after "quality vehicles"
>    - Add: [Takami, 2014] for TPS methodology citation
>    - Reason: Claim about TPS efficiency needs supporting citation
>
> 3. **💡 Clarity** (Line 1):
>    - Original: "very efficient"
>    - Suggested: "improves production efficiency by reducing waste and ensuring quality at each production stage"
>    - Reason: Vague modifier → specific benefits
>
> 4. **🏗️ Structure**:
>    - Suggestion: Split into two sentences for better flow
>
> 5. **✨ Style** (Line 1):
>    - Original: "Toyota makes cars"
>    - Suggested: "Toyota manufactures vehicles"
>    - Reason: More formal academic tone
>
> **Refined Text**:
> "Toyota manufactures vehicles using the Toyota Production System (TPS), which improves production efficiency by reducing waste and ensuring quality at each production stage. This approach enables consistent production of high-quality vehicles [Takami, 2014]."

**Why This Matters**:
- Maintains consistent terminology
- Ensures proper citations
- Improves academic writing quality
- Catches style inconsistencies
- Corpus-aware suggestions (uses your research library)

---

## Complete Workflow Examples

### Scenario 1: Writing a Research Paper on Toyota Metalworking

**Step 1: Research Phase**
- Use **Research Agent** → Search "金型加工" (die machining) on J-STAGE
- Find 5 Japanese academic papers
- Download PDFs

**Step 2: Document Processing**
- Use **Upload Agent** → Upload 5 PDFs
- Review AI-extracted metadata
- Edit tracks (classify as PE)
- Approve all 5 documents

**Step 3: Preliminary Research**
- Use **Summary Agent** → Ask "What metalworking techniques does Toyota use?"
- Get overview with citations
- Follow up: "Explain forging vs. stamping processes"
- Build understanding of topic

**Step 4: Outline Creation**
- Use **Outline Agent** → Topic: "Toyota's Metalworking Innovations 2010-2020"
- Review coverage assessment
- Identify gaps (e.g., "Missing: stamping automation 2015-2020")
- Return to Research Agent to fill gaps
- Regenerate outline with complete coverage

**Step 5: Writing Sections**
- Use **Summary Agent** → Ask detailed questions per section
- Get content with citations
- Draft paragraphs

**Step 6: Citation Support**
- Use **Analyze Agent** → Enter claim: "Toyota's forging technology reduces material waste"
- Get supporting citations with data
- Add to draft with proper references

**Step 7: Image Processing** (if applicable)
- Use **Images Agent** → Upload technical diagrams from papers
- Extract text descriptions
- Reference in paper

**Step 8: Final Refinement**
- Use **Editor Agent** → Paste full draft
- Apply terminology corrections
- Add missing citations where suggested
- Improve clarity and style
- Export final version

**Result**: Well-researched, properly cited, professionally written paper on Toyota metalworking - completed in 50% less time than manual research.

---

### Scenario 2: Quick Fact-Checking

**Need**: Verify a claim about TPS for a presentation

**Workflow**:
1. **Analyze Agent** → "TPS reduces inventory costs"
2. Get 3-5 citations with data/examples
3. Copy formatted citations
4. Add to presentation slides

**Time**: 2-3 minutes vs. 30+ minutes of manual searching

---

### Scenario 3: Exploring New Research Area

**Need**: Understand Toyota's EV battery strategy (new topic, no prior knowledge)

**Workflow**:
1. **Research Agent** → Search "電気自動車" (electric vehicles) + "バッテリー" (battery)
2. Upload 10-15 documents via **Upload Agent**
3. **Summary Agent** → Ask broad questions:
   - "What is Toyota's EV battery strategy?"
   - "What battery technologies is Toyota developing?"
   - "What are the main challenges?"
4. Follow-up questions based on answers
5. **Outline Agent** → Generate outline for potential research paper
6. Identify knowledge gaps
7. Return to Research Agent for targeted searches

**Result**: Comprehensive understanding of new topic in 2-3 hours vs. 2-3 days of manual research.

---

## Agent Dependencies

### Standalone (No Dependencies)
- **Research Agent**: Works independently

### Requires Approved Documents
- **Summary Agent**: Needs ≥1 approved document
- **Analyze Agent**: Needs ≥1 approved document (preferably 5+)
- **Outline Agent**: Needs ≥3 approved documents for good coverage
- **Editor Agent**: Corpus-aware features need ≥1 document (but can work without)

### Pipeline Dependencies
- **Upload Agent** → **Images Agent** (images converted to text documents)
- **Research Agent** → **Upload Agent** → **Summary/Analyze/Outline Agents**

---

## Status Summary

| Agent | Status | Complexity | Est. Time | Dependencies |
|-------|--------|------------|-----------|--------------|
| Research | ✅ Working | Medium | - | None |
| Upload | ✅ Working | Medium | - | Gemini Files API |
| Summary | ✅ Working | High | - | Upload Agent, Redis |
| Images | 🔨 Pending | Medium | 2 hours | Vision API |
| Analyze | 🔨 Pending | Medium | 2 hours | Summary Agent pattern |
| Outline | 🔨 Pending | High | 3 hours | Summary Agent + complexity |
| Editor | 🔨 Pending | Medium | 2 hours | None (corpus optional) |

**Total Remaining**: ~9 hours to complete all 7 agents

---

## Implementation Priority Recommendations

### Option A: User Value First
1. **Analyze Agent** (2h) - Immediate value for citing research
2. **Editor Agent** (2h) - Helps with current writing
3. **Images Agent** (2h) - Process existing diagram backlog
4. **Outline Agent** (3h) - Most complex, save for last

### Option B: Complexity First
1. **Outline Agent** (3h) - Tackle most complex first
2. **Images Agent** (2h) - Vision API integration
3. **Analyze Agent** (2h) - Citation finding
4. **Editor Agent** (2h) - Finish strong with quick win

### Option C: Natural Workflow
1. **Images Agent** (2h) - Complete document processing pipeline
2. **Analyze Agent** (2h) - Build on Summary Agent
3. **Outline Agent** (3h) - Article planning
4. **Editor Agent** (2h) - Final writing stage

**Recommendation**: **Option C - Natural Workflow** follows the actual research process flow and builds incrementally on existing patterns.

---

**Last Updated**: 2025-11-12 Session 5
**3/7 Agents Complete**: Research, Upload, Summary ✅
