/**
 * Example Data Validation
 *
 * Validates and formats example data for Teach Mode display.
 */

export interface ExampleSet {
  valid: string[];
  invalid: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ExampleDisplayOptions {
  maxLength?: number;
  showStatus?: boolean;
  isValid?: boolean;
}

export type ExampleDisplayFormat = 'code' | 'text';

export interface ExampleCategory {
  category: 'format' | 'threshold' | 'identifier' | 'unknown';
  pattern?: string;
  isNumeric?: boolean;
  format?: string;
}

/**
 * Validate example set structure and content.
 */
export function validateExampleSet(example: ExampleSet): ValidationResult {
  const errors: string[] = [];

  // Check valid array exists and is array
  if (!example.valid || !Array.isArray(example.valid)) {
    errors.push('Valid examples array is required');
    return { valid: false, errors };
  }

  // Check invalid array exists and is array
  if (!example.invalid || !Array.isArray(example.invalid)) {
    errors.push('Invalid examples array is required');
    return { valid: false, errors };
  }

  // Check valid array not empty
  if (example.valid.length === 0) {
    errors.push('Valid examples array cannot be empty');
  }

  // Check invalid array not empty
  if (example.invalid.length === 0) {
    errors.push('Invalid examples array cannot be empty');
  }

  // Check all values are strings
  const allValidStrings = example.valid.every(v => typeof v === 'string');
  const allInvalidStrings = example.invalid.every(v => typeof v === 'string');

  if (!allValidStrings) {
    errors.push('All valid examples must be strings');
  }

  if (!allInvalidStrings) {
    errors.push('All invalid examples must be strings');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format example value for display.
 */
export function formatExampleForDisplay(
  value: string,
  format: ExampleDisplayFormat,
  options: ExampleDisplayOptions = {}
): string {
  const { maxLength, showStatus, isValid } = options;

  // Escape HTML to prevent XSS
  let display = escapeHtml(value);

  // Truncate if needed
  if (maxLength && display.length > maxLength) {
    display = display.slice(0, maxLength) + '...';
  }

  // Add status indicator
  let status = '';
  if (showStatus) {
    status = isValid ? ' ✓' : ' ✗';
  }

  // Format based on type
  if (format === 'code') {
    return `<code>${display}</code>${status}`;
  }

  return `${display}${status}`;
}

/**
 * Categorize example based on field type and pattern.
 */
export function categorizeExample(value: string, fieldType: string): ExampleCategory {
  // TCC format: XX-XXXXXXX (alphanumeric)
  if (fieldType === 'tcc_format' && /^[A-Za-z0-9]{2}-[A-Za-z0-9]{7}$/.test(value)) {
    return {
      category: 'format',
      pattern: '\\d{2}-\\d{7}',
    };
  }

  // Payment threshold: numeric with currency
  if (fieldType === 'payment_threshold' && /^\$?\d+/.test(value)) {
    return {
      category: 'threshold',
      isNumeric: true,
    };
  }

  // EIN format: XX-XXXXXXX
  if (fieldType === 'ein_format' && /^\d{2}-\d{7}$/.test(value)) {
    return {
      category: 'identifier',
      format: 'XX-XXXXXXX',
    };
  }

  return {
    category: 'unknown',
  };
}

/**
 * Escape HTML special characters.
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  };

  return text.replace(/[&<>"']/g, char => map[char]);
}
