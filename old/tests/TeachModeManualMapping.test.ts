
import { describe, it, expect, vi } from 'vitest';
import { validateManualMapping, ManualMappingSchema } from '../services/teachModeService';

describe('Teach Mode Manual Mapping Data Structure', () => {
    it('should validate a correct manual mapping schema', () => {
        const validMapping = {
            formId: '1099-NEC',
            fields: [
                {
                    fieldId: 'tcc_code',
                    label: 'Transmitter Control Code (TCC)',
                    description: 'The 5-character alphanumeric code assigned by the IRS.',
                    taxonomyPath: ['Preparation', 'Filer Requirements', 'TCC'],
                    validationRules: ['regex:^[0-9A-Z]{5}$'],
                    examples: {
                        valid: ['12345', 'ABCDE', '1A2B3'],
                        invalid: ['1234', '123456', 'abcde'] // Lowercase invalid
                    },
                    instructionRef: 'p1-gen-instr'
                }
            ],
            taxonomy: {
                'Preparation': {
                    'Filer Requirements': ['TCC', 'EIN', 'Legal Name']
                }
            }
        };

        const result = validateManualMapping(validMapping);
        expect(result.valid).toBe(true);
    });

    it('should reject a mapping with missing required fields', () => {
        const invalidMapping = {
            formId: '1099-NEC',
            fields: [
                {
                    fieldId: 'tcc_code',
                    // Missing 'label' and 'description'
                    taxonomyPath: ['Preparation', 'Filer Requirements', 'TCC']
                }
            ],
            taxonomy: {} // Added to satisfy basic type for this test
        };

        const result = validateManualMapping(invalidMapping);
        expect(result.valid).toBe(false);
        // We look for partial match because Zod errors can be verbose
        expect(result.errors.some(e => e.includes('label'))).toBe(true);
    });

    it('should reject invalid taxonomy paths', () => {
        const invalidPathMapping = {
            formId: '1099-NEC',
            fields: [
                {
                    fieldId: 'tcc_code',
                    label: 'TCC',
                    description: 'TCC Code',
                    taxonomyPath: ['Invalid', 'Path', 'Item'], // 'Invalid' not in taxonomy def
                    validationRules: [],
                    examples: { valid: [], invalid: [] },
                    instructionRef: 'ref'
                }
            ],
            taxonomy: {
                'Preparation': { 'Sub': ['Item'] }
            }
        };

        const result = validateManualMapping(invalidPathMapping);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid taxonomy path: Invalid > Path > Item');
    });
});
