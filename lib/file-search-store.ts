/**
 * Google File Search Store Integration
 * Proper RAG implementation with semantic retrieval
 *
 * This replaces the old lib/file-search.ts which only used Files API (no semantic retrieval)
 */

import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface FileSearchStore {
  name: string; // fileSearchStores/abc123
  displayName: string;
  createTime?: string;
  updateTime?: string;
}

export interface StoreDocument {
  name: string; // fileSearchStores/abc123/documents/xyz789
  displayName: string;
  mimeType: string;
  sizeBytes: number;
  state: 'STATE_UNSPECIFIED' | 'ACTIVE' | 'FAILED';
  error?: any;
}

// Global store reference (create once, reuse)
let _globalStore: FileSearchStore | null = null;

/**
 * Initialize the Google GenAI client
 */
function getClient(): any {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not set in environment variables');
  }

  return new GoogleGenAI({ apiKey });
}

/**
 * Create or get the TRS File Search Store
 */
export async function getOrCreateStore(): Promise<FileSearchStore> {
  // Return cached store if exists
  if (_globalStore) {
    return _globalStore;
  }

  const ai = getClient();

  try {
    // List existing stores
    const storesList = await ai.fileSearchStores.list();

    // Look for TRS store
    for await (const store of storesList) {
      if (store.displayName === 'toyota-research-system') {
        console.log('Found existing TRS store:', store.name);
        _globalStore = {
          name: store.name,
          displayName: store.displayName,
          createTime: store.createTime,
          updateTime: store.updateTime,
        };
        return _globalStore;
      }
    }

    // Create new store if not found
    console.log('Creating new TRS File Search Store...');
    const createOp = await ai.fileSearchStores.create({
      config: {
        displayName: 'toyota-research-system',
      },
    });

    _globalStore = {
      name: createOp.name,
      displayName: 'toyota-research-system',
    };

    console.log('Store created:', _globalStore.name);
    return _globalStore;
  } catch (error) {
    console.error('Error creating/getting store:', error);
    throw new Error(
      `Failed to get or create File Search Store: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Upload a file directly to the File Search Store
 * This does upload + chunking + embedding in one call
 */
export async function uploadToStore(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  displayName?: string
): Promise<StoreDocument> {
  const ai = getClient();
  const store = await getOrCreateStore();

  try {
    // Write buffer to temp file (SDK requires file path)
    // Include original filename for chunk title matching (needed for citations)
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    const sanitizedFileName = `${timestamp}-${fileName}`;
    const tempFilePath = path.join(tempDir, sanitizedFileName);
    fs.writeFileSync(tempFilePath, buffer);

    // Upload to File Search Store with automatic chunking
    console.log(`Uploading ${fileName} to File Search Store...`);
    let operation = await ai.fileSearchStores.uploadToFileSearchStore({
      file: tempFilePath,
      fileSearchStoreName: store.name,
      config: {
        displayName: displayName || fileName,
        chunkingConfig: {
          whiteSpaceConfig: {
            maxTokensPerChunk: 500, // Reasonable chunk size
            maxOverlapTokens: 50,   // Overlap for context
          },
        },
      },
    });

    // Clean up temp file
    fs.unlinkSync(tempFilePath);

    // Poll until upload + indexing completes
    console.log(`Indexing ${fileName}...`);
    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Poll every 2s
      operation = await ai.operations.get({ operation });
    }

    if (operation.error) {
      throw new Error(`Upload failed: ${JSON.stringify(operation.error)}`);
    }

    console.log(`✓ ${fileName} indexed successfully`);

    // Extract document info from operation result
    const documentName = operation.result?.name || operation.name;

    return {
      name: documentName,
      displayName: displayName || fileName,
      mimeType,
      sizeBytes: buffer.length,
      state: 'ACTIVE',
    };
  } catch (error) {
    console.error('Upload to store error:', error);
    throw new Error(
      `Failed to upload file to File Search Store: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Import an existing Files API file into the File Search Store
 * Use this to migrate files already uploaded via Files API
 */
export async function importFileToStore(
  fileName: string, // e.g., "files/abc123"
  displayName: string,
  customMetadata?: Array<{ key: string; stringValue?: string; numericValue?: number }>
): Promise<StoreDocument> {
  const ai = getClient();
  const store = await getOrCreateStore();

  try {
    console.log(`Importing ${displayName} (${fileName}) to File Search Store...`);

    let operation = await ai.fileSearchStores.importFile({
      fileSearchStoreName: store.name,
      fileName: fileName,
      config: {
        customMetadata: customMetadata || [],
      },
    });

    // Poll until import completes
    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      operation = await ai.operations.get({ operation });
    }

    if (operation.error) {
      throw new Error(`Import failed: ${JSON.stringify(operation.error)}`);
    }

    console.log(`✓ ${displayName} imported successfully`);

    const documentName = operation.result?.name || operation.name;

    return {
      name: documentName,
      displayName,
      mimeType: 'application/pdf', // Will need to track this separately
      sizeBytes: 0, // Unknown after import
      state: 'ACTIVE',
    };
  } catch (error) {
    console.error('Import to store error:', error);
    throw new Error(
      `Failed to import file to File Search Store: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Delete a document from the File Search Store
 */
export async function deleteDocumentFromStore(
  documentName: string // e.g., "fileSearchStores/abc/documents/xyz"
): Promise<void> {
  const ai = getClient();

  try {
    await ai.fileSearchStores.deleteDocument({
      name: documentName,
    });
    console.log(`✓ Document ${documentName} deleted from store`);
  } catch (error) {
    console.error('Delete from store error:', error);
    throw new Error(
      `Failed to delete document from store: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * List all documents in the store
 */
export async function listStoreDocuments(): Promise<StoreDocument[]> {
  const ai = getClient();
  const store = await getOrCreateStore();

  try {
    const documents: StoreDocument[] = [];
    const docsList = await ai.fileSearchStores.listDocuments({
      parent: store.name,
    });

    for await (const doc of docsList) {
      documents.push({
        name: doc.name,
        displayName: doc.displayName || 'Unknown',
        mimeType: doc.mimeType || 'application/octet-stream',
        sizeBytes: parseInt(doc.sizeBytes || '0'),
        state: doc.state || 'STATE_UNSPECIFIED',
      });
    }

    return documents;
  } catch (error) {
    console.error('List documents error:', error);
    return [];
  }
}

/**
 * Get the File Search Store name (for use in queries)
 */
export async function getStoreName(): Promise<string> {
  const store = await getOrCreateStore();
  return store.name;
}
