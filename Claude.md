# TRS - Toyota Research System

## Quick Start

**Dev Server**: http://localhost:3000 (should be running)
```bash
npm run dev
```

## Current Status

**Phase**: 2 - Agent Implementation (IN PROGRESS)
**Deployed**: https://trs-mocha.vercel.app ✅
**Working**: Research Agent V1 ✅ | Upload Agent V1 ✅ | Browse/Query Agent V1 ✅
**Next**: Unified Blob Storage (documents + images) → Completes 4/6 agents | Then Brainstorm + Analyze

## Environment Setup

```bash
cp .env.example .env.local
```

Required keys:
- `GOOGLE_AI_API_KEY` - Gemini API key
- `GOOGLE_CUSTOM_SEARCH_API_KEY` - For Research Agent
- `GOOGLE_CUSTOM_SEARCH_ENGINE_ID` - For Research Agent
- `KV_REDIS_URL` - Auto-created when connecting Vercel Redis database

## Project Structure

```
app/
  api/              ← 9 API routes (stub implementations)
  page.tsx          ← Main UI with 7 tabs
components/
  agents/           ← Research & Upload built, 5 more pending
lib/
  gemini.ts         ← Gemini 2.5 Flash client
  kv.ts             ← Vercel KV operations
  types.ts          ← TypeScript definitions
```

## Tech Stack

- Next.js 16 + TypeScript
- Tailwind CSS v3 + Shadcn/ui (NOTE: v4 causes build issues - stay on v3)
- Google Gemini 2.5 Flash (reads PDFs/DOCX directly - no pdf-parse!)
- Google Files API for document storage
- ioredis + Vercel Redis for metadata persistence
- Google Custom Search API for web search
- react-dropzone for file uploads

## RAG Implementation

**Uses Google File Search** - a fully managed RAG system built into Gemini API that handles embeddings, storage, and grounding automatically. No separate vector database (Pinecone, Weaviate, etc.) needed.

**Citation System** - Production-ready academic citations:
- AI-powered family name extraction (handles Japanese vs Western name order)
- Title-based fallback for documents without authors
- Format: `[FamilyName2024, p.5]` or `[TitleKeywords]`
- Page-specific references with direct quotes

## 6 Active Agents (1 Eliminated)

1. **Research** ✅ WORKING - 228 curated terms, Google Custom Search, targeted search (J-STAGE, Patents, Scholar)
2. **Upload** ✅ WORKING - Gemini reads PDFs directly, AI metadata extraction, Redis storage, review dashboard, approve workflow
3. **Browse/Query** ✅ WORKING - Two-tab agent: Browse Documents (sorting, infinite scroll, detail modal) + Query Corpus (RAG Q&A with academic citations)
4. **Images** 🔨 NEXT - Unified upload with Blob Storage + Gemini Vision analysis (no longer deferred!)
5. **Brainstorm** 🔨 TODO - Corpus-aware ideation and outlining assistant (renamed from Outline)
6. **Analyze** 🔨 TODO - Draft article reviewer that finds corpus support (revised purpose)
7. **Editor** ❌ ELIMINATED - Use external tools (Claude.ai, Gemini, ChatGPT) for final polish

**Next Session**: Implement unified Blob Storage (documents + images) - completes Images Agent alongside enabling downloads

## Key Design Decisions

- No authentication (single user on desktop)
- AI-assisted metadata with human review workflow
- Gemini 2.5 Flash for all operations (upgrade to 3.0 when available)
- **Dual storage architecture**:
  - Vercel Blob: Universal storage for ALL files (documents + images)
  - Google File Search: RAG for text documents only
  - Gemini Vision API: Content analysis for images
- **Unified upload**: One page accepts any file type, smart routing handles the rest
- Session-based conversations (no persistence initially)

## Documentation

- `TRS_Concept.md` - Original specification
- `Next_steps.md` - Current work queue
- `research_terms.md` - Master list of Japanese/English search terms for Research Agent
- `docs/progress/` - Session logs by date
- `README.md` - Full project documentation

## Common Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint check
```

## Getting Context Quickly

Read this file + `Next_steps.md` + latest progress log in `docs/progress/`
