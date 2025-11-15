import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { listAllDocuments } from "@/lib/kv";
import { getStoreName } from "@/lib/file-search-store";
import { checkRateLimit, getClientIdentifier, rateLimitPresets } from "@/lib/rate-limit";
import { sanitizeArticle } from "@/lib/sanitize";

// POST /api/analyze - Analyze article against corpus
export async function POST(req: NextRequest) {
  try {
    // Rate limiting - Same as summary endpoint (expensive AI operation)
    const identifier = getClientIdentifier(req);
    const rateLimitCheck = await checkRateLimit(identifier, rateLimitPresets.summary);

    if (!rateLimitCheck.allowed) {
      return rateLimitCheck.response!;
    }

    const { article } = await req.json();

    if (!article || !article.trim()) {
      return NextResponse.json(
        { error: "Article text is required" },
        { status: 400 }
      );
    }

    // Validate and sanitize article
    const articleValidation = sanitizeArticle(article);
    if (!articleValidation.isValid) {
      return NextResponse.json(
        { error: articleValidation.error },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY is not set");
    }

    // Get all approved documents from KV
    const allDocs = await listAllDocuments();
    const approvedDocs = allDocs.filter((doc) => doc.status === "approved" && doc.fileType === "document");

    if (approvedDocs.length === 0) {
      return NextResponse.json({
        error: "No approved documents available in the corpus yet. Please upload and approve some documents first.",
      }, { status: 400 });
    }

    console.log(`Analyze API: Analyzing article against ${approvedDocs.length} documents`);

    // Initialize Gemini client
    const ai = new GoogleGenAI({ apiKey });
    const storeName = await getStoreName();

    // Helper function to generate citation key
    const generateCitationKey = (doc: any, idx: number): string => {
      if (doc.citationName && doc.year) {
        return `${doc.citationName}${doc.year}`;
      } else if (doc.year) {
        return `${doc.track}${doc.year}`;
      } else if (doc.title) {
        const words = doc.title
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter((w: string) => w.length > 2)
          .slice(0, 3);
        return words.map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
      }
      return `Doc${idx + 1}`;
    };

    // Create citation reference for each document
    const docCitationKeys = approvedDocs.map((doc, idx) => generateCitationKey(doc, idx));

    // Build corpus context
    const corpusContext = `
AVAILABLE CORPUS (${approvedDocs.length} documents):
${approvedDocs
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
  .join("\n\n")}`;

    const systemInstruction = `You are an expert research analyst specializing in Toyota production engineering and manufacturing.

Your task is to analyze a user-written article and provide detailed feedback by comparing it against the available corpus.

${corpusContext}

ANALYSIS CATEGORIES:

1. FACT-CHECKING
   - Verify factual claims against corpus sources
   - Identify any inaccuracies or misstatements
   - Confirm dates, names, processes are correct

2. BETTER EXAMPLES
   - Suggest stronger examples from the corpus
   - Identify missed opportunities to use compelling case studies
   - Recommend specific documents that support the argument better

3. CITATION SUGGESTIONS
   - Identify claims that need corpus citations
   - Suggest appropriate Citation Keys for unsupported statements
   - Format: "Consider citing [CitationKey] for this claim"

4. UNSUPPORTED CLAIMS
   - Flag assertions not backed by corpus evidence
   - Identify statements that lack supporting sources
   - Note areas where the author may be relying on external knowledge

5. COVERAGE GAPS
   - Identify missing perspectives from the corpus
   - Suggest additional angles or tracks (PD, PE, TPS, Cross-Cutting, History)
   - Note relevant corpus documents not referenced

The File Search tool will help you find relevant content from the corpus to support your analysis.

IMPORTANT:
- Be constructive and specific in your feedback
- Always reference corpus documents by Citation Key
- Provide actionable suggestions the author can implement
- Distinguish between critical issues (factual errors) and enhancements (better examples)`;

    const userPrompt = `Please analyze the following article against the corpus:

ARTICLE TO ANALYZE:
${articleValidation.sanitized}

---

Provide detailed feedback in the following categories:
1. Fact-Checking (verify claims against corpus)
2. Better Examples (suggest stronger corpus examples)
3. Citation Suggestions (where citations would strengthen the article)
4. Unsupported Claims (statements lacking corpus evidence)
5. Coverage Gaps (missed opportunities from corpus)

For each category, be specific about:
- What the issue or opportunity is
- Which corpus document(s) are relevant (use Citation Keys)
- What action the author should take`;

    // Analyze using File Search tool
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
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

    const feedbackText = result.text || "";

    console.log('Analysis completed. Feedback length:', feedbackText.length, 'characters');
    if (!feedbackText) {
      console.error('WARNING: Empty feedback generated!');
      console.error('Result object:', JSON.stringify({
        candidates: result.candidates?.map((c: any) => ({
          finishReason: c.finishReason,
          safetyRatings: c.safetyRatings,
          contentLength: c.content?.parts?.length || 0,
        })),
        usageMetadata: result.usageMetadata,
      }, null, 2));
    }

    // Extract sources from grounding metadata
    const groundingMetadata = result.candidates?.[0]?.groundingMetadata;
    const sourcesReferenced: string[] = [];

    if (groundingMetadata?.groundingChunks) {
      groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.retrievedContext?.title) {
          const title = chunk.retrievedContext.title;
          if (!sourcesReferenced.includes(title)) {
            sourcesReferenced.push(title);
          }
        }
      });
    }

    // Count words in original article
    const wordCount = article.split(/\s+/).length;

    return NextResponse.json({
      feedback: feedbackText,
      wordCount,
      sourcesReferenced,
      documentsAvailable: approvedDocs.length,
    });

  } catch (error) {
    console.error("Analyze API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
