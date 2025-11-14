/**
 * Migration script: Import existing Files API documents to File Search Store
 *
 * This script:
 * 1. Gets all approved documents from Redis
 * 2. Filters for documents only (not images - File Search Store doesn't support images)
 * 3. Imports each document to File Search Store using existing Files API fileUri
 * 4. Updates Redis metadata with new File Search Store document reference
 *
 * Run with: npx tsx scripts/migrate-to-file-search-store.ts
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { listAllDocuments, storeDocumentMetadata } from '../lib/kv';
import { importFileToStore } from '../lib/file-search-store';

async function migrateToFileSearchStore() {
  console.log('='.repeat(70));
  console.log('MIGRATION: Files API → File Search Store');
  console.log('='.repeat(70));

  try {
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
      console.log('\n❌ No documents to migrate!');
      return;
    }

    // Step 3: Migrate each document
    console.log(`\n3. Starting migration of ${documents.length} documents...`);
    console.log('   (This may take 2-5 minutes per document)\n');

    let successCount = 0;
    let failCount = 0;
    const failed: Array<{ title: string; error: string }> = [];

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const progress = `[${i + 1}/${documents.length}]`;

      console.log(`${progress} Migrating: "${doc.title}"`);
      console.log(`        File: ${doc.fileName}`);
      console.log(`        Files API ID: ${doc.fileUri || doc.fileId}`);

      try {
        // Import existing Files API file to File Search Store
        const fileId = doc.fileUri || doc.fileId;

        if (!fileId) {
          throw new Error('Missing fileUri/fileId');
        }

        // Check if already migrated (fileId starts with "fileSearchStores/")
        if (fileId.startsWith('fileSearchStores/')) {
          console.log(`        ⚠️  Already migrated - skipping`);
          successCount++;
          console.log('');
          continue;
        }

        // Prepare custom metadata for File Search Store
        const customMetadata = [];
        if (doc.authors && doc.authors.length > 0) {
          customMetadata.push({
            key: 'authors',
            stringValue: doc.authors.join(', '),
          });
        }
        if (doc.year && typeof doc.year === 'string') {
          const yearNum = parseInt(doc.year, 10);
          if (!isNaN(yearNum)) {
            customMetadata.push({
              key: 'year',
              numericValue: yearNum,
            });
          }
        }
        if (doc.track) {
          customMetadata.push({
            key: 'track',
            stringValue: doc.track,
          });
        }

        // Import to File Search Store
        console.log(`        → Importing to File Search Store...`);
        const storeDoc = await importFileToStore(
          fileId,
          doc.title,
          customMetadata
        );

        // Update Redis metadata with new File Search Store reference
        const updatedMetadata = {
          ...doc,
          fileId: storeDoc.name, // Update to File Search Store document ID
          fileUri: storeDoc.name, // Update to File Search Store document name
        };

        await storeDocumentMetadata(storeDoc.name, updatedMetadata);

        console.log(`        ✓ Migrated successfully`);
        console.log(`        New ID: ${storeDoc.name}`);
        successCount++;
      } catch (error) {
        console.log(`        ❌ FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failCount++;
        failed.push({
          title: doc.title,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      console.log('');
    }

    // Step 4: Summary
    console.log('='.repeat(70));
    console.log('MIGRATION COMPLETE');
    console.log('='.repeat(70));
    console.log(`\nResults:`);
    console.log(`  ✓ Successful: ${successCount}/${documents.length}`);
    console.log(`  ❌ Failed: ${failCount}/${documents.length}`);

    if (failed.length > 0) {
      console.log(`\nFailed documents:`);
      failed.forEach((f, i) => {
        console.log(`  ${i + 1}. "${f.title}"`);
        console.log(`     Error: ${f.error}`);
      });
    }

    console.log(`\nImages (not migrated - using Files API):`);
    console.log(`  Total: ${images.length}`);
    console.log(`  Note: Images will expire after 48 hours (Files API limitation)`);
    console.log(`        Consider re-uploading images periodically or removing image RAG support`);

    console.log('\n' + '='.repeat(70));

    if (failCount > 0) {
      console.log(`\n⚠️  Migration completed with ${failCount} failures`);
      console.log(`   Review failed documents above and retry manually if needed`);
    } else {
      console.log(`\n✓ All documents migrated successfully!`);
      console.log(`  You can now query your corpus without token limit errors`);
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    if (error instanceof Error) {
      console.error('   Error:', error.message);
      console.error('   Stack:', error.stack);
    }
    throw error;
  }
}

// Run the migration
migrateToFileSearchStore()
  .then(() => {
    console.log('\nMigration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration script failed:', error);
    process.exit(1);
  });
