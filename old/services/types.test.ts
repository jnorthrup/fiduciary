/**
 * Tests for IRS API Client Types
 * TIN matching request/response type validation
 */

import { describe, it, expect } from 'vitest';
import type {
  TinMatchRequest,
  TinMatchResponse,
  TinMatchBatchRequest,
  SubmissionRequest,
  PayeeRecord,
  FilerInfo,
  FormType,
  ValidationError,
} from './irsApiClient';

describe('TIN Match Types', () => {
  describe('TinMatchRequest', () => {
    it('should accept a valid single TIN match request', () => {
      const request: TinMatchRequest = {
        tin: '12-3456789',
        name: 'ABC Corporation',
      };
      expect(request.tin).toBeDefined();
      expect(request.name).toBeDefined();
    });

    it('should accept a TIN match request with request type', () => {
      const request: TinMatchRequest = {
        tin: '12-3456789',
        name: 'ABC Corporation',
        requestType: 'NameControl',
      };
      expect(request.requestType).toBe('NameControl');
    });

    it('should accept a TIN match request with business type', () => {
      const request: TinMatchRequest = {
        tin: '12-3456789',
        name: 'ABC Corporation',
        businessType: 'Corporation',
      };
      expect(request.businessType).toBe('Corporation');
    });

    it('should accept a TIN match request with all optional fields', () => {
      const request: TinMatchRequest = {
        tin: '123-45-6789',
        name: 'John Doe',
        requestType: 'FullMatch',
        businessType: 'SoleProprietor',
      };
      expect(request.requestType).toBe('FullMatch');
      expect(request.businessType).toBe('SoleProprietor');
    });
  });

  describe('TinMatchResponse', () => {
    it('should accept a match success response', () => {
      const response: TinMatchResponse = {
        code: 0,
        match: true,
        message: 'TIN and name combination validated successfully.',
        tin: '12-3456789',
        name: 'ABC Corporation',
      };
      expect(response.code).toBe(0);
      expect(response.match).toBe(true);
    });

    it('should accept a mismatch response', () => {
      const response: TinMatchResponse = {
        code: 1,
        match: false,
        message: 'TIN and name do not match.',
        tin: '12-3456789',
        name: 'Wrong Name',
      };
      expect(response.code).toBe(1);
      expect(response.match).toBe(false);
    });

    it('should accept an invalid request response', () => {
      const response: TinMatchResponse = {
        code: 2,
        match: false,
        message: 'Invalid TIN format.',
        tin: 'invalid',
        name: 'Test',
      };
      expect(response.code).toBe(2);
      expect(response.match).toBe(false);
    });
  });

  describe('TinMatchBatchRequest', () => {
    it('should accept a batch of TIN match requests', () => {
      const batch: TinMatchBatchRequest = {
        requests: [
          { tin: '12-3456789', name: 'ABC Corporation' },
          { tin: '98-7654321', name: 'XYZ Inc' },
          { tin: '123-45-6789', name: 'John Doe' },
        ],
      };
      expect(batch.requests).toHaveLength(3);
    });

    it('should accept an empty batch', () => {
      const batch: TinMatchBatchRequest = {
        requests: [],
      };
      expect(batch.requests).toHaveLength(0);
    });

    it('should accept a batch with optional fields', () => {
      const batch: TinMatchBatchRequest = {
        requests: [
          {
            tin: '12-3456789',
            name: 'ABC Corporation',
            requestType: 'NameControl',
            businessType: 'Corporation',
          },
        ],
      };
      expect(batch.requests[0].requestType).toBe('NameControl');
    });
  });
});

