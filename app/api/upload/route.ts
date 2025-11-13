import { NextRequest, NextResponse } from "next/server";
import { extractMetadataFromFile } from "@/lib/metadata-extraction";
import { uploadToFileSearch } from "@/lib/file-search";
import { storeDocumentMetadata } from "@/lib/kv";
import { uploadToBlob, generateUniqueFileName } from "@/lib/blob-storage";
import {
  analyzeImageWithVision,
  extractMetadataFromVision,
} from "@/lib/vision-analysis";
import { DocumentMetadata } from "@/lib/types";

// Configure larger body size limit for file uploads (50MB)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/upload - Upload and process documents + images with smart routing
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

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

    if (!allSupportedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${file.type}. Supported: PDF, DOCX, TXT, JPG, PNG, GIF, WEBP`,
        },
        { status: 400 }
      );
    }

    // Detect file type for smart routing
    const isDocument = documentTypes.includes(file.type);
    const isImage = imageTypes.includes(file.type);
    const fileType = isDocument ? "document" : "image";

    console.log(`📁 Processing ${fileType}: ${file.name} (${file.type})`);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // STEP 1: Upload to Blob (universal storage for ALL files)
    console.log(`☁️ Uploading to Blob storage...`);
    const uniqueFileName = generateUniqueFileName(file.name);
    const blobUrl = await uploadToBlob(buffer, uniqueFileName, file.type);

    // STEP 2: Smart routing based on file type
    let documentMetadata: DocumentMetadata;

    if (isDocument) {
      // === DOCUMENT FLOW ===
      console.log(`📄 Document detected - routing to File Search + metadata extraction`);

      // Upload to File Search for RAG
      console.log(`  → Uploading to File Search...`);
      const uploadedFile = await uploadToFileSearch(
        buffer,
        file.name,
        file.type,
        file.name
      );

      // Extract metadata using Gemini
      console.log(`  → Extracting metadata with Gemini...`);
      const metadata = await extractMetadataFromFile(
        uploadedFile.uri,
        file.type,
        file.name
      );

      // Build document metadata
      documentMetadata = {
        fileId: uploadedFile.name,
        fileUri: uploadedFile.uri,
        fileName: file.name,
        mimeType: file.type,
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
      // === HYBRID IMAGE FLOW ===
      console.log(`🖼️ Image detected - routing to File Search + Vision API (hybrid approach)`);

      // STEP 1: Upload to File Search for RAG queries
      console.log(`  → Uploading to File Search for RAG...`);
      const uploadedFile = await uploadToFileSearch(
        buffer,
        file.name,
        file.type,
        file.name
      );

      // STEP 2: Analyze image with Gemini Vision for metadata
      console.log(`  → Analyzing image with Gemini Vision...`);
      const visionAnalysis = await analyzeImageWithVision(
        buffer,
        file.type,
        file.name
      );

      // STEP 3: Extract metadata from vision analysis
      console.log(`  → Extracting searchable metadata from Vision analysis...`);
      const metadata = extractMetadataFromVision(visionAnalysis, file.name);

      // Build hybrid image metadata (File Search fileId + Vision analysis)
      documentMetadata = {
        fileId: uploadedFile.name, // Use File Search ID (starts with "files/")
        fileUri: uploadedFile.uri, // File Search URI for RAG
        fileName: file.name,
        mimeType: file.type,
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
      throw new Error(`Unable to determine file type for: ${file.type}`);
    }

    // STEP 3: Store metadata in Redis (pending review)
    console.log(`💾 Storing metadata in Redis...`);
    await storeDocumentMetadata(documentMetadata.fileId, documentMetadata);

    console.log(`✅ ${fileType} processed successfully: ${file.name}`);

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
    console.error("Upload API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
