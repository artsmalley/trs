import { DocumentMetadata } from "./types";

/**
 * Conservative auto-classification logic for document quality tiers.
 * Defaults to Tier 2 (High Quality) when uncertain, allowing users to
 * manually promote to Tier 1 (Authoritative) or demote to Tier 3/4.
 */

export type QualityTier = "Tier 1" | "Tier 2" | "Tier 3" | "Tier 4";
export type TierLabel = "Authoritative" | "High Quality" | "Supporting" | "Background";

export interface ClassificationResult {
  qualityTier: QualityTier;
  tierLabel: TierLabel;
  reason: string; // Human-readable explanation for transparency
  autoClassified: boolean;
  classifiedAt: string;
}

/**
 * Get human-readable label for a tier
 */
export function getTierLabel(tier: QualityTier): TierLabel {
  switch (tier) {
    case "Tier 1":
      return "Authoritative";
    case "Tier 2":
      return "High Quality";
    case "Tier 3":
      return "Supporting";
    case "Tier 4":
      return "Background";
  }
}

/**
 * Classify a document based on metadata using conservative rules.
 * Only uses strong signals, defaults to Tier 2 for manual review.
 */
export function classifyDocument(metadata: DocumentMetadata): ClassificationResult {
  const keywords = metadata.keywords?.map(k => k.toLowerCase()) || [];
  const summary = metadata.summary?.toLowerCase() || "";
  const documentType = metadata.documentType?.toLowerCase() || "";

  // Timeline keywords that indicate background material
  const timelineKeywords = [
    "timeline",
    "chronology",
    "founded",
    "established",
    "biography",
    "タイムライン",
    "年表",
    "創業",
    "設立"
  ];

  const hasTimelineKeywords = timelineKeywords.some(
    keyword => keywords.some(k => k.includes(keyword)) || summary.includes(keyword)
  );

  // TIER 4: Background (History + Timeline)
  // Strong signal: History track AND timeline keywords
  if (metadata.track === "History" && hasTimelineKeywords) {
    return {
      qualityTier: "Tier 4",
      tierLabel: "Background",
      reason: "History track + timeline keywords",
      autoClassified: true,
      classifiedAt: new Date().toISOString()
    };
  }

  // TIER 2: Academic Papers (High Quality by default)
  // Strong signal: Identified as academic paper
  if (documentType.includes("academic") || documentType.includes("paper")) {
    return {
      qualityTier: "Tier 2",
      tierLabel: "High Quality",
      reason: "Academic paper",
      autoClassified: true,
      classifiedAt: new Date().toISOString()
    };
  }

  // TIER 3: Supporting (Web pages, URL-ingested content, and some history)
  // URL-ingested text files (all .txt files are web-ingested timelines/articles)
  if (metadata.mimeType === "text/plain" && metadata.source) {
    return {
      qualityTier: "Tier 3",
      tierLabel: "Supporting",
      reason: "URL-ingested web content",
      autoClassified: true,
      classifiedAt: new Date().toISOString()
    };
  }

  // Web pages (URL-ingested content)
  if (documentType.includes("web page")) {
    return {
      qualityTier: "Tier 3",
      tierLabel: "Supporting",
      reason: "Web page",
      autoClassified: true,
      classifiedAt: new Date().toISOString()
    };
  }

  // History track without timeline keywords (could be good historical analysis)
  if (metadata.track === "History") {
    return {
      qualityTier: "Tier 3",
      tierLabel: "Supporting",
      reason: "History track (no timeline keywords)",
      autoClassified: true,
      classifiedAt: new Date().toISOString()
    };
  }

  // DEFAULT: Tier 2 (High Quality)
  // Conservative default - user reviews and decides if it should be Tier 1 or lower
  return {
    qualityTier: "Tier 2",
    tierLabel: "High Quality",
    reason: "Default classification - needs review",
    autoClassified: true,
    classifiedAt: new Date().toISOString()
  };
}

/**
 * Get tier color for UI display
 */
export function getTierColor(tier: QualityTier): string {
  switch (tier) {
    case "Tier 1":
      return "blue"; // Authoritative - blue badge
    case "Tier 2":
      return "green"; // High Quality - green badge
    case "Tier 3":
      return "amber"; // Supporting - amber badge
    case "Tier 4":
      return "gray"; // Background - gray badge
  }
}

/**
 * Get tier sorting priority (lower = higher priority)
 */
export function getTierPriority(tier: QualityTier): number {
  switch (tier) {
    case "Tier 1":
      return 1;
    case "Tier 2":
      return 2;
    case "Tier 3":
      return 3;
    case "Tier 4":
      return 4;
    default:
      return 99; // Unclassified goes to bottom
  }
}
