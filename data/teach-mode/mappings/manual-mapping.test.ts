/**
 * Manual Mapping Data Structure Tests
 *
 * Tests for validating manual annotation JSON files for IRS 1099 forms.
 */

import { describe, it, expect } from 'vitest';
import i1099necMapping from './i1099nec.json';
import i1099miscMapping from './i1099misc.json';
import crossReferences from './cross-references.json';

describe('Manual Mapping Schema Validation', () => {
  describe('1099-NEC Mapping Structure', () => {
    it('should have valid top-level structure', () => {
      expect(i1099necMapping).toHaveProperty('formId');
      expect(i1099necMapping).toHaveProperty('formName');
      expect(i1099necMapping).toHaveProperty('lastUpdated');
      expect(i1099necMapping).toHaveProperty('fields');
      expect(i1099necMapping).toHaveProperty('crossReferences');
      expect(i1099necMapping).toHaveProperty('taxonomy');
    });

    it('should have formId matching file', () => {
      expect(i1099necMapping.formId).toBe('i1099nec');
    });
  });

  describe('1099-MISC Mapping Structure', () => {
    it('should have valid top-level structure', () => {
      expect(i1099miscMapping).toHaveProperty('formId');
      expect(i1099miscMapping).toHaveProperty('formName');
      expect(i1099miscMapping).toHaveProperty('lastUpdated');
      expect(i1099miscMapping).toHaveProperty('fields');
      expect(i1099miscMapping).toHaveProperty('crossReferences');
      expect(i1099miscMapping).toHaveProperty('taxonomy');
    });

    it('should have formId matching file', () => {
      expect(i1099miscMapping.formId).toBe('i1099misc');
    });
  });

  describe('Cross-References Mapping Structure', () => {
    it('should have valid structure', () => {
      expect(crossReferences).toHaveProperty('lastUpdated');
      expect(crossReferences).toHaveProperty('description');
      expect(crossReferences).toHaveProperty('crossReferences');
      expect(crossReferences).toHaveProperty('relatedDocuments');
    });
  });
});

describe('Field Mapping Validation', () => {
  describe('1099-NEC Fields', () => {
    it('should have tcc_format field with all required properties', () => {
      const field = i1099necMapping.fields.tcc_format;

      expect(field).toBeDefined();
      expect(field).toHaveProperty('fieldId', 'tcc_format');
      expect(field).toHaveProperty('label');
      expect(field).toHaveProperty('description');
      expect(field).toHaveProperty('taxonomyPath');
      expect(field).toHaveProperty('pdfReference');
      expect(field).toHaveProperty('validationRules');
      expect(field).toHaveProperty('examples');
    });

    it('should have ein_format field with threshold-based examples', () => {
      const field = i1099necMapping.fields.ein_format;

      expect(field).toBeDefined();
      expect(field.fieldId).toBe('ein_format');
      expect(field.taxonomyPath).toContain('TIN Format');
      expect(field.examples.valid).toBeInstanceOf(Array);
      expect(field.examples.invalid).toBeInstanceOf(Array);
    });

    it('should have payment_amount_threshold with min value', () => {
      const field = i1099necMapping.fields.payment_amount_threshold;

      expect(field).toBeDefined();
      expect(field.thresholds).toBeDefined();
      expect(field.thresholds.min).toBe(600);
      expect(field.thresholds.description).toContain('$600');
    });

    it('should have payee_count_limit field', () => {
      const field = i1099necMapping.fields.payee_count_limit;

      expect(field).toBeDefined();
      expect(field.fieldId).toBe('payee_count_limit');
      expect(field.taxonomyPath).toContain('Filer Requirements');
    });
  });

  describe('1099-MISC Fields', () => {
    it('should have rent_threshold field', () => {
      const field = i1099miscMapping.fields.rent_threshold;

      expect(field).toBeDefined();
      expect(field.fieldId).toBe('rent_threshold');
      expect(field.thresholds.min).toBe(600);
    });

    it('should have royalty_threshold with $10 minimum', () => {
      const field = i1099miscMapping.fields.royalty_threshold;

      expect(field).toBeDefined();
      expect(field.fieldId).toBe('royalty_threshold');
      expect(field.thresholds.min).toBe(10);
      expect(field.thresholds.min).toBeLessThan(i1099miscMapping.fields.rent_threshold.thresholds.min);
    });

    it('should have backup_withholding with rate property', () => {
      const field = i1099miscMapping.fields.backup_withholding;

      expect(field).toBeDefined();
      expect(field.fieldId).toBe('backup_withholding');
      expect(field.rate).toBe(24);
    });

    it('should have box7_requirements field', () => {
      const field = i1099miscMapping.fields.box7_requirements;

      expect(field).toBeDefined();
      expect(field.fieldId).toBe('box7_requirements');
      expect(field.taxonomyPath).toContain('Box Requirements');
    });
  });
});

