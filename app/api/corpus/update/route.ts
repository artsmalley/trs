import { NextRequest, NextResponse } from "next/server";
import { getDocumentMetadata, storeDocumentMetadata } from "@/lib/kv";

// POST /api/corpus/update - Update document metadata
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileId, updates } = body;

    if (!fileId) {
      return NextResponse.json(
        { error: "Missing fileId" },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: "Missing or invalid updates object" },
        { status: 400 }
      );
    }

    // Get existing metadata
    const existingMetadata = await getDocumentMetadata(fileId);

    if (!existingMetadata) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Merge updates with existing metadata
    const updatedMetadata = {
      ...existingMetadata,
      ...updates,
      // Preserve system fields
      fileId: existingMetadata.fileId,
      fileUri: existingMetadata.fileUri,
      fileName: existingMetadata.fileName,
      mimeType: existingMetadata.mimeType,
      fileType: existingMetadata.fileType,
      blobUrl: existingMetadata.blobUrl,
      uploadedAt: existingMetadata.uploadedAt,
    };

    // Store updated metadata
    await storeDocumentMetadata(fileId, updatedMetadata);

    return NextResponse.json({
      success: true,
      metadata: updatedMetadata,
    });
  } catch (error) {
    console.error("Update metadata error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
