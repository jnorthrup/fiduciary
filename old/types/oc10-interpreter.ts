// OC-10 Interpretation Tools for Administrative Process

/**
 * Parsed section from Operating Circular 10
 */
export interface OC10Section {
  sectionNumber: string;
  title: string;
  content: string;
  subsections: string[];
  citations: OC10Citation[];
  lastUpdated: string;
}

/**
 * Citation extracted from OC-10 text
 */
export interface OC10Citation {
  type: 'statute' | 'regulation' | 'circular' | 'form' | 'case';
  title: string;
  section?: string;
  subsection?: string;
  uscReference?: string; // e.g., "12 USC 411"
  url?: string;
  text?: string;
}

/**
 * Result of interpretation generation
 */
export interface InterpretationResult {
  claim: string;
  statute: string;
  interpretation: string;
  legalBasis: string;
  supportingSections: Array<{
    sectionNumber: string;
    title: string;
    relevance: string;
  }>;
  citations: Array<{
    type: string;
    title: string;
    section?: string;
    url?: string;
  }>;
  confidence: number; // 0-100
  timestamp: string;
}

/**
 * Mapping from claim to relevant OC-10 sections
 */
export interface ClaimSectionMapping {
  claim: string;
  sections: OC10Section[];
  relevanceScore: number;
  matchedKeywords: string[];
}

// In-memory OC-10 section database
const oc10Sections: OC10Section[] = [
  {
    sectionNumber: '1.0',
    title: 'Scope',
    content: 'This Operating Circular is issued by each Reserve Bank and sets forth the terms under which an entity may obtain Advances from, incur Obligations to, or pledge Collateral to a Reserve Bank.',
    subsections: [],
    citations: [
      { type: 'circular', title: 'Operating Circular No. 10', section: '1.0' },
      { type: 'statute', title: 'Federal Reserve Act', section: '13A', uscReference: '12 USC 345' }
    ],
    lastUpdated: '2023-08-28'
  },
  {
    sectionNumber: '2.1',
    title: 'Defined Terms - Borrower',
    content: 'Borrower means an entity that incurs an Obligation to the Bank.',
    subsections: [],
    citations: [],
    lastUpdated: '2023-08-28'
  },
  {
    sectionNumber: '2.1',
    title: 'Defined Terms - Collateral',
    content: 'Collateral means: (i) all the Borrower\'s rights, title, and interest in property, including accounts, chattel paper, inventory, equipment, instruments, investment property, general intangibles, documents, deposit accounts, commercial tort claims...',
    subsections: [],
    citations: [],
    lastUpdated: '2023-08-28'
  },
  {
    sectionNumber: '7.1',
    title: 'Collateral - General Requirements',
    content: 'The Borrower shall ensure that the Collateral meets the requirements as the Bank may from time to time prescribe.',
    subsections: [],
    citations: [],
    lastUpdated: '2023-08-28'
  },
  {
    sectionNumber: '7.6',
    title: 'BIC-held Collateral',
    content: 'If the Bank approves, the Borrower may pledge BIC-held Collateral subject to the following: (a) BIC-held Collateral shall be prominently identified as Pledged to the Bank and subject exclusively to the Bank\'s written instructions. (b) The Borrower shall mark its records to show that BIC-held Collateral has been pledged to the Bank.',
    subsections: [
      '(a) BIC-held Collateral shall be prominently identified as Pledged to the Bank and subject exclusively to the Bank\'s written instructions.',
      '(b) The Borrower shall mark its records to show that BIC-held Collateral has been pledged to the Bank and is subject exclusively to the Bank\'s written instructions.'
    ],
    citations: [],
    lastUpdated: '2023-08-28'
  },
  {
    sectionNumber: 'Appendix 3',
    title: 'Application Package for U.S. Borrowers',
    content: 'U.S. Borrowers desiring capacity to request to borrow funds from their local Federal Reserve Bank should submit the following documents: Form of OC-10 Letter of Agreement, Form of OC-10 Certificate, Form of OC-10 Authorizing Resolutions for Borrowers, Form of OC-10 Official Authorization List.',
    subsections: [],
    citations: [
      { type: 'form', title: 'Form of OC-10 Letter of Agreement' },
      { type: 'form', title: 'Form of OC-10 Certificate' },
      { type: 'form', title: 'Form of OC-10 Authorizing Resolutions for Borrowers' },
      { type: 'form', title: 'Form of OC-10 Official Authorization List' }
    ],
    lastUpdated: '2023-08-28'
  },
  {
    sectionNumber: 'Appendix 3',
    title: 'Form of OC-10 Official Authorization List',
    content: 'The Official Authorization List identifies those individuals who are authorized to request Advances and submit Collateral Schedules to the Reserve Banks on behalf of the Borrower.',
    subsections: [],
    citations: [],
    lastUpdated: '2023-08-28'
  }
];

/**
 * Parse OC-10 section text and extract metadata
 * @param sectionNumber The section number (e.g., "7.6", "Appendix 3")
 * @param text The text content of the section
 * @returns Parsed OC10Section with citations
 */
