import { NextRequest, NextResponse } from "next/server";

// GET /api/corpus/stats - Get corpus statistics
export async function GET(req: NextRequest) {
  try {
    // TODO: Implement corpus statistics
    // 1. Query all documents from Vercel KV
    // 2. Calculate:
    //    - Total documents
    //    - Documents by track
    //    - Documents by year
    //    - Documents by language
    //    - Most common topics
    // 3. Return aggregated stats

    // Mock response for now
    return NextResponse.json({
      total: 32,
      byTrack: {
        PE: 18,
        PD: 8,
        Ops: 4,
        Purchasing: 1,
        "Supplier Dev": 1,
      },
      byYear: {
        2024: 5,
        2023: 8,
        2022: 6,
        2021: 4,
        2020: 5,
        2019: 2,
        2018: 2,
      },
      byLanguage: {
        en: 16,
        ja: 14,
        mixed: 2,
      },
      topTopics: [
        { topic: "Production Engineering", count: 12 },
        { topic: "Machine Tools", count: 9 },
        { topic: "Kosaku-zumen", count: 7 },
        { topic: "Die Design", count: 6 },
        { topic: "Process Design", count: 5 },
      ],
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Corpus stats API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
