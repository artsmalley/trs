import { NextRequest, NextResponse } from "next/server";
import { listAllDocuments, getDocumentMetadata, storeDocumentMetadata } from "@/lib/kv";
import { classifyDocument } from "@/lib/classify-documents";

/**
 * POST /api/corpus/classify-all
 *
 * Runs conservative auto-classification on all approved documents.
 * Returns tier distribution summary.
 *
 * Protected endpoint - requires confirmation in request body.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { confirm } = body;

    // Require explicit confirmation to prevent accidental classification
    if (confirm !== "CLASSIFY_ALL_DOCUMENTS") {
      return NextResponse.json(
        { error: "Missing or invalid confirmation token. Send { confirm: 'CLASSIFY_ALL_DOCUMENTS' }" },
        { status: 400 }
      );
    }

    // Get all documents
    const allDocuments = await listAllDocuments();

    // Filter for approved documents only (don't classify pending/rejected)
    const approvedDocuments = allDocuments.filter(doc => doc.status === "approved");

    if (approvedDocuments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No approved documents to classify",
        summary: {
          total: 0,
          classified: 0,
          distribution: {}
        }
      });
    }

    // Track classification results
    const tierCounts: Record<string, number> = {
      "Tier 1": 0,
      "Tier 2": 0,
      "Tier 3": 0,
      "Tier 4": 0
    };

    let classified = 0;
    const errors: string[] = [];

    // Classify each document
    for (const doc of approvedDocuments) {
      try {
        // Skip documents that already have manual classifications
        if (doc.qualityTier && doc.autoClassified === false) {
          tierCounts[doc.qualityTier] = (tierCounts[doc.qualityTier] || 0) + 1;
          continue; // Keep manual classifications
        }

        // Run classification
        const classification = classifyDocument(doc);

        // Update metadata in Redis
        const updatedMetadata = {
          ...doc,
          qualityTier: classification.qualityTier,
          tierLabel: classification.tierLabel,
          autoClassified: classification.autoClassified,
          classifiedAt: classification.classifiedAt
        };

        await storeDocumentMetadata(doc.fileId, updatedMetadata);

        // Track result
        tierCounts[classification.qualityTier] = (tierCounts[classification.qualityTier] || 0) + 1;
        classified++;

      } catch (error) {
        console.error(`Classification error for ${doc.fileId}:`, error);
        errors.push(`${doc.fileName}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully classified ${classified} of ${approvedDocuments.length} documents`,
      summary: {
        total: approvedDocuments.length,
        classified,
        distribution: tierCounts,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error("Classify-all API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/corpus/classify-all
 *
 * Returns current classification distribution without running classification.
 * Useful for checking tier distribution before/after classification.
 */
export async function GET() {
  try {
    const allDocuments = await listAllDocuments();
    const approvedDocuments = allDocuments.filter(doc => doc.status === "approved");

    const tierCounts: Record<string, number> = {
      "Tier 1": 0,
      "Tier 2": 0,
      "Tier 3": 0,
      "Tier 4": 0,
      "Unclassified": 0
    };

    let autoClassified = 0;
    let manuallyClassified = 0;

    for (const doc of approvedDocuments) {
      if (doc.qualityTier) {
        tierCounts[doc.qualityTier] = (tierCounts[doc.qualityTier] || 0) + 1;
        if (doc.autoClassified) {
          autoClassified++;
        } else {
          manuallyClassified++;
        }
      } else {
        tierCounts["Unclassified"]++;
      }
    }

    return NextResponse.json({
      total: approvedDocuments.length,
      distribution: tierCounts,
      autoClassified,
      manuallyClassified
    });

  } catch (error) {
    console.error("Get classification stats error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
