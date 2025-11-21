# Toyota Research System V2 - Technical Specification

**Version**: 2.0
**Date**: November 12, 2025
**Status**: Production Build (Not Prototype)

---

## Executive Summary

Building a **Fortune 50-quality Toyota Research System** - a multi-agent AI platform for researching, analyzing, and writing about Toyota's practices across all domains (Product Development, Production Engineering, Operations, Purchasing, Supplier Development, etc.).

**Think NotebookLM for Toyota Research** - but specialized, multi-agent, and user-controlled:
- Upload documents (journals, patents, technical reports, personal notes)
- AI understands corpus with RAG (File Search)
- Ask questions → Get grounded answers with citations
- **Plus**: Specialized agents (Research, Upload, Summary, Outline, Analyze, Editor)
- **Plus**: Toyota domain expertise (understands 生産技術, kosaku-zumen, PE/PD/Ops)
- **Plus**: Your infrastructure (Vercel deployment, controlled access)
- **Plus**: Custom workflows for article writing

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NEXT.JS FRONTEND                          │
│                 (TypeScript + Tailwind + Shadcn)             │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Research │ │  Upload  │ │ Summary  │ │ Outline  │      │
│  │   Tab    │ │   Tab    │ │   Tab    │ │   Tab    │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│  ┌──────────┐ ┌──────────┐                                 │
│  │ Analyze  │ │  Editor  │                                 │
│  │   Tab    │ │   Tab    │                                 │
│  └──────────┘ └──────────┘                                 │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              VERCEL SERVERLESS FUNCTIONS                     │
│                    (API Routes)                              │
│                                                              │
│  /api/research/*    - Research agent endpoints              │
│  /api/upload/*      - Document upload & processing          │
│  /api/summary/*     - Summary generation                    │
│  /api/outline/*     - Article outlining                     │
│  /api/analyze/*     - Citation finding                      │
│  /api/editor/*      - Text refinement                       │
│  /api/corpus/*      - Corpus management                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI LAYER                                  │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Gemini Flash 2.5 (→ 3.0 when available)          │    │
│  │  - Primary AI for all agents                       │    │
│  │  - Conversation generation                         │    │
│  │  - Analysis & synthesis                            │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  File Search (Managed RAG)                  │    │
│  │  - Vector database (managed)                       │    │
│  │  - Document storage                                │    │
│  │  - Semantic search / grounding                     │    │
│  │  - Text-only (images support coming 3-6 months)   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Claude Sonnet (Optional)                          │    │
│  │  - Use for specific tasks where superior          │    │
│  │  - Document classification, nuanced analysis       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  OpenAI (Optional)                                 │    │
│  │  - Use where beneficial (embeddings, etc.)         │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              OPTIONAL: RAILWAY (Heavy Processing)            │
│                                                              │
│  - Long-running document processing (>10 min)               │
│  - Batch operations                                         │
│  - Only if Vercel limits are hit                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend
| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Framework | Next.js | 14+ (App Router) | React framework with SSR/SSG |
| Language | TypeScript | 5.0+ | Type safety |
| Styling | Tailwind CSS | 3.4+ | Utility-first CSS |
| UI Components | Shadcn/ui | Latest | Pre-built accessible components |
| State Management | React Hooks + Context | - | Local state (no persistence) |
| Forms | React Hook Form | 7.0+ | Form validation |
| File Upload | react-dropzone | Latest | Drag-and-drop uploads |

### Backend (Vercel Serverless)
| Component | Technology | Purpose |
|-----------|-----------|---------|
| API Routes | Next.js API Routes | Serverless functions |
| Runtime | Node.js 20+ | Execution environment |
| Timeout | 10 seconds (Hobby), 60s (Pro) | Function execution limit |
| Memory | 1024 MB | Function memory |

### AI & RAG
| Component | Technology | API | Purpose |
|-----------|-----------|-----|---------|
| Primary AI | Gemini Flash 2.5 → 3.0 | Google AI SDK | All agents |
| RAG/Vector DB | File Search | Google AI SDK | Document storage & retrieval |
| Secondary AI | Claude Sonnet 4.5 | Anthropic SDK | Optional specialized tasks |
| Tertiary AI | GPT-4 | OpenAI SDK | Optional where beneficial |

### Data Storage
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Document Files | File Search | Managed by Google |
| Metadata (optional) | Vercel KV (Redis) | Document metadata, user prefs |
| Conversation Export | User's local filesystem | Download as JSON/Markdown |

### Deployment
| Component | Service | Purpose |
|-----------|---------|---------|
| Frontend + API | Vercel | Primary hosting |
| Heavy Processing | Railway | Long-running tasks (if needed) |
| Domain | Custom domain | Professional URL |

---

## Multi-Agent System

### Agent Architecture

Each agent is a specialized AI assistant with:
- **Specific prompt template** (system instructions)
- **Dedicated UI tab** (isolated interface)
- **API endpoint** (backend logic)
- **Conversation state** (session-based, not persisted)

### Agent 1: Research Agent

**Purpose**: Help find and download articles from J-STAGE, patents, etc.

**Reference**: See `research_terms.md` for master list of Japanese/English search terms organized by track (PD/PE/TPS), critical mistranslations, supplier names, and J-STAGE/patent search strategies.

**Capabilities**:
- Suggest Japanese search terms for J-STAGE
- Track what's been searched / downloaded
- Recommend research priorities
- Generate search strategies

**UI Elements**:
- Search term suggestion
- Research priority list
- Download tracking checklist

**API Endpoint**: `/api/research`

**Sample Interaction**:
```
User: "I need articles about kosaku-zumen"
Agent: "Here are 8 Japanese search terms for J-STAGE:
1. 工作図面 (kosaku-zumen)
2. 作業図面 (sagyo zumen - work drawings)
3. 工程設計図 (process design drawings)
...
Priority: Start with #1 and #3 (most specific)"
```

**No RAG needed**: This agent doesn't query the corpus, just helps with external research.

### Agent 2: Upload Agent

**Purpose**: Ingest documents into File Search with automatic processing

**Capabilities**:
- Accept PDF, DOCX, TXT files
- Extract metadata automatically (title, year, topics)
- Chunk large documents (avoid timeouts)
- Upload to File Search
- Log processing status

**UI Elements**:
- Drag-and-drop upload zone
- Processing queue with status
- Human review dashboard (verify auto-extracted metadata)
- Manual metadata override

**API Endpoint**: `/api/upload`

**Processing Flow**:
```
1. User drops file(s)
2. File uploads to Vercel (temp storage)
3. API route:
   a. Extract text (PyPDF2 or similar)
   b. Chunk if large (10-20 page chunks)
   c. AI extraction (title, year, summary, topics)
   d. Upload to File Search
   e. Log metadata
4. Show in review dashboard
5. User can edit metadata or approve
```

**Timeout Handling**:
- Chunk documents >50 pages
- Process chunks sequentially
- If >10min processing, offload to Railway

### Agent 3: Summary Agent

**Purpose**: Answer questions about what the corpus contains

**Capabilities**:
- Query corpus via File Search
- Synthesize across multiple documents
- Provide citations
- Identify knowledge gaps

**UI Elements**:
- Chat interface
- Source citation display
- "Documents referenced" sidebar
- Download conversation button

**API Endpoint**: `/api/summary`

**Sample Interaction**:
```
User: "What do we know about PE#1's machine tool design process?"
Agent: "Based on 12 documents:

1. WORKFLOW OVERVIEW
PE#1 follows a 5-phase process: Requirements → Design → Manufacturing → Testing → Delivery
[Sources: PE#1 Workflow Chart, PE Dept Description]

2. KEY ARTIFACTS
Primary output is kosaku-zumen (operations drawings)
[Sources: Kosaku-zumen Analysis Paper]

3. EQUIPMENT TYPES
Specializes in die machining centers, grinders, jigs
[Sources: 6 equipment patents]

KNOWLEDGE GAPS:
- Cost estimation methods (not documented)
- Testing validation criteria (mentioned but not detailed)"
```

**RAG Integration**: Uses File Search grounding

### Agent 4: Outline Agent

**Purpose**: Interactive article structuring and drafting

**Capabilities**:
- Generate article outlines based on corpus
- Discuss structure iteratively
- Draft sections with citations
- Suggest improvements

**UI Elements**:
- Split view: outline on left, chat on right
- Editable outline tree
- Section expansion
- Export to Markdown/Google Docs

**API Endpoint**: `/api/outline`

**Sample Interaction**:
```
User: "Help me outline an article about PE#1 machine tool design"
Agent: "Based on available knowledge, here's a proposed structure:

# How Toyota PE#1 Designs World-Class Machine Tools

## 1. Introduction: The Invisible Department
   Coverage: Strong (4 org docs)

## 2. The Five-Phase Design Process
   2.1 Requirements Gathering
   2.2 Kosaku-zumen Creation
   2.3 Manufacturing
   2.4 Testing & Validation ⚠️ WEAK
   2.5 Delivery

## 3. Case Study: Die Machining Center
   Coverage: Excellent (6 patents)

## 4. What Makes Toyota Different
   Coverage: Can synthesize

Sections 2.4 needs more research. Proceed with others?"

User: "Yes, draft section 1"
Agent: [Generates introduction with citations]
```

**State Management**: Outline stored in browser session storage (download before closing)

### Agent 5: Analyze Agent

**Purpose**: Find specific citations and examples to support claims

**Capabilities**:
- Search corpus for evidence
- Extract quotes with context
- Compare across documents
- Find contradictions

**UI Elements**:
- Query input
- Citation cards with source info
- Quote highlighting
- Export citations

**API Endpoint**: `/api/analyze`

**Sample Interaction**:
```
User: "Find 5 quotes supporting: Toyota designs critical equipment in-house"
Agent:
QUOTE 1:
"PE#1 maintains design capability for over 60 major equipment types..."
Source: PE Department Organization (2018), p.12

QUOTE 2:
"Unlike Western automotive companies that purchase machine tools from
suppliers, Toyota's production engineering departments design and
manufacture critical equipment internally."
Source: TTR Vol64 Article 5, p.92

[3 more quotes with sources]
```

**RAG Integration**: Heavy use of File Search semantic search

### Agent 6: Editor Agent

**Purpose**: Refine writing, improve clarity, check consistency

**Capabilities**:
- Review text for clarity
- Check Toyota terminology consistency
- Suggest improvements
- Verify citations format

**UI Elements**:
- Text editor
- Inline suggestions
- Terminology checker
- Citation validator

**API Endpoint**: `/api/editor`

**Sample Interaction**:
```
User: [Pastes draft section]
Agent: "Here are 6 suggestions:

1. TERMINOLOGY: You use 'production preparation' and 'seisan junbi'
   interchangeably. Pick one or define both at first use.

2. CITATION: Line 23 claims 'PE#1 designs 60+ equipment types' but no
   source cited. Suggest adding: [PE Org Doc 2018]

3. CLARITY: Paragraph 3 is 8 sentences. Consider splitting.

[3 more suggestions]

Apply all? Or review individually?"
```

**No RAG needed initially**: Focuses on text refinement, not corpus queries

---

## Data Flow

### Document Upload Flow

```
┌─────────────┐
│   User      │
│ Drops File  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│  Next.js Upload Page    │
│  (react-dropzone)       │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  /api/upload POST                │
│  1. Receive file                 │
│  2. Save to temp storage         │
│  3. Extract text                 │
│  4. Chunk if large              │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Gemini Flash 2.5               │
│  Extract metadata:              │
│  - Title                        │
│  - Year                         │
│  - Summary                      │
│  - Topics                       │
│  - Track (PD/PE/Ops/etc)       │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  File Search             │
│  Upload document + metadata     │
│  Returns: file_id               │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Review Dashboard               │
│  Show extracted metadata        │
│  Allow human correction         │
└─────────────────────────────────┘
```

### Query Flow (Summary/Analyze Agents)

```
┌─────────────┐
│   User      │
│  Asks Query │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│  Agent Tab UI           │
│  (Chat Interface)       │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  /api/summary (or /api/analyze) │
│  Receives query + history       │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Gemini Flash 2.5               │
│  + File Search Grounding │
│  - Retrieves relevant passages  │
│  - Generates response           │
│  - Includes citations           │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Response to UI                 │
│  - Answer text                  │
│  - Source citations             │
│  - Referenced documents         │
└─────────────────────────────────┘
```

---

## Conversation Management

### No Persistence Initially

**Design Decision**: Conversations are session-based only

**Rationale**:
- Simpler implementation
- No database needed
- Privacy (nothing stored server-side)
- Faster development

**Implementation**:
- State stored in browser (React state + sessionStorage)
- Download conversation as JSON or Markdown before closing
- Future: Add optional persistence with Vercel KV

**Download Format**:
```json
{
  "agent": "summary",
  "timestamp": "2025-11-12T10:30:00Z",
  "messages": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "...", "citations": [...]}
  ]
}
```

Or Markdown:
```markdown
# Research Session - Summary Agent
Date: November 12, 2025

## Query 1
**User**: What do we know about PE#1?
**Agent**: Based on 12 documents...
[Source: PE#1 Workflow Chart]

## Query 2
...
```

---

## UI/UX Design

### Layout Structure

```
┌────────────────────────────────────────────────────────────┐
│  Header                                                     │
│  [Toyota Research System]         [User] [Settings]        │
└────────────────────────────────────────────────────────────┘
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Tab Navigation                                       │ │
│  │  [Research] [Upload] [Summary] [Outline] [Analyze] [Editor]
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                                                       │ │
│  │          Tab Content Area                            │ │
│  │          (Agent-specific UI)                         │ │
│  │                                                       │ │
│  │                                                       │ │
│  │                                                       │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Shadcn/ui Components Used

| Component | Usage |
|-----------|-------|
| Tabs | Main navigation |
| Card | Document cards, citation cards |
| Button | Actions throughout |
| Input / Textarea | User input |
| Dialog | Metadata editing, confirmations |
| Badge | Tags, status indicators |
| Separator | Visual divisions |
| ScrollArea | Long content areas |
| Skeleton | Loading states |
| Toast | Notifications |
| Dropdown Menu | Settings, options |
| Progress | Upload/processing progress |

### Upload Agent Tab

```
┌─────────────────────────────────────────────────────────┐
│  📁 Upload Documents                                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────────┐│
│  │                                                     ││
│  │     📄 Drag & drop files here                      ││
│  │     or click to browse                             ││
│  │                                                     ││
│  │     Supports: PDF, DOCX, TXT                       ││
│  │                                                     ││
│  └────────────────────────────────────────────────────┘│
│                                                          │
│  Processing Queue:                                       │
│  ┌────────────────────────────────────────────────────┐│
│  │ ⏳ file1.pdf - Extracting text... 40%             ││
│  │ ✅ file2.docx - Complete                          ││
│  └────────────────────────────────────────────────────┘│
│                                                          │
│  Review Dashboard:                                       │
│  ┌────────────────────────────────────────────────────┐│
│  │ 📄 Production Engineering Strategies               ││
│  │    Year: 2018  Track: PE  Topics: Die design...   ││
│  │    [Edit Metadata] [Approve]                       ││
│  ├────────────────────────────────────────────────────┤│
│  │ 📄 PE#1 Workflow Chart                            ││
│  │    Year: 2020  Track: PE  Topics: Workflow...     ││
│  │    [Edit Metadata] [Approve]                       ││
│  └────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Summary Agent Tab

```
┌─────────────────────────────────────────────────────────┐
│  💬 Summary Agent                                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────┬──────────────────────────────────┐ │
│  │ Documents (32) │  Conversation                    │ │
│  │                │                                  │ │
│  │ [Filter]       │  You: What do we know about    │ │
│  │ ☑ PE          │       PE#1?                     │ │
│  │ □ PD          │                                  │ │
│  │ □ Ops         │  Agent: Based on 12 documents... │ │
│  │                │  [Full response with citations] │ │
│  │ • PE#1 Flow    │                                  │ │
│  │ • Die Design   │  Documents Referenced:          │ │
│  │ • Kosaku-zumen │  • PE#1 Workflow Chart          │ │
│  │   ...          │  • PE Dept Organization         │ │
│  │                │  • Equipment Patents (6)        │ │
│  │                │                                  │ │
│  │                │  [Input box]                    │ │
│  │                │  [Send] [Download Conversation] │ │
│  └────────────────┴──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Outline Agent Tab

```
┌─────────────────────────────────────────────────────────┐
│  📝 Outline Agent                                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────┬───────────────────────────────┐   │
│  │ Outline         │  Chat                         │   │
│  │                 │                               │   │
│  │ # Article Title │  You: Help me outline an     │   │
│  │                 │       article about PE#1      │   │
│  │ ▼ 1. Intro      │                               │   │
│  │   └─ Coverage: ✅│  Agent: Here's a structure... │   │
│  │                 │                               │   │
│  │ ▼ 2. Process    │  You: Draft section 1         │   │
│  │   ├─ 2.1 Phase1 │                               │   │
│  │   ├─ 2.2 Phase2 │  Agent: [Generates intro     │   │
│  │   └─ 2.3 Testing│         with citations]       │   │
│  │       └─ ⚠️ Weak │                               │   │
│  │                 │  [Input box]                  │   │
│  │ ▶ 3. Case Study │  [Send]                       │   │
│  │                 │                               │   │
│  │ [Export MD]     │                               │   │
│  └─────────────────┴───────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## API Routes Structure

### File Organization

```
app/
├── api/
│   ├── research/
│   │   └── route.ts           # POST - Generate search terms
│   ├── upload/
│   │   ├── route.ts           # POST - Upload file
│   │   ├── process/
│   │   │   └── route.ts       # POST - Process uploaded file
│   │   └── review/
│   │       └── route.ts       # GET - Get pending reviews
│   ├── summary/
│   │   └── route.ts           # POST - Query corpus
│   ├── outline/
│   │   ├── route.ts           # POST - Generate outline
│   │   └── draft/
│   │       └── route.ts       # POST - Draft section
│   ├── analyze/
│   │   └── route.ts           # POST - Find citations
│   ├── editor/
│   │   └── route.ts           # POST - Review text
│   └── corpus/
│       ├── list/
│       │   └── route.ts       # GET - List documents
│       └── stats/
│           └── route.ts       # GET - Corpus statistics
```

### API Endpoint Specifications

#### POST /api/upload

**Purpose**: Upload and process document

**Request**:
```typescript
{
  file: File,
  manualMetadata?: {
    track?: string,
    year?: number,
    source?: string,
    context?: string
  }
}
```

**Response**:
```typescript
{
  fileId: string,
  status: 'processing' | 'complete' | 'error',
  extractedMetadata: {
    title: string,
    year: number,
    summary: string,
    topics: string[],
    track: string,
    language: 'en' | 'ja'
  },
  needsReview: boolean
}
```

**Processing Steps**:
1. Receive file upload
2. Save to temp storage
3. Extract text (use appropriate library for file type)
4. Call Gemini Flash 2.5 for metadata extraction
5. Upload to File Search
6. Return for human review
7. Clean up temp storage

#### POST /api/summary

**Purpose**: Query corpus with RAG

**Request**:
```typescript
{
  query: string,
  history?: Message[],
  filters?: {
    track?: string[],
    yearRange?: [number, number],
    topics?: string[]
  }
}
```

**Response**:
```typescript
{
  answer: string,
  citations: Array<{
    documentId: string,
    title: string,
    excerpt: string,
    pageNumber?: number
  }>,
  referencedDocuments: string[],
  knowledgeGaps?: string[]
}
```

**Processing Steps**:
1. Construct Gemini prompt with query + history
2. Enable File Search grounding
3. Apply filters if provided
4. Generate response with citations
5. Extract referenced document IDs
6. Return structured response

#### POST /api/outline

**Purpose**: Generate or refine article outline

**Request**:
```typescript
{
  topic: string,
  existingOutline?: OutlineNode[],
  action: 'generate' | 'refine' | 'draft_section',
  sectionId?: string
}
```

**Response**:
```typescript
{
  outline?: OutlineNode[],
  draftedSection?: {
    title: string,
    content: string,
    citations: Citation[]
  },
  coverageAssessment?: {
    strong: string[],
    moderate: string[],
    weak: string[],
    missing: string[]
  }
}
```

#### POST /api/analyze

**Purpose**: Find specific citations

**Request**:
```typescript
{
  claim: string,
  count?: number,
  citationType?: 'quote' | 'example' | 'data'
}
```

**Response**:
```typescript
{
  citations: Array<{
    text: string,
    source: string,
    page?: number,
    relevanceScore: number,
    context: string
  }>
}
```

---

## File Search Integration

### SDK Setup

```typescript
// lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp'  // or gemini-3.0 when available
});

export const fileManager = genAI.fileManager;
```

### Upload Document

```typescript
// lib/corpus.ts
import { fileManager } from './gemini';

export async function uploadDocument(
  filePath: string,
  metadata: {
    title: string;
    year: number;
    track: string;
    topics: string[];
  }
) {
  const uploadResult = await fileManager.uploadFile(filePath, {
    mimeType: 'application/pdf', // or appropriate type
    displayName: metadata.title,
  });

  // Store metadata separately (optional - Vercel KV)
  await storeMetadata(uploadResult.file.name, metadata);

  return uploadResult.file;
}
```

### Query with Grounding

```typescript
// lib/rag.ts
import { model } from './gemini';

export async function queryCorpus(
  query: string,
  history: Message[] = []
) {
  const chat = model.startChat({
    history: history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    })),
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  });

  // Enable grounding against uploaded corpus
  const result = await chat.sendMessage(query, {
    // This syntax may vary - check latest Google AI SDK docs
    tools: [{
      retrieval: {
        // Automatically grounds against all uploaded files
        // Can filter by metadata if needed
      }
    }]
  });

  return {
    text: result.response.text(),
    citations: extractCitations(result),
  };
}
```

### List Corpus Documents

```typescript
// lib/corpus.ts
export async function listCorpusDocuments() {
  const files = await fileManager.listFiles();
  return files.files.map(file => ({
    fileId: file.name,
    displayName: file.displayName,
    mimeType: file.mimeType,
    uploadTime: file.createTime,
  }));
}
```

---

## Development Workflow

### Phase 1: Core Infrastructure (Week 1)

**Goals**:
- Next.js project setup
- Tab navigation working
- Upload Agent functional
- File Search integration tested

**Tasks**:
1. Initialize Next.js with TypeScript + Tailwind
2. Install Shadcn/ui components
3. Create tab layout structure
4. Build Upload Agent UI (drag-drop)
5. Implement `/api/upload` route
6. Test document upload to File Search
7. Build review dashboard

**Deliverable**: Can upload documents and see them in File Search

### Phase 2: Summary Agent (Week 2)

**Goals**:
- Query corpus with RAG
- Display citations
- Download conversations

**Tasks**:
1. Build Summary Agent UI (chat interface)
2. Implement `/api/summary` route with grounding
3. Test RAG quality with uploaded documents
4. Build citation display component
5. Implement conversation download (JSON/MD)
6. Add document reference sidebar

**Deliverable**: Can ask questions and get grounded answers with citations

### Phase 3: Research & Analyze Agents (Week 3)

**Goals**:
- Research Agent for search term generation
- Analyze Agent for citation finding

**Tasks**:
1. Build Research Agent UI
2. Implement `/api/research` route
3. Build Analyze Agent UI
4. Implement `/api/analyze` route
5. Test with real research questions

**Deliverable**: Research workflow + citation extraction working

### Phase 4: Outline & Editor Agents (Week 4)

**Goals**:
- Interactive article outlining
- Text refinement

**Tasks**:
1. Build Outline Agent split view UI
2. Implement `/api/outline` routes
3. Add outline editing/export
4. Build Editor Agent UI
5. Implement `/api/editor` route

**Deliverable**: Can outline and draft articles with AI assistance

### Phase 5: Polish & Testing (Week 5-6)

**Goals**:
- Production-ready quality
- Error handling
- Performance optimization

**Tasks**:
1. Comprehensive error handling
2. Loading states everywhere
3. Mobile-responsive (if needed)
4. Performance testing with 100+ documents
5. User testing with real Toyota documents
6. Documentation

**Deliverable**: Production-ready system

---

## Environment Variables

```bash
# .env.local
GOOGLE_AI_API_KEY=your_gemini_api_key
ANTHROPIC_API_KEY=your_claude_api_key  # optional
OPENAI_API_KEY=your_openai_api_key      # optional

# Vercel KV (if using for metadata)
KV_URL=your_vercel_kv_url
KV_REST_API_URL=your_kv_rest_api_url
KV_REST_API_TOKEN=your_kv_token
KV_REST_API_READ_ONLY_TOKEN=your_kv_readonly_token

# Railway (if needed for heavy processing)
RAILWAY_API_URL=your_railway_endpoint
```

---

## Deployment Checklist

### Vercel Deployment

1. **Environment Variables**: Set in Vercel dashboard
2. **Build Settings**:
   - Build Command: `next build`
   - Output Directory: `.next`
   - Install Command: `npm install`
3. **Function Limits**:
   - Hobby: 10s timeout, 1024MB memory
   - Pro: 60s timeout, 3008MB memory
4. **Edge Functions**: Not needed initially (standard serverless sufficient)

### Railway (Optional)

Only set up if Vercel timeout limits are hit for document processing.

---

## Cost Estimates

### Gemini Flash 2.5/3.0 Pricing

| Operation | Cost | Volume | Monthly Cost |
|-----------|------|--------|--------------|
| Document processing | $0.02/doc | 100 docs | $2 |
| Queries (RAG) | $0.001/query | 1000 queries | $1 |
| Conversation turns | $0.10/1M input tokens | 500k tokens | $0.05 |
| File Search storage | $0.001/GB/day | 10GB | $0.30 |

**Total: ~$5-10/month for active research use**

### Vercel Hosting

- Hobby: Free (sufficient for single user)
- Pro: $20/month (if need higher limits)

### Railway (Optional)

- $5-10/month if needed for heavy processing

**Grand Total: $5-30/month depending on usage**

---

## Success Metrics

### Phase 1 Success:
- [ ] Upload 20 documents successfully
- [ ] All appear in File Search
- [ ] Metadata extraction 80%+ accurate
- [ ] Review dashboard functional

### Phase 2 Success:
- [ ] Can query corpus and get relevant answers
- [ ] Citations are accurate
- [ ] Response quality is high (subjective but critical)
- [ ] Can download conversations

### Phase 3-4 Success:
- [ ] All 6 agents functional
- [ ] Used system to research 1 complete article
- [ ] Workflow feels natural
- [ ] Fortune 50 quality UI/UX

### Long-term Success (3-6 months):
- [ ] 200+ documents in corpus
- [ ] Written 5+ articles using system
- [ ] Retired Toyota experts sharing documents
- [ ] System is indispensable for research

---

## Next Steps

1. **Review this spec** - Does it match your vision?
2. **Create Next.js project structure** - File organization, initial setup
3. **Define agent prompt templates** - System instructions for each agent
4. **Phase 1 implementation plan** - Detailed task breakdown

Which would you like me to create next?
