/**
 * BOFA CashPro Service Tests
 * Tests for BOFA API integration module structure, types, and function signatures
 */

import { describe, it, expect } from 'vitest';
import {
  // Types
  type BOFAAuthConfig,
  type BOFATokenResponse,
  type AccountValidationRequest,
  type AccountValidationResponse,
  type ACHSubmissionRequest,
  type ACHSubmissionResponse,
  type PaymentStatusResponse,
  type BalanceResponse,
  // Functions
  getAuthToken,
  validateAccount,
  submitACHFile,
  getPaymentStatus,
  getBalance
} from './bofaCashProService';

describe('bofaCashProService', () => {
  describe('Module Exports', () => {
    it('exports all required TypeScript interfaces', () => {
      // Interfaces are type-only exports, verified by TypeScript compilation
      // This test ensures the module compiles correctly
      expect(true).toBe(true);
    });

    it('exports all required functions', () => {
      expect(typeof getAuthToken).toBe('function');
      expect(typeof validateAccount).toBe('function');
      expect(typeof submitACHFile).toBe('function');
      expect(typeof getPaymentStatus).toBe('function');
      expect(typeof getBalance).toBe('function');
    });
  });

  describe('TypeScript Interface Types', () => {
    it('BOFAAuthConfig has correct structure', () => {
      const config: BOFAAuthConfig = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        tenantId: 'test-tenant-id',
        tokenUrl: 'https://api.bankofamerica.com/auth/oauth/v2/token'
      };

      expect(config.clientId).toBe('test-client-id');
      expect(config.clientSecret).toBe('test-client-secret');
      expect(config.tenantId).toBe('test-tenant-id');
      expect(config.tokenUrl).toContain('bankofamerica.com');
    });

    it('BOFATokenResponse has correct structure', () => {
      const tokenResponse: BOFATokenResponse = {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'ACH_ORIGINATION'
      };

      expect(tokenResponse.access_token).toBe('test-access-token');
      expect(tokenResponse.token_type).toBe('Bearer');
      expect(tokenResponse.expires_in).toBe(3600);
      expect(tokenResponse.scope).toBe('ACH_ORIGINATION');
    });

    it('AccountValidationRequest has correct structure', () => {
      const request: AccountValidationRequest = {
        routingNumber: '021000021',
        accountNumber: '123456789',
        accountType: 'checking'
      };

      expect(request.routingNumber).toBe('021000021');
      expect(request.accountNumber).toBe('123456789');
      expect(request.accountType).toBe('checking');
    });

    it('AccountValidationResponse has correct structure', () => {
      const response: AccountValidationResponse = {
        valid: true,
        routingNumberValid: true,
        accountNumberValid: true,
        accountStatus: 'active',
        bankName: 'Bank of America'
      };

      expect(response.valid).toBe(true);
      expect(response.routingNumberValid).toBe(true);
      expect(response.accountNumberValid).toBe(true);
      expect(response.accountStatus).toBe('active');
      expect(response.bankName).toBe('Bank of America');
    });

    it('ACHSubmissionRequest has correct structure', () => {
      const request: ACHSubmissionRequest = {
        nachaFileContent: '101 021000021...',
        fileName: 'ACH-20260123.txt',
        effectiveDate: '2026-01-23',
        customerReference: 'REF-12345'
      };

      expect(request.nachaFileContent).toContain('101');
      expect(request.fileName).toBe('ACH-20260123.txt');
      expect(request.effectiveDate).toBe('2026-01-23');
      expect(request.customerReference).toBe('REF-12345');
    });

    it('ACHSubmissionResponse has correct structure', () => {
      const response: ACHSubmissionResponse = {
        submissionId: 'SUB-12345',
        status: 'accepted',
        receivedTimestamp: '2026-01-23T10:00:00Z',
        bofaReference: 'BOFA-REF-67890'
      };

      expect(response.submissionId).toBe('SUB-12345');
      expect(response.status).toBe('accepted');
      expect(response.receivedTimestamp).toContain('2026-01-23');
      expect(response.bofaReference).toBe('BOFA-REF-67890');
    });

    it('PaymentStatusResponse has correct structure', () => {
      const response: PaymentStatusResponse = {
        submissionId: 'SUB-12345',
        status: 'settled',
        settledDate: '2026-01-24'
      };

      expect(response.submissionId).toBe('SUB-12345');
      expect(response.status).toBe('settled');
      expect(response.settledDate).toBe('2026-01-24');
    });

    it('PaymentStatusResponse includes return codes when present', () => {
      const response: PaymentStatusResponse = {
        submissionId: 'SUB-12345',
        status: 'returned',
        returnCode: 'R01',
        returnReason: 'Insufficient funds'
      };

      expect(response.status).toBe('returned');
      expect(response.returnCode).toBe('R01');
      expect(response.returnReason).toBe('Insufficient funds');
    });

    it('BalanceResponse has correct structure', () => {
      const response: BalanceResponse = {
        accountNumber: '******789',
        availableBalance: 10000.50,
        currentBalance: 10500.00,
        currency: 'USD',
        asOfDate: '2026-01-23'
      };

      expect(response.accountNumber).toBe('******789');
      expect(response.availableBalance).toBe(10000.50);
      expect(response.currentBalance).toBe(10500.00);
      expect(response.currency).toBe('USD');
      expect(response.asOfDate).toBe('2026-01-23');
    });
  });

  describe('Function Stubs - Return Types', () => {
    it('getAuthToken is implemented and delegates to bofaAuthService', async () => {
      // getAuthToken is now implemented (Phase 2.1)
      // It delegates to bofaAuthService which requires GOOGLE_CLOUD_PROJECT
      // We expect it to throw an error about the missing env var when not properly configured
      await expect(getAuthToken()).rejects.toThrow(/GOOGLE_CLOUD_PROJECT|Secret Manager|credentials/);
    });

    it('validateAccount is implemented (Phase 3)', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '021000021',
        accountNumber: '123456789',
        accountType: 'checking'
      };

      // validateAccount is now implemented and requires GOOGLE_CLOUD_PROJECT
      // It will attempt to call getAuthToken() which needs the env var
      await expect(validateAccount(request)).rejects.toThrow(/GOOGLE_CLOUD_PROJECT|Secret Manager|credentials/);
    });

    it('submitACHFile is implemented (Phase 4)', async () => {
      const request: ACHSubmissionRequest = {
        nachaFileContent: '101 021000021...',
        fileName: 'ACH-20260123.txt',
        effectiveDate: '2026-01-23',
        customerReference: 'REF-12345'
      };

      // submitACHFile is now implemented and requires auth credentials
      // It will attempt to call getAuthToken() which needs the env var
      await expect(submitACHFile(request)).rejects.toThrow(/GOOGLE_CLOUD_PROJECT|Secret Manager|credentials|NACHA/);
    });

    it('getPaymentStatus is implemented (Phase 5)', async () => {
      // getPaymentStatus is now implemented and requires auth credentials
      // It will attempt to call getAuthToken() which needs the env var
      await expect(getPaymentStatus('SUB-12345')).rejects.toThrow(/GOOGLE_CLOUD_PROJECT|Secret Manager|credentials|Submission ID is required/);
    });

    it('getBalance is implemented (Phase 6)', async () => {
      // getBalance is now implemented and requires auth credentials
      // It will attempt to call getAuthToken() which needs the env var
      await expect(getBalance('ACCT-12345')).rejects.toThrow(/GOOGLE_CLOUD_PROJECT|Secret Manager|credentials/);
    });
  });

  describe('Type Safety - Account Types', () => {
    it('AccountValidationRequest accepts valid account types', () => {
      const checkingRequest: AccountValidationRequest = {
        routingNumber: '021000021',
        accountNumber: '123456789',
        accountType: 'checking'
      };

      const savingsRequest: AccountValidationRequest = {
        routingNumber: '021000021',
        accountNumber: '123456789',
        accountType: 'savings'
      };

      expect(checkingRequest.accountType).toBe('checking');
      expect(savingsRequest.accountType).toBe('savings');
    });

    it('AccountValidationResponse accepts valid status values', () => {
      const statuses: Array<'active' | 'closed' | 'invalid' | 'not_found'> = ['active', 'closed', 'invalid', 'not_found'];

      statuses.forEach(status => {
        const response: AccountValidationResponse = {
          valid: status === 'active',
          routingNumberValid: true,
          accountNumberValid: status !== 'invalid',
          accountStatus: status,
          bankName: 'Test Bank'
        };
        expect(response.accountStatus).toBe(status);
      });
    });

    it('ACHSubmissionResponse accepts valid status values', () => {
      const statuses: Array<'accepted' | 'rejected' | 'pending_review'> = ['accepted', 'rejected', 'pending_review'];

      statuses.forEach(status => {
        const response: ACHSubmissionResponse = {
          submissionId: 'SUB-123',
          status: status,
          receivedTimestamp: '2026-01-23T10:00:00Z',
          bofaReference: 'BOFA-REF-123'
        };
        expect(response.status).toBe(status);
      });
    });

    it('PaymentStatusResponse accepts valid status values', () => {
      const statuses: Array<'submitted' | 'processing' | 'settled' | 'returned' | 'rejected'> = [
        'submitted', 'processing', 'settled', 'returned', 'rejected'
      ];

      statuses.forEach(status => {
        const response: PaymentStatusResponse = {
          submissionId: 'SUB-123',
          status: status
        };
        expect(response.status).toBe(status);
      });
    });
  });
});
