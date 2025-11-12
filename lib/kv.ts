import Redis from "ioredis";
import type { DocumentMetadata } from "./types";

// Create Redis client using direct connection URL
// Works with KV_URL from Vercel marketplace Redis (Upstash)
const redis = new Redis(process.env.KV_URL!, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

// Store document metadata
export async function storeDocumentMetadata(
  fileId: string,
  metadata: DocumentMetadata
) {
  await redis.set(`doc:${fileId}`, JSON.stringify(metadata));
}

// Get document metadata
export async function getDocumentMetadata(
  fileId: string
): Promise<DocumentMetadata | null> {
  const data = await redis.get(`doc:${fileId}`);
  return data ? JSON.parse(data) : null;
}

// List all documents
export async function listAllDocuments(): Promise<DocumentMetadata[]> {
  const keys = await redis.keys("doc:*");
  const documents = await Promise.all(
    keys.map(async (key) => {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
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
  await redis.del(`doc:${fileId}`);
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
    (doc) => doc.year !== null && doc.year >= startYear && doc.year <= endYear
  );
}
