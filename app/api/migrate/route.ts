/**
 * API endpoint to migrate existing Files API documents to File Search Store
 * Call this endpoint once after deploying to migrate your 36 documents
 *
 * POST /api/migrate
 */

import { NextRequest, NextResponse } from "next/server";
import { listAllDocuments, storeDocumentMetadata } from "@/lib/kv";
import { uploadToStore } from "@/lib/file-search-store";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes (migration takes time)

export async function POST(req: NextRequest) {
  try {
    console.log('='.repeat(70));
    console.log('MIGRATION: Files API → File Search Store');
    console.log('='.repeat(70));

    // Step 1: Get all documents from Redis
    console.log('\n1. Fetching documents from Redis...');
    const allDocs = await listAllDocuments();
    const approvedDocs = allDocs.filter((doc) => doc.status === "approved");

    console.log(`   Total documents: ${allDocs.length}`);
    console.log(`   Approved documents: ${approvedDocs.length}`);

    // Step 2: Filter for documents only (exclude images)
    const documents = approvedDocs.filter((doc) => doc.fileType === "document");
    const images = approvedDocs.filter((doc) => doc.fileType === "image");

    console.log(`\n2. Categorizing files...`);
    console.log(`   Documents (will migrate): ${documents.length}`);
    console.log(`   Images (skip - not supported in File Search Store): ${images.length}`);

    if (documents.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No documents to migrate',
        documents: 0,
        images: 0,
      });
    }

    // Step 3: Migrate each document
    console.log(`\n3. Starting migration of ${documents.length} documents...`);

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    const failed: Array<{ title: string; error: string }> = [];
    const succeeded: string[] = [];

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const progress = `[${i + 1}/${documents.length}]`;

      console.log(`${progress} Migrating: "${doc.title}"`);

      try {
        const fileId = doc.fileUri || doc.fileId;

        if (!fileId) {
          throw new Error('Missing fileUri/fileId');
        }

        // Check if already migrated
        if (fileId.startsWith('fileSearchStores/')) {
          console.log(`        ⚠️  Already migrated - skipping`);
          skippedCount++;
          succeeded.push(doc.title);
          continue;
        }

        // Check if blobUrl exists
        if (!doc.blobUrl) {
          throw new Error('Missing blobUrl - cannot fetch file');
        }

        // Fetch file from Blob storage
        console.log(`        → Fetching file from Blob storage...`);
        const blobResponse = await fetch(doc.blobUrl);
        if (!blobResponse.ok) {
          throw new Error(`Failed to fetch from Blob: ${blobResponse.statusText}`);
        }

        const arrayBuffer = await blobResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        console.log(`        ✓ Fetched ${buffer.length} bytes`);

        // Upload to File Search Store
        console.log(`        → Uploading to File Search Store...`);
        const storeDoc = await uploadToStore(
          buffer,
          doc.fileName,
          doc.mimeType || 'application/pdf',
          doc.title
        );

        // Update Redis metadata
        const updatedMetadata = {
          ...doc,
          fileId: storeDoc.name,
          fileUri: storeDoc.name,
        };

        await storeDocumentMetadata(storeDoc.name, updatedMetadata);

        console.log(`        ✓ Migrated successfully`);
        succeeded.push(doc.title);
        successCount++;
      } catch (error) {
        console.log(`        ❌ FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failCount++;
        failed.push({
          title: doc.title,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Summary
    console.log('='.repeat(70));
    console.log('MIGRATION COMPLETE');
    console.log('='.repeat(70));
    console.log(`\nResults:`);
    console.log(`  ✓ Successful: ${successCount}/${documents.length}`);
    console.log(`  ⚠️  Skipped (already migrated): ${skippedCount}/${documents.length}`);
    console.log(`  ❌ Failed: ${failCount}/${documents.length}`);

    return NextResponse.json({
      success: true,
      summary: {
        total: documents.length,
        successful: successCount,
        skipped: skippedCount,
        failed: failCount,
        images: images.length,
      },
      succeeded,
      failed,
      message: failCount > 0
        ? `Migration completed with ${failCount} failures`
        : 'All documents migrated successfully!',
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Migration failed',
      },
      { status: 500 }
    );
  }
}
