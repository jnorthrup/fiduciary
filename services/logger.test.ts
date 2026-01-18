/**
 * Tests for secure logging utilities
 *
 * Tests that sensitive data (TCC, bearer tokens, TINs, SSNs) is sanitized
 * from log output to prevent credential leakage.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sanitizeSensitiveData } from './logger';

describe('Secure Logging', () => {
  describe('TCC Sanitization', () => {
    it('should sanitize Transmitter Control Codes from logs', () => {
      const logMessage = 'Authentication successful with TCC: T123456789';
      const sanitized = sanitizeSensitiveData(logMessage);
      expect(sanitized).not.toContain('T123456789');
      expect(sanitized).toContain('***');
    });

    it('should preserve non-TCC alphanumeric strings', () => {
      const logMessage = 'Processing batch ID: BATCH-2024-001';
      const sanitized = sanitizeSensitiveData(logMessage);
      expect(sanitized).toContain('BATCH-2024-001');
    });
  });

  describe('Bearer Token Sanitization', () => {
    it('should sanitize bearer tokens from logs', () => {
      const logMessage = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
      const sanitized = sanitizeSensitiveData(logMessage);
      expect(sanitized).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(sanitized).toMatch(/Bearer\s+\*\*\*/);
    });

    it('should sanitize JWT tokens without Bearer prefix', () => {
      const logMessage = 'Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature';
      const sanitized = sanitizeSensitiveData(logMessage);
      expect(sanitized).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });
  });

  describe('TIN/SSN Sanitization', () => {
    it('should sanitize EIN format (XX-XXXXXXX)', () => {
      const logMessage = 'Payee EIN: 12-3456789';
      const sanitized = sanitizeSensitiveData(logMessage);
      expect(sanitized).not.toContain('12-3456789');
      expect(sanitized).toContain('**-*******');
    });

    it('should sanitize SSN format (XXX-XX-XXXX)', () => {
      const logMessage = 'Payee SSN: 123-45-6789';
      const sanitized = sanitizeSensitiveData(logMessage);
      expect(sanitized).not.toContain('123-45-6789');
      expect(sanitized).toContain('***-**-****');
    });

    it('should preserve non-TIN numeric strings', () => {
      const logMessage = 'Amount: $1500.00, Year: 2024';
      const sanitized = sanitizeSensitiveData(logMessage);
      expect(sanitized).toContain('$1500.00');
      expect(sanitized).toContain('2024');
    });
  });

  describe('API Key Sanitization', () => {
    it('should sanitize API keys in query parameters', () => {
      const logMessage = 'Request to /api/submit?api_key=sk_live_abc123xyz789';
      const sanitized = sanitizeSensitiveData(logMessage);
      expect(sanitized).not.toContain('sk_live_abc123xyz789');
      expect(sanitized).toContain('api_key=***');
    });

    it('should sanitize keys in headers', () => {
      const logMessage = 'Headers: {"x-api-key": "key_abc123def456"}';
      const sanitized = sanitizeSensitiveData(logMessage);
      expect(sanitized).not.toContain('key_abc123def456');
    });
  });

  describe('Multiple Patterns', () => {
    it('should sanitize multiple sensitive values in one message', () => {
      const logMessage = 'User with TCC: T123456789 submitted with token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 for EIN: 12-3456789';
      const sanitized = sanitizeSensitiveData(logMessage);
      expect(sanitized).not.toContain('T123456789');
      expect(sanitized).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(sanitized).not.toContain('12-3456789');
    });
  });
});
