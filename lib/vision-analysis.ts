import { GoogleGenerativeAI } from "@google/generative-ai";
import { VisionAnalysisResult } from "./types";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

/**
 * Analyzes an image using Gemini Vision API
 * Extracts: content description, visible text (OCR), objects, concepts, and searchable keywords
 */
export async function analyzeImageWithVision(
  imageBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<VisionAnalysisResult> {
  try {
    // Use Gemini 2.5 Flash for vision analysis (latest and most capable)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Convert buffer to base64 for API
    const base64Image = imageBuffer.toString("base64");

    // Comprehensive prompt for extracting all relevant information
    const prompt = `Analyze this image in the context of Toyota manufacturing, production engineering, and industrial research.

Please provide a comprehensive analysis in the following JSON format:

{
  "description": "A detailed 2-3 sentence description of what the image shows",
  "extractedText": "Any visible text in the image (Japanese or English). If none, return empty string.",
  "objects": ["List", "of", "visible", "objects", "or", "subjects"],
  "concepts": ["High-level", "manufacturing", "or", "quality", "concepts", "visible"],
  "suggestedKeywords": ["Searchable", "keywords", "for", "finding", "this", "image"],
  "confidence": "high, medium, or low"
}

Focus on:
- Manufacturing processes (kaizen, kanban, 5S, TPS, quality circles, etc.)
- Quality control elements (QC diagrams, check sheets, control charts)
- Equipment and machinery
- Shop floor organization and layout
- Safety and standardization
- Any visible Japanese or English text

Return ONLY the JSON, no other text.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse vision analysis response");
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Validate and return structured result
    return {
      description: analysis.description || "No description available",
      extractedText: analysis.extractedText || "",
      objects: Array.isArray(analysis.objects) ? analysis.objects : [],
      concepts: Array.isArray(analysis.concepts) ? analysis.concepts : [],
      suggestedKeywords: Array.isArray(analysis.suggestedKeywords)
        ? analysis.suggestedKeywords
        : [],
      confidence: ["high", "medium", "low"].includes(analysis.confidence)
        ? analysis.confidence
        : "medium",
    };
  } catch (error) {
    console.error("❌ Vision analysis error for", fileName, ":", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");

    // Return fallback analysis
    return {
      description: `Image file: ${fileName} (Vision analysis failed - check server logs)`,
      extractedText: "",
      objects: [],
      concepts: [],
      suggestedKeywords: [fileName.replace(/\.[^/.]+$/, "")], // Filename without extension
      confidence: "low",
    };
  }
}

/**
 * Extracts searchable metadata from vision analysis for Redis storage
 * Combines title, description, objects, and concepts into searchable fields
 */
export function extractMetadataFromVision(
  visionAnalysis: VisionAnalysisResult,
  fileName: string
): {
  title: string;
  summary: string;
  keywords: string[];
  documentType: string;
} {
  // Generate title from filename or first object
  const title = visionAnalysis.objects[0]
    ? `${visionAnalysis.objects[0]} - ${fileName}`
    : fileName;

  // Summary is the AI description
  const summary = visionAnalysis.description;

  // Combine all searchable terms
  const keywords = [
    ...visionAnalysis.suggestedKeywords,
    ...visionAnalysis.objects,
    ...visionAnalysis.concepts,
  ].filter((k, i, arr) => arr.indexOf(k) === i); // Remove duplicates

  // Determine document type from concepts
  let documentType = "Photo";
  if (visionAnalysis.concepts.some((c) => c.toLowerCase().includes("diagram"))) {
    documentType = "Diagram";
  } else if (visionAnalysis.concepts.some((c) => c.toLowerCase().includes("chart"))) {
    documentType = "Chart";
  } else if (visionAnalysis.concepts.some((c) => c.toLowerCase().includes("drawing"))) {
    documentType = "Technical Drawing";
  }

  return {
    title,
    summary,
    keywords,
    documentType,
  };
}
