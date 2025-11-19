import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { checkRateLimit, getClientIdentifier, rateLimitPresets } from "@/lib/rate-limit";
import { sanitizeQuery, sanitizeCustomInstructions, validateHistory } from "@/lib/sanitize";

// POST /api/web-search - Search the web using Google Search
export async function POST(req: NextRequest) {
  try {
    // Rate limiting - Same as summary endpoint
    const identifier = getClientIdentifier(req);
    const rateLimitCheck = await checkRateLimit(identifier, rateLimitPresets.summary);

    if (!rateLimitCheck.allowed) {
      return rateLimitCheck.response!;
    }

    const { query, history, mode = 'standard', length = 'medium', customInstructions = '' } = await req.json();

    if (!query) {
      return NextResponse.json(
        { error: "Query is required" },
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

    const customInstructionsValidation = sanitizeCustomInstructions(customInstructions);
    if (!customInstructionsValidation.isValid) {
      return NextResponse.json(
        { error: customInstructionsValidation.error, warnings: customInstructionsValidation.warnings },
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
    const sanitizedCustomInstructions = customInstructionsValidation.sanitized || '';
    const sanitizedHistory = historyValidation.sanitized || [];

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY is not set");
    }

    // Initialize Gemini AI
    const ai = new GoogleGenAI({ apiKey });

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

    const modeInstruction = modeInstructions[mode] || '';
    const lengthInstruction = lengthInstructions[length] || lengthInstructions.medium;

    // Minimal system instruction - no corpus context (forces web search)
    const systemInstruction = `You are a research assistant specializing in Toyota production engineering and manufacturing.

${modeInstruction ? modeInstruction + '\n' : ''}
${lengthInstruction}
${sanitizedCustomInstructions ? '\n' + sanitizedCustomInstructions : ''}

You have access to Google Search. Use it to find authoritative external sources, recent information, and expert perspectives.

IMPORTANT: You MUST search the web for this query. Provide well-sourced information with citations.`;

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
      parts: [{ text: sanitizedQuery }],
    });

    // Query web using Google Search
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
        tools: [
          {
            googleSearch: {},
          },
        ],
      },
    });

    const answer = result.text || "";
    const grounding = result.candidates?.[0]?.groundingMetadata;

    // Extract citations from web search results
    const citations: any[] = [];

    if (grounding?.groundingChunks) {
      // Extract unique web sources with their titles and URLs
      const uniqueSources = new Map<string, { title: string; uri: string }>();

      grounding.groundingChunks.forEach((chunk: any, idx: number) => {
        if (chunk.web) {
          const title = chunk.web.title || `Source ${idx + 1}`;
          const uri = chunk.web.uri || '';

          // Use title as key to deduplicate
          if (!uniqueSources.has(title)) {
            uniqueSources.set(title, { title, uri });
          }
        }
      });

      // Add each unique source as a citation
      uniqueSources.forEach(({ title, uri }) => {
        citations.push({
          documentId: `web-${title}`,
          title: `[Web] ${title}`,
          excerpt: uri,
          source: 'web',
        });
      });
    }

    // Also show the search queries that were performed
    if (grounding?.webSearchQueries && grounding.webSearchQueries.length > 0) {
      const queries = grounding.webSearchQueries.join(', ');
      citations.push({
        documentId: 'web-queries',
        title: '[Web] Search Queries',
        excerpt: `Performed searches: ${queries}`,
        source: 'web',
      });
    }

    return NextResponse.json({
      answer,
      citations,
    });
  } catch (error) {
    console.error("Web search API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
