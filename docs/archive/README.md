# Archive

This folder contains obsolete or completed documentation that is no longer actively used but kept for historical reference.

## Contents

### Supabase V1 Migration Attempts (Obsolete)
- `supabase-migration-plan.md` - Original Supabase migration plan (Sessions 23-26)
- `supabase-implementation-plan.md` - Detailed implementation plan (Sessions 24-25)
- **Status**: Abandoned due to serverless incompatibility
- **Replaced by**: `docs/transition_plan.md` (V2 on Railway)

### Completed Fixes
- `citation.md` - Citation fix investigation and resolution (Session 22)
  - **Status**: Fixed with fileId matching solution
  - **Current state**: Citations working for all 241 documents
- `file-search-migration.md` - Files API → File Search Store migration (Session 12)
  - **Status**: Completed successfully
  - **Result**: System now scales to 1000+ documents

## Why These Were Archived

**Supabase V1 attempts**: Attempted migration from File Search Store to Supabase within Next.js serverless environment. Failed due to:
1. Serverless edge runtime incompatible with PDF parsing libraries (pdfjs-dist, pdf-parse)
2. LLMs unsuitable for deterministic text extraction (hit token limits, summarize instead of extract)
3. Architectural mismatch between serverless constraints and processing requirements

**Decision**: Build V2 fresh on Railway with traditional Node.js runtime (see `docs/transition_plan.md`)

**Citation fix**: Investigation into broken citations after Session 13 Unicode fix. Resolved with fileId string matching workaround.

**File Search migration**: Historical documentation of critical Session 12 architectural fix (Files API → File Search Store). Successfully resolved token limit crashes, enabled scaling to 100+ documents.
