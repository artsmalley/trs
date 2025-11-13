import { NextRequest, NextResponse } from "next/server";
import { listAllDocuments, deleteDocumentMetadata } from "@/lib/kv";
import { deleteFromBlob } from "@/lib/blob-storage";
import { GoogleAIFileManager } from "@google/generative-ai/server";

// DELETE /api/corpus/clear-all - Delete ALL files (use with caution!)
export async function DELETE(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY is not set");
    }

    // Get all documents
    const allDocs = await listAllDocuments();

    const fileManager = new GoogleAIFileManager(apiKey);
    let deletedCount = 0;

    // Delete each document from all storage layers
    for (const doc of allDocs) {
      try {
        // Delete from Blob if blobUrl exists
        if (doc.blobUrl) {
          await deleteFromBlob(doc.blobUrl);
        }

        // Delete from File Search if it's a document
        if (doc.fileUri && doc.fileId.startsWith("files/")) {
          try {
            await fileManager.deleteFile(doc.fileId);
          } catch (e) {
            console.warn(`Could not delete from File Search: ${doc.fileId}`);
          }
        }

        // Delete from Redis
        await deleteDocumentMetadata(doc.fileId);
        deletedCount++;

      } catch (error) {
        console.error(`Error deleting ${doc.fileId}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCount} files`,
      deletedCount,
    });

  } catch (error) {
    console.error("Clear all error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
