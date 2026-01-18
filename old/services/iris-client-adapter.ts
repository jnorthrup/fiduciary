/**
 * IRIS Production Client Adapter
 *
 * Bridges the IrsApiClient interface with the production IRISClient.
 * Enables direct IRS API communication with OAuth JWT authentication.
 *
 * Configuration:
 * - VITE_IRIS_DIRECT_API=true to use direct IRS API (requires credentials)
 * - VITE_IRS_CLIENT_ID - API Client ID from e-Services
 * - VITE_IRS_USER_ID - Full IRIS User ID
 * - VITE_IRS_TCC - Transmitter Control Code
 * - VITE_IRS_PRIVATE_KEY - RSA private key for JWT signing
 * - VITE_IRS_KEY_ID - Key ID from JWK upload
 * - VITE_IRS_TEST_MODE=true for test environment
 */

import { randomUUID } from 'crypto';
import { IRISClient, type IRISCredentials } from './iris-client';
import type {
  SubmissionRequest,
  SubmissionReceipt,
  BatchStatus,
  TransmissionCheckResponse,
} from './irsApiClient';

// ============================================================================
// Configuration
// ============================================================================

const DIRECT_API_ENABLED = (import.meta as any).env.VITE_IRIS_DIRECT_API === 'true';

const IRIS_CREDENTIALS: IRISCredentials | null = DIRECT_API_ENABLED
  ? {
      clientId: (import.meta as any).env.VITE_IRS_CLIENT_ID || '',
      userId: (import.meta as any).env.VITE_IRS_USER_ID || '',
      tcc: (import.meta as any).env.VITE_IRS_TCC || '',
      privateKey: (import.meta as any).env.VITE_IRS_PRIVATE_KEY || '',
      keyId: (import.meta as any).env.VITE_IRS_KEY_ID || '',
      testMode: (import.meta as any).env.VITE_IRS_TEST_MODE !== 'false',
    }
  : null;

// ============================================================================
// Types
// ============================================================================

export interface DirectSubmissionOptions {
  /** Transmission type: O=Original, C=Correction, R=Replacement */
  transmissionType?: 'O' | 'C' | 'R';
  /** Tax year */
  taxYear: string;
}

// ============================================================================
// IRIS Production Adapter
// ============================================================================

export class IRISProductionAdapter {
  private client: IRISClient | null = null;
  private enabled: boolean;
  private credentials: IRISCredentials | null;

  constructor() {
    this.enabled = DIRECT_API_ENABLED && this.validateCredentials();
    this.credentials = IRIS_CREDENTIALS;

    if (this.enabled && this.credentials) {
      this.client = new IRISClient(this.credentials);
    }
  }

  /**
   * Validate that all required credentials are present
   */
  private validateCredentials(): boolean {
    if (!IRIS_CREDENTIALS) return false;

    const required = ['clientId', 'userId', 'tcc', 'privateKey', 'keyId'] as const;
    return required.every(key => IRIS_CREDENTIALS![key]?.length > 0);
  }

  /**
   * Check if direct API mode is available
   */
  isAvailable(): boolean {
    return this.enabled && this.client !== null;
  }

  /**
   * Get configuration status
   */
  getStatus(): {
    enabled: boolean;
    available: boolean;
    testMode: boolean;
    missing: string[];
  } {
    const missing: string[] = [];
    if (!IRIS_CREDENTIALS) {
      return { enabled: DIRECT_API_ENABLED, available: false, testMode: false, missing: ['all'] };
    }

    const required = ['clientId', 'userId', 'tcc', 'privateKey', 'keyId'] as const;
    for (const key of required) {
      if (!IRIS_CREDENTIALS[key]) missing.push(key);
    }

    return {
      enabled: DIRECT_API_ENABLED,
      available: this.isAvailable(),
      testMode: IRIS_CREDENTIALS.testMode ?? false,
      missing,
    };
  }

