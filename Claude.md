# TRS - Toyota Research System

## Quick Start

**Dev Server**: http://localhost:3000 (should be running)
```bash
npm run dev
```

## Current Status

**Phase**: 2 - Agent Implementation (IN PROGRESS)
**Deployed**: https://trs-mocha.vercel.app ✅
**Working**: Research Agent V1 ✅ | Upload Agent V1 ✅ | Summary Agent V1 ✅
**Next**: Implement remaining agents (Images, Outline, Analyze, Editor)

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

## 6 Active Agents (1 Deferred, 1 Eliminated)

1. **Research** ✅ WORKING - 228 curated terms, Google Custom Search, targeted search (J-STAGE, Patents, Scholar)
2. **Upload** ✅ WORKING - Gemini reads PDFs directly, AI metadata extraction, Redis storage, review dashboard, approve workflow
3. **Browse** ✅ WORKING (localhost only) - Two-tab agent: Browse Documents (list/filter/search/delete) + Query Corpus (RAG Q&A with citations)
   - ⚠️ Vercel deployment issue: Works perfectly locally but crashes on production (Session 7 priority)
4. **Images** ⏸️ DEFERRED - Waiting for Gemini 3.0 & improved File Search image support (shows "coming soon" UI)
5. **Brainstorm** 🔨 TODO - Corpus-aware ideation and outlining assistant (renamed from Outline)
6. **Analyze** 🔨 TODO - Draft article reviewer that finds corpus support (revised purpose)
7. **Editor** ❌ ELIMINATED - Use external tools (Claude.ai, Gemini, ChatGPT) for final polish

**Next**: Implement Brainstorm Agent (corpus-aware ideation) and Analyze Agent (draft reviewer)

## Key Design Decisions

- No authentication (single user on desktop)
- AI-assisted metadata with human review workflow
- Gemini 2.5 Flash for all operations (upgrade to 3.0 when available)
- File Search for RAG (text-only documents: PDF, DOCX, TXT)
- Images Agent deferred until Gemini 3.0 (File Search doesn't support images yet)
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
