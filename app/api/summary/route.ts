import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { listAllDocuments } from "@/lib/kv";

// POST /api/summary - Query corpus with RAG
export async function POST(req: NextRequest) {
  try {
    const { query, history } = await req.json();

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

    // Build context from approved documents
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

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

    // Construct system instruction
    const systemInstruction = `You are a research assistant specializing in Toyota production engineering and manufacturing.

You have access to the following approved documents in the corpus:

${approvedDocs
  .map(
    (doc, idx) =>
      `Document: "${doc.title}"
Citation Key: [${docCitationKeys[idx]}]
Authors: ${doc.authors.length > 0 ? doc.authors.join(", ") : "Unknown"}
Track: ${doc.track}
Year: ${doc.year || "Unknown"}
${doc.summary ? `Summary: ${doc.summary}` : ""}
${doc.keywords.length > 0 ? `Keywords: ${doc.keywords.join(", ")}` : ""}
---`
  )
  .join("\n\n")}

IMPORTANT: Read the full content of the uploaded documents to answer questions. Do not rely only on the summaries above.

When citing information:
- Use the Citation Key format: [CitationKey, p.#] (e.g., [${docCitationKeys[0] || 'Tanaka2024'}, p.5])
- Include direct quotes from the source text in quotation marks
- Be specific about which section or heading the information comes from
- The citation key corresponds to the document listed above`;

    // Build conversation history with file references
    const contents = [];

    // Add conversation history if present
    if (history && history.length > 0) {
      for (const msg of history) {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }

    // Helper function to detect MIME type from filename
    const getMimeType = (doc: any): string => {
      if (doc.mimeType) return doc.mimeType;
      // Fallback for old documents without mimeType
      const ext = doc.fileName.toLowerCase().split('.').pop();
      const mimeTypes: Record<string, string> = {
        'pdf': 'application/pdf',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc': 'application/msword',
        'txt': 'text/plain',
      };
      return mimeTypes[ext || 'pdf'] || 'application/pdf';
    };

    // Add current query with file URIs for grounding
    const currentMessage: any = {
      role: "user",
      parts: [
        { text: query },
        // Add all approved document files for Gemini to read
        ...approvedDocs.map((doc) => ({
          fileData: {
            mimeType: getMimeType(doc),
            fileUri: doc.fileUri,
          },
        })),
      ],
    };

    contents.push(currentMessage);

    // Generate response with file grounding
    const result = await model.generateContent({
      contents,
      systemInstruction: systemInstruction,
    });

    const response = result.response;
    const responseText = response.text();

    // Log grounding metadata if available (for debugging)
    if (response.candidates?.[0]?.groundingMetadata) {
      console.log('Grounding metadata:', JSON.stringify(response.candidates[0].groundingMetadata, null, 2));
    }

    // Extract document references from response
    // Matches patterns like: [Tanaka2024, p.5], [PE2024, p.11], [Doc1], etc.
    const citationMatches = responseText.match(/\[[\w]+(?:\d{4})?(?:,\s*p\.?\d+)?\]/g) || [];

    // Build a map of citation keys to document indices
    const citationKeyMap = new Map<string, number>();
    docCitationKeys.forEach((key, idx) => {
      citationKeyMap.set(key.toLowerCase(), idx);
    });

    // Extract referenced document IDs and page numbers
    const referencedDocs = new Map<string, Set<number>>();
    citationMatches.forEach((match) => {
      // Parse citation format: [CitationKey, p.5] or [CitationKey]
      const parts = match.match(/\[([\w\d]+)(?:,\s*p\.?(\d+))?\]/);
      if (!parts) return;

      const citationKey = parts[1].toLowerCase();
      const pageNum = parts[2] ? parseInt(parts[2]) : undefined;

      // Find document by citation key
      const docIdx = citationKeyMap.get(citationKey);
      if (docIdx !== undefined) {
        const doc = approvedDocs[docIdx];
        if (doc) {
          if (!referencedDocs.has(doc.fileId)) {
            referencedDocs.set(doc.fileId, new Set());
          }
          if (pageNum !== undefined) {
            referencedDocs.get(doc.fileId)!.add(pageNum);
          }
        }
      }
    });

    const referencedDocIds = Array.from(referencedDocs.keys());

    // Build citations from referenced documents with page numbers
    const citations = Array.from(referencedDocs.entries())
      .slice(0, 5) // Limit to 5 documents
      .map(([fileId, pages]) => {
        const docIdx = approvedDocs.findIndex(d => d.fileId === fileId);
        const doc = approvedDocs[docIdx];
        if (!doc) return null;

        const citationKey = docCitationKeys[docIdx];
        const pageNumbers = Array.from(pages).sort((a, b) => a - b);
        const pageInfo = pageNumbers.length > 0
          ? `, p.${pageNumbers.join(', ')}`
          : '';

        // Format: [AuthorYear] Title (or [Track/Doc1] Title)
        return {
          documentId: doc.fileId,
          title: `[${citationKey}${pageInfo}] ${doc.title}`,
          excerpt: doc.summary.substring(0, 150) + "...",
          pageNumber: pageNumbers[0], // Use first page number
        };
      })
      .filter((c) => c !== null);

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
