/**
 * IRS IRIS A2A Production API Client
 *
 * Implements the IRS Information Returns Intake System (IRIS)
 * Application-to-Application (A2A) API client per Publication 5718 specifications.
 *
 * Key features:
 * - OAuth 2.0 JWT-based authentication (RS256)
 * - XML multipart/form-data submission
 * - Status/acknowledgment polling
 * - Automatic token refresh
 *
 * @see https://www.irs.gov/pub/irs-pdf/p5718.pdf
 */

import { randomUUID } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface IRISCredentials {
  /** API Client ID from e-Services */
  clientId: string;

  /** Full IRIS User ID (e.g., "dasmith-345870") */
  userId: string;

  /** Transmitter Control Code (5-character, starts with 'D') */
  tcc: string;

  /** Private key for JWT signing (PEM format) */
  privateKey: string;

  /** Key ID matching the JWK uploaded to API Client ID application */
  keyId: string;

  /** Test mode flag */
  testMode?: boolean;
}

export interface IRISJWTHeader {
  kid: string;
  alg: 'RS256';
}

export interface IRISJWTPayload {
  iss: string;
  sub: string;
  aud: string;
  iat: number;
  exp: number;
  jti: string;
}

export interface IRISTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  refresh_token: string;
  expires_in: number;
}

export interface IRISSubmissionOptions {
  /** XML payload conforming to IRIS schema */
  xmlPayload: string | Buffer;

  /** Unique Transmission Identifier (format: UUID:IRIS:TCC::A) */
  utid?: string;

  /** Transmission type: O=Original, C=Correction, R=Replacement */
  transmissionType?: 'O' | 'C' | 'R';

  /** Tax year */
  taxYear: string;
}

export interface IRISReceiptResponse {
  receiptId: string;
  utid: string;
  timestamp: string;
}

export interface IRISStatusRequest {
  /** Receipt ID or UTID to query */
  searchId: string;
}

export interface IRISStatusResponse {
  searchId: string;
  tcc: string;
  utid: string;
  transmissionStatusCd: 'Accepted' | 'Rejected' | 'Processing' | 'Partially Accepted' | 'Accepted with Errors' | 'Not Found';
  submissionResults?: IRISSubmissionResult[];
  errors?: IRISError[];
}

export interface IRISSubmissionResult {
  submissionId: string;
  submissionStatusCd: 'Accepted' | 'Rejected' | 'Processing' | 'Accepted with Errors' | 'Not Found';
  errors?: IRISError[];
  recordResults?: IRISRecordResult[];
}

export interface IRISRecordResult {
  recordId: string;
  errors?: IRISError[];
}

export interface IRISError {
  code: string;
  message: string;
  value?: string;
  elementPath?: string;
  severity?: 'Error' | 'Warning';
}

// ============================================================================
// Configuration
// ============================================================================

const IRIS_ENDPOINTS = {
  production: {
    token: 'https://api.www4.irs.gov/auth/oauth/v2/token',
    submit: 'https://api.www4.irs.gov/RIntakeAcceptanceA2A/1.0/irisa2a/v1/intake-acceptance',
    status: 'https://api.www4.irs.gov/RIntakeAcceptanceA2A/1.0/iris/transstatusorack',
  },
  test: {
    token: 'https://api.alt.www4.irs.gov/auth/oauth/v2/token',
    submit: 'https://api.alt.www4.irs.gov/RIntakeAcceptanceA2A/1.0/irisa2a/v1/intake-acceptance',
    status: 'https://api.alt.www4.irs.gov/RIntakeAcceptanceA2A/1.0/iris/transstatusorack',
  },
} as const;

// ============================================================================
// IRIS Client Class
// ============================================================================

export class IRISClient {
  private credentials: IRISCredentials;
  private endpoints: typeof IRIS_ENDPOINTS.production;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private refreshExpiresAt: number = 0;

  constructor(credentials: IRISCredentials) {
    this.credentials = credentials;
    this.endpoints = credentials.testMode
      ? IRIS_ENDPOINTS.test
      : IRIS_ENDPOINTS.production;
  }

  // ========================================================================
  // Authentication
  // ========================================================================

  /**
   * Generate a JWT for IRIS authentication
   *
   * @param type - 'client' or 'user'
   * @returns JWT string
   */
  private generateJWT(type: 'client' | 'user'): string {
    const header: IRISJWTHeader = {
      kid: this.credentials.keyId,
      alg: 'RS256',
    };

    const now = Math.floor(Date.now() / 1000);
    const exp = now + (15 * 60); // 15 minutes

    const payload: IRISJWTPayload = {
      iss: this.credentials.clientId,
      sub: type === 'client' ? this.credentials.clientId : this.credentials.userId,
      aud: 'https://api.irs.gov',
      iat: now,
      exp,
      jti: randomUUID(),
    };

    // For now, return a placeholder - actual JWT signing requires crypto library
    // In production, this would use the private key to sign
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

    // TODO: Implement RS256 signing with privateKey
    const signature = 'signature_placeholder';

    return `${headerB64}.${payloadB64}.${signature}`;
  }

