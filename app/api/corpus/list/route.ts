import { NextRequest, NextResponse } from "next/server";

// GET /api/corpus/list - List all documents in corpus
export async function GET(req: NextRequest) {
  try {
    // TODO: Implement document listing
    // 1. Query Vercel KV for all document metadata
    // 2. Optionally filter by track, year, language
    // 3. Sort by upload date or title
    // 4. Return list

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const track = searchParams.get("track");
    const year = searchParams.get("year");

    // Mock response for now
    return NextResponse.json({
      documents: [
        {
          fileId: "doc-123",
          title: "PE#1 Workflow Chart",
          year: 2020,
          summary: "Detailed workflow for Production Engineering Department #1",
          topics: ["workflow", "process design", "PE#1"],
          track: "PE",
          language: "ja",
          uploadedAt: "2025-11-12T10:00:00Z",
        },
        {
          fileId: "doc-456",
          title: "Die Machining Center Patent",
          year: 2018,
          summary: "Patent application for advanced die machining equipment",
          topics: ["die machining", "equipment", "patents"],
          track: "PE",
          language: "en",
          uploadedAt: "2025-11-12T11:30:00Z",
        },
      ],
      total: 2,
      filters: { track, year },
    });
  } catch (error) {
    console.error("Corpus list API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
