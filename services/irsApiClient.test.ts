/**
 * Tests for IRS API Client Utility Functions
 *
 * Test file following TDD principles:
 * 1. formatEIN - should format 9-digit EINs correctly
 * 2. formatSSN - should format 9-digit SSNs correctly
 * 3. validateTINFormat - should validate TIN formats
 * 4. getTINType - should identify TIN type
 */

import { describe, it, expect } from 'vitest';
import {
  formatEIN,
  formatSSN,
  validateTINFormat,
  getTINType,
  validateAddress,
  createSubmissionTemplate,
  getFormAmountFields,
  type FormType,
  type FilerInfo,
} from './irsApiClient';

describe('formatEIN', () => {
  it('should format a raw 9-digit string as XX-XXXXXXX', () => {
    expect(formatEIN('123456789')).toBe('12-3456789');
  });

  it('should handle a string with existing dashes', () => {
    expect(formatEIN('12-3456789')).toBe('12-3456789');
  });

  it('should handle a string with spaces and other characters', () => {
    expect(formatEIN('12 345 6789')).toBe('12-3456789');
    expect(formatEIN('12.345.6789')).toBe('12-3456789');
  });

  it('should throw an error for strings with less than 9 digits', () => {
    expect(() => formatEIN('12345678')).toThrow('Invalid EIN: must be 9 digits');
  });

  it('should throw an error for strings with more than 9 digits', () => {
    expect(() => formatEIN('1234567890')).toThrow('Invalid EIN: must be 9 digits');
  });

  it('should throw an error for empty strings', () => {
    expect(() => formatEIN('')).toThrow('Invalid EIN: must be 9 digits');
  });

  it('should throw an error for strings with no digits', () => {
    expect(() => formatEIN('abcdefghi')).toThrow('Invalid EIN: must be 9 digits');
  });
});

describe('formatSSN', () => {
  it('should format a raw 9-digit string as XXX-XX-XXXX', () => {
    expect(formatSSN('123456789')).toBe('123-45-6789');
  });

  it('should handle a string with existing dashes', () => {
    expect(formatSSN('123-45-6789')).toBe('123-45-6789');
  });

  it('should handle a string with spaces and other characters', () => {
    expect(formatSSN('123 45 6789')).toBe('123-45-6789');
    expect(formatSSN('123.45.6789')).toBe('123-45-6789');
  });

  it('should throw an error for strings with less than 9 digits', () => {
    expect(() => formatSSN('12345678')).toThrow('Invalid SSN: must be 9 digits');
  });

  it('should throw an error for strings with more than 9 digits', () => {
    expect(() => formatSSN('1234567890')).toThrow('Invalid SSN: must be 9 digits');
  });

  it('should throw an error for empty strings', () => {
    expect(() => formatSSN('')).toThrow('Invalid SSN: must be 9 digits');
  });

  it('should throw an error for strings with no digits', () => {
    expect(() => formatSSN('abcdefghi')).toThrow('Invalid SSN: must be 9 digits');
  });
});

describe('validateTINFormat', () => {
  describe('EIN validation', () => {
    it('should return true for valid EIN format (XX-XXXXXXX)', () => {
      expect(validateTINFormat('12-3456789')).toBe(true);
      expect(validateTINFormat('99-9999999')).toBe(true);
    });

    it('should return false for invalid EIN format', () => {
      expect(validateTINFormat('1-3456789')).toBe(false);  // Only 1 digit before dash
      expect(validateTINFormat('123-456789')).toBe(false); // 3 digits before dash
      expect(validateTINFormat('12-345678')).toBe(false);  // Only 7 digits after dash
      expect(validateTINFormat('12-34567890')).toBe(false); // 8 digits after dash
    });
  });

  describe('SSN validation', () => {
    it('should return true for valid SSN format (XXX-XX-XXXX)', () => {
      expect(validateTINFormat('123-45-6789')).toBe(true);
      expect(validateTINFormat('999-99-9999')).toBe(true);
    });

    it('should return false for invalid SSN format', () => {
      expect(validateTINFormat('12-345-6789')).toBe(false);  // Only 2 digits in first group
      expect(validateTINFormat('1234-45-6789')).toBe(false); // 4 digits in first group
      expect(validateTINFormat('123-4-6789')).toBe(false);    // Only 1 digit in second group
      expect(validateTINFormat('123-456-6789')).toBe(false); // 3 digits in second group
      expect(validateTINFormat('123-45-678')).toBe(false);   // Only 3 digits in third group
      expect(validateTINFormat('123-45-67890')).toBe(false); // 5 digits in third group
    });
  });

  describe('Edge cases', () => {
    it('should return false for empty string', () => {
      expect(validateTINFormat('')).toBe(false);
    });

    it('should return false for strings without dashes', () => {
      expect(validateTINFormat('123456789')).toBe(false);
    });

    it('should return false for strings with letters', () => {
      expect(validateTINFormat('AB-CDEFGHI')).toBe(false);
    });

    it('should return false for strings with special characters', () => {
      expect(validateTINFormat('12-345678!')).toBe(false);
    });
  });
});

