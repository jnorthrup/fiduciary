/**
 * OpenAPI Generated Client Usage Examples
 *
 * This file demonstrates how to use the auto-generated TypeScript client
 * created from the unified OpenAPI 3.1 specification.
 */

import { OpenAPI, IrsService, BsoService, LedgerService, HealthService, ApiError, EntityCreate } from './api-client';

// ============================================================================
// Configuration
// ============================================================================

// Configure the API client
OpenAPI.BASE = 'http://localhost:3001';
OpenAPI.WITH_CREDENTIALS = true;

// Optional: Add authentication
// OpenAPI.TOKEN = 'your-jwt-token';
// Or use a resolver for dynamic tokens
// OpenAPI.TOKEN = async () => {
//   return await getAuthToken();
// };

// Optional: Add custom headers
// OpenAPI.HEADERS = {
//   'X-Custom-Header': 'value',
// };

// ============================================================================
// IRS IRIS A2A API Examples
// ============================================================================

/**
 * Check IRS IRIS service health
 */
export async function checkIrisHealth() {
  const health = await IrsService.irisHealth();
  console.log('IRS IRIS Health:', health);
  return health;
}

/**
 * Generate demo JWT tokens for testing
 */
export async function generateDemoJwt() {
  const tokens = await IrsService.irisDemoAuth({
    requestBody: {
      clientId: 'demo-client-id',
      userId: 'demo-user-id',
      tcc: 'ABCDE',
      privateKey: 'demo-private-key',
      keyId: 'demo-key-id',
    },
  });
  console.log('Demo JWTs:', tokens);
  return tokens;
}

/**
 * Submit information returns (proxy endpoint)
 */
export async function submitReturns() {
  const result = await IrsService.submitReturns({
    requestBody: {
      transmitterId: 'ABCDE',
      filer: {
        ein: '12-3456789',
        name: 'Acme Corporation',
      },
      taxYear: 2024,
      payees: [
        {
          tin: '98-7654321',
          name: 'John Doe',
          amounts: {
            nonemployeeCompensation: 5000,
          },
        },
      ],
    },
  });
  console.log('Submission result:', result);
  return result;
}

/**
 * Get submission status
 */
export async function getSubmissionStatus(receiptId: string) {
  const status = await IrsService.getSubmissionStatus({ receiptId });
  console.log('Submission status:', status);
  return status;
}

/**
 * Validate TIN (Taxpayer Identification Number)
 */
export async function validateTIN() {
  const result = await IrsService.validateTin({
    requestBody: {
      tin: '12-3456789',
      name: 'Acme Corporation',
    },
  });
  console.log('TIN validation:', result);
  return result;
}

/**
 * Pre-transmission validation
 */
export async function validateTransmission() {
  const result = await IrsService.transmissionCheck({
    requestBody: {
      transmitterId: 'ABCDE',
      filer: {
        ein: '12-3456789',
        name: 'Acme Corporation',
      },
      taxYear: 2024,
      payees: [
        {
          tin: '98-7654321',
          name: 'John Doe',
          amounts: {
            nonemployeeCompensation: 5000,
          },
        },
      ],
    },
  });
  console.log('Transmission check:', result);
  return result;
}

/**
 * Get form schema
 */
export async function getFormSchema(formType: '1099-NEC' | '1099-MISC' | '1099-INT' | '1099-DIV' | '1099-B' | '1099-R' | '1099-S' | 'W-2' | 'W-2G' | '1042-S' | 3921 | 3922) {
  const schema = await IrsService.getFormSchema({ formType });
  console.log('Form schema:', schema);
  return schema;
}

// ============================================================================
// BSO (Business Services Online) API Examples
// ============================================================================

/**
 * Register BSO user
 */
export async function registerBsoUser() {
  const result = await BsoService.bsoRegisterUser({
    requestBody: {
      username: 'testuser',
      email: 'test@example.com',
      password: 'SecurePassword123!',
      securityQuestions: [
        {
          question: 'What is your mother\'s maiden name?',
          answer: 'Smith',
        },
      ],
    },
  });
  console.log('BSO registration:', result);
  return result;
}

