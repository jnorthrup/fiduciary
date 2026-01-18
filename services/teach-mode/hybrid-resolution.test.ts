/**
 * Hybrid Resolution Strategy Tests
 *
 * Tests for Teach Mode hybrid fallback: manual lookup -> AI -> generic help.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  HybridQuery,
  HybridResolutionResult,
  resolveWithHybridFallback,
  ResolutionSource,
  loadManualMappings,
} from './hybrid-resolution';

describe('Hybrid Fallback Strategy', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set up manual mappings for tests
    loadManualMappings({
      'i1099nec:tcc_format': {
        description: 'The TCC format is XX-XXXXXXX where X is alphanumeric.',
        taxonomyPath: ['Preparation', 'TIN Format', 'TCC Format'],
      },
    });
  });

  it('should优先使用 manual mapping', async () => {
    const query: HybridQuery = {
      fieldId: 'tcc_format',
      formId: 'i1099nec',
      description: 'TCC field format',
    };

    const result = await resolveWithHybridFallback(query);

    expect(result).toBeDefined();
    expect(result.source).toBe('manual');
    expect(result.content).toBeDefined();
  });

  it('should fallback to AI when manual mapping not found', async () => {
    const query: HybridQuery = {
      fieldId: 'unmapped_field',
      formId: 'i1099nec',
      description: 'Some unmapped field',
    };

    const result = await resolveWithHybridFallback(query);

    expect(result).toBeDefined();
    expect(result.source).toBe('ai');
  });

  it('should fallback to generic help on AI failure', async () => {
    const query: HybridQuery = {
      fieldId: 'nonexistent_field',
      formId: 'i1099nec',
      description: 'Field that does not exist anywhere',
    };

    const result = await resolveWithHybridFallback(query);

    expect(result).toBeDefined();
    expect(result.source).toBe('generic');
    expect(result.content.toLowerCase()).toContain('help');
  });

  it('should include metadata about resolution source', async () => {
    const query: HybridQuery = {
      fieldId: 'tcc_format',
      formId: 'i1099nec',
      description: 'TCC format',
    };

    const result = await resolveWithHybridFallback(query);

    expect(result.metadata).toBeDefined();
    expect(result.metadata.source).toBeDefined();
    expect(result.metadata.resolvedAt).toBeDefined();
  });

  it('should handle empty or null queries gracefully', async () => {
    const invalidQuery = { fieldId: '' } as HybridQuery;

    await expect(resolveWithHybridFallback(invalidQuery)).rejects.toThrow();
  });

  it('should cache AI results for subsequent queries', async () => {
    const query: HybridQuery = {
      fieldId: 'unmapped_cached',
      formId: 'i1099nec',
      description: 'Unmapped field to cache',
    };

    const result1 = await resolveWithHybridFallback(query);
    const result2 = await resolveWithHybridFallback(query);

    expect(result1.source).toBe('ai');
    expect(result2.source).toBe('cache');
  });

  it('should respect manual mapping taxonomy path', async () => {
    const query: HybridQuery = {
      fieldId: 'tcc_format',
      formId: 'i1099nec',
      description: 'TCC format',
    };

    const result = await resolveWithHybridFallback(query);

    if (result.source === 'manual') {
      expect(result.taxonomyPath).toBeDefined();
      expect(result.taxonomyPath?.length).toBe(3);
    }
  });

  it('should return generic help with form-specific context', async () => {
    const query: HybridQuery = {
      fieldId: 'nonexistent_field',
      formId: 'i1099nec',
      description: 'Completely unknown',
    };

    const result = await resolveWithHybridFallback(query);

    expect(result.source).toBe('generic');
    expect(result.content).toMatch(/1099-NEC/i);
  });
});
