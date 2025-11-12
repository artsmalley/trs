# TRS - Toyota Research System

## Quick Start

**Dev Server**: http://localhost:3000 (should be running)
```bash
npm run dev
```

## Current Status

**Phase**: 1 - Core Scaffold ✅ COMPLETE
**Built**: All 7 agent UIs functional with mock data
**Next**: Implement File Search integration OR real API calls

## Environment Setup

```bash
cp .env.example .env.local
```

Required keys:
- `GOOGLE_AI_API_KEY` - Get from https://makersuite.google.com/app/apikey
- `KV_URL` + tokens - From Vercel KV dashboard (when ready for production)

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
- Google Gemini 2.5 Flash + File Search
- Vercel KV (Redis) for metadata
- react-dropzone for file uploads

## RAG Implementation

**Uses Google File Search** - a fully managed RAG system built into Gemini API that handles embeddings, storage, and grounding automatically. No separate vector database (Pinecone, Weaviate, etc.) needed.

## 7 Agents Overview

1. **Research** ✅ - Search term generation (Japanese/English)
2. **Upload** ✅ - Document upload with AI metadata extraction
3. **Images** ✅ - Image upload with Gemini vision analysis
4. **Summary** ✅ - RAG chat interface with citations
5. **Outline** ✅ - Article structuring (split view)
6. **Analyze** ✅ - Citation finding with quote cards
7. **Editor** ✅ - Text refinement with inline suggestions

**All UI shells complete!** Ready for real API integration.

## Key Design Decisions

- No authentication (single user on desktop)
- AI-assisted metadata with human review workflow
- Gemini 2.5 Flash for all operations (upgrade to 3.0 when available)
- File Search for RAG (text-only currently)
- Separate image handling: Vision analysis → text → File Search
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
