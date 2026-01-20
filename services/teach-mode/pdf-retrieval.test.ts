/**
 * PDF Content Retrieval Tests
 *
 * Tests for Teach Mode AI-powered PDF paragraph retrieval.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PDFQuery,
  PDFParagraph,
  PDFRetrievalResult,
  queryPDFContent,
  ParagraphCache,
  getCachedParagraph,
  setCachedParagraph,
  clearExpiredCache,
} from './pdf-retrieval';

// Mock AI search results
const mockSearchResults: PDFParagraph[] = [
  {
    pdf: 'i1099nec.pdf',
    page: 12,
    section: 3,
    paragraph: 4,
    content: 'The TCC format is XX-XXXXXXX where X is alphanumeric.',
    embedding: [0.1, 0.2, 0.3],
  },
  {
    pdf: 'i1099nec.pdf',
    page: 8,
    section: 1,
    paragraph: 2,
    content: 'Report payments of at least $600 or more.',
    embedding: [0.4, 0.5, 0.6],
  },
];

// Mock the AI service
const mockSemanticSearch = vi.fn();

// Setup test mode to use mock data
beforeEach(() => {
  vi.clearAllMocks();
  // Configure mock to return test data
  mockSemanticSearch.mockResolvedValue(mockSearchResults);

  // Inject mock into the module
  (global as any).__TEST_MOCK_SEARCH__ = mockSemanticSearch;
});

describe('PDF Content Query Interface', () => {
  const mockParagraphs: PDFParagraph[] = [
    {
      pdf: 'i1099nec.pdf',
      page: 12,
      section: 3,
      paragraph: 4,
      content: 'The TCC format is XX-XXXXXXX where X is alphanumeric.',
      embedding: [0.1, 0.2, 0.3],
    },
    {
      pdf: 'i1099nec.pdf',
      page: 8,
      section: 1,
      paragraph: 2,
      content: 'Report payments of at least $600 or more.',
      embedding: [0.4, 0.5, 0.6],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should query PDF content by field description', async () => {
    const query: PDFQuery = {
      fieldId: 'tcc_format',
      description: 'Format for TCC field on 1099-NEC',
      formId: 'i1099nec',
    };

    const result = await queryPDFContent(query);

    expect(result).toBeDefined();
    expect(result.paragraphs).toBeDefined();
    expect(result.paragraphs.length).toBeGreaterThan(0);
  });

  it('should return paragraphs sorted by relevance', async () => {
    const query: PDFQuery = {
      fieldId: 'tcc_format',
      description: 'What is the TCC format',
      formId: 'i1099nec',
    };

    const result = await queryPDFContent(query);

    expect(result.paragraphs[0].relevance).toBeGreaterThanOrEqual(
      result.paragraphs[result.paragraphs.length - 1].relevance
    );
  });

  it('should handle queries with no matching results', async () => {
    const query: PDFQuery = {
      fieldId: 'nonexistent',
      description: 'This query will not match anything',
      formId: 'i1099nec',
    };

    // Make mock return empty for this specific query
    mockSemanticSearch.mockResolvedValueOnce([]);

    const result = await queryPDFContent(query);

    expect(result.paragraphs).toEqual([]);
  });

  it('should limit results to maxResults parameter', async () => {
    const query: PDFQuery = {
      fieldId: 'tcc_format',
      description: 'TCC format',
      formId: 'i1099nec',
      maxResults: 2,
    };

    const result = await queryPDFContent(query);

    expect(result.paragraphs.length).toBeLessThanOrEqual(2);
  });

  it('should include metadata in retrieval result', async () => {
    const query: PDFQuery = {
      fieldId: 'tcc_format',
      description: 'TCC format',
      formId: 'i1099nec',
    };

    const result = await queryPDFContent(query);

    expect(result.metadata).toBeDefined();
    expect(result.metadata.queryTime).toBeGreaterThanOrEqual(0);
    expect(result.metadata.cacheHit).toBeDefined();
  });

  it('should throw error for invalid query', async () => {
    const invalidQuery = { fieldId: '' } as PDFQuery;

    await expect(queryPDFContent(invalidQuery)).rejects.toThrow();
  });

  it('should handle multiple PDF sources', async () => {
    const query: PDFQuery = {
      fieldId: 'payment_threshold',
      description: 'Payment reporting threshold',
      formId: 'i1099nec',
      pdfSources: ['i1099nec.pdf', 'i1099gi.pdf'],
    };

    const result = await queryPDFContent(query);

    expect(result.paragraphs).toBeDefined();
    const uniquePdfs = new Set(result.paragraphs.map(p => p.pdf));
    expect(uniquePdfs.size).toBeGreaterThan(0);
  });
});

describe('Paragraph Cache with TTL', () => {
  const mockParagraph: PDFRetrievalResult = {
    paragraphs: [
      {
        pdf: 'i1099nec.pdf',
        page: 12,
        section: 3,
        paragraph: 4,
        content: 'Test content',
        relevance: 0.95,
      },
    ],
    metadata: {
      queryTime: 100,
      cacheHit: false,
      source: 'ai',
    },
  };

  beforeEach(() => {
    clearExpiredCache();
  });

  it('should cache paragraph with TTL', () => {
    const cacheKey = 'test-field';
    const ttl = 60000; // 1 minute

    setCachedParagraph(cacheKey, mockParagraph, ttl);

    const cached = getCachedParagraph(cacheKey);
    expect(cached).toBeDefined();
    expect(cached?.paragraphs[0].content).toBe('Test content');
  });

  it('should return null for expired cache entry', () => {
    const cacheKey = 'test-field';
    const ttl = 100; // 100ms

    setCachedParagraph(cacheKey, mockParagraph, ttl);

    // Wait for expiration
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const cached = getCachedParagraph(cacheKey);
        expect(cached).toBeNull();
        resolve();
      }, 150);
    });
  });

  it('should return null for non-existent cache key', () => {
    const cached = getCachedParagraph('nonexistent');
    expect(cached).toBeNull();
  });

  it('should update existing cache entry', () => {
    const cacheKey = 'test-field';

    setCachedParagraph(cacheKey, mockParagraph, 60000);

    const updatedParagraph: PDFRetrievalResult = {
      paragraphs: [
        {
          pdf: 'i1099nec.pdf',
          page: 15,
          section: 1,
          paragraph: 1,
          content: 'Updated content',
          relevance: 0.99,
        },
      ],
      metadata: {
        queryTime: 50,
        cacheHit: false,
        source: 'ai',
      },
    };

    setCachedParagraph(cacheKey, updatedParagraph, 60000);

    const cached = getCachedParagraph(cacheKey);
    expect(cached?.paragraphs[0].content).toBe('Updated content');
  });

  it('should clear all expired entries', () => {
    setCachedParagraph('key1', mockParagraph, 100);
    setCachedParagraph('key2', mockParagraph, 60000);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        clearExpiredCache();

        expect(getCachedParagraph('key1')).toBeNull();
        expect(getCachedParagraph('key2')).toBeDefined();
        resolve();
      }, 150);
    });
  });

  it('should respect custom TTL values', () => {
    const shortTTLKey = 'short';
    const longTTLKey = 'long';

    setCachedParagraph(shortTTLKey, mockParagraph, 50);
    setCachedParagraph(longTTLKey, mockParagraph, 5000);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(getCachedParagraph(shortTTLKey)).toBeNull();
        expect(getCachedParagraph(longTTLKey)).toBeDefined();
        resolve();
      }, 100);
    });
  });
});
