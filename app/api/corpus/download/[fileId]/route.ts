import { NextRequest, NextResponse } from "next/server";
import { getDocumentMetadata } from "@/lib/kv";

// GET /api/corpus/download/[fileId] - Download file from Blob storage
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId: rawFileId } = await params;

    // Decode fileId in case it contains URL-encoded characters (e.g., files%2Fxxx → files/xxx)
    // Next.js usually auto-decodes, but we ensure it here for safety
    const fileId = decodeURIComponent(rawFileId);

    // Get file metadata from Redis
    const doc = await getDocumentMetadata(fileId);
    if (!doc) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Check if blobUrl exists
    if (!doc.blobUrl) {
      return NextResponse.json(
        {
          error: "File not available for download",
          message: "This file was uploaded before Blob storage was enabled. Please re-upload to enable downloads."
        },
        { status: 404 }
      );
    }

    // Fetch file from Vercel Blob
    const response = await fetch(doc.blobUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch file from Blob: ${response.statusText}`);
    }

    // Get file as buffer
    const fileBuffer = await response.arrayBuffer();

    // Return file with proper headers for download
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${doc.fileName}"`,
        "Content-Length": fileBuffer.byteLength.toString(),
      },
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