describe('Example Data Format', () => {
  it('should have valid examples for TCC format', () => {
    const field = i1099necMapping.fields.tcc_format;
    const tccPattern = /^[A-Z0-9]{2}-[A-Z0-9]{7}$/;

    field.examples.valid.forEach((example: string) => {
      expect(example).toMatch(tccPattern);
    });

    field.examples.invalid.forEach((example: string) => {
      expect(example).not.toMatch(tccPattern);
    });
  });

  it('should have valid examples for EIN format', () => {
    const field = i1099necMapping.fields.ein_format;
    const einPattern = /^\d{2}-\d{7}$/;

    field.examples.valid.forEach((example: string) => {
      expect(example).toMatch(einPattern);
    });

    field.examples.invalid.forEach((example: string) => {
      expect(example).not.toMatch(einPattern);
    });
  });

  it('should have threshold examples that meet minimum', () => {
    const necField = i1099necMapping.fields.payment_amount_threshold;
    const miscField = i1099miscMapping.fields.rent_threshold;

    necField.examples.valid.forEach((example: string) => {
      expect(Number(example)).toBeGreaterThanOrEqual(600);
    });

    miscField.examples.valid.forEach((example: string) => {
      expect(Number(example)).toBeGreaterThanOrEqual(600);
    });
  });
});

describe('Taxonomy Path Resolution', () => {
  it('should resolve TCC format to correct taxonomy path', () => {
    const field = i1099necMapping.fields.tcc_format;

    expect(field.taxonomyPath).toEqual([
      'Preparation',
      'TIN Format',
      'TCC Format'
    ]);
  });

  it('should have consistent taxonomy structure across forms', () => {
    const necTaxonomy = i1099necMapping.taxonomy;
    const miscTaxonomy = i1099miscMapping.taxonomy;

    expect(necTaxonomy.process).toHaveProperty('Preparation');
    expect(necTaxonomy.process).toHaveProperty('Validation');
    expect(necTaxonomy.process).toHaveProperty('Submission');

    expect(miscTaxonomy.process).toHaveProperty('Preparation');
    expect(miscTaxonomy.process).toHaveProperty('Validation');
    expect(miscTaxonomy.process).toHaveProperty('Submission');
  });
});

describe('Cross-Reference Resolution', () => {
  it('should link 1099-NEC to 1099-MISC', () => {
    const xref = i1099necMapping.crossReferences.related_forms;

    expect(xref).toHaveProperty('i1099misc');
    expect(xref.i1099misc).toContain('1099-MISC');
  });

  it('should link 1099-MISC to 1099-NEC', () => {
    const xref = i1099miscMapping.crossReferences.related_forms;

    expect(xref).toHaveProperty('i1099nec');
    expect(xref.i1099nec).toContain('1099-NEC');
  });

  it('should link both forms to general instructions', () => {
    const necXref = i1099necMapping.crossReferences.general_instructions;
    const miscXref = i1099miscMapping.crossReferences.general_instructions;

    expect(necXref.target).toBe('i1099gi.pdf');
    expect(miscXref.target).toBe('i1099gi.pdf');
  });

  it('should have cross-reference mappings with relationships', () => {
    const xrefs = crossReferences.crossReferences;

    expect(xrefs).toHaveProperty('i1099nec_to_i1099misc');
    expect(xrefs).toHaveProperty('i1099misc_to_i1099nec');
    expect(xrefs).toHaveProperty('to_general_instructions');

    expect(xrefs.i1099nec_to_i1099misc.relationships).toBeInstanceOf(Array);
    expect(xrefs.i1099nec_to_i1099misc.relationships.length).toBeGreaterThan(0);
  });
});

describe('PDF Link Format Validation', () => {
  it('should use valid PDF reference format', () => {
    const pdfRefPattern = /^[a-z0-9]+\.pdf#p\d+(s\d+)?(p\d+)?$/;

    Object.values(i1099necMapping.fields).forEach((field: any) => {
      expect(field.pdfReference).toMatch(pdfRefPattern);
    });
  });

  it('should parse PDF links correctly', () => {
    const field = i1099necMapping.fields.tcc_format;
    const parts = field.pdfReference.split('#')[1].split('.');

    expect(parts[0]).toMatch(/^p\d+$/); // page
  });
});

describe('Circular Reference Detection', () => {
  it('should not have circular references between 1099-NEC and 1099-MISC', () => {
    const visited = new Set<string>();
    const detectCycle = (formId: string, path: string[]): boolean => {
      if (path.includes(formId)) {
        return true;
      }
      if (visited.has(formId)) {
        return false;
      }
      visited.add(formId);

      // Check cross-references
      const mapping = formId === 'i1099nec' ? i1099necMapping : i1099miscMapping;
      const related = mapping.crossReferences.related_forms;

      for (const [refId] of Object.entries(related)) {
        if (detectCycle(refId, [...path, formId])) {
          return true;
        }
      }
      return false;
    };

    expect(detectCycle('i1099nec', [])).toBe(false);
  });
});
