/**
 * Tests for IRS IRIS A2A Production API Client
 *
 * Test file following TDD principles:
 * 1. Client authentication with JWT
 * 2. Transmission submission with XML payload
 * 3. Status polling and acknowledgment retrieval
 * 4. Token refresh and management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IRISClient, createIRISClient, validateTCC, validateUTID, generateUTID, type IRISCredentials } from '../services/iris-client';

// Mock credentials for testing
const mockCredentials: IRISCredentials = {
  clientId: 'test-client-id-12345',
  userId: 'testuser-12345',
  tcc: 'D1234',
  privateKey: '-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQ...\\n-----END PRIVATE KEY-----',
  keyId: 'test-key-id',
  testMode: true,
};

describe('IRISClient', () => {
  let client: IRISClient;

  beforeEach(() => {
    client = createIRISClient(mockCredentials);
    vi.clearAllMocks();
  });

  describe('Client Creation', () => {
    it('should create client with credentials', () => {
      expect(client).toBeInstanceOf(IRISClient);
    });

    it('should use test endpoints when testMode is true', () => {
      const testClient = createIRISClient({ ...mockCredentials, testMode: true });
      expect(testClient).toBeInstanceOf(IRISClient);
    });

    it('should use production endpoints when testMode is false', () => {
      const prodClient = createIRISClient({ ...mockCredentials, testMode: false });
      expect(prodClient).toBeInstanceOf(IRISClient);
    });
  });

  describe('TCC Validation', () => {
    it('should validate correct production TCC format', () => {
      expect(validateTCC('D1234')).toBe(true);
      expect(validateTCC('DABCD')).toBe(true);
      expect(validateTCC('D9999')).toBe(true);
    });

    it('should validate correct test TCC format', () => {
      expect(validateTCC('T1234')).toBe(true);
      expect(validateTCC('TABCD')).toBe(true);
    });

    it('should reject invalid TCC format', () => {
      expect(validateTCC('X1234')).toBe(false);
      expect(validateTCC('D123')).toBe(false); // Too short
      expect(validateTCC('D12345')).toBe(false); // Too long
      expect(validateTCC('12345')).toBe(false); // No letter prefix
      expect(validateTCC('')).toBe(false);
      expect(validateTCC('D12_4')).toBe(false); // Invalid character
    });
  });

  describe('UTID Validation', () => {
    it('should validate correct UTID format', () => {
      const validUTID = 'da20a4de-1357-11ed-861d-0242ac120002:IRIS:D1234::A';
      expect(validateUTID(validUTID)).toBe(true);
    });

    it('should validate UTID with test TCC', () => {
      const testUTID = 'da20a4de-1357-11ed-861d-0242ac120002:IRIS:T1234::A';
      expect(validateUTID(testUTID)).toBe(true);
    });

    it('should reject invalid UTID format', () => {
      expect(validateUTID('invalid-utid')).toBe(false);
      expect(validateUTID('da20a4de-1357-11ed-861d-0242ac120002:IRIS:D1234::')).toBe(false); // Missing request type
      expect(validateUTID('da20a4de-1357-11ed-861d-0242ac120002:IRIS::A')).toBe(false); // Missing TCC
      expect(validateUTID('')).toBe(false);
    });

    it('should generate UTID from components', () => {
      const uuid = 'da20a4de-1357-11ed-861d-0242ac120002';
      const tcc = 'D5678';
      const utid = generateUTID(uuid, tcc);

      expect(utid).toBe(`${uuid}:IRIS:${tcc}::A`);
      expect(validateUTID(utid)).toBe(true);
    });
  });

  describe('JWT Generation', () => {
    it('should generate client JWT with correct claims', () => {
      const clientJWT = (client as any).generateJWT('client');

      expect(clientJWT).toBeDefined();
      expect(typeof clientJWT).toBe('string');

      const [headerB64, payloadB64, signature] = clientJWT.split('.');

      expect(headerB64).toBeDefined();
      expect(payloadB64).toBeDefined();
      expect(signature).toBeDefined();
    });

    it('should generate user JWT with correct subject', () => {
      const userJWT = (client as any).generateJWT('user');

      expect(userJWT).toBeDefined();
      expect(typeof userJWT).toBe('string');
    });

    it('should include correct header fields', () => {
      const clientJWT = (client as any).generateJWT('client');
      const [headerB64] = clientJWT.split('.');
      const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());

      expect(header.alg).toBe('RS256');
      expect(header.kid).toBe(mockCredentials.keyId);
    });

    it('should include correct payload fields for client JWT', () => {
      const clientJWT = (client as any).generateJWT('client');
      const [, payloadB64] = clientJWT.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

      expect(payload.iss).toBe(mockCredentials.clientId);
      expect(payload.sub).toBe(mockCredentials.clientId);
      expect(payload.aud).toBe('https://api.irs.gov');
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
      expect(payload.jti).toBeDefined();

      // Expiration should be approximately 15 minutes from now
      const now = Math.floor(Date.now() / 1000);
      const expDiff = payload.exp - payload.iat;
      expect(expDiff).toBe(15 * 60); // 15 minutes
    });

    it('should include correct payload fields for user JWT', () => {
      const userJWT = (client as any).generateJWT('user');
      const [, payloadB64] = userJWT.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

      expect(payload.iss).toBe(mockCredentials.clientId);
      expect(payload.sub).toBe(mockCredentials.userId);
    });

    it('should generate unique JTI for each JWT', () => {
      const jwt1 = (client as any).generateJWT('client');
      const jwt2 = (client as any).generateJWT('client');

      const [, payload1B64] = jwt1.split('.');
      const [, payload2B64] = jwt2.split('.');

      const payload1 = JSON.parse(Buffer.from(payload1B64, 'base64url').toString());
      const payload2 = JSON.parse(Buffer.from(payload2B64, 'base64url').toString());

      expect(payload1.jti).not.toBe(payload2.jti);
    });
  });

  describe('Authentication Flow', () => {
    it('should authenticate and receive access token', async () => {
      // Mock fetch for authentication
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'test-access-token',
          token_type: 'Bearer',
          refresh_token: 'test-refresh-token',
          expires_in: 900,
        }),
      });

      await client.authenticate();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('auth/oauth/v2/token'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        })
      );
    });

    it('should throw error when authentication fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(client.authenticate()).rejects.toThrow('IRIS authentication failed');
    });

    it('should store access token after authentication', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'test-access-token',
          token_type: 'Bearer',
          refresh_token: 'test-refresh-token',
          expires_in: 900,
        }),
      });

      await client.authenticate();
      const token = await (client as any).getAccessToken();

      expect(token).toBe('test-access-token');
    });

    it('should calculate token expiration correctly', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'test-access-token',
          token_type: 'Bearer',
          refresh_token: 'test-refresh-token',
          expires_in: 900, // 15 minutes
        }),
      });

      const beforeAuth = Date.now();
      await client.authenticate();
      const expiresAt = (client as any).tokenExpiresAt;

      expect(expiresAt).toBeGreaterThan(beforeAuth);
      expect(expiresAt).toBeLessThanOrEqual(beforeAuth + (900 * 1000) + 1000); // Allow 1s margin
    });
  });

  describe('Transmission Submission', () => {
    beforeEach(() => {
      // Mock authenticated client
      (client as any).accessToken = 'mock-access-token';
      (client as any).tokenExpiresAt = Date.now() + (15 * 60 * 1000);
    });

    it('should submit transmission with XML payload', async () => {
      const mockXML = '<?xml version="1.0"?><IRISTransmission>...</IRISTransmission>';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<ReceiptId>2022-68537508811-4386213b8</ReceiptId>',
      });

      const result = await client.submitTransmission({
        xmlPayload: mockXML,
        taxYear: '2024',
      });

      expect(result).toBeDefined();
      expect(result.receiptId).toBeDefined();
      expect(result.utid).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should use provided UTID if specified', async () => {
      const customUTID = 'custom-uuid:IRIS:D1234::A';
      const mockXML = '<?xml version="1.0"?><IRISTransmission>...</IRISTransmission>';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<ReceiptId>test-receipt-id</ReceiptId>',
      });

      const result = await client.submitTransmission({
        xmlPayload: mockXML,
        utid: customUTID,
        taxYear: '2024',
      });

      expect(result.utid).toBe(customUTID);
    });

    it('should generate UTID if not provided', async () => {
      const mockXML = '<?xml version="1.0"?><IRISTransmission>...</IRISTransmission>';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<ReceiptId>test-receipt-id</ReceiptId>',
      });

      const result = await client.submitTransmission({
        xmlPayload: mockXML,
        taxYear: '2024',
      });

      expect(result.utid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:IRIS:D1234::A$/);
    });

    it('should throw error when submission fails', async () => {
      const mockXML = '<?xml version="1.0"?><IRISTransmission>...</IRISTransmission>';

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      });

      await expect(client.submitTransmission({
        xmlPayload: mockXML,
        taxYear: '2024',
      })).rejects.toThrow('IRIS submission failed');
    });

    it('should send multipart/form-data with correct headers', async () => {
      const mockXML = '<?xml version="1.0"?><IRISTransmission>...</IRISTransmission>';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<ReceiptId>test-receipt</ReceiptId>',
      });

      await client.submitTransmission({
        xmlPayload: mockXML,
        taxYear: '2024',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('intake-acceptance'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-access-token',
          }),
        })
      );
    });

    it('should handle Buffer XML payload', async () => {
      const mockXMLBuffer = Buffer.from('<?xml version="1.0"?><IRISTransmission>...</IRISTransmission>', 'utf-8');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<ReceiptId>test-receipt</ReceiptId>',
      });

      const result = await client.submitTransmission({
        xmlPayload: mockXMLBuffer,
        taxYear: '2024',
      });

      expect(result).toBeDefined();
    });
  });

  describe('Status Retrieval', () => {
    beforeEach(() => {
      // Mock authenticated client
      (client as any).accessToken = 'mock-access-token';
      (client as any).tokenExpiresAt = Date.now() + (15 * 60 * 1000);
    });

    it('should retrieve status by receipt ID', async () => {
      const receiptId = '2022-68537508811-4386213b8';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => `
          <IRISStatusResponse>
            <SearchId>${receiptId}</SearchId>
            <TCC>D1234</TCC>
            <UTID>test-utid</UTID>
            <TransmissionStatusCd>Accepted</TransmissionStatusCd>
          </IRISStatusResponse>
        `,
      });

      const status = await client.getStatus({ searchId: receiptId });

      expect(status).toBeDefined();
      expect(status.searchId).toBe(receiptId);
    });

    it('should retrieve status by UTID', async () => {
      const utid = 'test-uuid:IRIS:D1234::A';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => `
          <IRISStatusResponse>
            <SearchId>${utid}</SearchId>
            <TCC>D1234</TCC>
            <UTID>${utid}</UTID>
            <TransmissionStatusCd>Processing</TransmissionStatusCd>
          </IRISStatusResponse>
        `,
      });

      const status = await client.getStatus({ searchId: utid });

      expect(status).toBeDefined();
    });

    it('should include submission results in response', async () => {
      const receiptId = 'test-receipt-id';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => `
          <IRISStatusResponse>
            <SearchId>${receiptId}</SearchId>
            <TransmissionStatusCd>Partially Accepted</TransmissionStatusCd>
            <SubmissionResultGrp>
              <SubmissionId>1</SubmissionId>
              <SubmissionStatusCd>Accepted</SubmissionStatusCd>
            </SubmissionResultGrp>
            <SubmissionResultGrp>
              <SubmissionId>2</SubmissionId>
              <SubmissionStatusCd>Rejected</SubmissionStatusCd>
              <ErrorInformationGrp>
                <ErrorMessageCode>S1H001</ErrorMessageCode>
                <ErrorMessageText>Invalid tax year</ErrorMessageText>
              </ErrorInformationGrp>
            </SubmissionResultGrp>
          </IRISStatusResponse>
        `,
      });

      const status = await client.getStatus({ searchId: receiptId });

      expect(status.transmissionStatusCd).toBe('Partially Accepted');
      expect(status.submissionResults).toBeDefined();
      expect(status.submissionResults).toHaveLength(2);
    });

    it('should throw error when status request fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });

      await expect(client.getStatus({ searchId: 'invalid-id' }))
        .rejects.toThrow('IRIS status request failed');
    });
  });

  describe('Status Polling', () => {
    beforeEach(() => {
      // Mock authenticated client
      (client as any).accessToken = 'mock-access-token';
      (client as any).tokenExpiresAt = Date.now() + (15 * 60 * 1000);
    });

    it('should poll until terminal state reached', async () => {
      const receiptId = 'test-receipt-id';
      let pollCount = 0;

      global.fetch = vi.fn().mockImplementation(() => {
        pollCount++;

        if (pollCount === 1) {
          // First call: Processing
          return Promise.resolve({
            ok: true,
            text: async () => `
              <IRISStatusResponse>
                <SearchId>${receiptId}</SearchId>
                <TransmissionStatusCd>Processing</TransmissionStatusCd>
              </IRISStatusResponse>
            `,
          });
        } else {
          // Second call: Accepted
          return Promise.resolve({
            ok: true,
            text: async () => `
              <IRISStatusResponse>
                <SearchId>${receiptId}</SearchId>
                <TransmissionStatusCd>Accepted</TransmissionStatusCd>
              </IRISStatusResponse>
            `,
          });
        }
      });

      const status = await client.pollStatus(receiptId, {
        maxAttempts: 5,
        intervalMs: 100,
      });

      expect(status.transmissionStatusCd).toBe('Accepted');
      expect(pollCount).toBe(2);
    });

    it('should throw timeout error when max attempts exceeded', async () => {
      const receiptId = 'test-receipt-id';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => `
          <IRISStatusResponse>
            <SearchId>${receiptId}</SearchId>
            <TransmissionStatusCd>Processing</TransmissionStatusCd>
          </IRISStatusResponse>
        `,
      });

      await expect(client.pollStatus(receiptId, {
        maxAttempts: 2,
        intervalMs: 50,
      })).rejects.toThrow('Polling timeout');
    });

    it('should return immediately if already in terminal state', async () => {
      const receiptId = 'test-receipt-id';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => `
          <IRISStatusResponse>
            <SearchId>${receiptId}</SearchId>
            <TransmissionStatusCd>Accepted</TransmissionStatusCd>
          </IRISStatusResponse>
        `,
      });

      const status = await client.pollStatus(receiptId);

      expect(status.transmissionStatusCd).toBe('Accepted');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle Rejected terminal state', async () => {
      const receiptId = 'test-receipt-id';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => `
          <IRISStatusResponse>
            <SearchId>${receiptId}</SearchId>
            <TransmissionStatusCd>Rejected</TransmissionStatusCd>
            <ErrorInformationGrp>
              <ErrorMessageCode>TMFST001</ErrorMessageCode>
              <ErrorMessageText>Invalid TCC</ErrorMessageText>
            </ErrorInformationGrp>
          </IRISStatusResponse>
        `,
      });

      const status = await client.pollStatus(receiptId, {
        maxAttempts: 2,
        intervalMs: 50,
      });

      expect(status.transmissionStatusCd).toBe('Rejected');
      expect(status.errors).toBeDefined();
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token when expired', async () => {
      // Set token as expired
      (client as any).tokenExpiresAt = Date.now() - 1000;
      (client as any).refreshExpiresAt = Date.now() + (60 * 60 * 1000);
      (client as any).refreshToken = 'valid-refresh-token';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          token_type: 'Bearer',
          refresh_token: 'new-refresh-token',
          expires_in: 900,
        }),
      });

      await (client as any).getAccessToken();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('auth/oauth/v2/token'),
        expect.any(Object)
      );
    });

    it('should re-authenticate when refresh token expired', async () => {
      // Set both tokens as expired
      (client as any).tokenExpiresAt = Date.now() - 1000;
      (client as any).refreshExpiresAt = Date.now() - 1000;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          token_type: 'Bearer',
          refresh_token: 'new-refresh-token',
          expires_in: 900,
        }),
      });

      await (client as any).getAccessToken();

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Utility Functions', () => {
    describe('createIRISClient', () => {
      it('should create IRIS client instance', () => {
        const client = createIRISClient(mockCredentials);
        expect(client).toBeInstanceOf(IRISClient);
      });
    });

    describe('validateTCC', () => {
      it('should return boolean for TCC validity', () => {
        expect(validateTCC('D1234')).toBe(true);
        expect(validateTCC('T1234')).toBe(true);
        expect(validateTCC('X1234')).toBe(false);
        expect(validateTCC('')).toBe(false);
      });
    });

    describe('validateUTID', () => {
      it('should return boolean for UTID validity', () => {
        expect(validateUTID('da20a4de-1357-11ed-861d-0242ac120002:IRIS:D1234::A')).toBe(true);
        expect(validateUTID('invalid')).toBe(false);
      });
    });

    describe('generateUTID', () => {
      it('should combine UUID and TCC into UTID format', () => {
        const uuid = '12345678-1234-1234-1234-123456789abc';
        const tcc = 'D9999';
        const utid = generateUTID(uuid, tcc);

        expect(utid).toBe(`${uuid}:IRIS:${tcc}::A`);
      });
    });
  });
});
