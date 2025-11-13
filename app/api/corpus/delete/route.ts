import { NextRequest, NextResponse } from "next/server";
import { deleteDocumentMetadata } from "@/lib/kv";

// POST /api/corpus/delete - Delete a document from the corpus
export async function POST(req: NextRequest) {
  try {
    const { fileId } = await req.json();

    if (!fileId) {
      return NextResponse.json({ error: "fileId is required" }, { status: 400 });
    }

    // Delete from Redis
    await deleteDocumentMetadata(fileId);

    // Note: We're NOT deleting from Google Files API / File Search
    // The document remains there but is no longer tracked in our metadata store
    // This is intentional - if you want to fully delete from File Search,
    // you would need to call the Gemini Files API delete endpoint as well

    return NextResponse.json({
      success: true,
      message: "Document metadata deleted successfully",
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
