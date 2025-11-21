import { NextRequest, NextResponse } from "next/server";
import { extractMetadataFromFile } from "@/lib/metadata-extraction";
import { uploadToFileSearch } from "@/lib/file-search"; // Files API for images (48-hour expiry)
import { uploadToStore } from "@/lib/file-search-store"; // File Search Store for documents (permanent + semantic RAG)
import { storeDocument as storeDocumentSupabase } from "@/lib/supabase-rag"; // Supabase RAG (alternative backend)
import { storeDocumentMetadata } from "@/lib/kv";
import {
  analyzeImageWithVision,
  extractMetadataFromVision,
} from "@/lib/vision-analysis";
import { DocumentMetadata } from "@/lib/types";
import { del as deleteBlob } from "@vercel/blob";
import { checkRateLimit, getClientIdentifier, rateLimitPresets } from "@/lib/rate-limit";
import { validateBlobUrl, sanitizeFilename } from "@/lib/sanitize";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Extract full text from PDF for Supabase chunking
 * Uses Gemini to read the PDF and extract all text with page markers
 */
async function extractFullText(fileUri: string, mimeType: string): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not set");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `Extract ALL text from this document.
For PDFs with multiple pages, add a page marker like "--- PAGE 2 ---" before the text from each new page.
This helps with citation extraction later.

Return ONLY the extracted text, no additional commentary.`;

  try {
    const result = await model.generateContent([
      {
        fileData: {
          fileUri: fileUri,
          mimeType: mimeType
        }
      },
      { text: prompt }
    ]);

    return result.response.text();
  } catch (error) {
    console.error('Text extraction error:', error);
    throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

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

    const { blobUrl: url, fileName, mimeType, backend = 'file_search' } = await req.json();
    blobUrl = url;

    if (!blobUrl || !fileName || !mimeType) {
      return NextResponse.json(
        { error: 'Missing required fields: blobUrl, fileName, or mimeType' },
        { status: 400 }
      );
    }

    // Validate backend parameter
    if (backend !== 'file_search' && backend !== 'supabase') {
      return NextResponse.json(
        { error: 'Invalid backend parameter. Must be "file_search" or "supabase"' },
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
      // === DOCUMENT FLOW ===
      console.log(`📄 Document detected - backend: ${backend}`);

      // STEP 1: Upload to Files API for metadata/text extraction (temporary)
      console.log(`  → Uploading to Files API (temporary, for extraction)...`);
      const tempFile = await uploadToFileSearch(buffer, sanitizedFileName, mimeType, sanitizedFileName);

      // STEP 2: Extract metadata using Gemini
      console.log(`  → Extracting metadata with Gemini...`);
      const metadata = await extractMetadataFromFile(
        tempFile.uri,
        mimeType,
        sanitizedFileName
      );

      // STEP 3: Backend-specific storage
      let storageId: string;

      if (backend === 'supabase') {
        // === SUPABASE PATH ===
        console.log(`  → Uploading to Supabase (PostgreSQL + pgvector)...`);

        // Extract full text for chunking
        console.log(`  → Extracting full text for chunking...`);
        const fullText = await extractFullText(tempFile.uri, mimeType);

        // Build metadata for Supabase
        const supabaseMetadata: DocumentMetadata = {
          fileId: '', // Will be set after storage
          fileUri: '',
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

        // Store in Supabase (chunks + embeddings)
        storageId = await storeDocumentSupabase(
          supabaseMetadata,
          blobUrl,
          fullText
        );

        console.log(`  ✓ Stored in Supabase with ID: ${storageId}`);

      } else {
        // === FILE SEARCH STORE PATH (CURRENT) ===
        console.log(`  → Uploading to File Search Store (persistent, semantic retrieval)...`);
        const storeDocument = await uploadToStore(
          buffer,
          sanitizedFileName,
          mimeType,
          sanitizedFileName
        );

        storageId = storeDocument.name;
        console.log(`  ✓ Stored in File Search Store: ${storageId}`);
      }

      // Build document metadata
      documentMetadata = {
        fileId: storageId,
        fileUri: storageId,
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
        storageBackend: backend, // Track which backend was used
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
