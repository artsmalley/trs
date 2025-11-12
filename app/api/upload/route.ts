import { NextRequest, NextResponse } from "next/server";

// POST /api/upload - Upload and process document
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    // TODO: Implement document processing:
    // 1. Save file temporarily
    // 2. Extract text
    // 3. Use Gemini to extract metadata
    // 4. Upload to File Search
    // 5. Store metadata in Vercel KV
    // 6. Return for human review

    // Mock response for now
    return NextResponse.json({
      fileId: "mock-file-id-" + Date.now(),
      status: "processing",
      extractedMetadata: {
        title: file.name,
        year: new Date().getFullYear(),
        summary: "Pending extraction...",
        topics: [],
        track: "PE",
        language: "en",
        uploadedAt: new Date().toISOString(),
      },
      needsReview: true,
    });
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
