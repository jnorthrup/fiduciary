/**
 * Field Mapping Data Structure Tests
 *
 * Tests for Teach Mode manual annotation data structure.
 * Defines schema for mapping form fields to PDF documentation paragraphs.
 */

import { describe, it, expect } from 'vitest';
import {
  FieldMapping,
  FieldMappingSchema,
  TaxonomyPath,
  TaxonomyBreadcrumb,
  validateFieldMapping,
  generateTaxonomyBreadcrumbs,
  resolveTaxonomyPath,
} from './field-mapping';

describe('Field Mapping Schema Validation', () => {
  it('should validate a complete field mapping', () => {
    const mapping: FieldMapping = {
      fieldId: 'tcc_format',
      fieldName: 'TCC Format',
      formType: '1099-NEC',
      stage: 'Preparation',
      topic: 'TCC Requirements',
      pdfReference: {
        file: 'i1099nec.pdf',
        page: 12,
        paragraph: '3',
      },
      excerpt: 'The TCC must be 9 alphanumeric characters, beginning with letter T.',
      examples: [
        {
          valid: true,
          value: 'T12345678',
          description: 'Valid TCC format',
        },
        {
          valid: false,
          value: '123456789',
          description: 'Missing required T prefix',
        },
      ],
      crossReferences: ['i1099gi.pdf#p15.s2'],
      taxonomy: ['Preparation', 'TCC Requirements', 'Format'],
    };

    const result = validateFieldMapping(mapping);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject mapping without required fieldId', () => {
    const mapping = {
      fieldName: 'Test Field',
      formType: '1099-NEC',
      pdfReference: { file: 'test.pdf', page: 1 },
      excerpt: 'Test excerpt',
      taxonomy: ['Test'],
    } as any;

    const result = validateFieldMapping(mapping);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('fieldId is required');
  });

  it('should reject mapping without pdfReference', () => {
    const mapping = {
      fieldId: 'test_field',
      fieldName: 'Test Field',
      formType: '1099-NEC',
      excerpt: 'Test excerpt',
      taxonomy: ['Test'],
    } as any;

    const result = validateFieldMapping(mapping);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('pdfReference is required');
  });

  it('should reject mapping with invalid pdfReference (missing file)', () => {
    const mapping = {
      fieldId: 'test_field',
      fieldName: 'Test Field',
      formType: '1099-NEC',
      pdfReference: { page: 1 }, // Missing file
      excerpt: 'Test excerpt',
      taxonomy: ['Test'],
    } as any;

    const result = validateFieldMapping(mapping);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('pdfReference.file is required');
  });

  it('should reject mapping with empty excerpt', () => {
    const mapping = {
      fieldId: 'test_field',
      fieldName: 'Test Field',
      formType: '1099-NEC',
      pdfReference: { file: 'test.pdf', page: 1 },
      excerpt: '',
      taxonomy: ['Test'],
    } as any;

    const result = validateFieldMapping(mapping);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('excerpt cannot be empty');
  });

  it('should reject mapping with invalid example (missing value)', () => {
    const mapping = {
      fieldId: 'test_field',
      fieldName: 'Test Field',
      formType: '1099-NEC',
      pdfReference: { file: 'test.pdf', page: 1 },
      excerpt: 'Test excerpt',
      examples: [
        { valid: true, description: 'Test' }, // Missing value
      ],
      taxonomy: ['Test'],
    } as any;

    const result = validateFieldMapping(mapping);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('example.value is required');
  });

  it('should validate mapping without examples (optional)', () => {
    const mapping: FieldMapping = {
      fieldId: 'test_field',
      fieldName: 'Test Field',
      formType: '1099-NEC',
      pdfReference: {
        file: 'test.pdf',
        page: 1,
      },
      excerpt: 'Test excerpt',
      taxonomy: ['Test'],
    };

    const result = validateFieldMapping(mapping);
    expect(result.valid).toBe(true);
  });

  it('should validate mapping with crossReferences (optional)', () => {
    const mapping: FieldMapping = {
      fieldId: 'test_field',
      fieldName: 'Test Field',
      formType: '1099-NEC',
      pdfReference: {
        file: 'test.pdf',
        page: 1,
        paragraph: '2',
      },
      excerpt: 'Test excerpt',
      crossReferences: ['other.pdf#p5', 'manual.pdf#p10.s3'],
      taxonomy: ['Test'],
    };

    const result = validateFieldMapping(mapping);
    expect(result.valid).toBe(true);
  });
});

describe('Taxonomy Path Resolution', () => {
  it('should resolve a simple taxonomy path', () => {
    const schema: FieldMappingSchema = {
      mappings: [
        {
          fieldId: 'test_field',
          fieldName: 'Test',
          formType: '1099-NEC',
          pdfReference: { file: 'test.pdf', page: 1 },
          excerpt: 'Test',
          taxonomy: ['Preparation', 'TCC', 'Format'],
        },
      ],
    };

    const result = resolveTaxonomyPath(schema, ['Preparation', 'TCC', 'Format']);
    expect(result).toHaveLength(1);
    expect(result[0].fieldId).toBe('test_field');
  });

  it('should return empty array for non-existent path', () => {
    const schema: FieldMappingSchema = {
      mappings: [
        {
          fieldId: 'test_field',
          fieldName: 'Test',
          formType: '1099-NEC',
          pdfReference: { file: 'test.pdf', page: 1 },
          excerpt: 'Test',
          taxonomy: ['Preparation'],
        },
      ],
    };

    const result = resolveTaxonomyPath(schema, ['NonExistent', 'Path']);
    expect(result).toHaveLength(0);
  });

  it('should support partial path matching (prefix)', () => {
    const schema: FieldMappingSchema = {
      mappings: [
        {
          fieldId: 'field1',
          fieldName: 'Field 1',
          formType: '1099-NEC',
          pdfReference: { file: 'test.pdf', page: 1 },
          excerpt: 'Test',
          taxonomy: ['Preparation', 'TCC', 'Format'],
        },
        {
          fieldId: 'field2',
          fieldName: 'Field 2',
          formType: '1099-NEC',
          pdfReference: { file: 'test.pdf', page: 2 },
          excerpt: 'Test',
          taxonomy: ['Preparation', 'TCC', 'Length'],
        },
      ],
    };

    const result = resolveTaxonomyPath(schema, ['Preparation', 'TCC']);
    expect(result).toHaveLength(2);
  });
});

describe('Taxonomy Breadcrumb Generation', () => {
  it('should generate breadcrumbs from taxonomy path', () => {
    const path: TaxonomyPath = ['Preparation', 'TCC Requirements', 'Format'];
    const result = generateTaxonomyBreadcrumbs(path);

    expect(result).toEqual([
      { label: 'Preparation', path: ['Preparation'] },
      { label: 'TCC Requirements', path: ['Preparation', 'TCC Requirements'] },
      { label: 'Format', path: ['Preparation', 'TCC Requirements', 'Format'] },
    ]);
  });

  it('should handle single-item taxonomy', () => {
    const path: TaxonomyPath = ['Overview'];
    const result = generateTaxonomyBreadcrumbs(path);

    expect(result).toEqual([
      { label: 'Overview', path: ['Overview'] },
    ]);
  });

  it('should handle empty taxonomy', () => {
    const path: TaxonomyPath = [];
    const result = generateTaxonomyBreadcrumbs(path);

    expect(result).toEqual([]);
  });
});