  /**
   * Obtain access token from IRS OAuth endpoint
   *
   * @throws Error if authentication fails
   */
  async authenticate(): Promise<void> {
    const clientJWT = this.generateJWT('client');
    const userJWT = this.generateJWT('user');

    const params = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: userJWT,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: clientJWT,
    });

    const response = await fetch(this.endpoints.token, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`IRIS authentication failed: ${response.status} ${errorText}`);
    }

    const data: IRISTokenResponse = await response.json();

    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);
    this.refreshExpiresAt = Date.now() + (60 * 60 * 1000); // 60 minutes
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  private async getAccessToken(): Promise<string> {
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
      if (this.refreshToken && Date.now() < this.refreshExpiresAt) {
        await this.refreshAccessToken();
      } else {
        await this.authenticate();
      }
    }
    return this.accessToken;
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    // TODO: Implement refresh token flow
    await this.authenticate();
  }

  // ========================================================================
  // Transmission Operations
  // ========================================================================

  /**
   * Submit information returns to IRS IRIS
   *
   * @param options - Submission options
   * @returns Receipt response with receiptId, UTID, and timestamp
   * @throws Error if submission fails
   */
  async submitTransmission(options: IRISSubmissionOptions): Promise<IRISReceiptResponse> {
    const token = await this.getAccessToken();

    // Generate UTID if not provided
    const utid = options.utid || this.generateUTID();

    // Prepare multipart/form-data payload
    const formData = new FormData();
    const xmlBuffer = Buffer.isBuffer(options.xmlPayload)
      ? options.xmlPayload
      : Buffer.from(options.xmlPayload, 'utf-8');

    formData.append('file', new Blob([xmlBuffer], { type: 'text/xml' }), 'submission.xml');

    const response = await fetch(this.endpoints.submit, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`IRIS submission failed: ${response.status} ${errorText}`);
    }

    const responseText = await response.text();

    // Parse XML response to extract receiptId
    // TODO: Implement proper XML parsing
    const receiptId = this.extractReceiptId(responseText);

    return {
      receiptId,
      utid,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get transmission status and acknowledgment
   *
   * @param request - Status request with receiptId or UTID
   * @returns Status response with transmission status and any errors
   * @throws Error if request fails
   */
  async getStatus(request: IRISStatusRequest): Promise<IRISStatusResponse> {
    const token = await this.getAccessToken();

    // Build XML request body per schema
    const xmlRequestBody = this.buildStatusRequestXML(request.searchId);

    const response = await fetch(this.endpoints.status, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/xml',
        'Accept': 'application/xml',
      },
      body: xmlRequestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`IRIS status request failed: ${response.status} ${errorText}`);
    }

    const responseText = await response.text();

    // Parse XML response
    // TODO: Implement proper XML parsing
    return this.parseStatusResponse(responseText);
  }

  /**
   * Poll for transmission completion
   *
   * @param receiptId - Receipt ID to poll
   * @param options - Polling options
   * @returns Final status response
   */
  async pollStatus(
    receiptId: string,
    options: {
      maxAttempts?: number;
      intervalMs?: number;
    } = {}
  ): Promise<IRISStatusResponse> {
    const {
      maxAttempts = 60, // 30 minutes default (60 * 30s)
      intervalMs = 30000, // 30 seconds
    } = options;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.getStatus({ searchId: receiptId });

      // Return if terminal state reached
      if (
        status.transmissionStatusCd === 'Accepted' ||
        status.transmissionStatusCd === 'Rejected' ||
        status.transmissionStatusCd === 'Partially Accepted' ||
        status.transmissionStatusCd === 'Accepted with Errors'
      ) {
        return status;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error('Polling timeout: transmission still processing after maximum attempts');
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Generate Unique Transmission Identifier (UTID)
   * Format: UUID:IRIS:TCC::A
   */
  private generateUTID(): string {
    const uuid = randomUUID();
    return `${uuid}:IRIS:${this.credentials.tcc}::A`;
  }

  /**
   * Extract receipt ID from XML response
   */
  private extractReceiptId(xmlResponse: string): string {
    // TODO: Implement proper XML parsing
    // For now, use regex as fallback
    const match = xmlResponse.match(/<ReceiptId>([^<]+)<\/ReceiptId>/);
    if (match && match[1]) {
      return match[1].trim();
    }
    throw new Error('Could not extract ReceiptId from response');
  }

  /**
   * Build status request XML body
   */
  private buildStatusRequestXML(searchId: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<IRISStatusRequest>
  <SearchId>${searchId}</SearchId>
</IRISStatusRequest>`;
  }

  /**
   * Parse status response XML
   */
  private parseStatusResponse(xmlResponse: string): IRISStatusResponse {
    // Simple XML parsing for status response
    const searchIdMatch = xmlResponse.match(/<SearchId>([^<]+)<\/SearchId>/);
    const tccMatch = xmlResponse.match(/<TCC>([^<]+)<\/TCC>/);
    const utidMatch = xmlResponse.match(/<UTID>([^<]+)<\/UTID>/);
    const statusMatch = xmlResponse.match(/<TransmissionStatusCd>([^<]+)<\/TransmissionStatusCd>/);

    const transmissionStatusCd = (statusMatch?.[1] as any) || 'Processing';

    // Parse submission results if present
    const submissionResults: IRISSubmissionResult[] = [];
    const submissionGrps = xmlResponse.matchAll(/<SubmissionResultGrp>([\s\S]*?)<\/SubmissionResultGrp>/g);

    for (const match of submissionGrps) {
      const grp = match[0]; // Get the full matched string
      const subIdMatch = grp.match(/<SubmissionId>([^<]+)<\/SubmissionId>/);
      const subStatusMatch = grp.match(/<SubmissionStatusCd>([^<]+)<\/SubmissionStatusCd>/);

      const submissionResult: IRISSubmissionResult = {
        submissionId: subIdMatch?.[1] || '',
        submissionStatusCd: (subStatusMatch?.[1] as any) || 'Processing',
      };

      // Parse errors
      const errorGrps = grp.matchAll(/<ErrorInformationGrp>([\s\S]*?)<\/ErrorInformationGrp>/g);
      const errors: IRISError[] = [];

      for (const errMatch of errorGrps) {
        const errGrp = errMatch[0];
        const codeMatch = errGrp.match(/<ErrorMessageCode>([^<]+)<\/ErrorMessageCode>/);
        const msgMatch = errGrp.match(/<ErrorMessageText>([^<]+)<\/ErrorMessageText>/);

        if (codeMatch && msgMatch) {
          errors.push({
            code: codeMatch[1],
            message: msgMatch[1],
          });
        }
      }

      if (errors.length > 0) {
        submissionResult.errors = errors;
      }

      submissionResults.push(submissionResult);
    }

    // Parse transmission-level errors
    const errors: IRISError[] = [];
    const txErrorGrps = xmlResponse.matchAll(/<ErrorInformationGrp>([\s\S]*?)<\/ErrorInformationGrp>/g);

    // Only include errors at transmission level (not within submission groups)
    // Check if error is not within a SubmissionResultGrp
    const txErrors = Array.from(xmlResponse.matchAll(/<ErrorInformationGrp>([\s\S]*?)<\/ErrorInformationGrp>/g))
      .filter(match => {
        const beforeError = xmlResponse.substring(0, match.index);
        // Count opening SubmissionResultGrp before this error
        const openGrps = (beforeError.match(/<SubmissionResultGrp>/g) || []).length;
        const closeGrps = (beforeError.match(/<\/SubmissionResultGrp>/g) || []).length;
        return openGrps === closeGrps; // Error is at transmission level if not inside a submission group
      });

    for (const errGrp of txErrors) {
      const codeMatch = errGrp[0].match(/<ErrorMessageCode>([^<]+)<\/ErrorMessageCode>/);
      const msgMatch = errGrp[0].match(/<ErrorMessageText>([^<]+)<\/ErrorMessageText>/);

      if (codeMatch && msgMatch) {
        errors.push({
          code: codeMatch[1],
          message: msgMatch[1],
        });
      }
    }

    return {
      searchId: searchIdMatch?.[1] || '',
      tcc: tccMatch?.[1] || this.credentials.tcc,
      utid: utidMatch?.[1] || '',
      transmissionStatusCd,
      submissionResults: submissionResults.length > 0 ? submissionResults : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create IRIS client instance
 */
export function createIRISClient(credentials: IRISCredentials): IRISClient {
  return new IRISClient(credentials);
}

/**
 * Validate TCC format
 */
export function validateTCC(tcc: string): boolean {
  // TCC must be 5-character alphanumeric starting with 'D' or 'T' (test)
  return /^[DT][A-Za-z0-9]{4}$/.test(tcc);
}

/**
 * Validate UTID format
 */
export function validateUTID(utid: string): boolean {
  // Format: UUID:IRIS:TCC::A
  const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:IRIS:[DT][A-Za-z0-9]{4}::[A-Z]$/;
  return pattern.test(utid);
}

/**
 * Generate UTID from components
 */
export function generateUTID(uuid: string, tcc: string): string {
  return `${uuid}:IRIS:${tcc}::A`;
}
