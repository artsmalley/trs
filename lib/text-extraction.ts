/**
 * Text Extraction Utilities
 * Handles text extraction from PDF, DOCX, and TXT files
 */

export interface ExtractionResult {
  text: string;
  pageCount?: number;
  wordCount: number;
  language?: "ja" | "en" | "mixed";
}

/**
 * Extract text from PDF file
 */
export async function extractTextFromPDF(
  buffer: Buffer
): Promise<ExtractionResult> {
  try {
    // Dynamic import to handle CommonJS module in ESM context
    const pdfModule = await import("pdf-parse");
    // @ts-ignore - pdf-parse has type issues
    const pdf = pdfModule.default || pdfModule;
    const data = await pdf(buffer);

    const text = data.text;
    const pageCount = data.numpages;
    const wordCount = text.split(/\s+/).filter((w: string) => w.length > 0).length;

    return {
      text,
      pageCount,
      wordCount,
      language: detectLanguage(text),
    };
  } catch (error) {
    throw new Error(
      `Failed to extract text from PDF: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Extract text from DOCX file
 */
export async function extractTextFromDOCX(
  buffer: Buffer
): Promise<ExtractionResult> {
  try {
    // Dynamic import to handle CommonJS module in ESM context
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });

    const text = result.value;
    const wordCount = text.split(/\s+/).filter((w: string) => w.length > 0).length;

    return {
      text,
      wordCount,
      language: detectLanguage(text),
    };
  } catch (error) {
    throw new Error(
      `Failed to extract text from DOCX: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Extract text from TXT file
 */
export async function extractTextFromTXT(
  buffer: Buffer
): Promise<ExtractionResult> {
  try {
    const text = buffer.toString("utf-8");
    const wordCount = text.split(/\s+/).filter((w: string) => w.length > 0).length;

    return {
      text,
      wordCount,
      language: detectLanguage(text),
    };
  } catch (error) {
    throw new Error(
      `Failed to extract text from TXT: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Main extraction function that routes to appropriate extractor based on file type
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractionResult> {
  if (mimeType === "application/pdf") {
    return extractTextFromPDF(buffer);
  } else if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    return extractTextFromDOCX(buffer);
  } else if (mimeType === "text/plain") {
    return extractTextFromTXT(buffer);
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

/**
 * Detect language (simple heuristic: check for Japanese characters)
 */
function detectLanguage(text: string): "ja" | "en" | "mixed" {
  // Japanese character ranges (Hiragana, Katakana, Kanji)
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;

  const hasJapanese = japaneseRegex.test(text);
  const sampleSize = Math.min(text.length, 1000);
  const sample = text.substring(0, sampleSize);
  const japaneseChars = (sample.match(japaneseRegex) || []).length;

  if (japaneseChars > sampleSize * 0.3) {
    return "ja";
  } else if (japaneseChars > 0) {
    return "mixed";
  } else {
    return "en";
  }
}

/**
 * Truncate text to a maximum length (useful for previews)
 */
export function truncateText(text: string, maxLength: number = 500): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + "...";
}
