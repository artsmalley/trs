# TRS - Toyota Research System

## Quick Start

**Dev Server**: http://localhost:3000 (should be running)
```bash
npm run dev
```

## Current Status

**Phase**: 2 - Agent Implementation (IN PROGRESS)
**Deployed**: https://trs-mocha.vercel.app ✅
**Working**: Research ✅ | Upload (hybrid RAG) ✅ | Browse/Query (multimodal) ✅ | Images ✅
**Next**: Architecture decision (PDF vs images) → Then Brainstorm + Analyze
**Complete**: 4/6 agents (Research, Upload, Browse/Query, Images)
**Major Discovery**: File Search supports images (undocumented Google API feature!) - Multimodal RAG enabled!

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
- Google File Search for multimodal RAG (documents + images - UNDOCUMENTED FEATURE!)
- Gemini Vision API for image content analysis (OCR, objects, concepts)
- ioredis + Vercel Redis for metadata persistence
- Google Custom Search API for web search
- react-dropzone for file uploads

## ⚠️ CRITICAL: Gemini Model Policy

**ALWAYS USE: `gemini-2.5-flash`** (current stable model)

**NEVER USE:**
- ❌ `gemini-1.5-*` (deprecated, inferior performance)
- ❌ `gemini-2.0-*` (deprecated, being phased out)
- ❌ `gemini-2.2-*` (does not exist)
- ❌ Any `-exp` experimental models (unstable)

**Why this matters:**
Claude's training data is dated. When encountering errors, Claude may incorrectly assume older models (1.5, 2.0) are "more stable" - this is almost never the case. Google deprecates older models because they don't work as well.

**Migration path:**
- Current: `gemini-2.5-flash` (stable, production-ready)
- Future: `gemini-3.0-flash` (when available via API key in ~2 weeks)

**If you see model errors:**
1. Check model name is exactly `gemini-2.5-flash`
2. Do NOT downgrade to 1.5 or 2.0
3. Check Google AI Studio for current model availability

## RAG Implementation

**Uses Google File Search** - a fully managed RAG system built into Gemini API that handles embeddings, storage, and grounding automatically. No separate vector database (Pinecone, Weaviate, etc.) needed.

**MAJOR DISCOVERY (Session 9):** File Search supports images! This is an undocumented Google API feature that enables true multimodal RAG. Gemini can ground on visual content from images, not just text.

**Hybrid Architecture for Images:**
- Vercel Blob: Display/download
- File Search: RAG queries with citations
- Vision API: OCR, objects, concepts metadata
- Redis: Stores both fileUri and visionAnalysis

**Citation System** - Production-ready academic citations:
- AI-powered family name extraction (handles Japanese vs Western name order)
- Title-based fallback for documents without authors
- Format: `[FamilyName2024, p.5]` or `[TitleKeywords]`
- Page-specific references with direct quotes
- **Works for both documents AND images!**

## 6 Active Agents (1 Eliminated)

1. **Research** ✅ COMPLETE - 228 curated terms, Google Custom Search, targeted search (J-STAGE, Patents, Scholar)
2. **Upload** ✅ COMPLETE - Hybrid approach: docs+images to File Search + Vision analysis, review dashboard, approve workflow
3. **Browse/Query** ✅ COMPLETE - Browse (sorting, infinite scroll, image thumbnails, type filter) + Query Corpus (multimodal RAG with citations from documents AND images)
4. **Images** ✅ COMPLETE - Hybrid integration: File Search grounding + Vision API metadata (OCR, objects, concepts)
5. **Brainstorm** 🔨 TODO - Corpus-aware ideation and outlining assistant (renamed from Outline)
6. **Analyze** 🔨 TODO - Draft article reviewer that finds corpus support
7. **Editor** ❌ ELIMINATED - Use external tools (Claude.ai, Gemini, ChatGPT) for final polish

**Next Session**: Architecture decision (keep hybrid images or PDF-only?) + Begin Brainstorm Agent implementation

## Key Design Decisions

- No authentication (single user on desktop)
- AI-assisted metadata with human review workflow
- Gemini 2.5 Flash for all operations (upgrade to 3.0 when available)
- **Hybrid multimodal RAG architecture** (DISCOVERED in Session 9):
  - Vercel Blob: Universal storage for ALL files (documents + images)
  - Google File Search: Multimodal RAG for documents AND images (undocumented feature!)
  - Gemini Vision API: Content analysis metadata (OCR, objects, concepts)
  - Redis: Stores both fileUri (File Search) and visionAnalysis (Vision API)
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
