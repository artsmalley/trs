/**
 * AI-Powered Metadata Extraction using Gemini
 * Extracts structured metadata from document text
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export interface DocumentMetadata {
  title: string;
  authors: string[];
  citationName: string | null; // Family name of first author for citations (e.g., "Takami" for Japanese or "Smith" for Western)
  year: number | null;
  track: "PD" | "PE" | "TPS" | "Cross-Cutting" | "Unknown";
  language: "Japanese" | "English" | "Mixed";
  keywords: string[];
  summary: string;
  documentType:
    | "Academic Paper"
    | "Company Report"
    | "Technical Document"
    | "Patent"
    | "Other";
  confidence: "high" | "medium" | "low";
}

const METADATA_EXTRACTION_PROMPT = `You are a metadata extraction expert specializing in Toyota production engineering and manufacturing documents.

Analyze the following document text and extract structured metadata in JSON format.

**Document Tracks:**
- PD: Product Development (CAD, PLM, simulation, design, prototyping)
- PE: Production Engineering (equipment planning, process design, tooling, jigs, fixtures, machine tools, production preparation, 生産技術, 生産準備)
- TPS: Toyota Production System (kaizen, quality control, daily management, automation, precision measurement)
- Cross-Cutting: Management systems, digital transformation, organizational topics

**Instructions:**
1. Extract title (if not explicitly stated, create a descriptive title based on content)
2. Identify authors (if mentioned)
3. Extract FAMILY NAME of first author for academic citations:
   - For Japanese names in "Family Given" order (e.g., "Takami Tatsuro"): Use first word → "Takami"
   - For Western names in "Given Family" order (e.g., "John Smith"): Use last word → "Smith"
   - This should be the name that would appear in an academic citation like [FamilyName2024]
   - If no author, set to null
4. Extract or infer publication year
5. Classify into one of the tracks above based on content
6. Detect language (Japanese, English, or Mixed)
7. Extract 5-10 relevant keywords (Japanese and/or English)
8. Write a 2-3 sentence summary
9. Classify document type
10. Provide confidence level for the classification

**Important Japanese Terms:**
- 生産技術 = Production Engineering (PE)
- 生産準備 = Production Preparation (PE)
- 工程設計 = Process Design (PE)
- 治具 = Jig/Fixture (PE)
- カイゼン = Kaizen (TPS)
- 品質管理 = Quality Control (TPS)

Return ONLY valid JSON in this exact format:
{
  "title": "Document Title",
  "authors": ["Full Author Name"],
  "citationName": "FamilyName",
  "year": 2024,
  "track": "PE",
  "language": "Japanese",
  "keywords": ["keyword1", "keyword2"],
  "summary": "Brief summary of the document...",
  "documentType": "Academic Paper",
  "confidence": "high"
}

Document Text (first 10000 characters):
---
{{TEXT}}
---`;

/**
 * Extract metadata from document file using Gemini
 * Gemini reads the file directly (PDF/DOCX/TXT)
 */
export async function extractMetadataFromFile(
  fileUri: string,
  mimeType: string,
  fileName: string
): Promise<DocumentMetadata> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GOOGLE_AI_API_KEY is not set in environment variables"
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
  });

  try {
    // Remove the {{TEXT}} placeholder since we're using file input
    const prompt = METADATA_EXTRACTION_PROMPT.replace(
      "Document Text (first 10000 characters):\n---\n{{TEXT}}\n---",
      ""
    );

    // Use Gemini's file reading capability
    const result = await model.generateContent([
      {
        fileData: {
          fileUri: fileUri,
          mimeType: mimeType
        }
      },
      { text: prompt }
    ]);

    const response = result.response;
    const responseText = response.text();

    // Extract JSON from response (handle markdown code blocks if present)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse JSON from Gemini response");
    }

    const metadata: DocumentMetadata = JSON.parse(jsonMatch[0]);

    // Validate and set defaults
    return {
      title: metadata.title || fileName,
      authors: Array.isArray(metadata.authors) ? metadata.authors : [],
      citationName: metadata.citationName || null,
      year: metadata.year || null,
      track: isValidTrack(metadata.track) ? metadata.track : "Unknown",
      language: isValidLanguage(metadata.language)
        ? metadata.language
        : "Mixed",
      keywords: Array.isArray(metadata.keywords) ? metadata.keywords : [],
      summary: metadata.summary || "No summary available",
      documentType: isValidDocumentType(metadata.documentType)
        ? metadata.documentType
        : "Other",
      confidence: isValidConfidence(metadata.confidence)
        ? metadata.confidence
        : "medium",
    };
  } catch (error) {
    console.error("Metadata extraction error:", error);

    // Return fallback metadata if extraction fails
    return {
      title: fileName,
      authors: [],
      citationName: null,
      year: null,
      track: "Unknown",
      language: "Mixed", // Default since we don't have text to analyze
      keywords: [],
      summary: "Metadata extraction failed. Please review manually.",
      documentType: "Other",
      confidence: "low",
    };
  }
}

// Validation helpers
function isValidTrack(
  track: string
): track is "PD" | "PE" | "TPS" | "Cross-Cutting" | "Unknown" {
  return ["PD", "PE", "TPS", "Cross-Cutting", "Unknown"].includes(track);
}

function isValidLanguage(
  language: string
): language is "Japanese" | "English" | "Mixed" {
  return ["Japanese", "English", "Mixed"].includes(language);
}

function isValidDocumentType(
  type: string
): type is
  | "Academic Paper"
  | "Company Report"
  | "Technical Document"
  | "Patent"
  | "Other" {
  return [
    "Academic Paper",
    "Company Report",
    "Technical Document",
    "Patent",
    "Other",
  ].includes(type);
}

function isValidConfidence(
  confidence: string
): confidence is "high" | "medium" | "low" {
  return ["high", "medium", "low"].includes(confidence);
}

function detectLanguageFromText(text: string): "Japanese" | "English" | "Mixed" {
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  const sampleSize = Math.min(text.length, 1000);
  const sample = text.substring(0, sampleSize);
  const japaneseChars = (sample.match(japaneseRegex) || []).length;

  if (japaneseChars > sampleSize * 0.3) {
    return "Japanese";
  } else if (japaneseChars > 0) {
    return "Mixed";
  } else {
    return "English";
  }
}
