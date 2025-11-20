/**
 * Citation Injection Utility
 *
 * Injects citations into response text based on Gemini's grounding metadata.
 * Citations are placed at the end of paragraphs in format: [Source1, p.1; Source2, p.5]
 */

interface CitationInfo {
  citationKey: string;
  pages: number[];
}

/**
 * Injects citations into response text at the end of each paragraph
 *
 * @param responseText - Plain text response from Gemini (no citations)
 * @param docMap - Map of fileId to {doc, pages, citationKey} from grounding metadata
 * @returns Annotated text with citations at end of paragraphs
 */
export function injectCitations(
  responseText: string,
  docMap: Map<string, { doc: any; pages: Set<number>; citationKey: string }>
): string {
  // If no response text or no citations, return as-is
  if (!responseText || !responseText.trim() || docMap.size === 0) {
    return responseText;
  }

  // Extract all citations from docMap
  const allCitations = Array.from(docMap.values()).map(({ citationKey, pages }) => ({
    citationKey,
    pages: Array.from(pages).sort((a, b) => a - b), // Sort page numbers
  }));

  // If no citations extracted, return original
  if (allCitations.length === 0) {
    return responseText;
  }

  // Format citations: [Source1, p.1, 5; Source2, p.3]
  const formattedCitations = formatCitations(allCitations);

  // Split response into paragraphs (separated by double newlines)
  const paragraphs = responseText.split(/\n\n+/);

  // If single paragraph, append citations at end
  if (paragraphs.length === 1) {
    const trimmed = responseText.trim();
    return `${trimmed} ${formattedCitations}`;
  }

  // Multiple paragraphs: append citations to last paragraph only
  // (since grounding metadata doesn't tell us which chunk maps to which paragraph)
  const annotatedParagraphs = paragraphs.map((para, idx) => {
    const trimmed = para.trim();
    if (!trimmed) return ''; // Skip empty paragraphs

    // Append citations only to last non-empty paragraph
    if (idx === paragraphs.length - 1) {
      return `${trimmed} ${formattedCitations}`;
    }
    return trimmed;
  });

  // Join paragraphs back together with double newlines
  return annotatedParagraphs.filter(p => p).join('\n\n');
}

/**
 * Formats citations in the style: [Source1, p.1, 5; Source2, p.3]
 *
 * @param citations - Array of {citationKey, pages}
 * @returns Formatted citation string
 */
function formatCitations(citations: CitationInfo[]): string {
  if (citations.length === 0) return '';

  // Sort citations by citation key for consistency
  const sorted = [...citations].sort((a, b) =>
    a.citationKey.localeCompare(b.citationKey)
  );

  // Format each citation
  const formattedParts = sorted.map(({ citationKey, pages }) => {
    if (pages.length === 0) {
      return citationKey;
    }

    // Format pages: "p.1, 5, 10" (comma-separated)
    const pageStr = pages.join(', ');
    return `${citationKey}, p.${pageStr}`;
  });

  // Combine multiple citations with semicolon: [Source1, p.1; Source2, p.5]
  return `[${formattedParts.join('; ')}]`;
}
