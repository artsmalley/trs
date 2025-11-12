import { NextRequest, NextResponse } from "next/server";
import { extractText } from "@/lib/text-extraction";
import { extractMetadata } from "@/lib/metadata-extraction";
import { uploadToFileSearch } from "@/lib/file-search";

// POST /api/upload - Upload and process document
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

    // Validate file type
    const supportedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ];

    if (!supportedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Supported: PDF, DOCX, TXT` },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Step 1: Extract text from document
    console.log(`Extracting text from ${file.name}...`);
    const extraction = await extractText(buffer, file.type);

    // Step 2: Extract metadata using Gemini
    console.log(`Extracting metadata with Gemini...`);
    const metadata = await extractMetadata(extraction.text, file.name);

    // Step 3: Upload to File Search
    console.log(`Uploading to File Search...`);
    const uploadedFile = await uploadToFileSearch(
      buffer,
      file.name,
      file.type,
      metadata.title
    );

    // Step 4: Return metadata for human review
    // TODO: Store in Vercel KV when ready
    return NextResponse.json({
      success: true,
      fileId: uploadedFile.name, // Use Gemini file name as ID
      fileUri: uploadedFile.uri,
      status: "pending_review",
      extractedMetadata: {
        title: metadata.title,
        authors: metadata.authors,
        year: metadata.year,
        track: metadata.track,
        language: metadata.language,
        keywords: metadata.keywords,
        summary: metadata.summary,
        documentType: metadata.documentType,
        confidence: metadata.confidence,
        wordCount: extraction.wordCount,
        pageCount: extraction.pageCount,
        uploadedAt: new Date().toISOString(),
      },
      needsReview: true,
      message: "Document processed successfully. Please review the metadata before approving.",
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