  /**
   * Authenticate with IRS (must be called before submissions)
   */
  async authenticate(): Promise<void> {
    if (!this.client) {
      throw new Error('IRIS client not configured. Set VITE_IRIS_DIRECT_API=true and provide credentials.');
    }

    await this.client.authenticate();
  }

  /**
   * Submit information returns to IRS IRIS
   * Converts SubmissionRequest to IRIS XML format
   */
  async submitTransmission(
    request: SubmissionRequest,
    options: DirectSubmissionOptions
  ): Promise<SubmissionReceipt> {
    if (!this.client) {
      throw new Error('IRIS client not configured');
    }

    // Generate IRIS XML payload from SubmissionRequest
    const xmlPayload = this.generateIRISXML(request, options);

    // Submit to IRS
    const response = await this.client.submitTransmission({
      xmlPayload,
      utid: options.transmissionType === undefined ? undefined : this.generateUTID(request),
      taxYear: options.taxYear,
    });

    // Convert IRIS response to SubmissionReceipt format
    return {
      receiptId: response.receiptId,
      status: 'Received', // IRIS returns receipt ID immediately
      timestamp: response.timestamp,
    };
  }

  /**
   * Get transmission status from IRS
   */
  async getTransmissionStatus(receiptId: string): Promise<BatchStatus> {
    if (!this.client) {
      throw new Error('IRIS client not configured');
    }

    const status = await this.client.getStatus({ searchId: receiptId });

    // Convert IRIS status to BatchStatus format
    return {
      receiptId: status.searchId,
      status: this.mapStatus(status.transmissionStatusCd),
      submittedAt: status.searchId, // Use receiptId as submittedAt proxy
      recordCount: status.submissionResults?.length || 0,
      acceptedCount: status.submissionResults?.filter(s => s.submissionStatusCd === 'Accepted').length || 0,
      errorCount: status.submissionResults?.filter(s => s.submissionStatusCd === 'Rejected').length || 0,
      warningCount: status.submissionResults?.filter(s => s.submissionStatusCd === 'Accepted with Errors').length || 0,
      errors: status.errors?.map(e => ({
        code: e.code,
        message: e.message,
        severity: e.severity === 'Warning' ? 'WARNING' : 'ERROR',
      })),
    };
  }

  /**
   * Poll transmission status until completion
   */
  async pollTransmissionStatus(
    receiptId: string,
    onUpdate?: (status: BatchStatus) => void,
    intervalMs: number = 30000,
    maxAttempts: number = 60
  ): Promise<BatchStatus> {
    if (!this.client) {
      throw new Error('IRIS client not configured');
    }

    const response = await this.client.pollStatus(receiptId, {
      intervalMs,
      maxAttempts,
    });

    const status = await this.getTransmissionStatus(receiptId);
    if (onUpdate) onUpdate(status);

    return status;
  }