/**
 * Submit W-2 EFW2 file
 */
export async function submitW2() {
  const result = await BsoService.bsoSubmitW2({
    formData: {
      ein: '123456789',
      taxYear: '2024',
      file: 'base64-encoded-file-content-or-file-path',
    },
  });
  console.log('W-2 submission:', result);
  return result;
}

/**
 * Get W-2 submission status
 */
export async function getW2SubmissionStatus(batchId: string) {
  const status = await BsoService.bsoGetSubmissionStatus({ batchId });
  console.log('W-2 submission status:', status);
  return status;
}

// ============================================================================
// Ledger API Examples
// ============================================================================

/**
 * List all entities
 */
export async function listEntities() {
  const entities = await LedgerService.listEntities();
  console.log('Entities:', entities);
  return entities;
}

/**
 * Create new entity
 */
export async function createEntity() {
  const entity = await LedgerService.createEntity({
    requestBody: {
      name: 'Smith Family Trust',
      type: EntityCreate.type.TRUST,
      ein: '12-3456789',
      taxYear: '2024',
    },
  });
  console.log('Created entity:', entity);
  return entity;
}

/**
 * Get entity details
 */
export async function getEntity(entityId: string) {
  const entity = await LedgerService.getEntity({ entityId });
  console.log('Entity:', entity);
  return entity;
}

/**
 * List journal entries
 */
export async function listJournalEntries(params?: {
  entityId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const entries = await LedgerService.listJournals({
    ...params,
  });
  console.log('Journal entries:', entries);
  return entries;
}

/**
 * Create journal entry
 */
export async function createJournalEntry() {
  const entry = await LedgerService.createJournalEntry({
    requestBody: {
      entityId: 'entity-uuid',
      date: '2024-01-15',
      description: 'Initial funding',
      lines: [
        {
          accountId: 'account-uuid-1',
          debit: 10000,
          credit: 0,
        },
        {
          accountId: 'account-uuid-2',
          debit: 0,
          credit: 10000,
        },
      ],
    },
  });
  console.log('Created journal entry:', entry);
  return entry;
}

/**
 * List chart of accounts
 */
export async function listAccounts(entityId: string) {
  const accounts = await LedgerService.listAccounts({ entityId });
  console.log('Accounts:', accounts);
  return accounts;
}

// ============================================================================
// Health API Examples
// ============================================================================

/**
 * System health check
 */
export async function checkHealth() {
  const health = await HealthService.healthCheck();
  console.log('System health:', health);
  return health;
}

// ============================================================================
// React Hook Example
// ============================================================================

/**
 * Example React hook for using the generated client
 */
/*
import { useEffect, useState } from 'react';
import { IrsService, type SubmissionStatus } from './generated/api-client';

export function useSubmissionStatus(receiptId: string) {
  const [status, setStatus] = useState<SubmissionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    IrsService.getSubmissionStatus({ receiptId })
      .then(setStatus)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [receiptId]);

  return { status, loading, error };
}

// Usage in component:
// function SubmissionStatus({ receiptId }: { receiptId: string }) {
//   const { status, loading, error } = useSubmissionStatus(receiptId);
//
//   if (loading) return <div>Loading...</div>;
//   if (error) return <div>Error: {error.message}</div>;
//
//   return (
//     <div>
//       <h3>Submission Status</h3>
//       <p>Status: {status?.status}</p>
//       <p>Records: {status?.recordCount}</p>
//     </div>
//   );
// }
*/

// ============================================================================
// Error Handling Example
// ============================================================================

/**
 * Example with proper error handling
 */
export async function submitWithErrorHandling() {
  try {
    const result = await IrsService.submitReturns({
      requestBody: {
        transmitterId: 'ABCDE',
        filer: {
          ein: '12-3456789',
          name: 'Acme Corporation',
        },
        taxYear: 2024,
        payees: [],
      },
    });
    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      // Handle API errors
      console.error('API Error:', error.status, error.body);
    } else {
      // Handle other errors
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}

export {};
