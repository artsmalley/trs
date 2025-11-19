// Document metadata stored in Vercel KV
export interface DocumentMetadata {
  fileId: string; // File Search file ID (for documents) or unique ID (for images)
  fileUri: string; // Gemini File API URI (for documents) or empty (for images)
  fileName: string; // Original filename
  mimeType: string; // MIME type (application/pdf, image/jpeg, etc.)
  blobUrl: string; // Vercel Blob storage URL for downloads/display
  fileType: "document" | "image"; // File category for smart routing
  title: string;
  authors: string[]; // Extracted authors
  citationName: string | null; // Family name of first author for citations (e.g., "Takami" for Japanese or "Smith" for Western)
  year: number | null; // Extracted year, null if not found
  summary: string;
  keywords: string[]; // AI-extracted keywords (from text or vision analysis)
  track: "PD" | "PE" | "TPS" | "History" | "Cross-Cutting" | "Unknown";
  language: "Japanese" | "English" | "Mixed";
  documentType?: string; // e.g., "Academic Paper", "Company Report", "Technical Document", "Patent", "Photo", "Diagram"
  confidence: "high" | "medium" | "low"; // AI confidence in metadata extraction
  source?: string; // Where this document came from (J-STAGE, patent, etc.)
  context?: string; // Additional notes from user
  visionAnalysis?: VisionAnalysisResult; // For images: AI-generated content description
  qualityTier?: "Tier 1" | "Tier 2" | "Tier 3" | "Tier 4"; // Document quality classification
  tierLabel?: "Authoritative" | "High Quality" | "Supporting" | "Background"; // Human-readable tier label
  autoClassified?: boolean; // Whether tier was auto-assigned (true) or manually selected (false)
  classifiedAt?: string; // ISO timestamp when tier was assigned
  status: "pending_review" | "approved" | "rejected";
  uploadedAt: string; // ISO timestamp
  approvedAt: string | null; // ISO timestamp when approved/rejected
  needsReview?: boolean; // Whether human review is needed
}

// Upload processing status
export type UploadStatus = "pending" | "processing" | "complete" | "error";

// Upload result from API
export interface UploadResult {
  fileId: string;
  status: UploadStatus;
  extractedMetadata?: DocumentMetadata;
  error?: string;
  needsReview: boolean;
}

// Chat message for agents
export interface Message {
  role: "user" | "model";
  content: string;
  citations?: Citation[];
}

// Citation from RAG
export interface Citation {
  documentId: string;
  title: string;
  excerpt: string;
  pageNumber?: number;
  source?: 'corpus' | 'web'; // Track whether from corpus or web search
}

// Query filters for Summary/Analyze agents
export interface QueryFilters {
  track?: string[];
  yearRange?: [number, number];
  topics?: string[];
  language?: ("en" | "ja" | "mixed")[];
}

// Summary/Analyze API response
export interface QueryResponse {
  answer: string;
  citations: Citation[];
  referencedDocuments: string[]; // File IDs
  knowledgeGaps?: string[];
}

// Outline node for article structuring
export interface OutlineNode {
  id: string;
  title: string;
  level: number; // 1, 2, 3 for heading levels
  content?: string; // Drafted content if available
  coverage?: "strong" | "moderate" | "weak" | "missing";
  children?: OutlineNode[];
}

// Outline API response
export interface OutlineResponse {
  outline?: OutlineNode[];
  draftedSection?: {
    title: string;
    content: string;
    citations: Citation[];
  };
  coverageAssessment?: {
    strong: string[];
    moderate: string[];
    weak: string[];
    missing: string[];
  };
}

// Analyze API request
export interface AnalyzeRequest {
  claim: string;
  count?: number;
  citationType?: "quote" | "example" | "data";
}

// Editor suggestion
export interface EditorSuggestion {
  type: "terminology" | "citation" | "clarity" | "structure" | "style";
  line?: number;
  suggestion: string;
  original?: string;
  suggested?: string;
}

// Research priority item
export interface ResearchPriority {
  id: string;
  topic: string;
  searchTerms: string[];
  priority: "high" | "medium" | "low";
  status: "not_started" | "in_progress" | "completed";
  notes?: string;
}

// Vision analysis result from Gemini Vision API
export interface VisionAnalysisResult {
  description: string; // AI-generated description of image content
  extractedText: string; // OCR text found in image
  objects: string[]; // Detected objects/subjects (e.g., "kanban board", "workers", "machinery")
  concepts: string[]; // High-level concepts (e.g., "5S organization", "quality control", "safety")
  suggestedKeywords: string[]; // Searchable keywords generated from analysis
  confidence: "high" | "medium" | "low"; // AI confidence in analysis
}
