# Citation & Duplication Issues - Analysis

**Date**: 2025-01-18
**Status**: INVESTIGATION COMPLETE - Awaiting Decision

---

## Background

### System Overview
- **Endpoint**: `/app/api/summary/route.ts` - Query Corpus with RAG
- **Model**: Gemini 2.5 Flash with File Search tool
- **Corpus**: 240 documents in File Search Store
- **Purpose**: Answer user queries with citations to source documents

### Expected Behavior
- User asks question about Toyota PD/PE/TPS
- System queries corpus using File Search
- Response includes inline citations like `[Yoshino1985, p.30]`
- Citations reference actual document citation keys

---

## Current Situation and Problems

### Problem 1: Duplicate Responses
**Symptom**: Model generates TWO identical lists of facts instead of one cohesive response

**Example**:
```
Here are five facts about training at NUMMI:
1. Poor timing and planning...
2. Lack of dedicated staff...
...

Here are five aspects of training at NUMMI:
1. Poor Timing and Planning...
2. Lack of Dedicated Training Staff...
...
```

**Impact**: Unreadable, wastes tokens, frustrates user

---

### Problem 2: Missing or Generic Citations
**Symptom**: Citations either missing entirely or using generic numbers

**Examples**:
- **No citations**: "Training at NUMMI was characterized by poor timing and planning." (no citation)
- **Generic numbers**: "Training was poorly planned [cite: 4, p.1]." (should be `[Yoshino1985, p.1]`)

**What works**: When asked "What is your source?", model correctly responds with `[Yoshino1985]`

**Impact**: User can't verify claims, defeats purpose of corpus-based research system

---

### Problem 3: System Instruction Ignored
**Symptom**: Despite explicit instructions, model doesn't follow citation format

**Current instruction** (simplified version):
```
🚨 CITATION FORMAT: After each fact, add [CitationKey, p.#]
Example: "Toyota developed JIT in 1950s [Fujimoto2002, p.30]."

🚨 ONE RESPONSE: Provide one cohesive answer, not multiple lists.
```

**Impact**: Instructions are being ignored or misunderstood

---

## Likely Causes

### Cause 1: System Instruction Token Bloat (CRITICAL)
**Discovery**: System instruction contains ~47,000 tokens of document metadata

**Code location**: `/app/api/summary/route.ts`, lines 125-170

**What's happening**:
```typescript
DOCUMENTS (${documents.length} files - searchable via File Search):
${documents
  .map((doc, idx) =>
    `Document: "${doc.title}"
Citation Key: [${docCitationKeys[idx]}]
Authors: ${doc.authors && doc.authors.length > 0 ? doc.authors.join(", ") : "Unknown"}
Track: ${doc.track || "Unknown"}
Year: ${doc.year || "Unknown"}
${doc.summary ? `Summary: ${doc.summary}` : ""}
${doc.keywords && doc.keywords.length > 0 ? `Keywords: ${doc.keywords.join(", ")}` : ""}
---`)
  .join("\n\n")}
```

**Calculation**:
- 240 documents × ~200 tokens each = **~48,000 tokens**
- This is MORE THAN HALF of the 128K context window
- Citation instructions get buried/ignored

**Why this is a problem**:
1. Model has limited "attention span" - later instructions get ignored
2. Wastes tokens that could be used for response quality
3. File Search tool ALREADY has access to all documents - this metadata is redundant
4. Increases cost and latency

---

### Cause 2: Gemini File Search Doesn't Produce Inline Citations Natively
**Discovery**: Gemini's File Search tool returns grounding metadata SEPARATELY from response text

**How Gemini File Search actually works**:
1. Model generates response text using File Search results
2. Gemini produces `groundingMetadata.groundingChunks` separately
3. Grounding metadata contains chunk titles, text snippets, and page markers
4. **Model does NOT inject citations into response text automatically**

**Evidence**:
- Current code extracts citations from grounding metadata (lines 233-293)
- Citations are returned as separate `citations` array
- Response text (`answer`) contains no citation markers
- When user asks "what's your source?", model can look at grounding metadata and provide source

**Why model can't cite inline during generation**:
- Model generates text BEFORE grounding metadata is finalized
- Citation keys (e.g., `Yoshino1985`) don't match chunk titles (e.g., `upload-1763123009682-file.pdf`)
- Model doesn't have access to our custom citation key mapping during generation

---

