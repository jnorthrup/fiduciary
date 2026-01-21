import { describe, it, expect } from 'vitest';
import {
  StatuteCitation,
  CaseCitation,
  Citation,
  CitationDatabase,
  addCitation,
  getCitation,
  searchCitations,
  formatCitationMLA,
  formatCitationBluebook,
  formatCitationPlain
} from '../types/citation-database';

describe('Citation Database', () => {
  describe('StatuteCitation storage and retrieval', () => {
    it('should store and retrieve a statute citation', () => {
      const citation: StatuteCitation = {
        type: 'statute',
        title: 'Operating Circular No. 10',
        url: 'https://www.frbservices.org/binaries/content/assets/crsocms/resources/rules-regulations/082823-operating-circular-10.pdf',
        section: 'Appendix 3',
        textSnippet: 'Borrower Desiring capacity to request to borrow funds'
      };

      const id = addCitation(citation);
      const retrieved = getCitation(id) as StatuteCitation;

      expect(retrieved).toBeDefined();
      expect(retrieved.type).toBe('statute');
      expect(retrieved.title).toBe('Operating Circular No. 10');
      expect(retrieved.section).toBe('Appendix 3');
    });

    it('should validate statute URL format', () => {
      const validUrls = [
        'https://www.frbservices.org/binaries/content/assets/crsocms/resources/rules-regulations/082823-operating-circular-10.pdf',
        'https://www.law.cornell.edu/uscode/text/12/411',
        'https://www.govinfo.gov/content/pkg/STATUTE-77/pdf/STATUTE-77-Pg51.pdf'
      ];

      validUrls.forEach(url => {
        const citation: StatuteCitation = {
          type: 'statute',
          title: 'Test Statute',
          url,
          section: '1'
        };

        const id = addCitation(citation);
        const retrieved = getCitation(id) as StatuteCitation;
        expect(retrieved.url).toBe(url);
      });
    });

    it('should search statutes by title', () => {
      const citation: StatuteCitation = {
        type: 'statute',
        title: 'Federal Reserve Act Section 16',
        url: 'https://www.federalreserve.gov/aboutthefed/section16.htm',
        section: 'Paragraph 2',
        textSnippet: 'Any Federal Reserve bank may make application'
      };

      addCitation(citation);
      const results = searchCitations('Federal Reserve Act');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain('Federal Reserve Act');
    });
  });

  describe('CaseCitation storage and retrieval', () => {
    it('should store and retrieve a case citation', () => {
      const citation: CaseCitation = {
        type: 'case',
        title: 'Test v. Defendant',
        court: 'Supreme Court',
        year: 2024,
        docket: '123-45',
        holding: 'Test holding text',
        url: 'https://example.com/case/123-45'
      };

      const id = addCitation(citation);
      const retrieved = getCitation(id) as CaseCitation;

      expect(retrieved).toBeDefined();
      expect(retrieved.type).toBe('case');
      expect(retrieved.court).toBe('Supreme Court');
      expect(retrieved.year).toBe(2024);
      expect(retrieved.docket).toBe('123-45');
    });

    it('should support parallel citations', () => {
      const citation: CaseCitation = {
        type: 'case',
        title: 'Test v. Defendant',
        court: 'Supreme Court',
        year: 2024,
        docket: '123-45',
        holding: 'Test holding',
        url: 'https://example.com/case/123-45',
        parallelCitation: '456 F.3d 789'
      };

      const id = addCitation(citation);
      const retrieved = getCitation(id) as CaseCitation;

      expect(retrieved.parallelCitation).toBe('456 F.3d 789');
    });

    it('should search cases by court', () => {
      const citation: CaseCitation = {
        type: 'case',
        title: 'Test v. Defendant',
        court: 'Ninth Circuit Court of Appeals',
        year: 2024,
        docket: '123-45',
        holding: 'Test holding'
      };

      addCitation(citation);
      const results = searchCitations('Ninth Circuit');

      expect(results.length).toBeGreaterThan(0);
      const caseResult = results[0] as CaseCitation;
      expect(caseResult.court).toContain('Ninth Circuit');
    });
  });

  describe('Citation formatting', () => {
    it('should format statute in MLA style', () => {
      const citation: StatuteCitation = {
        type: 'statute',
        title: 'Operating Circular No. 10',
        url: 'https://www.frbservices.org/binaries/content/assets/crsocms/resources/rules-regulations/082823-operating-circular-10.pdf',
        section: 'Appendix 3',
        subsection: '(a)'
      };

      const formatted = formatCitationMLA(citation);
      expect(formatted).toContain('Operating Circular No. 10');
      expect(formatted).toContain('Appendix 3');
    });

    it('should format case in Bluebook style', () => {
      const citation: CaseCitation = {
        type: 'case',
        title: 'Test v. Defendant',
        court: 'Supreme Court',
        year: 2024,
        docket: '123-45',
        holding: 'Test holding',
        parallelCitation: '456 F.3d 789'
      };

      const formatted = formatCitationBluebook(citation);
      expect(formatted).toContain('Test v. Defendant');
      expect(formatted).toContain('456 F.3d 789');
    });

    it('should format citation in plain text', () => {
      const citation: StatuteCitation = {
        type: 'statute',
        title: 'Federal Reserve Act Section 16',
        url: 'https://www.federalreserve.gov/aboutthefed/section16.htm',
        section: 'Paragraph 2'
      };

      const formatted = formatCitationPlain(citation);
      expect(formatted).toContain('Federal Reserve Act Section 16');
      expect(formatted).toContain('Paragraph 2');
    });
  });

  describe('CitationDatabase interface', () => {
    it('should track all citations', () => {
      const db: CitationDatabase = {
        statutes: [
          {
            type: 'statute',
            title: 'Operating Circular No. 10',
            url: 'https://www.frbservices.org/binaries/content/assets/crsocms/resources/rules-regulations/082823-operating-circular-10.pdf',
            section: 'Appendix 3'
          }
        ],
        cases: [
          {
            type: 'case',
            title: 'Test v. Defendant',
            court: 'Supreme Court',
            year: 2024,
            docket: '123-45',
            holding: 'Test holding'
          }
        ]
      };

      expect(db.statutes).toHaveLength(1);
      expect(db.cases).toHaveLength(1);
    });
  });
});
