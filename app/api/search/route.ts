import { NextRequest, NextResponse } from "next/server";
import { performGoogleSearch } from "@/lib/google-search";
import { checkRateLimit, getClientIdentifier, rateLimitPresets } from "@/lib/rate-limit";
import { sanitizeQuery } from "@/lib/sanitize";

/**
 * POST /api/search
 * Performs web search using Google Custom Search API
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting - Tier 2: Quota-limited endpoint (100 free searches/day)
    const identifier = getClientIdentifier(request);
    const rateLimitCheck = await checkRateLimit(identifier, rateLimitPresets.search);

    if (!rateLimitCheck.allowed) {
      return rateLimitCheck.response!;
    }

    const { query, startIndex = 1 } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query parameter is required and must be a string" },
        { status: 400 }
      );
    }

    // Sanitize and validate query
    const queryValidation = sanitizeQuery(query);
    if (!queryValidation.isValid) {
      return NextResponse.json(
        { error: queryValidation.error, warnings: queryValidation.warnings },
        { status: 400 }
      );
    }

    // Perform search with sanitized query
    const results = await performGoogleSearch(queryValidation.sanitized!, startIndex);

    return NextResponse.json({
      success: true,
      results: results.items || [],
      totalResults: results.searchInformation?.totalResults || "0",
      searchTime: results.searchInformation?.searchTime || 0,
      nextStartIndex: results.queries?.nextPage?.[0]?.startIndex,
    });
  } catch (error: any) {
    console.error("Search API error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to perform search",
        success: false,
      },
      { status: 500 }
    );
  }
}
