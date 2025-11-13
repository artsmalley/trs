// Document metadata stored in Vercel KV
export interface DocumentMetadata {
  fileId: string; // File Search file ID
  fileUri: string; // Gemini File API URI
  fileName: string; // Original filename
  mimeType: string; // MIME type (application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, etc.)
  title: string;
  authors: string[]; // Extracted authors
  year: number | null; // Extracted year, null if not found
  summary: string;
  keywords: string[]; // AI-extracted keywords
  track: "PD" | "PE" | "TPS" | "Cross-Cutting" | "Unknown";
  language: "Japanese" | "English" | "Mixed";
  documentType?: string; // e.g., "Academic Paper", "Company Report", "Technical Document", "Patent", "Other"
  confidence: "high" | "medium" | "low"; // AI confidence in metadata extraction
  source?: string; // Where this document came from (J-STAGE, patent, etc.)
  context?: string; // Additional notes from user
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
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

// Citation from RAG
export interface Citation {
  documentId: string;
  title: string;
  excerpt: string;
  pageNumber?: number;
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

// Image analysis result
export interface ImageAnalysisResult {
  imageId: string;
  analysis: string;
  extractedText?: string;
  tags: string[];
  confidence: number;
  metadata: Partial<DocumentMetadata>;
}
