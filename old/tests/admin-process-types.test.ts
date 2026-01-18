import { describe, it, expect } from 'vitest';
import {
  Affidavit,
  Claim,
  Affiant,
  NotarySection,
  StatuteCitation,
  CaseCitation,
  validateAffidavit,
  validateClaim
} from '../types/admin-process';

describe('Affidavit Type', () => {
  describe('Affiant interface', () => {
    it('should validate a complete affiant', () => {
      const affiant: Affiant = {
        name: 'John Doe',
        entityType: 'Individual',
        address: {
          street: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zip: '62701'
        },
        capacity: 'Trustee of the XYZ Trust'
      };

      expect(affiant.name).toBe('John Doe');
      expect(affiant.entityType).toBe('Individual');
      expect(affiant.capacity).toBe('Trustee of the XYZ Trust');
    });

    it('should require affiant name', () => {
      const invalidAffiant = {
        entityType: 'Individual',
        address: {
          street: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zip: '62701'
        }
      };

      const result = validateAffidavit({ affiant: invalidAffiant } as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('name'))).toBe(true);
    });

    it('should require affiant address', () => {
      const invalidAffiant: Partial<Affiant> = {
        name: 'John Doe',
        entityType: 'Individual'
      };

      const result = validateAffidavit({ affiant: invalidAffiant } as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('address'))).toBe(true);
    });
  });

  describe('Claim interface', () => {
    it('should validate a complete claim with statutory citations', () => {
      const claim: Claim = {
        id: 'claim-001',
        description: 'Under OC-10, borrower is deemed to have capacity to operate as a Federal Reserve agent',
        legalBasis: 'Operating Circular 10, Appendix 3, Section 7',
        supportingCitations: [
          {
            type: 'statute',
            title: 'Operating Circular No. 10',
            url: 'https://www.frbservices.org/binaries/content/assets/crsocms/resources/rules-regulations/082823-operating-circular-10.pdf',
            section: 'Appendix 3',
            textSnippet: 'Borrower Desiring capacity to request to borrow funds from their local Federal Reserve Bank'
          }
        ],
        timestamp: '2026-01-14T00:00:00Z'
      };

      expect(claim.id).toBe('claim-001');
      expect(claim.supportingCitations).toHaveLength(1);
      expect(claim.supportingCitations[0].type).toBe('statute');
    });

    it('should require claim description', () => {
      const invalidClaim: Partial<Claim> = {
        id: 'claim-002',
        legalBasis: 'OC-10',
        supportingCitations: []
      };

      const result = validateClaim(invalidClaim as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('description'))).toBe(true);
    });

    it('should require legal basis for claim', () => {
      const invalidClaim = {
        id: 'claim-003',
        description: 'Some claim',
        supportingCitations: []
      };

      const result = validateClaim(invalidClaim as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('legalBasis'))).toBe(true);
    });

    it('should accept multiple supporting citations', () => {
      const claim: Claim = {
        id: 'claim-004',
        description: 'Multiple statutory authorities support this position',
        legalBasis: 'Operating Circular 10, Federal Reserve Act §16',
        supportingCitations: [
          {
            type: 'statute',
            title: 'Operating Circular No. 10',
            url: 'https://www.frbservices.org/binaries/content/assets/crsocms/resources/rules-regulations/082823-operating-circular-10.pdf',
            section: 'Appendix 3'
          },
          {
            type: 'statute',
            title: 'Federal Reserve Act Section 16',
            url: 'https://www.federalreserve.gov/aboutthefed/section16.htm',
            section: 'Paragraph 2'
          },
          {
            type: 'case',
            title: 'Test Case',
            court: 'Supreme Court',
            year: 2024,
            docket: '123-45',
            holding: 'Test holding'
          }
        ],
        timestamp: '2026-01-14T00:00:00Z'
      };

      expect(claim.supportingCitations).toHaveLength(3);
      expect(claim.supportingCitations[2].type).toBe('case');
    });
  });

  describe('NotarySection interface', () => {
    it('should validate a complete notary section', () => {
      const notary: NotarySection = {
        commissionNumber: '123456',
        commissionExpires: '2028-12-31',
        notaryName: 'Jane Smith',
        notarySignature: 'signature_placeholder',
        sealPresent: true,
        notarizationDate: '2026-01-14'
      };

      expect(notary.commissionNumber).toBe('123456');
      expect(notary.sealPresent).toBe(true);
    });

    it('should require notary commission number', () => {
      const invalidNotary: Partial<NotarySection> = {
        commissionExpires: '2028-12-31',
        notaryName: 'Jane Smith'
      };

      const result = validateAffidavit({
        affiant: { name: 'John Doe', entityType: 'Individual', address: { street: '123 Main St', city: 'Springfield', state: 'IL', zip: '62701' } },
        claims: [],
        notary: invalidNotary as NotarySection,
        timestamp: '2026-01-14T00:00:00Z'
      } as any);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('commissionNumber'))).toBe(true);
    });
  });

  describe('Complete Affidavit validation', () => {
    it('should validate a complete affidavit with all required fields', () => {
      const affidavit: Affidavit = {
        id: 'affidavit-001',
        title: 'Affidavit of OC-10 Capacity',
        affiant: {
          name: 'John Doe',
          entityType: 'Individual',
          address: {
            street: '123 Main St',
            city: 'Springfield',
            state: 'IL',
            zip: '62701'
          },
          capacity: 'Trustee of the XYZ Trust'
        },
        claims: [
          {
            id: 'claim-001',
            description: 'Under OC-10, borrower is deemed to have capacity',
            legalBasis: 'Operating Circular 10, Appendix 3',
            supportingCitations: [
              {
                type: 'statute',
                title: 'Operating Circular No. 10',
                url: 'https://www.frbservices.org/binaries/content/assets/crsocms/resources/rules-regulations/082823-operating-circular-10.pdf',
                section: 'Appendix 3'
              }
            ],
            timestamp: '2026-01-14T00:00:00Z'
          }
        ],
        notary: {
          commissionNumber: '123456',
          commissionExpires: '2028-12-31',
          notaryName: 'Jane Smith',
          notarySignature: 'signature_placeholder',
          sealPresent: true,
          notarizationDate: '2026-01-14'
        },
        timestamp: '2026-01-14T00:00:00Z',
        version: 1
      };

      const result = validateAffidavit(affidavit);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject affidavit without affiant', () => {
      const invalidAffidavit = {
        id: 'affidavit-002',
        title: 'Invalid Affidavit',
        claims: [],
        timestamp: '2026-01-14T00:00:00Z',
        version: 1
      };

      const result = validateAffidavit(invalidAffidavit as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('affiant'))).toBe(true);
    });

    it('should reject affidavit without at least one claim', () => {
      const invalidAffidavit = {
        id: 'affidavit-003',
        title: 'Empty Affidavit',
        affiant: {
          name: 'John Doe',
          entityType: 'Individual',
          address: {
            street: '123 Main St',
            city: 'Springfield',
            state: 'IL',
            zip: '62701'
          }
        },
        claims: [],
        timestamp: '2026-01-14T00:00:00Z',
        version: 1
      };

      const result = validateAffidavit(invalidAffidavit as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('claim'))).toBe(true);
    });

    it('should require timestamp', () => {
      const invalidAffidavit = {
        id: 'affidavit-004',
        title: 'Untimed Affidavit',
        affiant: {
          name: 'John Doe',
          entityType: 'Individual',
          address: {
            street: '123 Main St',
            city: 'Springfield',
            state: 'IL',
            zip: '62701'
          }
        },
        claims: [
          {
            id: 'claim-001',
            description: 'Test claim',
            legalBasis: 'Test basis',
            supportingCitations: [],
            timestamp: '2026-01-14T00:00:00Z'
          }
        ],
        version: 1
      };

      const result = validateAffidavit(invalidAffidavit as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('timestamp'))).toBe(true);
    });
  });

  describe('Citation types', () => {
    it('should validate StatuteCitation with all fields', () => {
      const statute: StatuteCitation = {
        type: 'statute',
        title: 'Operating Circular No. 10',
        url: 'https://www.frbservices.org/binaries/content/assets/crsocms/resources/rules-regulations/082823-operating-circular-10.pdf',
        section: 'Appendix 3',
        textSnippet: 'Borrower Desiring capacity to request to borrow funds'
      };

      expect(statute.type).toBe('statute');
      expect(statute.section).toBe('Appendix 3');
    });

    it('should validate CaseCitation with all fields', () => {
      const caseCitation: CaseCitation = {
        type: 'case',
        title: 'Test v. Defendant',
        court: 'Supreme Court',
        year: 2024,
        docket: '123-45',
        holding: 'Test holding text',
        url: 'https://example.com/case/123-45'
      };

      expect(caseCitation.type).toBe('case');
      expect(caseCitation.court).toBe('Supreme Court');
    });

    it('should require statute URL', () => {
      const invalidStatute = {
        type: 'statute',
        title: 'Operating Circular No. 10',
        section: 'Appendix 3'
      };

      const claimWithInvalidCitation: Claim = {
        id: 'claim-005',
        description: 'Test',
        legalBasis: 'Test',
        supportingCitations: [invalidStatute as any],
        timestamp: '2026-01-14T00:00:00Z'
      };

      const result = validateClaim(claimWithInvalidCitation);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('url'))).toBe(true);
    });

    it('should require case court and year', () => {
      const invalidCase = {
        type: 'case',
        title: 'Test Case'
      };

      const claimWithInvalidCitation: Claim = {
        id: 'claim-006',
        description: 'Test',
        legalBasis: 'Test',
        supportingCitations: [invalidCase as any],
        timestamp: '2026-01-14T00:00:00Z'
      };

      const result = validateClaim(claimWithInvalidCitation);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('court')) || result.errors.some(e => e.includes('year'))).toBe(true);
    });
  });
});
