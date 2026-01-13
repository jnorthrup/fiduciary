/**
 * Cross-Reference Resolution Tests
 *
 * Tests for Teach Mode PDF cross-reference system.
 * Handles parsing PDF links, detecting circular references, and resolving cross-doc mappings.
 */

import { describe, it, expect } from 'vitest';
import {
  PDFLink,
  CrossReference,
  parsePDFLink,
  resolveCrossReference,
  detectCircularReferences,
  CrossReferenceGraph,
} from './cross-reference';

describe('PDF Link Parsing', () => {
  it('should parse standard PDF link with page only', () => {
    const link = 'i1099nec.pdf#p12';
    const result = parsePDFLink(link);

    expect(result).toEqual({
      file: 'i1099nec.pdf',
      page: 12,
      section: undefined,
      paragraph: undefined,
    });
  });

  it('should parse PDF link with page and section', () => {
    const link = 'i1099nec.pdf#p12.s3';
    const result = parsePDFLink(link);

    expect(result).toEqual({
      file: 'i1099nec.pdf',
      page: 12,
      section: 3,
      paragraph: undefined,
    });
  });

  it('should parse PDF link with page, section, and paragraph', () => {
    const link = 'i1099gi.pdf#p15.s2.p4';
    const result = parsePDFLink(link);

    expect(result).toEqual({
      file: 'i1099gi.pdf',
      page: 15,
      section: 2,
      paragraph: 4,
    });
  });

  it('should parse PDF link with page and paragraph only', () => {
    const link = 'manual.pdf#p5.p3';
    const result = parsePDFLink(link);

    expect(result).toEqual({
      file: 'manual.pdf',
      page: 5,
      section: undefined,
      paragraph: 3,
    });
  });

  it('should reject malformed PDF link (missing #)', () => {
    const link = 'i1099nec.pdf p12';
    const result = parsePDFLink(link);

    expect(result).toBeNull();
  });

  it('should reject malformed PDF link (missing p prefix)', () => {
    const link = 'i1099nec.pdf#12';
    const result = parsePDFLink(link);

    expect(result).toBeNull();
  });

  it('should reject malformed PDF link (non-numeric page)', () => {
    const link = 'i1099nec.pdf#pab';
    const result = parsePDFLink(link);

    expect(result).toBeNull();
  });

  it('should reject empty string', () => {
    const result = parsePDFLink('');

    expect(result).toBeNull();
  });

  it('should parse link with leading path (relative path)', () => {
    const link = '../instructions/i1099nec.pdf#p12';
    const result = parsePDFLink(link);

    expect(result).toEqual({
      file: '../instructions/i1099nec.pdf',
      page: 12,
      section: undefined,
      paragraph: undefined,
    });
  });
});

describe('Cross-Reference Data Structure', () => {
  it('should create a valid cross-reference', () => {
    const xref: CrossReference = {
      sourceFieldId: 'tcc_format',
      targetPdfLink: 'i1099gi.pdf#p15.s2',
      targetFieldId: 'tcc_definition',
      relationship: 'see_also',
    };

    expect(xref.sourceFieldId).toBe('tcc_format');
    expect(xref.targetPdfLink).toBe('i1099gi.pdf#p15.s2');
  });

  it('should support different relationship types', () => {
    const types = ['see_also', 'defined_in', 'example_in', 'related_to'] as const;

    types.forEach(type => {
      const xref: CrossReference = {
        sourceFieldId: 'test',
        targetPdfLink: 'test.pdf#p1',
        relationship: type,
      };
      expect(xref.relationship).toBe(type);
    });
  });
});

