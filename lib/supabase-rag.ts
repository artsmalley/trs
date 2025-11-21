/**
 * Supabase RAG Functions
 *
 * Text chunking, embedding generation, document storage, and semantic search
 * using PostgreSQL + pgvector with gemini-embedding-001 (768 dimensions)
 */

import { GoogleGenAI } from '@google/genai';
import { supabase } from './supabase-client';
import type { DocumentMetadata } from './types';

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });

// ============================================================================
// TYPES
// ============================================================================

export interface Chunk {
  text: string;
  pageNumber: number;
  tokenCount: number;
}

export interface SearchResult {
  chunkId: string;
  documentId: string;
  citationKey: string;
  title: string;
  pageNumber: number;
  text: string;
  similarity: number;
}

export interface SupabaseDocument {
  id: string;
  title: string;
  citation_key: string;
  authors: string[];
  year: number | null;
  track: string;
  summary: string;
  keywords: string[];
  quality_tier: number;
  tier_label: string;
  blob_url: string;
  file_name: string;
  file_size_bytes: number;
  source_url: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TEXT CHUNKING
// ============================================================================

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Get last N tokens from text (for overlap)
 */
function getLastNTokens(text: string, n: number): string {
  const targetChars = n * 4;
  if (text.length <= targetChars) return text;

  // Try to break at sentence boundary
  const substring = text.slice(-targetChars);
  const sentenceMatch = substring.match(/[.!?]\s+/);
  if (sentenceMatch && sentenceMatch.index) {
    return substring.slice(sentenceMatch.index + sentenceMatch[0].length);
  }

  return substring;
}

/**
 * Split text into chunks with overlap
 * - Chunk size: 500 tokens
 * - Overlap: 50 tokens
 * - Preserves page markers for citation extraction
 */
export function chunkText(text: string): Chunk[] {
  const chunks: Chunk[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);

  console.log(`  DEBUG: Text length: ${text.length} chars, Split into ${sentences.length} sentences`);
  console.log(`  DEBUG: First sentence: ${sentences[0]?.substring(0, 100)}...`);

  let currentChunk = '';
  let tokenCount = 0;
  let currentPage = 1;

  for (const sentence of sentences) {
    // Check for page markers (--- PAGE X ---)
    const pageMatch = sentence.match(/---\s*PAGE\s+(\d+)\s*---/);
    if (pageMatch) {
      currentPage = parseInt(pageMatch[1]);
      continue;
    }

    const sentenceTokens = estimateTokens(sentence);

    // If adding this sentence exceeds 500 tokens, save current chunk
    if (tokenCount + sentenceTokens > 500 && currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        pageNumber: currentPage,
        tokenCount: tokenCount
      });

      // Start new chunk with overlap (last 50 tokens)
      const overlapText = getLastNTokens(currentChunk, 50);
      currentChunk = overlapText + ' ' + sentence;
      tokenCount = 50 + sentenceTokens;
    } else {
      currentChunk += sentence + ' ';
      tokenCount += sentenceTokens;
    }
  }

  // Save final chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      pageNumber: currentPage,
      tokenCount: tokenCount
    });
  }

  return chunks;
}

// ============================================================================
// EMBEDDING GENERATION
// ============================================================================

/**
 * Generate 768-dimensional embeddings using gemini-embedding-001
 *
 * Uses Matryoshka Representation Learning with 768 dimensions for optimal
 * balance of performance, cost, and Japanese tokenization stability
 */
