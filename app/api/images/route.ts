import { NextRequest, NextResponse } from "next/server";

// POST /api/images - Upload and analyze images with Gemini Vision
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Image file is required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // TODO: Implement image analysis:
    // 1. Convert image to base64 or buffer
    // 2. Call Gemini 2.5 Flash with vision capabilities
    // 3. Extract:
    //    - Detailed description
    //    - Any visible text (OCR)
    //    - Relevant tags/topics
    //    - Suggested metadata (title, track, etc.)
    // 4. Store analysis as text document in File Search
    // 5. Store metadata in Vercel KV
    // 6. Return for human review

    // Mock response for now
    return NextResponse.json({
      imageId: "img-" + Date.now(),
      analysis: "This appears to be a technical diagram showing a machine tool layout with labeled components in Japanese. The diagram depicts a die machining center with annotations for various mechanical parts.",
      extractedText: "工作機械配置図\nダイ加工センター\n寸法: 2500mm x 1800mm",
      tags: ["machine tool", "die machining", "technical diagram", "PE"],
      confidence: 0.92,
      metadata: {
        title: file.name.replace(/\.[^/.]+$/, ""),
        year: new Date().getFullYear(),
        summary: "Technical diagram - awaiting detailed analysis",
        topics: ["machine tools", "die machining"],
        track: "PE",
        language: "ja",
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Images API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
