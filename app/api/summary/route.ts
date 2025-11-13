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

    // Construct prompt with document context
    const contextPrompt = `You are a research assistant specializing in Toyota production engineering and manufacturing.

You have access to the following approved documents in the corpus:

${approvedDocs
  .map(
    (doc, idx) =>
      `[${idx + 1}] ${doc.title}
Track: ${doc.track}
Year: ${doc.year || "Unknown"}
Summary: ${doc.summary}
Keywords: ${doc.keywords.join(", ")}
---`
  )
  .join("\n\n")}

Answer the user's question based on the above documents. If you reference information from a specific document, cite it using the format [Document #].

User Question: ${query}`;

    // Build conversation history
    const contents = [];
    if (history && history.length > 0) {
      for (const msg of history) {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }
    // Add current query with context
    contents.push({
      role: "user",
      parts: [{ text: contextPrompt }],
    });

    // Generate response
    const result = await model.generateContent({
      contents,
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
