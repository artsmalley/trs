/**
 * Google File Search Integration
 * Handles file uploads to Gemini File API for RAG grounding
 */

import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import fs from "fs";
import path from "path";
import os from "os";

export interface UploadedFile {
  uri: string; // files/abc123
  name: string; // Display name
  mimeType: string;
  sizeBytes: string | number; // API returns string, but can be number
  state: FileState;
  displayName?: string;
}

/**
 * Upload a file to Gemini File API for use with File Search
 */
export async function uploadToFileSearch(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  displayName?: string
): Promise<UploadedFile> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not set in environment variables");
  }

  const fileManager = new GoogleAIFileManager(apiKey);

  try {
    // Write buffer to a temporary file (File API requires file path)
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(
      tempDir,
      `upload-${Date.now()}-${fileName}`
    );

    fs.writeFileSync(tempFilePath, buffer);

    // Upload file to Gemini File API
    const uploadResult = await fileManager.uploadFile(tempFilePath, {
      mimeType,
      displayName: displayName || fileName,
    });

    // Clean up temp file
    fs.unlinkSync(tempFilePath);

    // Wait for file to be processed (ACTIVE state)
    let file = await fileManager.getFile(uploadResult.file.name);
    while (file.state === FileState.PROCESSING) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      file = await fileManager.getFile(uploadResult.file.name);
    }

    if (file.state === FileState.FAILED) {
      throw new Error("File processing failed");
    }

    return {
      uri: file.uri,
      name: file.name,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      state: file.state,
      displayName: file.displayName,
    };
  } catch (error) {
    console.error("File upload error:", error);
    throw new Error(
      `Failed to upload file to File Search: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * List all uploaded files
 */
export async function listUploadedFiles(): Promise<UploadedFile[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not set in environment variables");
  }

  const fileManager = new GoogleAIFileManager(apiKey);

  try {
    const listResult = await fileManager.listFiles();
    return listResult.files.map((file) => ({
      uri: file.uri,
      name: file.name,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      state: file.state,
      displayName: file.displayName,
    }));
  } catch (error) {
    console.error("Failed to list files:", error);
    return [];
  }
}

/**
 * Delete a file from File Search
 */
export async function deleteFile(fileName: string): Promise<void> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not set in environment variables");
  }

  const fileManager = new GoogleAIFileManager(apiKey);

  try {
    await fileManager.deleteFile(fileName);
  } catch (error) {
    console.error("Failed to delete file:", error);
    throw new Error(
      `Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get file information
 */
export async function getFileInfo(fileName: string): Promise<UploadedFile> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not set in environment variables");
  }

  const fileManager = new GoogleAIFileManager(apiKey);

  try {
    const file = await fileManager.getFile(fileName);
    return {
      uri: file.uri,
      name: file.name,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      state: file.state,
      displayName: file.displayName,
    };
  } catch (error) {
    throw new Error(
      `Failed to get file info: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
