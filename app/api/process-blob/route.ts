import { NextRequest, NextResponse } from "next/server";
import { extractMetadataFromFile } from "@/lib/metadata-extraction";
import { uploadToFileSearch } from "@/lib/file-search"; // Files API for images (48-hour expiry)
import { uploadToStore } from "@/lib/file-search-store"; // File Search Store for documents (permanent + semantic RAG)
import { storeDocumentMetadata } from "@/lib/kv";
import {
  analyzeImageWithVision,
  extractMetadataFromVision,
} from "@/lib/vision-analysis";
import { DocumentMetadata } from "@/lib/types";
import { del as deleteBlob } from "@vercel/blob";
import { checkRateLimit, getClientIdentifier, rateLimitPresets } from "@/lib/rate-limit";
import { validateBlobUrl, sanitizeFilename } from "@/lib/sanitize";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/process-blob - Process files uploaded directly to Blob (client-side upload)
export async function POST(req: NextRequest) {
  let blobUrl: string | null = null;

  try {
    // Rate limiting - Tier 3: Resource-intensive endpoint
    const identifier = getClientIdentifier(req);
    const rateLimitCheck = await checkRateLimit(identifier, rateLimitPresets.upload);

    if (!rateLimitCheck.allowed) {
      return rateLimitCheck.response!;
    }

    const { blobUrl: url, fileName, mimeType } = await req.json();
    blobUrl = url;

    if (!blobUrl || !fileName || !mimeType) {
      return NextResponse.json(
        { error: 'Missing required fields: blobUrl, fileName, or mimeType' },
        { status: 400 }
      );
    }

    // Validate blob URL to prevent SSRF attacks
    const blobUrlValidation = validateBlobUrl(blobUrl);
    if (!blobUrlValidation.isValid) {
      return NextResponse.json(
        { error: blobUrlValidation.error },
        { status: 400 }
      );
    }

    // Sanitize filename to prevent path traversal
    const filenameValidation = sanitizeFilename(fileName);
    if (!filenameValidation.isValid) {
      return NextResponse.json(
        { error: filenameValidation.error },
        { status: 400 }
      );
    }

    const sanitizedFileName = filenameValidation.sanitized!;

    console.log(`📥 Processing Blob: ${sanitizedFileName} from ${blobUrl}`);

    // Supported file types
    const documentTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ];

    const imageTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    const allSupportedTypes = [...documentTypes, ...imageTypes];

    if (!allSupportedTypes.includes(mimeType)) {
      await deleteBlob(blobUrl); // Cleanup uploaded blob
      return NextResponse.json(
        {
          error: `Unsupported file type: ${mimeType}. Supported: PDF, DOCX, TXT, JPG, PNG, GIF, WEBP`,
        },
        { status: 400 }
      );
    }

    // Detect file type for smart routing
    const isDocument = documentTypes.includes(mimeType);
    const isImage = imageTypes.includes(mimeType);
    const fileType = isDocument ? "document" : "image";

    console.log(`📁 Processing ${fileType}: ${sanitizedFileName} (${mimeType})`);

    // STEP 1: Fetch file from Blob URL
    console.log(`  → Fetching file from Blob storage...`);
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch Blob: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`  ✓ Fetched ${buffer.length} bytes`);

    // STEP 2: Smart routing based on file type
    let documentMetadata: DocumentMetadata;

    if (isDocument) {
      // === DOCUMENT FLOW (File Search Store) ===
      console.log(`📄 Document detected - routing to File Search Store (semantic RAG) + metadata extraction`);

      // Upload to File Search Store for permanent semantic RAG
      console.log(`  → Uploading to File Search Store (persistent, semantic retrieval)...`);
      const storeDocument = await uploadToStore(
        buffer,
        sanitizedFileName,
        mimeType,
        sanitizedFileName
      );

      // Extract metadata using Gemini
      // Note: We need to create a temporary Files API upload for metadata extraction
      // because Gemini needs a fileUri to read the file content
      console.log(`  → Uploading to Files API (temporary, for metadata extraction)...`);
      const tempFile = await uploadToFileSearch(buffer, sanitizedFileName, mimeType, sanitizedFileName);

      console.log(`  → Extracting metadata with Gemini...`);
      const metadata = await extractMetadataFromFile(
        tempFile.uri,
        mimeType,
        sanitizedFileName
      );

      // Build document metadata
      documentMetadata = {
        fileId: storeDocument.name, // File Search Store document ID
        fileUri: storeDocument.name, // Store document name (used for queries)
        fileName: sanitizedFileName,
        mimeType: mimeType,
        blobUrl: blobUrl,
        fileType: "document",
        title: metadata.title,
        authors: metadata.authors,
        citationName: metadata.citationName,
        year: metadata.year,
        track: metadata.track,
        language: metadata.language,
        keywords: metadata.keywords,
        summary: metadata.summary,
        documentType: metadata.documentType,
        confidence: metadata.confidence,
        status: "pending_review",
        uploadedAt: new Date().toISOString(),
        approvedAt: null,
      };
    } else if (isImage) {
      // === IMAGE FLOW (Files API - 48-hour expiry) ===
      // Note: File Search Store doesn't support images, so we use Files API
      // Files expire after 48 hours, but images work with RAG queries during that time
      console.log(`🖼️ Image detected - routing to Files API (48-hour expiry) + Vision API`);

      // STEP 1: Upload to Files API for RAG queries (will expire after 48 hours)
      console.log(`  → Uploading to Files API (temporary, 48-hour expiry)...`);
      const uploadedFile = await uploadToFileSearch(
        buffer,
        sanitizedFileName,
        mimeType,
        sanitizedFileName
      );

      // STEP 2: Analyze image with Gemini Vision for metadata
      console.log(`  → Analyzing image with Gemini Vision...`);
      const visionAnalysis = await analyzeImageWithVision(
        buffer,
        mimeType,
        sanitizedFileName
      );

      // STEP 3: Extract metadata from vision analysis
      console.log(`  → Extracting searchable metadata from Vision analysis...`);
      const metadata = extractMetadataFromVision(visionAnalysis, sanitizedFileName);

      // Build hybrid image metadata (File Search fileId + Vision analysis)
      documentMetadata = {
        fileId: uploadedFile.name, // Use File Search ID (starts with "files/")
        fileUri: uploadedFile.uri, // File Search URI for RAG
        fileName: sanitizedFileName,
        mimeType: mimeType,
        blobUrl: blobUrl,
        fileType: "image",
        title: metadata.title,
        authors: [], // Images don't have authors
        citationName: null,
        year: null,
        track: "Unknown", // Can be updated during review
        language: "Mixed",
        keywords: metadata.keywords,
        summary: metadata.summary,
        documentType: metadata.documentType,
        confidence: visionAnalysis.confidence,
        visionAnalysis: visionAnalysis, // Store Vision analysis for display in modal
        status: "pending_review",
        uploadedAt: new Date().toISOString(),
        approvedAt: null,
      };
    } else {
      throw new Error(`Unable to determine file type for: ${mimeType}`);
    }

    // STEP 3: Store metadata in Redis (pending review)
    console.log(`💾 Storing metadata in Redis...`);
    await storeDocumentMetadata(documentMetadata.fileId, documentMetadata);

    console.log(`✅ ${fileType} processed successfully: ${sanitizedFileName}`);

    // STEP 4: Return metadata for human review
    return NextResponse.json({
      success: true,
      fileId: documentMetadata.fileId,
      fileUri: documentMetadata.fileUri,
      blobUrl: blobUrl,
      fileType: fileType,
      status: "pending_review",
      extractedMetadata: documentMetadata,
      needsReview: true,
      message: `${fileType === "document" ? "Document" : "Image"} processed and metadata stored. Please review before approving.`,
    });

  } catch (error) {
    console.error('❌ Processing failed:', error);

    // Cleanup: Delete orphaned Blob if processing failed
    if (blobUrl) {
      try {
        await deleteBlob(blobUrl);
        console.log('🗑️ Cleaned up orphaned Blob:', blobUrl);
      } catch (cleanupError) {
        console.error('Failed to cleanup Blob:', cleanupError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed',
      },
      { status: 500 }
    );
  }
}
