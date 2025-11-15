import { NextRequest, NextResponse } from "next/server";
import { mdToPdf } from "md-to-pdf";
import { put } from "@vercel/blob";
import { uploadToStore } from "@/lib/file-search-store";
import { uploadToFileSearch } from "@/lib/file-search";
import { extractMetadataFromFile } from "@/lib/metadata-extraction";
import { storeDocumentMetadata, listAllDocuments } from "@/lib/kv";
import { DocumentMetadata } from "@/lib/types";
import { checkRateLimit, getClientIdentifier, rateLimitPresets } from "@/lib/rate-limit";
import { sanitizeFilename } from "@/lib/sanitize";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Allow up to 2 minutes for URL processing

// POST /api/process-url - Process web pages via Jina.ai Reader
export async function POST(req: NextRequest) {
  let blobUrl: string | null = null;

  try {
    // Rate limiting - Same as upload endpoint
    const identifier = getClientIdentifier(req);
    const rateLimitCheck = await checkRateLimit(identifier, rateLimitPresets.upload);

    if (!rateLimitCheck.allowed) {
      return rateLimitCheck.response!;
    }

    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: 'Missing required field: url' },
        { status: 400 }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    console.log(`🌐 Processing URL: ${url}`);

    // STEP 1: Check for duplicates
    console.log(`  → Checking for duplicates...`);
    const existingDoc = await checkDuplicateUrl(url);
    if (existingDoc) {
      return NextResponse.json({
        success: false,
        error: 'URL already processed',
        duplicate: true,
        existingDocument: {
          title: existingDoc.title,
          status: existingDoc.status,
          uploadedAt: existingDoc.uploadedAt,
          fileId: existingDoc.fileId,
        }
      }, { status: 409 }); // 409 Conflict
    }

    // STEP 2: Fetch content from Jina.ai Reader API
    console.log(`  → Fetching content from Jina.ai Reader...`);
    const jinaApiKey = process.env.JINA_API_KEY;
    console.log(`  → API Key present: ${jinaApiKey ? 'YES' : 'NO'}`);
    const jinaHeaders: Record<string, string> = {
      'Accept': 'application/json',
      'X-Respond-With': 'markdown', // Fixed: was X-Return-Format
      'X-With-Generated-Alt': 'true', // Include alt text for images
    };

    // Add optional API key for higher rate limits (500 req/min vs 20 req/min)
    if (jinaApiKey) {
      jinaHeaders['Authorization'] = `Bearer ${jinaApiKey}`;
      console.log(`  → Using API key for authentication`);
    }

    console.log(`  → Headers:`, Object.keys(jinaHeaders));
    const jinaResponse = await fetch(`https://r.jina.ai/${url}`, {
      headers: jinaHeaders
    });

    if (!jinaResponse.ok) {
      throw new Error(`Jina.ai API failed: ${jinaResponse.statusText}`);
    }

    const jinaData = await jinaResponse.json();
    const { title, description, content, url: canonicalUrl } = jinaData.data;

    if (!content) {
      throw new Error('No content extracted from URL');
    }

    console.log(`  ✓ Extracted content: "${title}" (${content.length} chars)`);

    // STEP 3: Convert markdown to PDF
    console.log(`  → Converting markdown to PDF...`);
    const pdf = await mdToPdf(
      { content },
      {
        pdf_options: {
          format: 'A4',
          margin: {
            top: '20mm',
            right: '20mm',
            bottom: '20mm',
            left: '20mm'
          },
          printBackground: true,
        },
        css: `
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #333;
          }
          h1 { font-size: 20pt; margin-top: 12pt; margin-bottom: 8pt; }
          h2 { font-size: 16pt; margin-top: 10pt; margin-bottom: 6pt; }
          h3 { font-size: 14pt; margin-top: 8pt; margin-bottom: 4pt; }
          p { margin-bottom: 8pt; }
          code {
            background: #f5f5f5;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
          }
          pre {
            background: #f5f5f5;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
          }
        `,
        launch_options: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      }
    );

    if (!pdf || !pdf.content) {
      throw new Error('Failed to generate PDF from markdown');
    }

    const pdfBuffer = pdf.content;
    console.log(`  ✓ Generated PDF (${pdfBuffer.length} bytes)`);

    // STEP 4: Upload PDF to Vercel Blob
    console.log(`  → Uploading PDF to Blob storage...`);
    const sanitizedFilenameResult = sanitizeFilename(
      `${title || 'web-page'}_${Date.now()}.pdf`
    );
    const fileName = sanitizedFilenameResult.sanitized || `web-page_${Date.now()}.pdf`;

    const blob = await put(fileName, pdfBuffer, {
      access: 'public',
      contentType: 'application/pdf',
    });

    blobUrl = blob.url;
    console.log(`  ✓ Uploaded to Blob: ${blobUrl}`);

    // STEP 5: Upload to File Search Store for semantic RAG
    console.log(`  → Uploading to File Search Store...`);
    const storeDocument = await uploadToStore(
      pdfBuffer,
      fileName,
      'application/pdf',
      fileName
    );

    // STEP 6: Upload to Files API for metadata extraction
    console.log(`  → Uploading to Files API for metadata extraction...`);
    const tempFile = await uploadToFileSearch(
      pdfBuffer,
      fileName,
      'application/pdf',
      fileName
    );

    // STEP 7: Extract metadata using Gemini
    console.log(`  → Extracting metadata with Gemini...`);
    const metadata = await extractMetadataFromFile(
      tempFile.uri,
      'application/pdf',
      fileName
    );

    // STEP 8: Build document metadata
    const documentMetadata: DocumentMetadata = {
      fileId: storeDocument.name, // File Search Store document ID
      fileUri: storeDocument.name,
      fileName: fileName,
      mimeType: 'application/pdf',
      blobUrl: blobUrl,
      fileType: 'document',
      title: metadata.title || title || 'Web Page',
      authors: metadata.authors || [],
      citationName: metadata.citationName,
      year: metadata.year,
      track: metadata.track || 'Unknown',
      language: metadata.language || 'Mixed',
      keywords: metadata.keywords || [],
      summary: metadata.summary || description || 'Web page content',
      documentType: 'Web Page',
      confidence: metadata.confidence || 'medium',
      source: canonicalUrl || url, // Store original URL
      status: 'pending_review',
      uploadedAt: new Date().toISOString(),
      approvedAt: null,
    };

    // STEP 9: Store metadata in Redis
    console.log(`💾 Storing metadata in Redis...`);
    await storeDocumentMetadata(documentMetadata.fileId, documentMetadata);

    console.log(`✅ URL processed successfully: ${url}`);

    return NextResponse.json({
      success: true,
      fileId: documentMetadata.fileId,
      fileUri: documentMetadata.fileUri,
      blobUrl: blobUrl,
      sourceUrl: url,
      title: documentMetadata.title,
      status: 'pending_review',
      extractedMetadata: documentMetadata,
      needsReview: true,
      message: 'Web page processed and converted to PDF. Please review before approving.',
    });

  } catch (error) {
    console.error('❌ URL processing failed:', error);

    // Cleanup: Delete orphaned Blob if processing failed
    if (blobUrl) {
      try {
        const { del } = await import('@vercel/blob');
        await del(blobUrl);
        console.log('🗑️ Cleaned up orphaned Blob:', blobUrl);
      } catch (cleanupError) {
        console.error('Failed to cleanup Blob:', cleanupError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'URL processing failed',
      },
      { status: 500 }
    );
  }
}

/**
 * Check if a URL has already been processed
 * Returns existing document metadata if found
 */
async function checkDuplicateUrl(url: string): Promise<DocumentMetadata | null> {
  const allDocs = await listAllDocuments();

  // Normalize URLs for comparison (remove trailing slashes, fragments, etc.)
  const normalizeUrl = (u: string) => {
    try {
      const parsed = new URL(u);
      // Remove fragment and normalize path
      return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, '');
    } catch {
      return u;
    }
  };

  const normalizedUrl = normalizeUrl(url);

  return allDocs.find(doc => {
    if (!doc.source) return false;
    return normalizeUrl(doc.source) === normalizedUrl;
  }) || null;
}
