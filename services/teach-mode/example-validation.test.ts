/**
 * Example Data Validation Tests
 *
 * Tests for Teach Mode example validation and display.
 */

import { describe, it, expect } from 'vitest';
import {
  ExampleSet,
  validateExampleSet,
  ExampleDisplayFormat,
  formatExampleForDisplay,
  categorizeExample,
} from './example-validation';

describe('Example Format Validation', () => {
  it('should validate correct example set with valid and invalid examples', () => {
    const example: ExampleSet = {
      valid: ['XX-XXXXXXX', 'AA-1234567'],
      invalid: ['12345', 'XX-XXXXXX', 'AB-12345678'],
    };

    const result = validateExampleSet(example);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should reject example set with missing valid array', () => {
    const example = {
      invalid: ['bad'],
    } as ExampleSet;

    const result = validateExampleSet(example);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject example set with missing invalid array', () => {
    const example = {
      valid: ['good'],
    } as ExampleSet;

    const result = validateExampleSet(example);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject empty valid array', () => {
    const example: ExampleSet = {
      valid: [],
      invalid: ['bad'],
    };

    const result = validateExampleSet(example);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Valid examples array cannot be empty');
  });

  it('should reject empty invalid array', () => {
    const example: ExampleSet = {
      valid: ['good'],
      invalid: [],
    };

    const result = validateExampleSet(example);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid examples array cannot be empty');
  });

  it('should reject non-string values in arrays', () => {
    const example = {
      valid: ['XX-XXXXXXX', 12345 as any],
      invalid: ['bad'],
    };

    const result = validateExampleSet(example);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('must be strings'))).toBe(true);
  });

  it('should accept valid and invalid arrays with special characters', () => {
    const example: ExampleSet = {
      valid: ['XX-XXXXXXX', 'AB-1234&567'],
      invalid: ['123-456', 'XX-XXXX_XX'],
    };

    const result = validateExampleSet(example);

    expect(result.valid).toBe(true);
  });
});

describe('Example Display Format', () => {
  it('should format example as code block for monospace values', () => {
    const result = formatExampleForDisplay('XX-XXXXXXX', 'code');

    expect(result).toContain('XX-XXXXXXX');
    expect(result).toMatch(/`|code/);
  });

  it('should format example as plain text for regular values', () => {
    const result = formatExampleForDisplay('Example value', 'text');

    expect(result).toContain('Example value');
    expect(result).not.toMatch(/<code>|`/);
  });

  it('should escape HTML in example values', () => {
    const result = formatExampleForDisplay('<script>alert("xss")</script>', 'text');

    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;');
  });

  it('should truncate long examples with maxLength option', () => {
    const longValue = 'X'.repeat(100);
    const result = formatExampleForDisplay(longValue, 'text', { maxLength: 20 });

    expect(result.length).toBeLessThan(longValue.length);
    expect(result).toContain('...');
  });

  it('should add validation indicator for examples', () => {
    const validResult = formatExampleForDisplay('XX-XXXXXXX', 'code', { showStatus: true, isValid: true });
    const invalidResult = formatExampleForDisplay('12345', 'code', { showStatus: true, isValid: false });

    expect(validResult).toMatch(/✓|valid|check/i);
    expect(invalidResult).toMatch(/✗|invalid|wrong/i);
  });
});

describe('Example Categorization', () => {
  it('should categorize TCC format examples', () => {
    const result = categorizeExample('XX-XXXXXXX', 'tcc_format');

    expect(result.category).toBe('format');
    expect(result.pattern).toBeDefined();
  });

  it('should categorize numeric threshold examples', () => {
    const result = categorizeExample('$600', 'payment_threshold');

    expect(result.category).toBe('threshold');
    expect(result.isNumeric).toBe(true);
  });

  it('should categorize EIN format examples', () => {
    const result = categorizeExample('12-3456789', 'ein_format');

    expect(result.category).toBe('identifier');
    expect(result.format).toBe('XX-XXXXXXX');
  });

  it('should return unknown category for unrecognized patterns', () => {
    const result = categorizeExample('random text', 'unknown_field');

    expect(result.category).toBe('unknown');
  });
});
