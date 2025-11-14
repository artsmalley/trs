import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai"; // New SDK for File Search Store
import { GoogleGenerativeAI } from "@google/generative-ai"; // Legacy SDK for Files API (images)
import { listAllDocuments } from "@/lib/kv";
import { getStoreName } from "@/lib/file-search-store";

// POST /api/summary - Query corpus with RAG
export async function POST(req: NextRequest) {
  try {
    const { query, history, mode = 'standard', length = 'medium', customInstructions = '' } = await req.json();

    if (!query) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

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

    // Separate documents (in File Search Store) from images (in Files API)
    const documents = approvedDocs.filter((doc) => doc.fileType === "document");
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

    // Mode modifiers - add focus/lens to the query
    const modeInstructions: Record<string, string> = {
      standard: '',
      'find-examples': 'Focus on identifying specific case studies, examples, and real-world implementations. Provide concrete instances and practical applications.',
      'find-people': 'Emphasize key researchers, authors, teams, and their contributions. Highlight who did what and their roles in development.',
      'compare': 'Analyze and contrast different methods, approaches, schools of thought, or implementations. Show similarities and differences.',
      'timeline': 'Present information chronologically, showing evolution over time. Emphasize when things happened and how they developed.',
      'technical': 'Provide detailed technical explanations including formulas, methods, processes, and specifications. Use precise technical language.',
    };

    // Length modifiers - control response detail level
    const lengthInstructions: Record<string, string> = {
      brief: 'Provide a concise 2-3 sentence response with only the most essential information.',
      medium: 'Provide a balanced response of 2-3 paragraphs with key details and citations.',
      detailed: 'Provide a comprehensive, detailed analysis of 4-6 paragraphs covering all relevant aspects with extensive citations.',
    };

    // Build dynamic instructions
    const modeInstruction = modeInstructions[mode] || '';
    const lengthInstruction = lengthInstructions[length] || lengthInstructions.medium;

    // Construct system instruction
    const systemInstruction = `You are a research assistant specializing in Toyota production engineering and manufacturing.

${modeInstruction ? modeInstruction + '\n' : ''}
${lengthInstruction}
${customInstructions ? '\n' + customInstructions : ''}

You have access to a corpus with the following approved content:

DOCUMENTS (${documents.length} files - searchable via File Search):
${documents
  .map(
    (doc, idx) =>
      `Document: "${doc.title}"
Citation Key: [${docCitationKeys[idx]}]
Authors: ${doc.authors && doc.authors.length > 0 ? doc.authors.join(", ") : "Unknown"}
Track: ${doc.track || "Unknown"}
Year: ${doc.year || "Unknown"}
${doc.summary ? `Summary: ${doc.summary}` : ""}
${doc.keywords && doc.keywords.length > 0 ? `Keywords: ${doc.keywords.join(", ")}` : ""}
---`
  )
  .join("\n\n")}

${images.length > 0 ? `
IMAGES (${images.length} files):
${images
  .map(
    (img, idx) =>
      `Image: "${img.title}"
${img.summary ? `Description: ${img.summary}` : ""}
---`
  )
  .join("\n\n")}
` : ''}

IMPORTANT: The File Search tool will automatically retrieve relevant sections from documents based on your query.

When citing information:
- Use the Citation Key format: [CitationKey, p.#] (e.g., [${docCitationKeys[0] || 'Tanaka2024'}, p.5])
- Include direct quotes from the source text in quotation marks
- Be specific about which section or heading the information comes from
- The citation key corresponds to the document listed above`;

    // Get File Search Store name for semantic retrieval
    const storeName = await getStoreName();

    // Build query with File Search tool (for documents) and optional image fileData
    const queryParts: any[] = [{ text: query }];

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

    if (history && history.length > 0) {
      for (const msg of history) {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }

    // Add current query
    contents.push({
      role: "user",
      parts: queryParts,
    });

    // Generate response with File Search tool (semantic retrieval)
    console.log(`Querying File Search Store: ${storeName}`);
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: [storeName],
              // Optional: can add metadata filters here
            },
          },
        ],
      },
    });

    // Get response text (new SDK structure)
    const responseText = result.text || "";

    // Log grounding metadata if available (for debugging)
    const groundingMetadata = result.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata) {
      console.log('Grounding metadata:', JSON.stringify(groundingMetadata, null, 2));
    }

    // Extract citations from File Search Store grounding metadata
    const citations: any[] = [];
    const referencedDocIds: string[] = [];

    if (groundingMetadata?.groundingChunks) {
      // Track unique documents by title
      const docMap = new Map<string, { doc: any; pages: Set<number>; citationKey: string }>();

      groundingMetadata.groundingChunks.forEach((chunk: any) => {
        const chunkTitle = chunk.retrievedContext?.title;
        if (!chunkTitle) return;

        // Extract page numbers from chunk text (look for "--- PAGE X ---" markers)
        const chunkText = chunk.retrievedContext?.text || '';
        const pageMatches = chunkText.match(/---\s*PAGE\s+(\d+)\s*---/g) || [];
        const pages = pageMatches.map((m: string) => {
          const match = m.match(/PAGE\s+(\d+)/);
          return match ? parseInt(match[1]) : null;
        }).filter((p: number | null) => p !== null);

        // Try to match chunk title to original document
        // Chunk titles are like "upload-1763123009682-TPS_history_timeline.pdf"
        // Extract the actual filename part
        const filenamePart = chunkTitle.replace(/^upload-\d+-/, '');

        // Find matching document by filename
        const matchedDoc = approvedDocs.find(doc => {
          return doc.fileName === filenamePart ||
                 chunkTitle.includes(doc.fileName) ||
                 doc.fileName.includes(filenamePart);
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

    return NextResponse.json({
      answer: responseText,
      citations,
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
