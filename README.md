# Toyota Research System (TRS) V2.0

A multi-agent AI platform for researching, analyzing, and writing about Toyota's practices using RAG (Retrieval Augmented Generation) with Google File Search.

## 🔍 RAG Implementation Strategy

**This project uses Google File Search** as its RAG solution. File Search is a fully managed retrieval system built directly into the Gemini API that:

- **Handles embeddings automatically** - No manual vector management required
- **Stores documents natively** - No separate vector database (Pinecone, Weaviate, etc.) needed
- **Provides semantic search & grounding** - Gemini models can directly ground responses in uploaded documents
- **Simplifies architecture** - Google-managed infrastructure eliminates complex RAG setup

**Why File Search?** Seamless Gemini integration, simplified deployment, and Google-managed scaling make it ideal for this research-focused application.

## 🚀 Current Status

**Development Environment: RUNNING** ✅
Server: http://localhost:3000

### What's Built

#### ✅ Core Infrastructure
- Next.js 16 with TypeScript & App Router
- Tailwind CSS + Shadcn/ui components
- 7-tab navigation system (Research, Upload, Images, Summary, Outline, Analyze, Editor)
- Environment variables configuration
- Dev server running successfully

#### ✅ Library & SDK Setup
- `lib/gemini.ts` - Google Generative AI client (Gemini 2.5 Flash)
- `lib/kv.ts` - Vercel KV operations for metadata storage
- `lib/types.ts` - Complete TypeScript type definitions

#### ✅ API Routes (Stub Implementations)
All API routes created with mock responses, ready for implementation:

- `/api/research` - Generate search terms and research strategy
- `/api/upload` - Document upload and processing
- `/api/images` - Image upload with vision analysis
- `/api/summary` - RAG-powered corpus queries
- `/api/outline` - Article structuring and drafting
- `/api/analyze` - Citation finding and evidence search
- `/api/editor` - Text refinement and consistency checking
- `/api/corpus/list` - List all documents
- `/api/corpus/stats` - Corpus statistics

#### ✅ Agent Components (UI Shells)

**Research Agent** (`components/agents/research-agent.tsx`)
- Topic input
- Search term generation (Japanese & English)
- Research priority tracking
- Connected to API endpoint

**Upload Agent** (`components/agents/upload-agent.tsx`)
- Drag-and-drop file upload (PDF, DOCX, TXT)
- Processing queue with progress bars
- Review dashboard for AI-extracted metadata
- Edit metadata dialog
- Connected to API endpoint

### 🔧 Not Yet Built

The following agent UIs need to be created:

1. **Image Upload Agent** - Image-specific upload with vision analysis display
2. **Summary Agent** - Chat interface with citations and document sidebar
3. **Outline Agent** - Split view (outline tree + chat)
4. **Analyze Agent** - Citation search with quote cards
5. **Editor Agent** - Text editor with inline suggestions

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 20+
- npm or yarn
- Google AI API key (for Gemini)
- Vercel KV database (for production)

### Getting Started

1. **Install dependencies** (already done):
```bash
npm install
```

2. **Set up environment variables**:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your keys:
```
GOOGLE_AI_API_KEY=your_key_here
KV_URL=your_vercel_kv_url
# ... etc
```

3. **Run development server** (already running):
```bash
npm run dev
```

Open http://localhost:3000

### Project Structure

```
trs/
├── app/
│   ├── api/              # API routes
│   │   ├── research/
│   │   ├── upload/
│   │   ├── images/
│   │   ├── summary/
│   │   ├── outline/
│   │   ├── analyze/
│   │   ├── editor/
│   │   └── corpus/
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main page with tabs
├── components/
│   ├── agents/           # Agent UI components
│   │   ├── research-agent.tsx
│   │   └── upload-agent.tsx
│   └── ui/               # Shadcn/ui components
├── lib/
│   ├── gemini.ts         # Gemini client
│   ├── kv.ts             # Vercel KV operations
│   ├── types.ts          # TypeScript types
│   └── utils.ts          # Utility functions
└── TRS_Concept.md        # Original specification
```

## 📋 Next Steps

### Immediate Tasks

1. **Complete remaining agent UIs** (Image Upload, Summary, Outline, Analyze, Editor)
2. **Implement File Search integration**
   - Study the File Search documentation
   - Implement document upload to File Search
   - Implement RAG queries with grounding
3. **Connect Vercel KV**
   - Create KV database in Vercel dashboard
   - Test metadata storage operations
4. **Implement real Gemini API calls** in each agent endpoint

### Implementation Priority (Per Original Spec)

**Phase 1** (Current): Core Infrastructure ✅
**Phase 2**: Summary Agent (RAG functionality)
**Phase 3**: Research & Analyze Agents
**Phase 4**: Outline & Editor Agents
**Phase 5**: Polish & Testing

## 🔑 Key Technologies

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **UI Components**: Shadcn/ui (Radix UI + Tailwind)
- **AI**: Google Gemini 2.5 Flash + File Search
- **Storage**: Vercel KV (Redis) for metadata
- **Deployment**: Vercel (Pro plan, $20/month)
- **File Upload**: react-dropzone
- **Form Handling**: react-hook-form

## 🧪 Testing the Current Build

With the dev server running:

1. **Navigate to Research tab** - Enter a topic, click "Generate"
2. **Navigate to Upload tab** - Drag files into the upload zone
3. The API returns mock data currently - real AI integration is next step

## 📊 Corpus Management

Documents will be:
- **Stored**: File Search (managed document storage & retrieval)
- **Metadata**: Vercel KV (custom taxonomy: PE/PD/Ops, year, topics, etc.)
- **Languages**: English, Japanese, and mixed documents supported

## 🎯 Design Decisions Made

1. **No Authentication**: Single-user initially (your desktop)
2. **AI-Assisted Metadata**: Gemini extracts, human reviews/approves
3. **Vercel KV Storage**: For production-quality metadata management
4. **Full Scaffold Approach**: All 7 tabs visible from day 1
5. **Image Handling**: Separate workflow with Gemini Vision → File Search

## 📚 Resources

### Project Documentation
- `research_terms.md` - Master list of Japanese/English search terms organized by track (PD/PE/TPS)
- `TRS_Concept.md` - Full technical specification

### External Resources
- [Google File Search Documentation](https://ai.google.dev/gemini-api/docs/file-search)
- [Shadcn/ui Documentation](https://ui.shadcn.com)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Vercel KV](https://vercel.com/docs/storage/vercel-kv)

## 💡 Notes

- The app uses **Gemini 2.5 Flash** - will upgrade to 3.0 when available
- File Search currently text-only; image support expected in 3-6 months
- Cost estimate: $5-30/month depending on usage
- Session-based conversations initially (no persistence)

---

**Version**: 2.0
**Last Updated**: November 12, 2025
**Status**: Active Development
