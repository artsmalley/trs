import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { listAllDocuments } from "@/lib/kv";
import { getStoreName } from "@/lib/file-search-store";
import { checkRateLimit, getClientIdentifier, rateLimitPresets } from "@/lib/rate-limit";
import { sanitizeQuery, sanitizeCustomInstructions } from "@/lib/sanitize";

// POST /api/draft - Generate outline or full draft
export async function POST(req: NextRequest) {
  try {
    // Rate limiting - Same as summary endpoint (expensive AI operation)
    const identifier = getClientIdentifier(req);
    const rateLimitCheck = await checkRateLimit(identifier, rateLimitPresets.summary);

    if (!rateLimitCheck.allowed) {
      return rateLimitCheck.response!;
    }

    const {
      action,
      setup,
      outline,
    } = await req.json();

    if (!action || !setup) {
      return NextResponse.json(
        { error: "Action and setup are required" },
        { status: 400 }
      );
    }

    if (action === "generate-draft" && !outline) {
      return NextResponse.json(
        { error: "Outline is required for draft generation" },
        { status: 400 }
      );
    }

    // Validate and sanitize topic/key points
    const topicValidation = sanitizeQuery(setup.topic || "");
    if (!topicValidation.isValid) {
      return NextResponse.json(
        { error: topicValidation.error, warnings: topicValidation.warnings },
        { status: 400 }
      );
    }

    const keyPointsValidation = sanitizeCustomInstructions(setup.keyPoints || "");
    if (!keyPointsValidation.isValid) {
      return NextResponse.json(
        { error: keyPointsValidation.error },
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

    console.log(`Draft API: ${approvedDocs.length} documents available for ${action}`);

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

    // Article type instructions
    const articleTypeInstructions: Record<string, string> = {
      'research': 'Write in academic style with formal language, structured arguments, and extensive citations.',
      'opinion': 'Write as an opinion/argument piece with a clear thesis, persuasive reasoning, and supporting evidence.',
      'technical': 'Write for technical practitioners with detailed processes, methods, and specifications.',
      'historical': 'Present information chronologically, showing evolution and development over time.',
      'case-study': 'Focus on specific examples, real-world implementations, and practical applications.',
      'executive': 'Write concisely for executives with key insights, actionable takeaways, and strategic implications.',
    };

    // Tone instructions
    const toneInstructions: Record<string, string> = {
      'academic': 'Use formal academic tone with precise language and scholarly conventions.',
      'journalistic': 'Use accessible, narrative style suitable for general business readers.',
      'technical': 'Use technical terminology appropriate for engineering practitioners.',
      'executive': 'Use concise, direct language focused on business implications.',
    };

    if (action === "generate-outline") {
      // STEP 1: Generate structured outline

      const systemInstruction = `You are an expert research writer specializing in Toyota production engineering and manufacturing.

${articleTypeInstructions[setup.articleType] || ''}
${toneInstructions[setup.tone] || ''}

Your task is to create a structured article outline based on the user's topic and the available corpus.

${corpusContext}

DOCUMENT QUALITY PRIORITIZATION:
Documents in the corpus have quality tiers to guide your writing:
- Tier 1 (Authoritative): Primary sources from ex-Toyota authors and top experts - PRIORITIZE THESE
- Tier 2 (High Quality): Academic papers and detailed technical documents - PRIORITIZE THESE
- Tier 3 (Supporting): Supporting materials and general references - Use for additional context
- Tier 4 (Background): Timelines and historical context - Use ONLY for dates and chronology

When creating the outline:
1. PRIORITIZE insights and examples from Tier 1 (Authoritative) and Tier 2 (High Quality) sources
2. Use Tier 3 (Supporting) sources for additional context when needed
3. Use Tier 4 (Background) sources ONLY for establishing dates, timelines, or chronological context
4. Identify which corpus documents will be cited in each section, preferring higher-tier sources

OUTLINE FORMAT:
Generate a hierarchical outline with the following structure:
- Use Roman numerals for main sections (I, II, III)
- Use capital letters for subsections (A, B, C)
- For each section, include:
  * Section title
  * Estimated word count (should sum to approximately ${setup.length} words total)
  * Key sources from the corpus that will be cited (use Citation Keys)

TARGET LENGTH: ${setup.length} words total
CITATION STYLE: ${setup.citationStyle || 'Inline (Author, Year)'}

The File Search tool will help you understand what content is available in the corpus.`;

      const userPrompt = `Create a detailed outline for an article on the following topic:

TOPIC: ${topicValidation.sanitized}

${setup.targetAudience ? `TARGET AUDIENCE: ${setup.targetAudience}` : ''}

${setup.keyPoints ? `KEY POINTS TO INCLUDE:\n${keyPointsValidation.sanitized}` : ''}

Please generate a structured outline that:
1. Covers the topic comprehensively using corpus sources
2. Has a clear flow from introduction to conclusion
3. Specifies which corpus documents will be used for each section
4. Distributes the ${setup.length}-word target across sections logically
5. Identifies any gaps where corpus coverage is weak`;

      // Generate outline using File Search tool
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

      const outlineText = result.text || "";

      return NextResponse.json({
        outline: outlineText,
        documentsUsed: approvedDocs.length,
      });

    } else if (action === "generate-draft") {
      // STEP 2: Generate full draft from outline

      const systemInstruction = `You are an expert research writer specializing in Toyota production engineering and manufacturing.

${articleTypeInstructions[setup.articleType] || ''}
${toneInstructions[setup.tone] || ''}

Your task is to write a complete article based on the approved outline and corpus sources.

${corpusContext}

DOCUMENT QUALITY PRIORITIZATION:
Documents in the corpus have quality tiers to guide your writing:
- Tier 1 (Authoritative): Primary sources from ex-Toyota authors and top experts - PRIORITIZE THESE
- Tier 2 (High Quality): Academic papers and detailed technical documents - PRIORITIZE THESE
- Tier 3 (Supporting): Supporting materials and general references - Use for additional context
- Tier 4 (Background): Timelines and historical context - Use ONLY for dates and chronology

When writing the article:
1. PRIORITIZE insights, examples, and quotes from Tier 1 (Authoritative) and Tier 2 (High Quality) sources
2. Use Tier 3 (Supporting) sources for additional context when needed
3. Use Tier 4 (Background) sources ONLY for establishing dates, timelines, or chronological context
4. If multiple sources cover the same topic, prefer the higher-tier source

WRITING REQUIREMENTS:
- TARGET LENGTH: ${setup.length} words
- CITATION STYLE: ${setup.citationStyle || 'Inline (Author, Year)'}
- Use direct quotes where appropriate
- Include page numbers in citations: [CitationKey, p.#]
- Ensure all factual claims are supported by corpus sources
- Follow the outline structure provided

The File Search tool will retrieve relevant content from the corpus to support your writing.`;

      const userPrompt = `Write a complete article based on this approved outline:

TOPIC: ${topicValidation.sanitized}

OUTLINE:
${outline}

${setup.targetAudience ? `TARGET AUDIENCE: ${setup.targetAudience}` : ''}

${setup.keyPoints ? `KEY POINTS TO INCLUDE:\n${keyPointsValidation.sanitized}` : ''}

Write the full article with:
1. Proper citations using the Citation Key format
2. Clear section headings following the outline
3. Approximately ${setup.length} words total
4. Direct quotes and evidence from corpus sources
5. Smooth transitions between sections`;

      // Generate draft using File Search tool
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

      const draftText = result.text || "";

      // Extract word count
      const wordCount = draftText.split(/\s+/).length;

      // Extract sources from grounding metadata
      const groundingMetadata = result.candidates?.[0]?.groundingMetadata;
      const sourcesUsed: string[] = [];

      if (groundingMetadata?.groundingChunks) {
        groundingMetadata.groundingChunks.forEach((chunk: any) => {
          if (chunk.retrievedContext?.title) {
            const title = chunk.retrievedContext.title;
            if (!sourcesUsed.includes(title)) {
              sourcesUsed.push(title);
            }
          }
        });
      }

      return NextResponse.json({
        draft: draftText,
        wordCount,
        sourcesUsed,
        documentsAvailable: approvedDocs.length,
      });

    } else {
      return NextResponse.json(
        { error: "Invalid action. Must be 'generate-outline' or 'generate-draft'" },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Draft API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
