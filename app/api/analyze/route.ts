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

    const { article, customInstructions } = await req.json();

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

    const systemInstruction = `You are a TRS database analyst. Your role is to validate articles against the Toyota Research System corpus (${approvedDocs.length} documents) and surface what the database contains.

YOUR TASK: Analyze the article from a DATABASE PERSPECTIVE. Don't just validate - actively surface what else is in TRS.

FOCUS ON:
- What does the TRS database say about the claims in this article?
- **Are the examples used the BEST available in TRS, or are there stronger/more detailed alternatives?**
- **What other relevant documents exist in TRS that provide different perspectives or additional depth?**
- **What's in the database that the article missed?**
- Be specific: "You used [DocX], but TRS also contains [DocY] and [DocZ] which show..."

OUTPUT FORMAT (under 500 words):

## Database Assessment
[2-3 sentences: How well does this article align with what's in the TRS database?]

## TRS Database Findings
[3-5 observations about what ELSE is in the database. For each:]
- **PRIORITY: Surface alternatives** - "Article uses [DocX], but TRS also contains [DocY, DocZ] which..."
- **Compare examples** - Are the ones used the strongest available? What else exists?
- **Identify gaps** - What relevant content is in TRS that article doesn't reference?
- Reference specific documents by Citation Key [like this]
- Frame as analytical comparison, not prescription

${customInstructions ? `\nUSER'S FOCUS AREAS:\n${customInstructions}\n` : ''}

IMPORTANT:
- **Actively surface alternatives** - don't just validate, show what else exists
- Frame as "TRS also contains..." or "Database shows alternative evidence in..."
- Compare examples: "While [DocX] is valid, [DocY] provides more detail on..."
- Identify what's in TRS that article doesn't use
- Cite corpus documents by Citation Key
- Under 500 words total

The File Search tool will help you query the TRS corpus.`;

    const userPrompt = `Validate this article against the TRS database. Focus on what the database contains, not general writing advice.

ARTICLE TO ANALYZE:
${articleValidation.sanitized}

---

Provide your analysis in this format:

## Database Assessment
[2-3 sentences: How well does this article align with TRS database contents?]

## TRS Database Findings
[3-5 observations about what ELSE is in the database. Focus on:]
- Alternative documents on the same topics
- Stronger or more detailed examples available in TRS
- Relevant content the article doesn't reference
- Comparisons: "Article uses X, but TRS also has Y and Z which..."

Keep response under 500 words. Frame as "TRS also contains..." or "Database shows alternative evidence in..." - actively surface what else exists, don't just validate.

Use Citation Keys to reference specific corpus documents.`;

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
