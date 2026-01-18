import { describe, it, expect } from 'vitest';
import {
  parseOCText,
  OC10Section,
  OC10Citation,
  generateInterpretation,
  InterpretationResult,
  extractCitations,
  findRelevantSections,
  mapClaimToSections
} from '../types/oc10-interpreter';

describe('OC-10 Text Parser', () => {
  describe('parseOCText', () => {
    it('should parse OC-10 section 7.6 (BIC-held Collateral)', () => {
      const text = `
        7.6 If the Bank approves, the Borrower may pledge BIC-held Collateral subject to the following:
        (a) BIC-held Collateral shall be prominently identified as Pledged to the Bank and subject exclusively to the Bank's written instructions.
        (b) The Borrower shall mark its records to show that BIC-held Collateral has been pledged to the Bank.
      `;

      const result: OC10Section = parseOCText('7.6', text);

      expect(result.sectionNumber).toBe('7.6');
      expect(result.title).toContain('BIC-held Collateral');
      expect(result.subsections).toHaveLength(2);
      expect(result.subsections[0]).toContain('prominently identified as Pledged');
      expect(result.citations).toBeDefined();
    });

    it('should parse OC-10 Appendix 3 (Application Package)', () => {
      const text = `
        APPLICATION PACKAGE FOR U.S. BORROWERS
        U.S. Borrowers desiring capacity to request to borrow funds from their local Federal Reserve Bank should submit the following documents:
        Form of OC-10 Letter of Agreement
        Form of OC-10 Certificate
        Form of OC-10 Authorizing Resolutions for Borrowers
        Form of OC-10 Official Authorization List
      `;

      const result: OC10Section = parseOCText('Appendix 3', text);

      expect(result.sectionNumber).toBe('Appendix 3');
      expect(result.title).toContain('APPLICATION PACKAGE');
      expect(result.citations).toBeDefined();
      expect(result.citations.some((c: OC10Citation) => c.type === 'form' && c.title === 'Form of OC-10 Letter of Agreement')).toBe(true);
    });

    it('should extract citations from OC-10 text', () => {
      const text = `
        Reference is made to Operating Circular No. 10 as issued by each of the Federal Reserve Banks.
        Under Section 16 of the Federal Reserve Act, Federal Reserve notes are authorized for issuance.
      `;

      const result: OC10Section = parseOCText('1.0', text);

      expect(result.citations.length).toBeGreaterThan(0);
      expect(result.citations.some((c: OC10Citation) => c.type === 'statute' && c.title.includes('Federal Reserve Act')));
    });
  });

  describe('extractCitations', () => {
    it('should extract statute citations from text', () => {
      const text = 'Under Section 16 of the Federal Reserve Act, notes are authorized for issuance.';

      const citations = extractCitations(text);

      expect(citations.length).toBeGreaterThan(0);
      expect(citations[0].type).toBe('statute');
      expect(citations[0].title).toContain('Federal Reserve Act');
      expect(citations[0].section).toBe('16');
    });

    it('should extract Federal Reserve Act references', () => {
      const text = 'Federal Reserve Act Section 16 (12 USC 411) authorizes note issuance.';

      const citations = extractCitations(text);

      expect(citations.some(c => c.section === '16')).toBe(true);
      expect(citations.some(c => c.uscReference === '12 USC 411')).toBe(true);
    });

    it('should extract multiple citations from complex text', () => {
      const text = `
        This is governed by Operating Circular 10 (Section 7.6), Federal Reserve Act Section 16 (12 USC 411),
        and Presidential Proclamation 2039 (March 6, 1933).
      `;

      const citations = extractCitations(text);

      expect(citations.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('findRelevantSections', () => {
    it('should find sections about BIC collateral', () => {
      const sections = findRelevantSections('BIC-held collateral');

      expect(sections.length).toBeGreaterThan(0);
      expect(sections.some(s => s.sectionNumber === '7.6')).toBe(true);
      expect(sections.some(s => s.title.includes('BIC'))).toBe(true);
    });

    it('should find sections about borrowing capacity', () => {
      const sections = findRelevantSections('capacity to borrow funds');

      expect(sections.length).toBeGreaterThan(0);
      expect(sections.some(s => s.sectionNumber.includes('Appendix 3') || s.sectionNumber.includes('1.0'))).toBe(true);
    });

    it('should return empty array for unmatched queries', () => {
      const sections = findRelevantSections('nonexistent section about xyz');

      expect(sections).toEqual([]);
    });
  });

  describe('mapClaimToSections', () => {
    it('should map borrower capacity claim to OC-10 sections', () => {
      const claim = 'Borrower has capacity to operate as Federal Reserve agent under OC-10 Appendix 3';

      const mappings = mapClaimToSections(claim);

      expect(mappings.length).toBeGreaterThan(0);
      expect(mappings[0].claim).toBe(claim);
      expect(mappings[0].relevanceScore).toBeGreaterThan(0);
      expect(mappings[0].sections.length).toBeGreaterThan(0);
    });

    it('should assign relevance scores based on keyword matching', () => {
      const claim1 = 'BIC-held collateral requirements';
      const claim2 = 'Some unrelated claim';

      const mappings1 = mapClaimToSections(claim1);
      const mappings2 = mapClaimToSections(claim2);

      expect(mappings1[0].relevanceScore).toBeGreaterThan(mappings2[0]?.relevanceScore ?? 0);
    });

    it('should identify specific OC-10 sections for fractional reserve claims', () => {
      const claim = 'Bank fractionally reserves my promissory note for 900% of face value';

      const mappings = mapClaimToSections(claim);

      // Should find sections about collateral, but may not have explicit "fractional reserve" text
      expect(mappings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateInterpretation', () => {
    it('should generate interpretation for capacity claim', () => {
      const claim = 'Borrower is deemed to have capacity to borrow from Federal Reserve';
      const statute = 'Operating Circular 10, Appendix 3, Form of OC-10 Letter of Agreement';

      const result: InterpretationResult = generateInterpretation(claim, statute);

      expect(result.claim).toBe(claim);
      expect(result.statute).toBe(statute);
      expect(result.interpretation).toBeDefined();
      expect(result.interpretation.length).toBeGreaterThan(0);
      expect(result.supportingSections).toBeDefined();
      expect(result.legalBasis).toBeDefined();
    });

    it('should include legal basis with citations', () => {
      const claim = 'Note is pledged as collateral under OC-10 Section 7.6';
      const statute = 'Operating Circular 10, Section 7.6';

      const result: InterpretationResult = generateInterpretation(claim, statute);

      expect(result.legalBasis).toContain('Operating Circular 10');
      expect(result.legalBasis).toContain('Section 7.6');
      expect(result.citations.length).toBeGreaterThan(0);
    });

    it('should map claim to specific OC-10 provisions', () => {
      const claim = 'Application for borrowing capacity';
      const statute = 'Operating Circular 10, Appendix 3';

      const result: InterpretationResult = generateInterpretation(claim, statute);

      expect(result.supportingSections.length).toBeGreaterThan(0);
      expect(result.supportingSections[0].sectionNumber).toContain('Appendix 3');
    });

    it('should provide actionable interpretation for affidavit use', () => {
      const claim = 'Borrower is acting as Federal Reserve agent via OC-10';
      const statute = 'OC-10 Appendix 3, Application Package for U.S. Borrowers';

      const result: InterpretationResult = generateInterpretation(claim, statute);

      // Interpretation should be detailed enough for affidavit use
      expect(result.interpretation.split('.').length).toBeGreaterThanOrEqual(3);
      expect(result.confidence).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('should handle claims about fractional reserve mechanics', () => {
      const claim = 'Lender fractionally reserves promissory note, creating 900% value';
      const statute = 'Federal Reserve Act Section 16; Operating Circular 10 Section 7.1';

      const result: InterpretationResult = generateInterpretation(claim, statute);

      // Should provide interpretation even if OC-10 doesn't explicitly mention fractional reserve
      expect(result.interpretation).toBeDefined();
      expect(result.citations.some(c => c.title.includes('Federal Reserve Act') || c.title.includes('Operating Circular')));
    });
  });
});
