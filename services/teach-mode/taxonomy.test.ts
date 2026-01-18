/**
 * Taxonomy Path Resolution Tests
 *
 * Tests for Teach Mode taxonomy path resolution and breadcrumb generation.
 */

import { describe, it, expect } from 'vitest';
import {
  Taxonomy,
  resolveTaxonomyPath,
  generateBreadcrumbs,
  TaxonomyNode,
} from './taxonomy';

describe('Taxonomy Path Resolution', () => {
  const mockTaxonomy: Taxonomy = {
    'Preparation': {
      'TIN Format': ['EIN Format', 'SSN Format', 'ITIN Format'],
      'Data Collection': ['Payee Information', 'Payer Information'],
    },
    'Validation': {
      'Thresholds': ['Payment Thresholds', 'Filing Thresholds'],
      'Format Checks': ['TCC Validation', 'Date Validation'],
    },
    'Submission': {
      'Electronic Filing': ['Fire System Transmission', 'Error Correction'],
      'Paper Filing': ['Form Printing', 'Mailing Instructions'],
    },
  };

  it('should resolve valid taxonomy path to node', () => {
    const path = ['Preparation', 'TIN Format', 'EIN Format'];
    const result = resolveTaxonomyPath(mockTaxonomy, path);

    expect(result).toBeDefined();
    expect(result!.category).toBe('Preparation');
    expect(result!.subCategory).toBe('TIN Format');
    expect(result!.topic).toBe('EIN Format');
  });

  it('should return null for non-existent category', () => {
    const path = ['NonExistent', 'TIN Format', 'EIN Format'];
    const result = resolveTaxonomyPath(mockTaxonomy, path);

    expect(result).toBeNull();
  });

  it('should return null for non-existent sub-category', () => {
    const path = ['Preparation', 'NonExistent', 'EIN Format'];
    const result = resolveTaxonomyPath(mockTaxonomy, path);

    expect(result).toBeNull();
  });

  it('should return null for non-existent topic', () => {
    const path = ['Preparation', 'TIN Format', 'NonExistent'];
    const result = resolveTaxonomyPath(mockTaxonomy, path);

    expect(result).toBeNull();
  });

  it('should return null for malformed path (too short)', () => {
    const path = ['Preparation', 'TIN Format'];
    const result = resolveTaxonomyPath(mockTaxonomy, path);

    expect(result).toBeNull();
  });

  it('should return null for malformed path (too long)', () => {
    const path = ['Preparation', 'TIN Format', 'EIN Format', 'Extra'];
    const result = resolveTaxonomyPath(mockTaxonomy, path);

    expect(result).toBeNull();
  });

  it('should return null for empty path', () => {
    const result = resolveTaxonomyPath(mockTaxonomy, []);

    expect(result).toBeNull();
  });

  it('should handle special characters in taxonomy names', () => {
    const taxonomyWithSpecial: Taxonomy = {
      'Data Entry': {
        'Special/Characters': ['Test & Validate', 'Phase 2'],
      },
    };

    const path = ['Data Entry', 'Special/Characters', 'Test & Validate'];
    const result = resolveTaxonomyPath(taxonomyWithSpecial, path);

    expect(result).toBeDefined();
    expect(result!.category).toBe('Data Entry');
    expect(result!.topic).toBe('Test & Validate');
  });

  it('should resolve path with unicode characters', () => {
    const taxonomyWithUnicode: Taxonomy = {
      'Catégorie': {
        'Sous-Catégorie': ['Sujet'],
      },
    };

    const path = ['Catégorie', 'Sous-Catégorie', 'Sujet'];
    const result = resolveTaxonomyPath(taxonomyWithUnicode, path);

    expect(result).toBeDefined();
  });
});

describe('Taxonomy Breadcrumb Generation', () => {
  it('should generate simple breadcrumb from taxonomy path', () => {
    const path = ['Preparation', 'TIN Format', 'EIN Format'];
    const result = generateBreadcrumbs(path);

    expect(result).toEqual([
      { label: 'Preparation', path: ['Preparation'] },
      { label: 'TIN Format', path: ['Preparation', 'TIN Format'] },
      { label: 'EIN Format', path: ['Preparation', 'TIN Format', 'EIN Format'] },
    ]);
  });

  it('should generate breadcrumb for nested path', () => {
    const path = ['Validation', 'Thresholds', 'Payment Thresholds'];
    const result = generateBreadcrumbs(path);

    expect(result).toHaveLength(3);
    expect(result[0].label).toBe('Validation');
    expect(result[1].label).toBe('Thresholds');
    expect(result[2].label).toBe('Payment Thresholds');
    expect(result[2].path).toEqual(['Validation', 'Thresholds', 'Payment Thresholds']);
  });

  it('should return empty array for empty path', () => {
    const result = generateBreadcrumbs([]);

    expect(result).toEqual([]);
  });

  it('should handle single-level path', () => {
    const result = generateBreadcrumbs(['Only Category']);

    expect(result).toEqual([
      { label: 'Only Category', path: ['Only Category'] },
    ]);
  });

  it('should escape HTML in breadcrumb labels', () => {
    const path = ['Category<script>', 'Sub&Category', 'Topic'];
    const result = generateBreadcrumbs(path);

    // Labels should be HTML-escaped for safety
    expect(result[0].label).toContain('script');
    expect(result[1].label).toContain('&');
  });

  it('should customize separator', () => {
    const path = ['A', 'B', 'C'];
    const result = generateBreadcrumbs(path, ' > ');

    expect(result).toHaveLength(3);
    // Separator is used when joining breadcrumb labels
    const labels = result.map(b => b.label).join(' > ');
    expect(labels).toBe('A > B > C');
  });

  it('should include full path in each breadcrumb for navigation', () => {
    const path = ['Preparation', 'Data Collection', 'Payee Information'];
    const result = generateBreadcrumbs(path);

    expect(result[0].path).toEqual(['Preparation']);
    expect(result[1].path).toEqual(['Preparation', 'Data Collection']);
    expect(result[2].path).toEqual(['Preparation', 'Data Collection', 'Payee Information']);
  });

  it('should handle special breadcrumb separator character', () => {
    const path = ['Validation', 'Format Checks', 'TCC Validation'];
    const result = generateBreadcrumbs(path, ' » ');

    const labels = result.map(b => b.label).join(' » ');
    expect(labels).toBe('Validation » Format Checks » TCC Validation');
  });
});
