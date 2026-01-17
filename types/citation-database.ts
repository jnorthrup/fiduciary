// Citation Database and Lookup Service for Administrative Process

/**
 * In-memory citation database
 */
export interface CitationDatabase {
  statutes: StatuteCitation[];
  cases: CaseCitation[];
}

/**
 * Re-export citation types
 */
export interface StatuteCitation {
  type: 'statute';
  title: string;
  url: string;
  section?: string;
  subsection?: string;
  paragraph?: string;
  textSnippet?: string;
}

export interface CaseCitation {
  type: 'case';
  title: string;
  court: string;
  year: number;
  docket: string;
  holding?: string;
  url?: string;
  parallelCitation?: string;
}

export type Citation = StatuteCitation | CaseCitation;

// In-memory storage
const database: CitationDatabase = {
  statutes: [],
  cases: []
};

/**
 * Add a citation to the database
 */
export function addCitation(citation: Citation): string {
  const id = `${citation.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  if (citation.type === 'statute') {
    database.statutes.push({ ...citation, id } as any);
  } else {
    database.cases.push({ ...citation, id } as any);
  }

  return id;
}

/**
 * Get a citation by ID
 */
export function getCitation(id: string): Citation | null {
  const statute = database.statutes.find((s: any) => s.id === id);
  if (statute) return statute;

  const caseCit = database.cases.find((c: any) => c.id === id);
  if (caseCit) return caseCit;

  return null;
}

/**
 * Search citations by query string
 */
export function searchCitations(query: string): Citation[] {
  const lowerQuery = query.toLowerCase();

  const statuteResults = database.statutes.filter(
    (s: any) =>
      s.title.toLowerCase().includes(lowerQuery) ||
      s.section?.toLowerCase().includes(lowerQuery) ||
      s.textSnippet?.toLowerCase().includes(lowerQuery)
  );

  const caseResults = database.cases.filter(
    (c: any) =>
      c.title.toLowerCase().includes(lowerQuery) ||
      c.court.toLowerCase().includes(lowerQuery) ||
      c.holding?.toLowerCase().includes(lowerQuery)
  );

  return [...statuteResults, ...caseResults];
}

/**
 * Format statute citation in MLA style
 * Format: Title. Section, Publisher, URL.
 */
export function formatCitationMLA(citation: StatuteCitation): string {
  let formatted = citation.title;

  if (citation.section) {
    formatted += `, ${citation.section}`;
    if (citation.subsection) {
      formatted += citation.subsection;
    }
  }

  if (citation.paragraph) {
    formatted += `, ${citation.paragraph}`;
  }

  // Extract publisher from URL
  let publisher = 'Publisher';
  if (citation.url.includes('federalreserve')) {
    publisher = 'Federal Reserve Board';
  } else if (citation.url.includes('govinfo')) {
    publisher = 'Government Publishing Office';
  } else if (citation.url.includes('cornell')) {
    publisher = 'Legal Information Institute';
  }

  formatted += `. ${publisher}, ${citation.url}.`;

  return formatted;
}

/**
 * Format case citation in Bluebook style
 * Format: CaseName, Volume Reporter Page (Court Year).
 */
export function formatCitationBluebook(citation: CaseCitation): string {
  let formatted = citation.title;

  if (citation.parallelCitation) {
    formatted += `, ${citation.parallelCitation}`;
  }

  // Format court and year
  const courtAbbr = abbreviateCourt(citation.court);
  formatted += ` (${courtAbbr} ${citation.year})`;

  return formatted;
}

/**
 * Format citation in plain text
 */
export function formatCitationPlain(citation: Citation): string {
  if (citation.type === 'statute') {
    const stat = citation as StatuteCitation;
    let formatted = `${stat.title}`;

    if (stat.section) {
      formatted += `, Section ${stat.section}`;
      if (stat.subsection) {
        formatted += `(${stat.subsection})`;
      }
    }

    return formatted;
  } else {
    const caseCit = citation as CaseCitation;
    return `${caseCit.title}, ${caseCit.court}, Docket ${caseCit.docket}, ${caseCit.year}`;
  }
}

/**
 * Abbreviate court name for Bluebook style
 */
function abbreviateCourt(court: string): string {
  const abbreviations: Record<string, string> = {
    'Supreme Court': 'U.S.',
    'Court of Appeals': 'Ct. App.',
    'District Court': 'Dist. Ct.',
    'Ninth Circuit Court of Appeals': '9th Cir.',
    'Second Circuit Court of Appeals': '2d Cir.',
    'Tax Court': 'Tax Ct.',
    'Bankruptcy Court': 'Bankr. Ct.',
    'Magistrate Court': 'Mag. Ct.'
  };

  for (const [full, abbrev] of Object.entries(abbreviations)) {
    if (court.includes(full)) {
      return abbrev;
    }
  }

  return court;
}

/**
 * Validate URL format for statute citation
 */
export function isValidStatuteURL(url: string): boolean {
  try {
    const urlObj = new URL(url);

    // Must be HTTPS
    if (urlObj.protocol !== 'https:') {
      return false;
    }

    // Valid domains for legal citations
    const validDomains = [
      'federalreserve.gov',
      'govinfo.gov',
      'law.cornell.edu',
      'congress.gov',
      'uscode.house.gov'
    ];

    return validDomains.some(domain => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

/**
 * Get database statistics
 */
export function getDatabaseStats(): {
  totalStatutes: number;
  totalCases: number;
  total: number;
} {
  return {
    totalStatutes: database.statutes.length,
    totalCases: database.cases.length,
    total: database.statutes.length + database.cases.length
  };
}

/**
 * Clear all citations from database (for testing)
 */
export function clearDatabase(): void {
  database.statutes = [];
  database.cases = [];
}
