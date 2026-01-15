/**
 * PDF Content Retrieval
 *
 * AI-powered PDF paragraph retrieval for Teach Mode.
 */

export interface PDFQuery {
  fieldId: string;
  description: string;
  formId: string;
  maxResults?: number;
  pdfSources?: string[];
}

export interface PDFParagraph {
  pdf: string;
  page: number;
  section?: number;
  paragraph?: number;
  content: string;
  relevance?: number;
  embedding?: number[];
}

export interface PDFRetrievalMetadata {
  queryTime: number;
  cacheHit: boolean;
  source: 'ai' | 'cache' | 'manual';
}

export interface PDFRetrievalResult {
  paragraphs: Array<PDFParagraph & { relevance: number }>;
  metadata: PDFRetrievalMetadata;
}

// In-memory cache with TTL
interface CacheEntry {
  data: PDFRetrievalResult;
  expiresAt: number;
}

const cache: Record<string, CacheEntry> = {};
const pendingRequests: Record<string, Promise<PDFRetrievalResult>> = {};

/**
 * Query PDF content using semantic search.
 */
export async function queryPDFContent(
  query: PDFQuery
): Promise<PDFRetrievalResult> {
  const startTime = Date.now();

  if (!query.fieldId || !query.description || !query.formId) {
    throw new Error('Invalid query: missing required fields');
  }

  // Check cache first
  const cacheKey = `${query.formId}:${query.fieldId}:${query.description}`;
  const cached = getCachedParagraph(cacheKey);
  if (cached) {
    return {
      ...cached,
      metadata: {
        ...cached.metadata,
        cacheHit: true,
      },
    };
  }

  // Check for pending request to deduplicate
  if (pendingRequests[cacheKey]) {
    return pendingRequests[cacheKey];
  }

  // Perform semantic search (mock implementation)
  const requestPromise = (async () => {
    // In production, this would call a GenAI service
    const paragraphs: Array<PDFParagraph & { relevance: number }> = [];

    const result: PDFRetrievalResult = {
      paragraphs,
      metadata: {
        queryTime: Date.now() - startTime,
        cacheHit: false,
        source: 'ai',
      },
    };

    // Cache the result (default TTL: 1 hour)
    setCachedParagraph(cacheKey, result, 3600000);
    
    // Clean up pending request
    delete pendingRequests[cacheKey];

    return result;
  })();

  pendingRequests[cacheKey] = requestPromise;
  return requestPromise;
}

/**
 * Get cached paragraph if exists and not expired.
 */
export function getCachedParagraph(key: string): PDFRetrievalResult | null {
  const entry = cache[key];
  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    delete cache[key];
    return null;
  }

  return entry.data;
}

/**
 * Cache paragraph with TTL.
 */
export function setCachedParagraph(
  key: string,
  data: PDFRetrievalResult,
  ttl: number
): void {
  cache[key] = {
    data,
    expiresAt: Date.now() + ttl,
  };
}

/**
 * Clear expired cache entries.
 */
export function clearExpiredCache(): void {
  const now = Date.now();
  for (const key in cache) {
    if (now > cache[key].expiresAt) {
      delete cache[key];
    }
  }
}

// Export ParagraphCache type for external use
export type ParagraphCache = typeof cache;
