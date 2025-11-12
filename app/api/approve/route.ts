import { NextRequest, NextResponse } from "next/server";
import { updateDocumentMetadata } from "@/lib/kv";

// POST /api/approve - Approve or reject document metadata
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileId, action, updates } = body;

    if (!fileId || !action) {
      return NextResponse.json(
        { error: "fileId and action are required" },
        { status: 400 }
      );
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    // Update metadata with approval/rejection
    const updatedMetadata = await updateDocumentMetadata(fileId, {
      ...updates,
      status: action === "approve" ? "approved" : "rejected",
      approvedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      metadata: updatedMetadata,
      message: `Document ${action === "approve" ? "approved" : "rejected"} successfully`,
    });
  } catch (error) {
    console.error("Approve API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
