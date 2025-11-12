import { NextRequest, NextResponse } from "next/server";
import { performGoogleSearch } from "@/lib/google-search";

/**
 * POST /api/search
 * Performs web search using Google Custom Search API
 */
export async function POST(request: NextRequest) {
  try {
    const { query, startIndex = 1 } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query parameter is required and must be a string" },
        { status: 400 }
      );
    }

    // Perform search
    const results = await performGoogleSearch(query, startIndex);

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
