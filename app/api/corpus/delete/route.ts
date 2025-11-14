import { NextRequest, NextResponse } from "next/server";
import { deleteDocumentMetadata, getDocumentMetadata } from "@/lib/kv";
import { deleteFromBlob } from "@/lib/blob-storage";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { checkRateLimit, getClientIdentifier, rateLimitPresets } from "@/lib/rate-limit";

// POST /api/corpus/delete - Delete a file from Blob, File Search, and Redis
export async function POST(req: NextRequest) {
  try {
    // Rate limiting - Tier 3: Mutation endpoint
    const identifier = getClientIdentifier(req);
    const rateLimitCheck = await checkRateLimit(identifier, rateLimitPresets.mutation);

    if (!rateLimitCheck.allowed) {
      return rateLimitCheck.response!;
    }

    const { fileId } = await req.json();

    if (!fileId) {
      return NextResponse.json({ error: "fileId is required" }, { status: 400 });
    }

    // Get document metadata to access blobUrl and fileType
    const doc = await getDocumentMetadata(fileId);
    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const deletionResults = {
      blob: false,
      fileSearch: false,
      redis: false,
    };

    // 1. Delete from Blob storage (if blobUrl exists)
    if (doc.blobUrl) {
      try {
        await deleteFromBlob(doc.blobUrl);
        deletionResults.blob = true;
        console.log(`✅ Deleted from Blob: ${doc.blobUrl}`);
      } catch (error) {
        console.warn(`⚠️ Failed to delete from Blob: ${error}`);
        // Continue even if Blob deletion fails
      }
    }

    // 2. Delete from File Search (documents only, if fileUri exists)
    if (doc.fileType === "document" && doc.fileUri && doc.fileId.startsWith("files/")) {
      try {
        const apiKey = process.env.GOOGLE_AI_API_KEY;
        if (apiKey) {
          const fileManager = new GoogleAIFileManager(apiKey);
          await fileManager.deleteFile(doc.fileId);
          deletionResults.fileSearch = true;
          console.log(`✅ Deleted from File Search: ${doc.fileId}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to delete from File Search: ${error}`);
        // Continue even if File Search deletion fails
      }
    }

    // 3. Delete metadata from Redis
    await deleteDocumentMetadata(fileId);
    deletionResults.redis = true;
    console.log(`✅ Deleted metadata from Redis: ${fileId}`);

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
      deletionResults,
    });
  } catch (error) {
    console.error("Delete API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