describe('getTINType', () => {
  describe('EIN detection', () => {
    it('should return "EIN" for valid EIN format', () => {
      expect(getTINType('12-3456789')).toBe('EIN');
      expect(getTINType('99-9999999')).toBe('EIN');
    });

    it('should return null for invalid EIN formats', () => {
      expect(getTINType('1-3456789')).toBe(null);
      expect(getTINType('123-456789')).toBe(null);
      expect(getTINType('12-345678')).toBe(null);
    });
  });

  describe('SSN detection', () => {
    it('should return "SSN" for valid SSN format', () => {
      expect(getTINType('123-45-6789')).toBe('SSN');
      expect(getTINType('999-99-9999')).toBe('SSN');
    });

    it('should return null for invalid SSN formats', () => {
      expect(getTINType('12-345-6789')).toBe(null);
      expect(getTINType('1234-45-6789')).toBe(null);
      expect(getTINType('123-45-678')).toBe(null);
    });
  });

  describe('Edge cases', () => {
    it('should return null for empty string', () => {
      expect(getTINType('')).toBe(null);
    });

    it('should return null for strings without dashes', () => {
      expect(getTINType('123456789')).toBe(null);
    });

    it('should return null for strings with letters', () => {
      expect(getTINType('AB-CDEFGHI')).toBe(null);
    });
  });
});

describe('validateAddress', () => {
  it('should return no errors for a complete valid address', () => {
    const address = {
      streetAddress: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '90210',
    };
    expect(validateAddress(address)).toEqual([]);
  });

  it('should return errors for missing street address', () => {
    const address = {
      city: 'Anytown',
      state: 'CA',
      zipCode: '90210',
    };
    const errors = validateAddress(address);
    expect(errors).toContain('Street address is required');
  });

  it('should return errors for missing city', () => {
    const address = {
      streetAddress: '123 Main St',
      state: 'CA',
      zipCode: '90210',
    };
    const errors = validateAddress(address);
    expect(errors).toContain('City is required');
  });

  it('should return errors for invalid state code', () => {
    const address = {
      streetAddress: '123 Main St',
      city: 'Anytown',
      state: 'C',  // Only 1 character
      zipCode: '90210',
    };
    const errors = validateAddress(address);
    expect(errors).toContain('Valid state code required');
  });

  it('should return errors for lowercase state code', () => {
    const address = {
      streetAddress: '123 Main St',
      city: 'Anytown',
      state: 'ca',  // lowercase
      zipCode: '90210',
    };
    const errors = validateAddress(address);
    expect(errors).toContain('Valid state code required');
  });

  it('should return errors for invalid ZIP code', () => {
    const address = {
      streetAddress: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '9021',  // Only 4 digits
    };
    const errors = validateAddress(address);
    expect(errors).toContain('Valid ZIP code required');
  });

  it('should accept ZIP+4 format', () => {
    const address = {
      streetAddress: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '90210-1234',
    };
    expect(validateAddress(address)).toEqual([]);
  });

  it('should return multiple errors for multiple invalid fields', () => {
    const address = {
      state: 'C',
      zipCode: '9021',
    };
    const errors = validateAddress(address);
    expect(errors.length).toBeGreaterThan(1);
    expect(errors).toContain('Street address is required');
    expect(errors).toContain('City is required');
  });
});

describe('createSubmissionTemplate', () => {
  it('should create a minimal submission request template', () => {
    const transmitterId = 'T123456789';
    const softwareId = 'SOFTWARE-001';
    const formType: FormType = '1099-NEC';
    const filer: FilerInfo = {
      ein: '12-3456789',
      name: 'ABC Corporation',
      address: {
        streetAddress: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '90210',
      },
    };

    const template = createSubmissionTemplate(transmitterId, softwareId, formType, filer);

    expect(template.transmitterId).toBe(transmitterId);
    expect(template.softwareId).toBe(softwareId);
    expect(template.formType).toBe(formType);
    expect(template.submissionType).toBe('O');
    expect(template.filer).toEqual(filer);
    expect(template.payees).toEqual([]);
    expect(template.taxYear).toBe(new Date().getFullYear() - 1);
  });
});

describe('getFormAmountFields', () => {
  it('should return correct fields for 1099-NEC', () => {
    const fields = getFormAmountFields('1099-NEC');
    expect(fields).toHaveLength(1);
    expect(fields[0].key).toBe('nonemployeeCompensation');
    expect(fields[0].required).toBe(true);
  });

  it('should return correct fields for 1099-MISC', () => {
    const fields = getFormAmountFields('1099-MISC');
    expect(fields.length).toBeGreaterThan(0);
    expect(fields.some(f => f.key === 'rents')).toBe(true);
  });

  it('should return correct fields for 1099-INT', () => {
    const fields = getFormAmountFields('1099-INT');
    expect(fields.some(f => f.key === 'interestIncome')).toBe(true);
    expect(fields.some(f => f.required === true && f.key === 'interestIncome')).toBe(true);
  });

  it('should return correct fields for W-2', () => {
    const fields = getFormAmountFields('W-2');
    expect(fields.some(f => f.key === 'wagesTipsOtherComp')).toBe(true);
  });

  it('should return empty array for unknown form type', () => {
    const fields = getFormAmountFields('1099-INVALID' as FormType);
    expect(fields).toEqual([]);
  });
});