export function parseOCText(sectionNumber: string, text: string): OC10Section {
  // Extract title from first line or provided
  const lines = text.trim().split('\n').filter(l => l.trim());
  const title = extractTitle(sectionNumber, text);

  // Extract subsections (parenthesized or lettered)
  const subsections = extractSubsections(text);

  // Extract citations from text
  const citations = extractCitations(text);

  return {
    sectionNumber,
    title,
    content: text,
    subsections,
    citations,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Extract title from section number and text
 */
function extractTitle(sectionNumber: string, text: string): string {
  // Look for title on first line
  const firstLine = text.trim().split('\n')[0];
  if (firstLine && firstLine.length < 200) {
    return firstLine;
  }

  // Use section number as fallback
  if (sectionNumber.includes('Appendix')) {
    return `Appendix ${sectionNumber.replace('Appendix', '')} - Application Package`;
  }
  return `Section ${sectionNumber}`;
}

/**
 * Extract subsections from text
 */
function extractSubsections(text: string): string[] {
  const subsections: string[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Match patterns like "(a)", "1.", "i."
    if (/^\([a-z]+\)/.test(trimmed) || /^\d+\.\s/.test(trimmed) || /^[ivxlcdm]+\.\s/.test(trimmed)) {
      subsections.push(trimmed);
    }
  }

  return subsections;
}

/**
 * Extract citations from text
 * @param text Text to parse for citations
 * @returns Array of extracted citations
 */
export function extractCitations(text: string): OC10Citation[] {
  const citations: OC10Citation[] = [];

  // Federal Reserve Act citations - handle both:
  // "Federal Reserve Act Section 16" and "Section 16 of the Federal Reserve Act"
  const frActPattern1 = /Federal Reserve Act\s+(?:Section\s+)?(\d+(?:\.\d+)?)(?:\s*\((\d+)\s+USC\s+(\d+)\))?/gi;
  const frActPattern2 = /Section\s+(\d+(?:\.\d+)?)\s+of\s+the\s+Federal\s+Reserve\s+Act(?:\s+\((\d+)\s+USC\s+(\d+)\))?/gi;

  for (const pattern of [frActPattern1, frActPattern2]) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      citations.push({
        type: 'statute',
        title: 'Federal Reserve Act',
        section: match[1],
        uscReference: match[2] ? `${match[2]} USC ${match[3]}` : undefined,
        url: match[2] ? `https://www.federalreserve.gov/aboutthefed/section${match[1]}.htm` : undefined
      });
    }
  }

  // Operating Circular 10 citations
  const oc10Pattern = /Operating Circular\s+(?:No\.\s*)?10/gi;
  if (oc10Pattern.test(text)) {
    citations.push({
      type: 'circular',
      title: 'Operating Circular No. 10',
      url: 'https://www.frbservices.org/binaries/content/assets/crsocms/resources/rules-regulations/082823-operating-circular-10.pdf'
    });
  }

  // OC-10 Form citations
  const formPattern = /Form\s+of\s+OC-10\s+([^,\n.]+)/gi;
  let formMatch;
  while ((formMatch = formPattern.exec(text)) !== null) {
    citations.push({
      type: 'form',
      title: `Form of OC-10 ${formMatch[1].trim()}`
    });
  }

  // USC citations
  const uscPattern = /(\d+)\s+USC\s+(\d+)/g;
  let match;
  while ((match = uscPattern.exec(text)) !== null) {
    citations.push({
      type: 'statute',
      title: `U.S. Code Title ${match[1]}`,
      uscReference: `${match[1]} USC ${match[2]}`,
      url: `https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title${match[1]}&edition=prelim`
    });
  }

  return citations;
}

/**
 * Find OC-10 sections relevant to a query
 * @param query Search query
 * @returns Array of relevant sections
 */
export function findRelevantSections(query: string): OC10Section[] {
  const lowerQuery = query.toLowerCase();
  const keywords = lowerQuery.split(/\s+/).filter(k => k.length > 2);

  const results = oc10Sections.filter(section => {
    const searchableText = `${section.title} ${section.content} ${section.subsections.join(' ')}`.toLowerCase();
    return keywords.some(keyword => searchableText.includes(keyword));
  });

  // Sort by relevance (number of matching keywords)
  results.sort((a, b) => {
    const aScore = keywords.filter(k => a.title.toLowerCase().includes(k)).length;
    const bScore = keywords.filter(k => b.title.toLowerCase().includes(k)).length;
    return bScore - aScore;
  });

  return results;
}

/**
 * Map a claim to relevant OC-10 sections
 * @param claim The claim text to map
 * @returns ClaimSectionMapping with relevance score
 */
export function mapClaimToSections(claim: string): ClaimSectionMapping[] {
  const relevantSections = findRelevantSections(claim);
  const keywords = claim.toLowerCase().split(/\s+/).filter(k => k.length > 3);

  const matchedKeywords = keywords.filter(k =>
    relevantSections.some(s =>
      s.title.toLowerCase().includes(k) || s.content.toLowerCase().includes(k)
    )
  );

  const relevanceScore = matchedKeywords.length > 0
    ? Math.min(100, matchedKeywords.length * 20)
    : 0;

  return [{
    claim,
    sections: relevantSections,
    relevanceScore,
    matchedKeywords
  }];
}

