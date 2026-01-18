/**
 * IRS IRIS A2A API Client
 *
 * Full-featured client for the IRS Information Returns Intake System.
 * Provides methods for submitting batches, checking status, and TIN validation.
 *
 * Supports two modes:
 * 1. Proxy mode: Routes through backend server at API_BASE_URL
 * 2. Direct mode: Uses IRISClient with OAuth JWT authentication (requires credentials)
 *
 * @see OpenAPI Spec: /specs/iris-a2a-openapi.yaml
 */
import { isValidEINFormat, isValidSSNFormat } from '../utils/validation';
import { ERROR_CODES, ERROR_MESSAGES } from '../types/errors';
import { irisAdapter } from './iris-client-adapter';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001/api/irs';

// ============================================================================
// Types
// ============================================================================

export type FormType =
  | '1099-NEC'
  | '1099-MISC'
  | '1099-INT'
  | '1099-DIV'
  | '1099-B'
  | '1099-R'
  | '1099-S'
  | 'W-2'
  | 'W-2G'
  | '1042-S'
  | '3921'
  | '3922';

export type SubmissionType = 'O' | 'C'; // Original | Correction
export type SubmissionStatus = 'Received' | 'Processing' | 'Accepted' | 'AcceptedWithErrors' | 'Rejected' | 'Cancelled';

export interface Address {
  streetAddress: string;
  streetAddress2?: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
}

export interface ContactInfo {
  name?: string;
  phone?: string;
  email?: string;
}

export interface FilerInfo {
  ein: string;
  name: string;
  tradeName?: string;
  address: Address;
  contact?: ContactInfo;
}

export interface PayeeAmounts {
  [key: string]: number | undefined;
  // 1099-NEC
  nonemployeeCompensation?: number;
  // 1099-INT
  interestIncome?: number;
  earlyWithdrawalPenalty?: number;
  // 1099-DIV
  ordinaryDividends?: number;
  qualifiedDividends?: number;
  // Common
  federalIncomeTaxWithheld?: number;
  stateTaxWithheld?: number;
}

export interface StateAmount {
  state: string;
  stateId?: string;
  amount: number;
}

export interface WithholdingInfo {
  federalIncomeTax?: number;
}

export interface PayeeRecord {
  recordId?: string;
  tin: string;
  tinType?: 'EIN' | 'SSN';
  name: string;
  address: Address;
  accountNumber?: string;
  secondTinNotice?: string;
  amounts?: PayeeAmounts;
  stateAmounts?: StateAmount[];
  withholding?: WithholdingInfo;
}

export interface SubmissionRequest {
  transmitterId: string;
  softwareId: string;
  formType: FormType;
  submissionType: SubmissionType;
  taxYear: number;
  originalReceiptId?: string;
  sequenceNumber?: string;
  filer: FilerInfo;
  payees: PayeeRecord[];
}

export interface SubmissionReceipt {
  receiptId: string;
  status: SubmissionStatus;
  timestamp: string;
  estimatedCompletion?: string;
  message?: string;
  warnings?: string[];
  errors?: ValidationError[];
}

export interface SubmissionError {
  code: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
  recordRef?: string;
  field?: string;
  correctedValue?: string;
}

export interface BatchStatus {
  receiptId: string;
  status: SubmissionStatus;
  submittedAt: string;
  completedAt?: string;
  recordCount: number;
  acceptedCount: number;
  errorCount: number;
  warningCount: number;
  errors?: SubmissionError[];
  warnings?: SubmissionError[];
  processingTime?: number;
}

export interface RecordStatus {
  recordId: string;
  status: 'Accepted' | 'Error' | 'Warning';
  tin: string;
  name: string;
  errors: SubmissionError[];
  warnings: SubmissionError[];
}

export interface SubmissionDetails {
  receiptId: string;
  status: SubmissionStatus;
  submittedAt: string;
  completedAt?: string;
  records: RecordStatus[];
}

export interface TinMatchRequest {
  tin: string;
  name: string;
  requestType?: 'NameControl' | 'FullMatch';
  businessType?: 'SoleProprietor' | 'Corporation' | 'Partnership' | 'Estate';
}

