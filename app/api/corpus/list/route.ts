import { NextRequest, NextResponse } from "next/server";
import { listAllDocuments } from "@/lib/kv";

// Helper function to detect mimeType from fileName
function detectMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// Helper function to detect fileType from mimeType or fileName
function detectFileType(mimeType: string | undefined, fileName: string): "document" | "image" {
  if (mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('application/') || mimeType.startsWith('text/')) return 'document';
  }

  // Fallback to fileName extension
  const ext = fileName.toLowerCase().split('.').pop() || '';
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  return imageExts.includes(ext) ? 'image' : 'document';
}

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
      documents: documents.map((doc) => {
        // Auto-detect missing mimeType and fileType for backward compatibility
        const mimeType = doc.mimeType || detectMimeType(doc.fileName);
        const fileType = doc.fileType || detectFileType(doc.mimeType, doc.fileName);

        return {
          fileId: doc.fileId,
          fileUri: doc.fileUri,
          fileName: doc.fileName,
          mimeType: mimeType,
          fileType: fileType,
          blobUrl: doc.blobUrl,
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
          visionAnalysis: doc.visionAnalysis,
        };
      }),
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
