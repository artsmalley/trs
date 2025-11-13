import { put, del } from "@vercel/blob";

/**
 * Uploads a file to Vercel Blob storage
 * Returns the public URL for accessing the file
 */
export async function uploadToBlob(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  try {
    // Upload to Vercel Blob with public access
    const blob = await put(fileName, buffer, {
      access: "public",
      contentType: mimeType,
    });

    console.log(`✅ Uploaded to Blob: ${blob.url}`);
    return blob.url;
  } catch (error) {
    console.error("Blob upload error:", error);
    throw new Error(
      `Failed to upload to Blob: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Deletes a file from Vercel Blob storage
 */
export async function deleteFromBlob(blobUrl: string): Promise<void> {
  try {
    await del(blobUrl);
    console.log(`✅ Deleted from Blob: ${blobUrl}`);
  } catch (error) {
    console.error("Blob deletion error:", error);
    // Don't throw - deletion failures shouldn't block the operation
    console.warn(`⚠️ Failed to delete from Blob: ${blobUrl}`);
  }
}

/**
 * Generates a unique filename to avoid collisions
 * Format: timestamp-randomhex-originalname.ext
 */
export function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomHex = Math.random().toString(36).substring(2, 8);
  const sanitized = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${timestamp}-${randomHex}-${sanitized}`;
}