describe('Submission Types', () => {
  describe('ValidationError', () => {
    it('should accept a validation error with all fields', () => {
      const error: ValidationError = {
        code: 'INVALID_EIN',
        message: 'EIN must be in format XX-XXXXXXX',
        severity: 'ERROR',
        field: 'filer.ein',
        path: '$.filer.ein',
      };
      expect(error.code).toBe('INVALID_EIN');
      expect(error.severity).toBe('ERROR');
    });

    it('should accept a warning validation error', () => {
      const error: ValidationError = {
        code: 'MISSING_OPTIONAL_FIELD',
        message: 'Optional field not provided',
        severity: 'WARNING',
      };
      expect(error.severity).toBe('WARNING');
    });

    it('should accept an info validation error', () => {
      const error: ValidationError = {
        code: 'INFO_MESSAGE',
        message: 'Informational message',
        severity: 'INFO',
      };
      expect(error.severity).toBe('INFO');
    });
  });

  describe('PayeeRecord', () => {
    it('should accept a minimal payee record', () => {
      const payee: PayeeRecord = {
        tin: '12-3456789',
        name: 'John Contractor',
        address: {
          streetAddress: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '90210',
        },
      };
      expect(payee.tin).toBe('12-3456789');
      expect(payee.name).toBe('John Contractor');
    });

    it('should accept a payee with amounts', () => {
      const payee: PayeeRecord = {
        tin: '12-3456789',
        name: 'John Contractor',
        address: {
          streetAddress: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '90210',
        },
        amounts: {
          nonemployeeCompensation: 5000,
        },
      };
      expect(payee.amounts?.nonemployeeCompensation).toBe(5000);
    });

    it('should accept a payee with state amounts', () => {
      const payee: PayeeRecord = {
        tin: '12-3456789',
        name: 'John Contractor',
        address: {
          streetAddress: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '90210',
        },
        stateAmounts: [
          { state: 'CA', amount: 100 },
          { state: 'NY', amount: 200 },
        ],
      };
      expect(payee.stateAmounts).toHaveLength(2);
    });

    it('should accept a payee with withholding info', () => {
      const payee: PayeeRecord = {
        tin: '12-3456789',
        name: 'John Contractor',
        address: {
          streetAddress: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '90210',
        },
        withholding: {
          federalIncomeTax: 500,
        },
      };
      expect(payee.withholding?.federalIncomeTax).toBe(500);
    });
  });

  describe('SubmissionRequest', () => {
    const filer: FilerInfo = {
      ein: '12-3456789',
      name: 'ABC Corporation',
      address: {
        streetAddress: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '90210',
      },
    };

    it('should accept a minimal submission request', () => {
      const submission: SubmissionRequest = {
        transmitterId: 'T123456789',
        softwareId: 'SOFTWARE-001',
        formType: '1099-NEC',
        submissionType: 'O',
        taxYear: 2024,
        filer,
        payees: [],
      };
      expect(submission.submissionType).toBe('O');
      expect(submission.payees).toHaveLength(0);
    });

    it('should accept a submission with payees', () => {
      const submission: SubmissionRequest = {
        transmitterId: 'T123456789',
        softwareId: 'SOFTWARE-001',
        formType: '1099-NEC',
        submissionType: 'O',
        taxYear: 2024,
        filer,
        payees: [
          {
            tin: '98-7654321',
            name: 'John Contractor',
            address: {
              streetAddress: '456 Oak Ave',
              city: 'Sometown',
              state: 'CA',
              zipCode: '90211',
            },
            amounts: {
              nonemployeeCompensation: 5000,
            },
          },
        ],
      };
      expect(submission.payees).toHaveLength(1);
    });

    it('should accept a correction submission', () => {
      const submission: SubmissionRequest = {
        transmitterId: 'T123456789',
        softwareId: 'SOFTWARE-001',
        formType: '1099-NEC',
        submissionType: 'C',
        taxYear: 2024,
        originalReceiptId: '550e8400-e29b-41d4-a716-446655440000',
        filer,
        payees: [],
      };
      expect(submission.submissionType).toBe('C');
      expect(submission.originalReceiptId).toBeDefined();
    });
  });
});

describe('FormType Enum', () => {
  it('should accept all valid form types', () => {
    const validFormTypes: FormType[] = [
      '1099-NEC',
      '1099-MISC',
      '1099-INT',
      '1099-DIV',
      '1099-B',
      '1099-R',
      '1099-S',
      'W-2',
      'W-2G',
      '1042-S',
      '3921',
      '3922',
    ];

    expect(validFormTypes).toHaveLength(12);
  });
});