  /**
   * Pre-transmission validation check
   * IRIS doesn't have a separate validation endpoint, so this does basic validation
   */
  async transmissionCheck(request: SubmissionRequest): Promise<TransmissionCheckResponse> {
    // Basic validation before submission
    const errors: Array<{ code: string; message: string; severity: 'ERROR' | 'WARNING' | 'INFO' }> = [];
    const warnings: Array<{ code: string; message: string; severity: 'ERROR' | 'WARNING' | 'INFO' }> = [];

    // Validate filer EIN
    if (!request.filer.ein || request.filer.ein.replace(/\D/g, '').length !== 9) {
      errors.push({ code: 'INVALID_EIN', message: 'Invalid filer EIN format', severity: 'ERROR' });
    }

    // Validate payees
    if (request.payees.length === 0) {
      errors.push({ code: 'NO_PAYEES', message: 'At least one payee is required', severity: 'ERROR' });
    }

    if (request.payees.length > 1000) {
      errors.push({ code: 'TOO_MANY_PAYEES', message: 'Maximum 1000 payees per transmission', severity: 'ERROR' });
    }

    // Validate each payee
    request.payees.forEach((payee, index) => {
      const tinClean = payee.tin.replace(/\D/g, '');
      if (tinClean.length !== 9) {
        errors.push({
          code: 'INVALID_PAYEE_TIN',
          message: `Invalid TIN format for payee at index ${index}`,
          severity: 'ERROR',
        });
      }
      if (!payee.name) {
        errors.push({
          code: 'MISSING_PAYEE_NAME',
          message: `Missing name for payee at index ${index}`,
          severity: 'ERROR',
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  /**
   * Map IRIS status codes to BatchStatus format
   */
  private mapStatus(
    irisStatus: 'Accepted' | 'Rejected' | 'Processing' | 'Partially Accepted' | 'Accepted with Errors' | 'Not Found'
  ): 'Received' | 'Processing' | 'Accepted' | 'AcceptedWithErrors' | 'Rejected' | 'Cancelled' {
    const statusMap: Record<typeof irisStatus, BatchStatus['status']> = {
      'Accepted': 'Accepted',
      'Rejected': 'Rejected',
      'Processing': 'Processing',
      'Partially Accepted': 'AcceptedWithErrors',
      'Accepted with Errors': 'AcceptedWithErrors',
      'Not Found': 'Rejected',
    };
    return statusMap[irisStatus] || 'Processing';
  }

  /**
   * Generate UTID from submission request
   */
  private generateUTID(request: SubmissionRequest): string {
    const uuid = crypto.randomUUID();
    return `${uuid}:IRIS:${request.transmitterId || 'D1234'}::A`;
  }

  /**
   * Generate IRIS XML payload from SubmissionRequest
   * This is a simplified version - full implementation would need to generate
   * complete IRIS XML per Publication 5718 schema
   */
  private generateIRISXML(request: SubmissionRequest, options: DirectSubmissionOptions): string {
    // This is a placeholder - actual implementation would generate proper IRIS XML
    // conforming to the schema at https://www.irs.gov/irisschema
    // TODO: Implement full IRIS XML generation

    const timestamp = new Date().toISOString();

    return `<?xml version="1.0" encoding="UTF-8"?>
<IRTransmission xmlns="urn:us:gov:treasury:irs:iristransmission">
  <IRTransmissionHeader>
    <TransmitterId>${request.transmitterId}</TransmitterId>
    <SoftwareId>${request.softwareId}</SoftwareId>
    <TransmissionTs>${timestamp}</TransmissionTs>
    <TransmissionType>${options.transmissionType || 'O'}</TransmissionType>
    <TestMode>${this.credentials?.testMode ? 'true' : 'false'}</TestMode>
  </IRTransmissionHeader>

  <IRSubmissionHeader>
    <Filer>
      <EIN>${request.filer.ein.replace(/\D/g, '')}</EIN>
      <FilerName>
        <BusinessName1>${request.filer.name}</BusinessName1>
      </FilerName>
      <FilerAddress>
        <USAddress>
          <AddressLine1>${request.filer.address.streetAddress}</AddressLine1>
          <City>${request.filer.address.city}</City>
          <State>${request.filer.address.state}</State>
          <ZIPCode>${request.filer.address.zipCode}</ZIPCode>
        </USAddress>
      </FilerAddress>
    </Filer>
    <TaxYear>${options.taxYear}</TaxYear>
  </IRSubmissionHeader>

  ${request.payees.map(payee => `
  <IRSubmissionData>
    <IRPayer>
      <EIN>${request.filer.ein.replace(/\D/g, '')}</EIN>
    </IRPayer>
    <IRPayee>
      <SSN>${payee.tin.replace(/\D/g, '')}</SSN>
      <PayeeName1>${payee.name}</PayeeName1>
      <PayeeAddress>
        <USAddress>
          <AddressLine1>${payee.address.streetAddress}</AddressLine1>
          <City>${payee.address.city}</City>
          <State>${payee.address.state}</State>
          <ZIPCode>${payee.address.zipCode}</ZIPCode>
        </USAddress>
      </PayeeAddress>
    </IRPayee>
  </IRSubmissionData>`).join('\n')}

</IRTransmission>`;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const irisAdapter = new IRISProductionAdapter();