### Cause 3: Mismatch Between Citation Keys and Chunk Titles
**Problem**: Our citation keys don't match what File Search returns

**What we provide**:
- Citation keys: `Yoshino1985`, `Fujimoto2002`, `Aoki2025`
- Derived from document metadata (author + year)

**What File Search returns**:
- Chunk titles: `upload-1763123009682-TPS_history.pdf`
- Internal storage filenames, not human-readable

**Current matching logic** (lines 252-259):
```typescript
const filenamePart = chunkTitle.replace(/^upload-\d+-/, '');
const matchedDoc = approvedDocs.find(doc => {
  return doc.fileName === filenamePart ||
         chunkTitle.includes(doc.fileName) ||
         doc.fileName.includes(filenamePart);
});
```

**Issues**:
- Fragile string matching
- Fails with special characters or name variations
- No guarantee of unique matches

---

### Cause 4: Duplicate Response Generation
**Hypothesis**: Complex system instruction with conflicting priorities causes model to "process twice"

**Evidence from Session 21**:
- Previous fix: "CRITICAL: Provide ONE clear, concise response. Do NOT repeat information, create multiple lists, or generate redundant content."
- This was added at END of long system instruction
- Current simplified version puts it at TOP with visual indicator
- Still seeing duplicates

**Possible reasons**:
1. Model interprets "provide facts" and "be comprehensive" as requiring multiple formats
2. File Search retrieval happens separately from response generation, causing two passes
3. System instruction complexity causes model confusion

---

## Goals

### Primary Goals
1. **Eliminate duplicate responses** - One cohesive answer per query
2. **Provide proper inline citations** - Format: `[Yoshino1985, p.30]` embedded in response text
3. **Ensure citation accuracy** - Citations match grounding metadata exactly
4. **Improve response quality** - Focus on content, not fighting citation formatting

### Secondary Goals
5. **Reduce token waste** - Remove redundant metadata from system instruction
6. **Improve performance** - Faster responses, lower costs
7. **Make system maintainable** - Work with Gemini's behavior, not against it

---

## Potential Countermeasures

### Option 1: Post-Processing Citation Injection (RECOMMENDED)

**Approach**: Stop asking model to format citations, inject them after generation

**Implementation**:
1. Remove document metadata from system instruction (save 47K tokens)
2. Simplify system instruction to: "Answer using File Search. Provide one response."
3. After model generates response, parse grounding metadata
4. Match grounding chunks to sentences in response text
5. Inject citation markers `[CitationKey, p.#]` at appropriate locations
6. Return annotated text to user

**Advantages**:
- Works WITH Gemini's actual behavior
- Reliable citation accuracy (based on grounding metadata, not model formatting)
- Eliminates token bloat
- Allows model to focus on content quality
- Citations guaranteed to match sources used

**Disadvantages**:
- Requires new citation injection logic (~100 lines)
- Sentence matching might not be perfect
- Citations might not be exactly where user expects

**Estimated effort**: 1-2 hours

**Code outline**:
```typescript
// New file: lib/inject-citations.ts
export function injectCitations(
  responseText: string,
  groundingChunks: any[],
  docCitationKeys: string[],
  approvedDocs: any[]
): string {
  // 1. Build map of chunks to citation keys
  // 2. Parse response into sentences
  // 3. Match sentences to chunks using semantic similarity
  // 4. Inject [CitationKey, p.#] after relevant sentences
  // 5. Return annotated text
}

// In /app/api/summary/route.ts:
const answer = result.text || "";
const annotatedAnswer = injectCitations(
  answer,
  grounding?.groundingChunks || [],
  docCitationKeys,
  approvedDocs
);
```

---

### Option 2: Numbered Footnote System (ALTERNATIVE)

**Approach**: Use numbered footnotes instead of inline citation keys

**Example output**:
```
Training at NUMMI was characterized by poor timing and planning[1].
The lack of dedicated training staff was a significant problem[2].

References:
[1] Yoshino, "NUMMI Education and Training Program", 1985, p.1
[2] Yoshino, "NUMMI Education and Training Program", 1985, p.5
```

**Advantages**:
- Cleaner reading experience
- Easier to implement (just append citations at end)
- Standard academic format

**Disadvantages**:
- User has to scroll to see sources
- Doesn't match current UI design (which shows citations separately)

**Estimated effort**: 30 minutes

---

