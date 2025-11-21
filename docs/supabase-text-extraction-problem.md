# Supabase Text Extraction Problem - Session 28

## Problem Statement

**Goal**: Extract full text from 30MB PDF (29 pages) for Supabase RAG chunking and embedding.

**Current Result**: Only extracting ~16,000 characters from a PDF that should have 100,000+ characters.

**Impact**: Creates only 1 chunk instead of 40-50 chunks → RAG search fails → queries return no results.

---

## Symptoms

### Upload Logs
```
✓ PDF has 29 pages. Extracting text in batches...
→ Extracting pages 1-5...
→ Extracting pages 6-10...
...
→ Extracting pages 26-29...
✓ Extracted 16282 characters total

DEBUG: Text length: 16282 chars, Split into 22 sentences
DEBUG: First sentence: --- PAGE 1 ---
2012/02 新規作成
Braid Super Mechatronics 技術資料
● 計測装置への応用
1
2 Systemとしての展開

Chunking: 1 chunks created
```

### Expected vs Actual

| Metric | Expected | Actual | Problem |
|--------|----------|--------|---------|
| Characters | 100,000+ | 16,282 | **84% missing** |
| Sentences | 500+ | 22 | **96% missing** |
| Chunks | 40-50 | 1 | **98% missing** |

---

## What We've Tried

### Attempt 1: Use pdf-parse Library
**Approach**: Direct PDF parsing without Gemini
**Result**: ❌ ESM/CommonJS import incompatibility with Next.js 16
**Errors**:
- `Export default doesn't exist in target module`
- `Class constructor PDFParse cannot be invoked without 'new'`

### Attempt 2: Gemini All-At-Once Extraction
**Approach**: Ask Gemini to extract ALL text in one call
**Result**: ❌ Hit 8K token output limit
**Problem**: Only extracted first ~1 page worth of text

### Attempt 3: Gemini Page-by-Page (5 pages per batch)
**Approach**: Extract text in batches of 5 pages to avoid token limits
**Code Location**: `app/api/process-blob/route.ts:24-83`
**Result**: ❌ Still only extracts ~16K characters
**Problem**: Gemini appears to be summarizing/condensing instead of extracting word-for-word

### Attempt 4: More Explicit Prompt
**Prompt**:
```
You are a precise OCR system. Extract EVERY SINGLE WORD from pages X to Y of this PDF.

CRITICAL REQUIREMENTS:
- Include ALL text - headings, body text, tables, captions, footnotes, EVERYTHING
- Do NOT summarize or condense - extract word-for-word
- Do NOT skip any content
- Add "--- PAGE X ---" marker before each page's text
- Preserve line breaks and formatting where possible

Return ONLY the complete extracted text with no additional commentary.
```

**Result**: ❌ No improvement - still only ~16K characters
**Conclusion**: Gemini ignores the instruction and summarizes anyway

---

## Root Cause Hypothesis

**Gemini's `generateContent()` API has undocumented limitations on PDF text extraction:**

1. **Output token limit**: Even with explicit prompts, Gemini may be internally limiting output length
2. **PDF processing mode**: Gemini may be optimized for Q&A about PDFs, not full text extraction
3. **Page range instructions**: Gemini may not properly handle "extract pages X-Y" instructions
4. **Japanese/Mixed language**: May affect extraction quality (document has Japanese + English)

---

## Architecture Context

### Why This Matters for Supabase
- **File Search Store** (current production): Google handles chunking internally → no extraction needed ✅
- **Supabase** (testing): We must extract and chunk text ourselves → broken ❌

### Current Supabase Flow
1. Upload PDF to Gemini Files API (temporary)
2. Extract metadata with Gemini ✅ (works fine)
3. **Extract full text with Gemini** ❌ (broken - only gets 16% of text)
4. Chunk text with `chunkText()` function ✅ (works, but gets garbage input)
5. Generate embeddings with `gemini-embedding-001` ✅ (works)
6. Store in PostgreSQL with pgvector ✅ (works)

**Bottleneck**: Step 3 - text extraction

---

## Potential Solutions to Research

### Option 1: Different PDF Library
- **pdf-parse**: Already tried, ESM import issues
- **pdfjs-dist**: Mozilla's library, might have better Next.js compatibility
- **pdf2json**: Converts to JSON structure
- **unpdf**: Modern ESM-first library

**Research**: Which PDF parsing library works with Next.js 16 + Turbopack + ESM?

### Option 2: Different Gemini API
- **Files API with chat**: Use multi-turn conversation to extract text chunk by chunk
- **Document AI API**: Google's specialized OCR API (separate product)
- **Vision API**: Process PDF as images and OCR each page

**Research**: Does Gemini have a specialized API for full-text extraction?

### Option 3: External Service
- **Google Document AI**: Paid OCR service
- **AWS Textract**: Similar OCR service
- **Apache Tika**: Java-based text extraction (could run as separate service)

**Research**: Cost/benefit of external OCR service vs fixing client-side extraction

### Option 4: Keep File Search Store
- **Accept limitation**: Supabase has better citations but worse extraction
- **Hybrid approach**: Use File Search Store for text, Supabase for metadata?
- **Abandon Supabase migration**: File Search Store works well enough

**Research**: Is SQL JOIN citation worth the extraction hassle?

---

## Current Code Locations

### Text Extraction Function
**File**: `app/api/process-blob/route.ts`
**Lines**: 24-83
**Function**: `extractFullText(fileUri: string, mimeType: string)`

### Chunking Function
**File**: `lib/supabase-rag.ts`
**Lines**: 88-134
**Function**: `chunkText(text: string)`
**Status**: Works correctly, but receives incomplete input

### Upload Handler (Supabase Path)
**File**: `app/api/process-blob/route.ts`
**Lines**: 207-240
**Calls**: `extractFullText()` → `storeDocument()`

---

## Test Data

**File**: Braid Super Mecatronics Measuring Technology.pdf
**Size**: 30.5 MB
**Pages**: 29
**Content**: Mixed Japanese and English technical documentation
**Expected Characters**: ~100,000-150,000
**Actual Extracted**: 16,282 (11-16% of expected)

---

## Questions for Research

1. **Can Gemini API extract full text from PDFs?** Or is it only designed for Q&A?
2. **What's the actual output token limit** for `generateContent()` with PDFs?
3. **Does page-range extraction work?** Or does Gemini always process the whole PDF?
4. **Are there Gemini API parameters** we're missing (like `maxOutputTokens`)?
5. **Which PDF parsing library** is compatible with Next.js 16 + Turbopack?
6. **Is there a working example** of full-text PDF extraction with Gemini API?

---

## Recommended Next Steps

1. **Research Gemini API documentation** for PDF text extraction capabilities
2. **Test alternative PDF libraries** with simple Next.js route
3. **Consider external OCR service** if no client-side solution works
4. **Evaluate cost/benefit** of continuing Supabase migration vs accepting File Search Store limitations

---

## Session History

- **Session 24**: Supabase infrastructure setup ✅
- **Session 25**: Backend API integration ✅
- **Session 26**: UI toggles ✅
- **Session 27**: Embedding dimension fixes ✅
- **Session 28**: Text extraction debugging ❌ (current issue)

---

**Status**: BLOCKED on text extraction
**Impact**: Cannot proceed with Supabase Phase 4 testing until resolved
**Decision Needed**: Choose alternative extraction approach or abandon Supabase migration
