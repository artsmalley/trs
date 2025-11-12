import { NextRequest, NextResponse } from "next/server";

// POST /api/research - Generate search terms and research strategy
export async function POST(req: NextRequest) {
  try {
    const { topic } = await req.json();

    if (!topic) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    // TODO: Implement Gemini call to generate search terms
    // For now, return mock data
    return NextResponse.json({
      searchTerms: {
        japanese: ["工作図面", "生産技術", "工程設計"],
        english: ["Production engineering", "Process design", "Tooling"],
      },
      priorities: [
        {
          id: "1",
          topic: "Kosaku-zumen (工作図面)",
          searchTerms: ["工作図面", "作業図面"],
          priority: "high",
          status: "not_started",
        },
      ],
      recommendations: "Start with J-STAGE search using 工作図面",
    });
  } catch (error) {
    console.error("Research API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