export interface TinMatchResponse {
  code: number; // 0 = Match, 1 = Mismatch, 2 = Invalid Request
  match: boolean;
  message: string;
  tin: string;
  name: string;
}

export interface TinMatchBatchRequest {
  requests: TinMatchRequest[];
}

export interface TinMatchBatchResponse {
  results: TinMatchResponse[];
  requestId: string;
}

export interface ValidationError {
  code: string;
  message: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  field?: string;
  path?: string;
}

export interface TransmissionCheckResponse {
  valid: boolean;
  warnings: ValidationError[];
  errors: ValidationError[];
}

export interface FormSchema {
  type: string;
  title: string;
  description: string;
  required?: string[];
  properties: Record<string, {
    type: string;
    description?: string;
    minimum?: number;
    [key: string]: any;
  }>;
}

export interface ErrorResponse {
  code: string;
  message: string;
  timestamp?: string;
  requestId?: string;
  errors?: ValidationError[];
}

// ============================================================================
// IRS API Client Class
// ============================================================================

export class IrsApiClient {
  private baseUrl: string;
  private tcc: string | null = null;
  private bearerToken: string | null = null;
  private useDirectAPI: boolean;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.useDirectAPI = irisAdapter.isAvailable();
  }

  /**
   * Check if using direct IRS API mode
   */
  isDirectMode(): boolean {
    return this.useDirectAPI;
  }

  /**
   * Get adapter status for UI display
   */
  getAdapterStatus() {
    return irisAdapter.getStatus();
  }

  /**
   * Set authentication credentials
   * Priority: Direct API auth > Bearer token > TCC
   */
  async setAuth(tcc?: string, bearerToken?: string): Promise<void> {
    if (this.useDirectAPI) {
      // In direct mode, authenticate with IRIS adapter
      await irisAdapter.authenticate();
    } else if (bearerToken) {
      this.bearerToken = bearerToken;
      this.tcc = null;
    } else if (tcc) {
      this.tcc = tcc;
      this.bearerToken = null;
    }
  }

  /**
   * Clear authentication credentials
   */
  clearAuth(): void {
    this.tcc = null;
    this.bearerToken = null;
  }

  /**
   * Get auth headers for request (proxy mode only)
   */
  private getAuthHeaders(): Record<string, string> {
    if (this.bearerToken) {
      return { Authorization: `Bearer ${this.bearerToken}` };
    }
    if (this.tcc) {
      return { 'X-IRS-TCC': this.tcc };
    }
    return {};
  }

  /**
   * Make authenticated API request (proxy mode only)
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (this.useDirectAPI) {
      throw new Error('Direct API mode enabled - use adapter methods instead');
    }

    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json().catch(() => ({
        code: 'UNKNOWN_ERROR',
        message: response.statusText,
      }));
      throw new IrsApiError(error.code, error.message, response.status, error);
    }

    return response.json();
  }

  /**
   * Check API health
   */
  async healthCheck(): Promise<{ status: string; timestamp: string; service: string; version: string }> {
    if (this.useDirectAPI) {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'IRS IRIS A2A API (Direct)',
        version: '1.0.0',
      };
    }
    return this.request('/health');
  }

  /**
   * Get OpenAPI specification
   */
  async getSpec(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/spec`);
    if (!response.ok) throw new Error('Failed to fetch specification');
    return response.text();
  }

  /**
   * Submit information return batch
   */
  async submitBatch(submission: SubmissionRequest): Promise<SubmissionReceipt> {
    if (this.useDirectAPI) {
      return irisAdapter.submitTransmission(submission, {
        transmissionType: submission.submissionType,
        taxYear: String(submission.taxYear),
      });
    }
    return this.request<SubmissionReceipt>('/submissions', {
      method: 'POST',
      body: JSON.stringify(submission),
    });
  }

  /**
   * Get submission status
   */
  async getSubmissionStatus(receiptId: string): Promise<BatchStatus> {
    if (this.useDirectAPI) {
      return irisAdapter.getTransmissionStatus(receiptId);
    }
    return this.request<BatchStatus>(`/submissions/${encodeURIComponent(receiptId)}/status`);
  }

  /**
   * Get submission details
   */
  async getSubmissionDetails(receiptId: string): Promise<SubmissionDetails> {
    if (this.useDirectAPI) {
      // IRIS API doesn't have a separate details endpoint
      // Map from status response
      const status = await irisAdapter.getTransmissionStatus(receiptId);
      return {
        receiptId: status.receiptId,
        status: status.status,
        submittedAt: status.submittedAt,
        completedAt: status.completedAt,
        records: status.errors?.map((e, i) => ({
          recordId: `REC-${i}`,
          status: e.severity === 'ERROR' ? 'Error' : 'Warning',
          tin: '',
          name: '',
          errors: [e],
          warnings: [],
        })) || [],
      };
    }
    return this.request<SubmissionDetails>(`/submissions/${encodeURIComponent(receiptId)}/details`);
  }

  /**
   * Validate single TIN
   */
  async validateTin(request: TinMatchRequest): Promise<TinMatchResponse> {
    // TIN validation not available in direct mode - uses backend proxy
    return this.request<TinMatchResponse>('/tin-validation', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Validate multiple TINs (batch)
   */
  async validateTinBatch(request: TinMatchBatchRequest): Promise<TinMatchBatchResponse> {
    // TIN validation not available in direct mode - uses backend proxy
    return this.request<TinMatchBatchResponse>('/tin-validation', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get form schema
   */
  async getFormSchema(formType: FormType): Promise<FormSchema> {
    // Form schema not available in direct mode - uses backend proxy
    return this.request<FormSchema>(`/schemas/${encodeURIComponent(formType)}`);
  }

  /**
   * Pre-transmission validation check
   */
  async transmissionCheck(submission: SubmissionRequest): Promise<TransmissionCheckResponse> {
    if (this.useDirectAPI) {
      return irisAdapter.transmissionCheck(submission);
    }
    return this.request<TransmissionCheckResponse>('/transmission-check', {
      method: 'POST',
      body: JSON.stringify(submission),
    });
  }

  /**
   * Poll submission status until completion
   * @param receiptId Submission receipt ID
   * @param onUpdate Callback with current status
   * @param interval Polling interval in milliseconds (default: 2000)
   * @param timeout Maximum time to poll in milliseconds (default: 300000 = 5 minutes)
   */
  async pollSubmissionStatus(
    receiptId: string,
    onUpdate?: (status: BatchStatus) => void,
    interval: number = 2000,
    timeout: number = 300000
  ): Promise<BatchStatus> {
    if (this.useDirectAPI) {
      // Use adapter's optimized polling (30s intervals, 60 attempts = 30 minutes)
      return irisAdapter.pollTransmissionStatus(receiptId, onUpdate, interval, Math.ceil(timeout / interval));
    }

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const status = await this.getSubmissionStatus(receiptId);

      if (onUpdate) {
        onUpdate(status);
      }

      // Terminal states
      if (['Accepted', 'AcceptedWithErrors', 'Rejected', 'Cancelled'].includes(status.status)) {
        return status;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error('Polling timeout exceeded');
  }
}

// ============================================================================
// Error Classes
// ============================================================================

export class IrsApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: ErrorResponse
  ) {
    super(message);
    this.name = 'IrsApiError';
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const irsApi = new IrsApiClient();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format EIN to standard format XX-XXXXXXX
 */
/**
 * Format EIN to standard format XX-XXXXXXX
 */
export function formatEIN(ein: string): string {
  const cleaned = ein.replace(/\D/g, '');
  if (cleaned.length !== 9) {
    throw new Error(ERROR_MESSAGES[ERROR_CODES.INVALID_EIN_FORMAT]);
  }
  return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
}

/**
 * Format SSN to standard format XXX-XX-XXXX
 */
export function formatSSN(ssn: string): string {
  const cleaned = ssn.replace(/\D/g, '');
  if (cleaned.length !== 9) {
    throw new Error(ERROR_MESSAGES[ERROR_CODES.INVALID_TIN_FORMAT]);
  }
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
}

/**
 * Validate TIN format (EIN or SSN)
 */
export function validateTINFormat(tin: string): boolean {
  const einPattern = /^\d{2}-\d{7}$/;
  const ssnPattern = /^\d{3}-\d{2}-\d{4}$/;
  return einPattern.test(tin) || ssnPattern.test(tin);
}

/**
 * Determine TIN type from format
 */
export function getTINType(tin: string): 'EIN' | 'SSN' | null {
  if (/^\d{2}-\d{7}$/.test(tin)) return 'EIN';
  if (/^\d{3}-\d{2}-\d{4}$/.test(tin)) return 'SSN';
  return null;
}

/**
 * Create a minimal submission request template
 */
export function createSubmissionTemplate(
  transmitterId: string,
  softwareId: string,
  formType: FormType,
  filer: FilerInfo
): SubmissionRequest {
  return {
    transmitterId,
    softwareId,
    formType,
    submissionType: 'O',
    taxYear: new Date().getFullYear() - 1,
    filer,
    payees: [],
  };
}

/**
 * Validate address object
 */
export function validateAddress(address: Partial<Address>): string[] {
  const errors: string[] = [];

  if (!address.streetAddress) errors.push('Street address is required');
  if (!address.city) errors.push('City is required');
  if (!address.state || !/^[A-Z]{2}$/.test(address.state)) errors.push('Valid state code required');
  if (!address.zipCode || !/^\d{5}(-\d{4})?$/.test(address.zipCode)) errors.push('Valid ZIP code required');

  return errors;
}

/**
 * Get 1099-NEC amount fields for UI display
 */
export function getFormAmountFields(formType: FormType): Array<{ key: string; label: string; required: boolean }> {
  const fields: Record<FormType, Array<{ key: string; label: string; required: boolean }>> = {
    '1099-NEC': [
      { key: 'nonemployeeCompensation', label: 'Nonemployee Compensation (Box 1)', required: true },
    ],
    '1099-MISC': [
      { key: 'rents', label: 'Rents (Box 1)', required: false },
      { key: 'royalties', label: 'Royalties (Box 2)', required: false },
      { key: 'otherIncome', label: 'Other Income (Box 3)', required: false },
    ],
    '1099-INT': [
      { key: 'interestIncome', label: 'Interest Income (Box 1)', required: true },
      { key: 'earlyWithdrawalPenalty', label: 'Early Withdrawal Penalty (Box 3)', required: false },
      { key: 'federalIncomeTaxWithheld', label: 'Federal Tax Withheld (Box 4)', required: false },
    ],
    '1099-DIV': [
      { key: 'ordinaryDividends', label: 'Ordinary Dividends (Box 1a)', required: true },
      { key: 'qualifiedDividends', label: 'Qualified Dividends (Box 1b)', required: false },
    ],
    '1099-B': [
      { key: 'proceeds', label: 'Proceeds (Box 1d)', required: true },
    ],
    '1099-R': [
      { key: 'grossDistribution', label: 'Gross Distribution (Box 1)', required: true },
      { key: 'taxableAmount', label: 'Taxable Amount (Box 2a)', required: false },
    ],
    '1099-S': [
      { key: 'grossProceeds', label: 'Gross Proceeds (Box 2)', required: true },
    ],
    'W-2': [
      { key: 'wagesTipsOtherComp', label: 'Wages, Tips, Other Compensation (Box 1)', required: true },
      { key: 'federalIncomeTaxWithheld', label: 'Federal Income Tax Withheld (Box 2)', required: true },
    ],
    'W-2G': [
      { key: 'gamblingWinnings', label: 'Gambling Winnings (Box 1)', required: true },
    ],
    '1042-S': [
      { key: 'incomeCode', label: 'Income Code (Box 1)', required: true },
    ],
    '3921': [
      { key: 'fairMarketValue', label: 'FMV of Shares Transferred (Box 3)', required: true },
    ],
    '3922': [
      { key: 'fairMarketValue', label: 'FMV of Shares (Box 3)', required: true },
    ],
  };

  return fields[formType] || [];
}