export async function generateEmbedding(
  text: string,
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' = 'RETRIEVAL_DOCUMENT'
): Promise<number[]> {
  try {
    const result = await ai.models.embedContent({
      model: 'gemini-embedding-001',  // Stable Japanese tokenization
      contents: [{ parts: [{ text }] }],  // Array format for API
      config: {
        outputDimensionality: 768,    // Match database schema (vector(768))
        taskType: taskType             // Optimize for RAG (RETRIEVAL_DOCUMENT/QUERY)
      }
    });

    // API returns embeddings array when using contents array
    const embedding = result.embeddings?.[0]?.values;
    if (!embedding) {
      throw new Error('No embedding returned from API');
    }
    return embedding;
  } catch (error) {
    console.error('Embedding generation error:', error);
    throw new Error(
      `Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// DOCUMENT STORAGE
// ============================================================================

/**
 * Build citation key from metadata
 * Format: AuthorYear (e.g., "Yoshino1985", "Smith2024")
 */
function buildCitationKey(metadata: DocumentMetadata): string {
  const author = metadata.citationName || (metadata.authors.length > 0 ? metadata.authors[0] : 'Unknown');
  const year = metadata.year || 'n.d.';
  return `${author}${year}`;
}

/**
 * Convert quality tier string to number
 */
function qualityTierToNumber(tier?: string): number {
  if (!tier) return 2; // Default to Tier 2

  const match = tier.match(/Tier (\d)/);
  return match ? parseInt(match[1]) : 2;
}

/**
 * Store document in Supabase with chunking and embedding
 *
 * @param metadata - Document metadata from extraction
 * @param blobUrl - Vercel Blob URL for downloads
 * @param pdfText - Full text content (with PAGE markers)
 * @returns Document ID (UUID)
 */
export async function storeDocument(
  metadata: DocumentMetadata,
  blobUrl: string,
  pdfText: string
): Promise<string> {
  try {
    // 1. Build citation key and check for duplicates
    const citationKey = buildCitationKey(metadata);
    const qualityTier = qualityTierToNumber(metadata.qualityTier);

    // Check if document already exists (from previous failed upload)
    const { data: existingDoc } = await supabase
      .from('documents')
      .select('id')
      .eq('citation_key', citationKey)
      .maybeSingle(); // Use maybeSingle() to avoid error if not found

    // Delete existing document if found (chunks cascade via foreign key)
    if (existingDoc) {
      console.log(`⚠️  Document ${citationKey} already exists (orphaned from previous upload), deleting...`);
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', existingDoc.id);

      if (deleteError) {
        console.error('Delete existing document error:', deleteError);
        throw new Error(`Failed to delete existing document: ${deleteError.message}`);
      }
      console.log(`✓ Cleaned up orphaned document ${citationKey}`);
    }

    // 2. Insert document metadata
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        title: metadata.title,
        citation_key: citationKey,
        authors: metadata.authors,
        year: metadata.year,
        track: metadata.track,
        summary: metadata.summary,
        keywords: metadata.keywords,
        quality_tier: qualityTier,
        tier_label: metadata.tierLabel || 'High Quality',
        blob_url: blobUrl,
        file_name: metadata.fileName,
        file_size_bytes: 0, // Will be set by upload handler if available
        source_url: metadata.source || null
      })
      .select()
      .single();

    if (docError) {
      console.error('Document insert error:', docError);
      throw new Error(`Failed to insert document: ${docError.message}`);
    }

    console.log(`✓ Document inserted: ${doc.id} (${citationKey})`);

    // 3. Chunk text
    const chunks = chunkText(pdfText);
    console.log(`Chunking: ${chunks.length} chunks created`);

    // 4. Generate embeddings and store chunks (with rollback on failure)
    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        // Generate embedding
        const embedding = await generateEmbedding(chunk.text, 'RETRIEVAL_DOCUMENT');

        // DEBUG: Log embedding details
        console.log(`  DEBUG: Chunk ${i} - Embedding length: ${embedding.length}, First 3 values: [${embedding.slice(0, 3).join(', ')}]`);

        // Insert chunk
        const { error: chunkError } = await supabase
          .from('chunks')
          .insert({
            document_id: doc.id,
            text: chunk.text,
            page_number: chunk.pageNumber,
            chunk_index: i,
            embedding: embedding,
            token_count: chunk.tokenCount
          });

        if (chunkError) {
          console.error(`Chunk ${i} insert error:`, chunkError);
          throw new Error(`Failed to insert chunk ${i}: ${chunkError.message}`);
        }

        // Progress logging
        if ((i + 1) % 10 === 0 || i === chunks.length - 1) {
          console.log(`  Embedded ${i + 1}/${chunks.length} chunks`);
        }
      }

      console.log(`✓ All ${chunks.length} chunks embedded and stored`);
      return doc.id;

    } catch (chunkError) {
      // ROLLBACK: Delete document we just inserted (chunks auto-delete via CASCADE)
      console.error('❌ Chunk insertion failed, rolling back document...');
      const { error: rollbackError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (rollbackError) {
        console.error('Rollback failed:', rollbackError);
        // Still throw original error
      } else {
        console.log(`✓ Rolled back document ${citationKey}`);
      }

      // Re-throw original chunk error
      throw chunkError;
    }
  } catch (error) {
    console.error('Store document error:', error);
    throw new Error(
      `Failed to store document in Supabase: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// SEMANTIC SEARCH
// ============================================================================

/**
 * Search corpus using semantic similarity
 *
 * Uses the search_chunks PostgreSQL function which:
 * - Generates query embedding
 * - Finds similar chunks via pgvector
 * - JOINs with documents table for citation metadata
 * - Filters by quality tier if specified
 *
 * @param query - User's search query
 * @param qualityTiers - Optional quality tier filter (e.g., [1, 2] for high quality only)
 * @param matchCount - Number of chunks to return (default: 10)
 * @param matchThreshold - Minimum similarity score (default: 0.7)
 * @returns Array of search results with citation metadata
 */
export async function searchCorpus(
  query: string,
  qualityTiers?: number[],
  matchCount: number = 10,
  matchThreshold: number = 0.7
): Promise<SearchResult[]> {
  try {
    // 1. Generate query embedding
    const queryEmbedding = await generateEmbedding(query, 'RETRIEVAL_QUERY');

    // 2. Search similar chunks using PostgreSQL function
    const { data: results, error } = await supabase.rpc('search_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
      filter_quality_tiers: qualityTiers || null
    });

    if (error) {
      console.error('Search error:', error);
      throw new Error(`Search failed: ${error.message}`);
    }

    // 3. Transform results to SearchResult format
    return (results || []).map((r: any) => ({
      chunkId: r.chunk_id,
      documentId: r.document_id,
      citationKey: r.citation_key,
      title: r.title,
      pageNumber: r.page_number,
      text: r.text,
      similarity: r.similarity
    }));
  } catch (error) {
    console.error('Search corpus error:', error);
    throw new Error(
      `Failed to search corpus: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// CITATION EXTRACTION
// ============================================================================

/**
 * Extract citations from search results
 *
 * With Supabase, this is trivial - citation metadata comes directly
 * from the SQL JOIN, no fragile string parsing needed!
 */
export function extractCitations(results: SearchResult[]): Array<{
  citationKey: string;
  title: string;
  pageNumbers: number[];
  excerpts: string[];
}> {
  // Group by citation key
  const citationMap = new Map<string, {
    citationKey: string;
    title: string;
    pageNumbers: Set<number>;
    excerpts: string[];
  }>();

  for (const result of results) {
    const key = result.citationKey;

    if (!citationMap.has(key)) {
      citationMap.set(key, {
        citationKey: key,
        title: result.title,
        pageNumbers: new Set(),
        excerpts: []
      });
    }

    const citation = citationMap.get(key)!;
    citation.pageNumbers.add(result.pageNumber);
    citation.excerpts.push(result.text.substring(0, 200) + '...');
  }

  // Convert to array format
  return Array.from(citationMap.values()).map(c => ({
    citationKey: c.citationKey,
    title: c.title,
    pageNumbers: Array.from(c.pageNumbers).sort((a, b) => a - b),
    excerpts: c.excerpts
  }));
}

/**
 * Format citation for display
 * Format: [CitationKey, p.1, 2, 5]
 */
export function formatCitation(
  citationKey: string,
  pageNumbers: number[]
): string {
  const pages = pageNumbers.join(', ');
  return `[${citationKey}, p.${pages}]`;
}

// ============================================================================
// DOCUMENT MANAGEMENT
// ============================================================================

/**
 * Delete document and all its chunks from Supabase
 * (Chunks are automatically deleted via CASCADE)
 */
export async function deleteDocument(documentId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (error) {
      console.error('Delete error:', error);
      throw new Error(`Failed to delete document: ${error.message}`);
    }

    console.log(`✓ Document ${documentId} deleted (chunks auto-deleted via CASCADE)`);
  } catch (error) {
    console.error('Delete document error:', error);
    throw new Error(
      `Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get all documents from Supabase
 */
export async function listDocuments(): Promise<SupabaseDocument[]> {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('List error:', error);
      throw new Error(`Failed to list documents: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('List documents error:', error);
    throw new Error(
      `Failed to list documents: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
