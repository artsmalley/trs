import { NextRequest, NextResponse } from "next/server";
import { getDocumentMetadata } from "@/lib/kv";
import { GoogleAIFileManager } from "@google/generative-ai/server";

// GET /api/corpus/download/[fileId] - Download document file
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    // Get document metadata from Redis
    const doc = await getDocumentMetadata(fileId);
    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY is not set");
    }

    // Get file from Google Files API
    const fileManager = new GoogleAIFileManager(apiKey);
    const file = await fileManager.getFile(doc.fileId);

    if (!file || !file.uri) {
      return NextResponse.json(
        { error: "File not found in Google Files API" },
        { status: 404 }
      );
    }

    // Fetch the file content from Google's URI
    // Note: Google Files API doesn't provide direct download URLs
    // We need to redirect to the fileUri or provide metadata

    // Return file metadata for now (actual file download requires Google Cloud Storage access)
    return NextResponse.json({
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      fileUri: file.uri,
      message: "File download not yet implemented - requires Google Cloud Storage access",
      // In a full implementation, you would:
      // 1. Download file from Google's internal storage
      // 2. Stream it back to the client
      // 3. Or provide a signed download URL
    });

  } catch (error) {
    console.error("Download API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
