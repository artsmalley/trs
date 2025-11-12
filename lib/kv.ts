import { kv } from "@vercel/kv";
import type { DocumentMetadata } from "./types";

// Store document metadata
export async function storeDocumentMetadata(
  fileId: string,
  metadata: DocumentMetadata
) {
  await kv.set(`doc:${fileId}`, metadata);
}

// Get document metadata
export async function getDocumentMetadata(
  fileId: string
): Promise<DocumentMetadata | null> {
  return await kv.get(`doc:${fileId}`);
}

// List all documents
export async function listAllDocuments(): Promise<DocumentMetadata[]> {
  const keys = await kv.keys("doc:*");
  const documents = await Promise.all(
    keys.map(async (key) => {
      const metadata = await kv.get<DocumentMetadata>(key);
      return metadata;
    })
  );
  return documents.filter((doc) => doc !== null) as DocumentMetadata[];
}

// Update document metadata
export async function updateDocumentMetadata(
  fileId: string,
  updates: Partial<DocumentMetadata>
) {
  const existing = await getDocumentMetadata(fileId);
  if (!existing) {
    throw new Error(`Document ${fileId} not found`);
  }
  const updated = { ...existing, ...updates };
  await storeDocumentMetadata(fileId, updated);
  return updated;
}

// Delete document metadata
export async function deleteDocumentMetadata(fileId: string) {
  await kv.del(`doc:${fileId}`);
}

// Get documents by track (PE, PD, Ops, etc.)
export async function getDocumentsByTrack(
  track: string
): Promise<DocumentMetadata[]> {
  const allDocs = await listAllDocuments();
  return allDocs.filter((doc) => doc.track === track);
}

// Get documents by year range
export async function getDocumentsByYearRange(
  startYear: number,
  endYear: number
): Promise<DocumentMetadata[]> {
  const allDocs = await listAllDocuments();
  return allDocs.filter(
    (doc) => doc.year >= startYear && doc.year <= endYear
  );
}
