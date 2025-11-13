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
      model: "gemini-2.0-flash-exp",
    });

    // Construct system instruction
    const systemInstruction = `You are a research assistant specializing in Toyota production engineering and manufacturing.

You have access to the following approved documents in the corpus:

${approvedDocs
  .map(
    (doc, idx) =>
      `[${idx + 1}] ${doc.title}
Track: ${doc.track}
Year: ${doc.year || "Unknown"}
${doc.summary ? `Summary: ${doc.summary}` : ""}
${doc.keywords.length > 0 ? `Keywords: ${doc.keywords.join(", ")}` : ""}
---`
  )
  .join("\n\n")}

IMPORTANT: Read the full content of the uploaded documents to answer questions. Do not rely only on the summaries above. If you find relevant information in a document, cite it using [Document #] format and quote the specific passages.`;

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

    // Extract document references from response (matches [1], [2], etc.)
    const citationMatches = responseText.match(/\[\d+\]/g) || [];
    const referencedDocIds = [
      ...new Set(
        citationMatches.map((match) => {
          const idx = parseInt(match.match(/\d+/)?.[0] || "0") - 1;
          return approvedDocs[idx]?.fileId || null;
        })
      ),
    ].filter(Boolean);

    // Build citations from referenced documents
    const citations = [...new Set(citationMatches)]
      .slice(0, 5) // Limit to 5 citations
      .map((match) => {
        const idx = parseInt(match.match(/\d+/)?.[0] || "0") - 1;
        const doc = approvedDocs[idx];
        if (!doc) return null;
        return {
          documentId: doc.fileId,
          title: doc.title,
          excerpt: doc.summary.substring(0, 150) + "...",
          pageNumber: undefined,
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