describe('Circular Reference Detection', () => {
  it('should detect simple circular reference (A->B->A)', () => {
    const graph: CrossReferenceGraph = {
      'field_a': ['field_b'],
      'field_b': ['field_a'],
    };

    const cycles = detectCircularReferences(graph);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toEqual(['field_a', 'field_b', 'field_a']);
  });

  it('should detect longer circular reference (A->B->C->A)', () => {
    const graph: CrossReferenceGraph = {
      'field_a': ['field_b'],
      'field_b': ['field_c'],
      'field_c': ['field_a'],
    };

    const cycles = detectCircularReferences(graph);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toEqual(['field_a', 'field_b', 'field_c', 'field_a']);
  });

  it('should detect multiple circular references', () => {
    const graph: CrossReferenceGraph = {
      'field_a': ['field_b'],
      'field_b': ['field_a'],
      'field_x': ['field_y'],
      'field_y': ['field_x'],
    };

    const cycles = detectCircularReferences(graph);
    expect(cycles.length).toBeGreaterThanOrEqual(2);
  });

  it('should return empty array for acyclic graph', () => {
    const graph: CrossReferenceGraph = {
      'field_a': ['field_b'],
      'field_b': ['field_c'],
      'field_c': [],
    };

    const cycles = detectCircularReferences(graph);
    expect(cycles).toHaveLength(0);
  });

  it('should handle empty graph', () => {
    const graph: CrossReferenceGraph = {};

    const cycles = detectCircularReferences(graph);
    expect(cycles).toHaveLength(0);
  });

  it('should handle self-reference (A->A)', () => {
    const graph: CrossReferenceGraph = {
      'field_a': ['field_a'],
    };

    const cycles = detectCircularReferences(graph);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toEqual(['field_a', 'field_a']);
  });

  it('should detect cycle in complex graph with multiple paths', () => {
    const graph: CrossReferenceGraph = {
      'field_a': ['field_b', 'field_c'],
      'field_b': ['field_d'],
      'field_c': ['field_d'],
      'field_d': ['field_a'],
    };

    const cycles = detectCircularReferences(graph);
    expect(cycles.length).toBeGreaterThan(0);
    // Should detect A->B->D->A or A->C->D->A
    const hasAFirstCycle = cycles.some(c => c[0] === 'field_a');
    expect(hasAFirstCycle).toBe(true);
  });
});

describe('Cross-Reference Resolution', () => {
  it('should resolve cross-reference to target field', () => {
    const xrefs: CrossReference[] = [
      {
        sourceFieldId: 'tcc_format',
        targetPdfLink: 'i1099gi.pdf#p15.s2',
        targetFieldId: 'tcc_definition',
        relationship: 'defined_in',
      },
    ];

    const result = resolveCrossReference(xrefs, 'tcc_format');
    expect(result).toBeDefined();
    expect(result?.targetFieldId).toBe('tcc_definition');
  });

  it('should return null for non-existent source field', () => {
    const xrefs: CrossReference[] = [
      {
        sourceFieldId: 'tcc_format',
        targetPdfLink: 'i1099gi.pdf#p15.s2',
        relationship: 'see_also',
      },
    ];

    const result = resolveCrossReference(xrefs, 'non_existent');
    expect(result).toBeNull();
  });

  it('should return multiple cross-references for same source', () => {
    const xrefs: CrossReference[] = [
      {
        sourceFieldId: 'tcc_format',
        targetPdfLink: 'i1099gi.pdf#p15.s2',
        relationship: 'defined_in',
      },
      {
        sourceFieldId: 'tcc_format',
        targetPdfLink: 'examples.pdf#p5',
        relationship: 'example_in',
      },
    ];

    const result = resolveCrossReference(xrefs, 'tcc_format');
    expect(result).toHaveLength(2);
  });

  it('should filter by relationship type', () => {
    const xrefs: CrossReference[] = [
      {
        sourceFieldId: 'tcc_format',
        targetPdfLink: 'i1099gi.pdf#p15.s2',
        relationship: 'defined_in',
      },
      {
        sourceFieldId: 'tcc_format',
        targetPdfLink: 'examples.pdf#p5',
        relationship: 'example_in',
      },
    ];

    const result = resolveCrossReference(xrefs, 'tcc_format', 'example_in');
    expect(result).toHaveLength(1);
    expect(result[0].relationship).toBe('example_in');
  });
});
