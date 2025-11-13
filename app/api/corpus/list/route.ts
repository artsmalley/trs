import { NextRequest, NextResponse } from "next/server";
import { listAllDocuments } from "@/lib/kv";

// GET /api/corpus/list - List all documents in corpus
export async function GET(req: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const track = searchParams.get("track");
    const year = searchParams.get("year");
    const status = searchParams.get("status"); // pending_review, approved, rejected

    // Get all documents from KV
    let documents = await listAllDocuments();

    // Apply filters
    if (track) {
      documents = documents.filter((doc) => doc.track === track);
    }
    if (year) {
      const yearNum = parseInt(year);
      documents = documents.filter((doc) => doc.year === yearNum);
    }
    if (status) {
      documents = documents.filter((doc) => doc.status === status);
    }

    // Sort by upload date (newest first)
    documents.sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    return NextResponse.json({
      documents: documents.map((doc) => ({
        fileId: doc.fileId,
        fileUri: doc.fileUri,
        fileName: doc.fileName,
        title: doc.title,
        authors: doc.authors,
        year: doc.year,
        summary: doc.summary,
        keywords: doc.keywords,
        track: doc.track,
        language: doc.language,
        documentType: doc.documentType,
        status: doc.status,
        uploadedAt: doc.uploadedAt,
        approvedAt: doc.approvedAt,
      })),
      total: documents.length,
      filters: { track, year, status },
    });
  } catch (error) {
    console.error("Corpus list API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