/**
 * Generate interpretation of claim based on statute
 * @param claim The claim to interpret
 * @param statute The statutory basis
 * @returns InterpretationResult with legal analysis
 */
export function generateInterpretation(claim: string, statute: string): InterpretationResult {
  const sections = findRelevantSections(claim);
  const citations = extractCitations(statute);

  // Build interpretation
  const interpretation = buildInterpretation(claim, sections, citations);

  // Build legal basis
  const legalBasis = buildLegalBasis(statute, citations);

  // Extract supporting sections
  const supportingSections = sections.map(s => ({
    sectionNumber: s.sectionNumber,
    title: s.title,
    relevance: determineRelevance(claim, s)
  }));

  // Format citations for output
  const formattedCitations = citations.map(c => ({
    type: c.type,
    title: c.title,
    section: c.section,
    url: c.url
  }));

  // Calculate confidence based on keyword matches and section availability
  const confidence = calculateConfidence(claim, sections, citations);

  return {
    claim,
    statute,
    interpretation,
    legalBasis,
    supportingSections,
    citations: formattedCitations,
    confidence,
    timestamp: new Date().toISOString()
  };
}

/**
 * Build interpretation text
 */
function buildInterpretation(claim: string, sections: OC10Section[], citations: OC10Citation[]): string {
  let interpretation = `Based on the claim "${claim}", `;

  if (sections.length === 0) {
    interpretation += 'no direct OC-10 provisions were found that explicitly address this claim. ';
  } else {
    interpretation += `the following OC-10 provisions are relevant: `;
    sections.forEach((s, i) => {
      interpretation += `${s.sectionNumber} (${s.title})`;
      if (i < sections.length - 1) interpretation += ', ';
    });
    interpretation += '. ';
  }

  if (sections.some(s => s.sectionNumber.includes('Appendix 3'))) {
    interpretation += 'Appendix 3 establishes the application process for entities seeking capacity to borrow from Federal Reserve Banks. ';
  }

  if (sections.some(s => s.sectionNumber === '2.1' && s.title.includes('Borrower'))) {
    interpretation += 'OC-10 defines "Borrower" as "an entity that incurs an Obligation to the Bank," which includes depository institutions that have executed the OC-10 Letter of Agreement. ';
  }

  if (sections.some(s => s.sectionNumber === '7.6') && sections[0].title.includes('BIC')) {
    interpretation += 'Section 7.6 governs BIC-held collateral arrangements, allowing institutions to maintain custody of pledged collateral while marking it as subject to the Bank\'s exclusive instructions. ';
  }

  interpretation += 'These provisions enable institutions to obtain advances and pledge collateral to Reserve Banks under the Federal Reserve Act.';

  return interpretation;
}

/**
 * Build legal basis text
 */
function buildLegalBasis(statute: string, citations: OC10Citation[]): string {
  let basis = `Legal Basis: ${statute}`;

  if (citations.length > 0) {
    basis += '. Supporting authorities: ';
    citations.forEach((c, i) => {
      basis += c.title;
      if (c.section) basis += ` §${c.section}`;
      if (c.uscReference) basis += ` (${c.uscReference})`;
      if (i < citations.length - 1) basis += ', ';
    });
  }

  return basis;
}

/**
 * Determine relevance of a section to the claim
 */
function determineRelevance(claim: string, section: OC10Section): string {
  const lowerClaim = claim.toLowerCase();
  const lowerSection = `${section.title} ${section.content}`.toLowerCase();

  if (lowerSection.includes(lowerClaim)) {
    return 'Direct match';
  }

  const claimWords = lowerClaim.split(/\s+/);
  const matchCount = claimWords.filter(w => w.length > 4 && lowerSection.includes(w)).length;

  if (matchCount >= 2) {
    return 'Highly relevant';
  } else if (matchCount === 1) {
    return 'Potentially relevant';
  }
  return 'Background';
}

/**
 * Calculate confidence score for interpretation
 */
function calculateConfidence(claim: string, sections: OC10Section[], citations: OC10Citation[]): number {
  let confidence = 0;

  // Base confidence from section matches
  if (sections.length > 0) {
    confidence += 40;
  }

  // Additional confidence from citation matches
  if (citations.length > 0) {
    confidence += 30;
  }

  // Confidence from keyword density
  const keywords = claim.toLowerCase().split(/\s+/);
  const sectionText = sections.map(s => s.title + ' ' + s.content).join(' ').toLowerCase();
  const matchCount = keywords.filter(k => k.length > 4 && sectionText.includes(k)).length;
  confidence += Math.min(30, matchCount * 5);

  return Math.min(100, confidence);
}

/**
 * Get all OC-10 sections (for reference)
 */
export function getAllOC10Sections(): OC10Section[] {
  return [...oc10Sections];
}

/**
 * Add a custom OC-10 section to the database
 */
export function addOC10Section(section: OC10Section): void {
  oc10Sections.push(section);
}
