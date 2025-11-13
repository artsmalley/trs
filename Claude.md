# TRS - Toyota Research System

## Quick Start

**Dev Server**: http://localhost:3000 (should be running)
```bash
npm run dev
```

## Current Status

**Phase**: 2 - Agent Implementation (IN PROGRESS)
**Deployed**: https://trs-mocha.vercel.app ✅
**Working**: Research ✅ | Upload (docs+images) ✅ | Browse/Query ✅ | Images ✅
**Next**: Debug image filter → Then Brainstorm + Analyze
**Complete**: 4/6 agents (Research, Upload, Browse/Query, Images)

## Environment Setup

```bash
cp .env.example .env.local
```

Required keys:
- `GOOGLE_AI_API_KEY` - Gemini API key
- `GOOGLE_CUSTOM_SEARCH_API_KEY` - For Research Agent
- `GOOGLE_CUSTOM_SEARCH_ENGINE_ID` - For Research Agent
- `KV_REDIS_URL` - Auto-created when connecting Vercel Redis database
- `BLOB_READ_WRITE_TOKEN` - Auto-created when connecting Vercel Blob storage

## Project Structure

```
app/
  api/              ← API routes for all agents + utilities
  page.tsx          ← Main UI with 6 tabs (Research, Upload, Browse, Outline, Analyze, Editor)
components/
  agents/           ← 4 agents complete (Research, Upload, Browse/Query, Images integrated)
lib/
  gemini.ts         ← Gemini 2.5 Flash client
  vision-analysis.ts ← Gemini Vision API for image analysis
  blob-storage.ts   ← Vercel Blob upload/download/delete
  file-search.ts    ← Google File Search integration
  kv.ts             ← Vercel KV (Redis) operations
  types.ts          ← TypeScript definitions
```

## Tech Stack

- Next.js 16 + TypeScript
- Tailwind CSS v3 + Shadcn/ui (NOTE: v4 causes build issues - stay on v3)
- Google Gemini 2.5 Flash + Vision (reads PDFs directly, analyzes images)
- Vercel Blob for universal file storage (documents + images)
- Google File Search for RAG on documents
- Gemini Vision API for image content analysis (OCR, objects, concepts)
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

1. **Research** ✅ COMPLETE - 228 curated terms, Google Custom Search, targeted search (J-STAGE, Patents, Scholar)
2. **Upload** ✅ COMPLETE - Unified upload for docs+images, Blob storage, Vision analysis, review dashboard, approve workflow
3. **Browse/Query** ✅ COMPLETE - Browse (sorting, infinite scroll, image thumbnails, type filter) + Query Corpus (RAG with citations)
4. **Images** ✅ COMPLETE - Integrated into Upload agent, Vision API analysis (OCR, objects, concepts), searchable by content
5. **Brainstorm** 🔨 TODO - Corpus-aware ideation and outlining assistant (renamed from Outline)
6. **Analyze** 🔨 TODO - Draft article reviewer that finds corpus support
7. **Editor** ❌ ELIMINATED - Use external tools (Claude.ai, Gemini, ChatGPT) for final polish

**Next Session**: Debug image type filter (mimeType detection) + Test Vision analysis quality on QC Circle images

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