### Option 3: Radical System Instruction Simplification (QUICK FIX)

**Approach**: Remove ALL document metadata, ultra-minimal instruction

**New system instruction**:
```typescript
const systemInstruction = `Answer using File Search results from the corpus.

Provide one cohesive response (not multiple lists).

File Search has access to ${documents.length} documents covering Toyota Product Development, Production Engineering, and TPS.`;
```

**Remove**:
- Document listings (47K tokens)
- Citation key examples
- Quality tier details
- Citation formatting instructions

**Keep**:
- File Search tool configuration (unchanged)
- Grounding metadata extraction (unchanged)

**Advantages**:
- Immediate implementation (5 minutes)
- Eliminates token bloat
- Allows model to focus on content
- Might fix duplicate issue

**Disadvantages**:
- Doesn't solve inline citation problem
- Still need Option 1 or 2 for proper citations

**Estimated effort**: 5 minutes

**Status**: Can be done IMMEDIATELY as first step

---

### Option 4: Hybrid Approach (COMPREHENSIVE)

**Combine Option 3 + Option 1**:

**Phase 1** (5 min): Simplify system instruction
- Remove document metadata
- Remove citation formatting instructions
- Test if duplicates stop

**Phase 2** (1 hour): Implement citation injection
- Create `lib/inject-citations.ts`
- Parse grounding chunks
- Inject citations into response text
- Test accuracy

**Phase 3** (30 min): UI enhancement
- Make inline citations clickable
- Show document preview on hover
- Display full citation info

**Advantages**:
- Incremental approach
- Can test Phase 1 immediately
- Full solution addresses all issues

**Estimated effort**: 2 hours total

---

## Recommended Path Forward

### Immediate Action (Tonight - 5 minutes)
1. **Remove document metadata bloat** from system instruction
2. **Simplify to ultra-minimal** instruction
3. **Test** if this fixes duplicate responses

### Short-term (Next session - 1-2 hours)
4. **Implement post-processing citation injection**
5. **Test citation accuracy** with multiple queries
6. **Refine matching logic** if needed

### Optional (Future)
7. **UI enhancement** for clickable citations
8. **Citation validation** and logging
9. **Semantic matching** for better sentence-to-chunk alignment

---

## Technical Details

### Current System Instruction Size
- **Estimated**: ~50,000 tokens (with 240 documents)
- **Gemini context limit**: 128,000 tokens
- **Wasted**: ~40% of context on redundant metadata
- **Remaining for response**: ~78,000 tokens

### Citation Extraction (Already Working)
**Location**: `/app/api/summary/route.ts`, lines 233-293

**What it does**:
```typescript
if (grounding?.groundingChunks) {
  grounding.groundingChunks.forEach((chunk: any) => {
    const chunkTitle = chunk.retrievedContext?.title;
    const chunkText = chunk.retrievedContext?.text || '';

    // Extract page numbers from chunk text
    const pageMatches = chunkText.match(/---\s*PAGE\s+(\d+)\s*---/g) || [];

    // Match chunk to document
    const matchedDoc = approvedDocs.find(doc =>
      chunkTitle.includes(doc.fileName)
    );

    // Build citation
    citations.push({
      documentId: doc.fileId,
      title: `[${citationKey}${pageInfo}] ${doc.title}`,
      excerpt: doc.summary,
      pageNumber: pageNumbers[0]
    });
  });
}
```

**Status**: This works correctly, extracts citations from grounding metadata

**What's missing**: Injecting these citations INTO the response text

---

## Questions for User

1. **Priority**: Is fixing duplicates more urgent than inline citations?
2. **Citation style**: Prefer inline `[Yoshino1985, p.30]` or footnotes `[1]`?
3. **Risk tolerance**: OK with implementing post-processing logic, or prefer simpler footnote system?
4. **Timeline**: Fix tonight (quick) or next session (comprehensive)?

---

## Conclusion

**Root cause**: We're fighting against Gemini's natural behavior instead of working with it.

**Key insight**: Gemini File Search provides grounding metadata separately - we should use it for post-processing, not ask model to format citations during generation.

**Recommended solution**:
1. Remove 47K token metadata bloat (5 min fix)
2. Implement post-processing citation injection (1 hour)
3. Focus model on content quality, not citation formatting

**Expected result**: Reliable citations, no duplicates, better responses, faster performance.

---

**Status**: Awaiting user review and decision on approach.
