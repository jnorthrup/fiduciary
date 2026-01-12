/**
 * CAFR (Comprehensive Annual Financial Report) API Client
 *
 * Provides search and retrieval functionality for municipal CAFRs
 * via MSRB EMMA (Electronic Municipal Market Access) or similar sources.
 */

export interface CAFRSearchParams {
  entityName?: string;
  state?: string;
  fiscalYear?: number;
  limit?: number;
  offset?: number;
}

export interface CAFRDocument {
  id: string;
  entityName: string;
  entityType: 'city' | 'county' | 'state' | 'district' | 'authority';
  state: string;
  fiscalYear: number;
  filingDate: string;
  pdfUrl: string;
  pages?: number;
  fileSize?: number;
}

export interface CAFRSearchResult {
  documents: CAFRDocument[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface CAFRFinancialSummary {
  documentId: string;
  totalRevenue: number;
  totalExpenditure: number;
  generalFundBalance: number;
  totalDebt: number;
  debtRatio?: number;
  populationServed?: number;
  perCapitaDebt?: number;
}

class CAFRApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/cafr') {
    this.baseUrl = baseUrl;
  }

  /**
   * Search for CAFR documents by entity name, state, or fiscal year
   */
  async search(params: CAFRSearchParams): Promise<CAFRSearchResult> {
    const queryParams = new URLSearchParams();
    if (params.entityName) queryParams.set('entityName', params.entityName);
    if (params.state) queryParams.set('state', params.state);
    if (params.fiscalYear) queryParams.set('fiscalYear', params.fiscalYear.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.offset) queryParams.set('offset', params.offset.toString());

    const response = await fetch(`${this.baseUrl}/search?${queryParams.toString()}`);
    if (!response.ok) {
      throw new Error(`CAFR search failed: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get a specific CAFR document by ID
   */
  async getDocument(id: string): Promise<CAFRDocument> {
    const response = await fetch(`${this.baseUrl}/documents/${id}`);
    if (!response.ok) {
      throw new Error(`CAFR document not found: ${id}`);
    }
    return response.json();
  }

  /**
   * Get PDF URL for a CAFR document
   */
  async getPdfUrl(id: string): Promise<string> {
    const doc = await this.getDocument(id);
    return doc.pdfUrl;
  }

  /**
   * Get financial summary extracted from a CAFR
   */
  async getFinancialSummary(id: string): Promise<CAFRFinancialSummary> {
    const response = await fetch(`${this.baseUrl}/documents/${id}/summary`);
    if (!response.ok) {
      throw new Error(`Financial summary not available for: ${id}`);
    }
    return response.json();
  }

  /**
   * Get list of US states for filtering
   */
  getStates(): { code: string; name: string }[] {
    return [
      { code: 'AL', name: 'Alabama' },
      { code: 'AK', name: 'Alaska' },
      { code: 'AZ', name: 'Arizona' },
      { code: 'AR', name: 'Arkansas' },
      { code: 'CA', name: 'California' },
      { code: 'CO', name: 'Colorado' },
      { code: 'CT', name: 'Connecticut' },
      { code: 'DE', name: 'Delaware' },
      { code: 'FL', name: 'Florida' },
      { code: 'GA', name: 'Georgia' },
      { code: 'HI', name: 'Hawaii' },
      { code: 'ID', name: 'Idaho' },
      { code: 'IL', name: 'Illinois' },
      { code: 'IN', name: 'Indiana' },
      { code: 'IA', name: 'Iowa' },
      { code: 'KS', name: 'Kansas' },
      { code: 'KY', name: 'Kentucky' },
      { code: 'LA', name: 'Louisiana' },
      { code: 'ME', name: 'Maine' },
      { code: 'MD', name: 'Maryland' },
      { code: 'MA', name: 'Massachusetts' },
      { code: 'MI', name: 'Michigan' },
      { code: 'MN', name: 'Minnesota' },
      { code: 'MS', name: 'Mississippi' },
      { code: 'MO', name: 'Missouri' },
      { code: 'MT', name: 'Montana' },
      { code: 'NE', name: 'Nebraska' },
      { code: 'NV', name: 'Nevada' },
      { code: 'NH', name: 'New Hampshire' },
      { code: 'NJ', name: 'New Jersey' },
      { code: 'NM', name: 'New Mexico' },
      { code: 'NY', name: 'New York' },
      { code: 'NC', name: 'North Carolina' },
      { code: 'ND', name: 'North Dakota' },
      { code: 'OH', name: 'Ohio' },
      { code: 'OK', name: 'Oklahoma' },
      { code: 'OR', name: 'Oregon' },
      { code: 'PA', name: 'Pennsylvania' },
      { code: 'RI', name: 'Rhode Island' },
      { code: 'SC', name: 'South Carolina' },
      { code: 'SD', name: 'South Dakota' },
      { code: 'TN', name: 'Tennessee' },
      { code: 'TX', name: 'Texas' },
      { code: 'UT', name: 'Utah' },
      { code: 'VT', name: 'Vermont' },
      { code: 'VA', name: 'Virginia' },
      { code: 'WA', name: 'Washington' },
      { code: 'WV', name: 'West Virginia' },
      { code: 'WI', name: 'Wisconsin' },
      { code: 'WY', name: 'Wyoming' },
      { code: 'DC', name: 'District of Columbia' },
    ];
  }

  /**
   * Get available fiscal years for filtering
   */
  getFiscalYears(): number[] {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let i = currentYear; i >= currentYear - 10; i--) {
      years.push(i);
    }
    return years;
  }
}

export const cafrApi = new CAFRApiClient();
