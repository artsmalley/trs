import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai"; // New SDK for File Search Store
import { GoogleGenerativeAI } from "@google/generative-ai"; // Legacy SDK for Files API (images)
import { listAllDocuments } from "@/lib/kv";
import { getStoreName } from "@/lib/file-search-store";
import { searchCorpus, extractCitations, formatCitation } from "@/lib/supabase-rag"; // Supabase RAG
import { checkRateLimit, getClientIdentifier, rateLimitPresets } from "@/lib/rate-limit";
import { sanitizeQuery, sanitizeCustomInstructions, validateHistory } from "@/lib/sanitize";
import { injectCitations } from "@/lib/inject-citations";

// POST /api/summary - Query corpus with RAG
export async function POST(req: NextRequest) {
  try {
    // Rate limiting - Tier 1: Expensive AI endpoint
    const identifier = getClientIdentifier(req);
    const rateLimitCheck = await checkRateLimit(identifier, rateLimitPresets.summary);

    if (!rateLimitCheck.allowed) {
      return rateLimitCheck.response!;
    }

    const { query, history, backend = 'file_search' } = await req.json();

    if (!query) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // Validate backend parameter
    if (backend !== 'file_search' && backend !== 'supabase') {
      return NextResponse.json(
        { error: 'Invalid backend parameter. Must be "file_search" or "supabase"' },
        { status: 400 }
      );
    }

    // Sanitize and validate inputs
    const queryValidation = sanitizeQuery(query);
    if (!queryValidation.isValid) {
      return NextResponse.json(
        { error: queryValidation.error, warnings: queryValidation.warnings },
        { status: 400 }
      );
    }

    const historyValidation = validateHistory(history);
    if (!historyValidation.isValid) {
      return NextResponse.json(
        { error: historyValidation.error },
        { status: 400 }
      );
    }

    // Use sanitized values
    const sanitizedQuery = queryValidation.sanitized!;
    const sanitizedHistory = historyValidation.sanitized || [];

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY is not set");
    }

    // Get all approved documents from KV
    const allDocs = await listAllDocuments();
    const approvedDocs = allDocs.filter((doc) => doc.status === "approved");

    if (approvedDocs.length === 0) {
      return NextResponse.json({
        answer: "No approved documents available in the corpus yet. Please upload and approve some documents first.",
        citations: [],
        referencedDocuments: [],
      });
    }

    // === DUAL-PATH BACKEND LOGIC ===
    if (backend === 'supabase') {
      // === SUPABASE PATH: PostgreSQL + pgvector with SQL JOIN citations ===
      console.log(`Query corpus: Supabase backend (PostgreSQL + pgvector)`);

      // Filter for Supabase documents only
      const supabaseDocs = approvedDocs.filter(
        (doc) => doc.storageBackend === 'supabase'
      );

      if (supabaseDocs.length === 0) {
        return NextResponse.json({
          answer: "No Supabase documents available yet. Please upload some documents using the Supabase backend.",
          citations: [],
          referencedDocuments: [],
          backend: 'supabase'
        });
      }

      console.log(`  → ${supabaseDocs.length} documents in Supabase`);

      // 1. Search corpus using semantic similarity
      const searchResults = await searchCorpus(
        sanitizedQuery,
        [1, 2, 3, 4], // All quality tiers for now
        10, // Return top 10 chunks
        0.7 // Minimum similarity threshold
      );

      console.log(`  → Found ${searchResults.length} relevant chunks`);

      // 2. Build context from search results
      const context = searchResults
        .map((result) => {
          const citation = formatCitation(result.citationKey, [result.pageNumber]);
          return `${citation}\n${result.text}`;
        })
        .join('\n\n---\n\n');

      // 3. Build system instruction
      const systemInstruction = `You are a research assistant with access to ${supabaseDocs.length} documents about Toyota Product Development, Production Engineering, and TPS.

Answer queries using ONLY the information provided in the context below. Provide one cohesive response.

CRITICAL CITATION REQUIREMENTS:
- You MUST cite EVERY factual claim using the format [CitationKey, p.#]
- Each paragraph with factual information MUST include at least one citation
- Place citations at the end of sentences or paragraphs
- You MUST ONLY use citation keys found in the context below
- DO NOT make up or infer information not in the context

DOCUMENT QUALITY PRIORITIZATION:
- Tier 1 (Authoritative): Primary sources - PRIORITIZE THESE
- Tier 2 (High Quality): Academic papers - PRIORITIZE THESE
- Tier 3 (Supporting): Supporting materials - Use for context
- Tier 4 (Background): Timelines - Use ONLY for dates

Context:
${context}`;

      // 4. Build conversation history
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const contents: any[] = [];

      if (sanitizedHistory && sanitizedHistory.length > 0) {
        for (const msg of sanitizedHistory) {
          contents.push({
            role: msg.role === "model" ? "model" : "user",
            parts: [{ text: msg.content }],
          });
        }
      }

      // Add current query
      contents.push({
        role: "user",
        parts: [{ text: sanitizedQuery }],
      });

      // 5. Query Gemini with context (NO File Search tool - we provide context directly)
      const result = await model.generateContent({
        contents,
        systemInstruction,
      });

      const answer = result.response.text() || "";

      // 6. Extract citations (CLEAN! Direct from SQL JOIN results)
      const citationData = extractCitations(searchResults);
      const citations = citationData.map((c) => ({
        documentId: c.citationKey,
        title: formatCitation(c.citationKey, c.pageNumbers) + ` ${c.title}`,
        excerpt: c.excerpts[0] || "No excerpt available",
        pageNumber: c.pageNumbers[0] || undefined,
      }));

      const referencedDocIds = searchResults.map((r) => r.documentId);

      console.log(`  ✓ Generated answer with ${citations.length} citations`);

      return NextResponse.json({
        answer,
        citations,
        referencedDocuments: [...new Set(referencedDocIds)],
        backend: 'supabase'
      });
    }

    // === FILE SEARCH STORE PATH (CURRENT) ===
    console.log(`Query corpus: File Search Store backend`);

    // Separate documents (in File Search Store) from images (in Files API)
    const documents = approvedDocs.filter((doc) => doc.fileType === "document" && doc.storageBackend !== 'supabase');
    const images = approvedDocs.filter((doc) => doc.fileType === "image");

    console.log(`Query corpus: ${documents.length} documents (File Search Store), ${images.length} images (Files API)`);

    // Initialize new SDK for File Search Store
    const ai = new GoogleGenAI({ apiKey });

    // Helper function to generate citation key from title
    const generateTitleCitationKey = (title: string): string => {
      // Remove common words and take first 2-3 significant words
      const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
      const words = title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special chars
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.includes(word))
        .slice(0, 3); // Take first 3 significant words

      // Capitalize first letter of each word and join
      return words
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
    };

    // Create citation keys for each document using AI-extracted citationName
    const docCitationKeys = approvedDocs.map((doc, idx) => {
      // Priority 1: Use AI-extracted citationName + year
      if (doc.citationName && doc.year) {
        return `${doc.citationName}${doc.year}`;
      }
      // Priority 2: Use track + year if no citationName
      else if (doc.year) {
        return `${doc.track}${doc.year}`;
      }
      // Priority 3: Generate from title
      else if (doc.title) {
        return generateTitleCitationKey(doc.title);
      }
      // Priority 4: Fallback to Doc#
      else {
        return `Doc${idx + 1}`;
      }
    });

    // Construct system instruction (minimal - citations added via post-processing)
    const systemInstruction = `You are a research assistant with access to ${documents.length} documents about Toyota Product Development, Production Engineering, and TPS via File Search.

Answer queries using ONLY information from File Search results. Provide one cohesive response (not multiple lists or duplicate content).

DOCUMENT QUALITY PRIORITIZATION:
The corpus contains ${documents.length} documents with quality tiers:
- Tier 1 (Authoritative): Primary sources from ex-Toyota authors and top experts - PRIORITIZE THESE
- Tier 2 (High Quality): Academic papers and detailed technical documents - PRIORITIZE THESE
- Tier 3 (Supporting): Supporting materials and general references - Use for additional context
- Tier 4 (Background): Timelines and historical context - Use ONLY for dates and chronology

When responding:
1. PRIORITIZE insights and examples from Tier 1 and Tier 2 sources
2. Use Tier 3 sources for additional context when needed
3. Use Tier 4 sources ONLY for dates, timelines, or chronological context
4. If information exists in multiple tiers, prefer the higher tier source`;

    // Get File Search Store name for semantic retrieval
    const storeName = await getStoreName();

    // Build query with File Search tool (for documents) and optional image fileData
    const queryParts: any[] = [{ text: sanitizedQuery }];

    // Add images as direct fileData (Files API - temporary 48-hour solution)
    // TODO: Find permanent solution for image storage (Files API expires after 48 hours)
    if (images.length > 0) {
      console.log(`Including ${images.length} images as direct fileData (Files API)`);
      images.forEach((img) => {
        queryParts.push({
          fileData: {
            mimeType: img.mimeType,
            fileUri: img.fileUri,
          },
        });
      });
    }

    // Build conversation history
    const contents: any[] = [];

    if (sanitizedHistory && sanitizedHistory.length > 0) {
      for (const msg of sanitizedHistory) {
        contents.push({
          role: msg.role === "model" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }

    // Add current query
    contents.push({
      role: "user",
      parts: queryParts,
    });

    // Query corpus using File Search Store
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: [storeName],
            },
          },
        ],
      },
    });

    const answer = result.text || "";
    const grounding = result.candidates?.[0]?.groundingMetadata;

    // Extract citations from corpus query
    const citations: any[] = [];
    const referencedDocIds: string[] = [];
    const docMap = new Map<string, { doc: any; pages: Set<number>; citationKey: string }>();

    if (grounding?.groundingChunks) {
      // Track unique documents by title (docMap already declared above)

      grounding.groundingChunks.forEach((chunk: any, idx: number) => {
        const chunkTitle = chunk.retrievedContext?.title;
        if (!chunkTitle) return;

        // Extract page numbers from chunk text (look for "--- PAGE X ---" markers)
        const chunkText = chunk.retrievedContext?.text || '';
        const pageMatches = chunkText.match(/---\s*PAGE\s+(\d+)\s*---/g) || [];
        const pages = pageMatches.map((m: string) => {
          const match = m.match(/PAGE\s+(\d+)/);
          return match ? parseInt(match[1]) : null;
        }).filter((p: number | null) => p !== null);

        // Try to match chunk title to original document using fileId
        // Chunk title: "upload-1763588882831.pdf"
        // FileId contains: "fileSearchStores/.../upload1763588882831pdf-randomId"
        // Normalize chunk title by removing dashes and dots to match fileId format
        const normalizedTitle = chunkTitle.replace(/-/g, '').replace(/\./g, '');

        // Find matching document by checking if fileId contains normalized chunk title
        const matchedDoc = approvedDocs.find(doc => {
          return doc.fileId && doc.fileId.includes(normalizedTitle);
        });

        if (matchedDoc && !docMap.has(matchedDoc.fileId)) {
          const docIdx = approvedDocs.indexOf(matchedDoc);
          const citationKey = docCitationKeys[docIdx] || 'Doc' + (docIdx + 1);

          docMap.set(matchedDoc.fileId, {
            doc: matchedDoc,
            pages: new Set(pages as number[]),
            citationKey
          });
        } else if (matchedDoc) {
          // Add pages to existing document
          const existing = docMap.get(matchedDoc.fileId)!;
          pages.forEach((p: number) => existing.pages.add(p));
        }
      });

      // Build citations from matched documents
      docMap.forEach(({ doc, pages, citationKey }) => {
        referencedDocIds.push(doc.fileId);

        const pageNumbers = Array.from(pages).sort((a, b) => a - b);
        const pageInfo = pageNumbers.length > 0
          ? `, p.${pageNumbers.join(', ')}`
          : '';

        citations.push({
          documentId: doc.fileId,
          title: `[${citationKey}${pageInfo}] ${doc.title}`,
          excerpt: doc.summary ? doc.summary.substring(0, 150) + "..." : "No summary available",
          pageNumber: pageNumbers[0] || undefined,
        });
      });
    }

    // Inject citations into response text (post-processing)
    const annotatedAnswer = injectCitations(answer, docMap);

    return NextResponse.json({
      answer: annotatedAnswer,  // Now contains inline citations at end of paragraphs
      citations,                // Keep separate citations for UI display
      referencedDocuments: referencedDocIds,
    });
  } catch (error) {
    console.error("Summary API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
