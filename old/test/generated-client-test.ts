/**
 * Test Generated OpenAPI Client Against Backend
 *
 * This file tests the auto-generated TypeScript client by making
 * actual API calls to the running backend server.
 */

import { strict as assert } from 'assert';
import { describe, it } from 'node:test';
import { OpenAPI, IrsService, BsoService, LedgerService, HealthService } from '../generated/api-client/index.js';

// Configure the client to point to our backend
OpenAPI.BASE = 'http://localhost:3001';
OpenAPI.WITH_CREDENTIALS = false;

describe('Generated OpenAPI Client', () => {
  describe('HealthService', () => {
    it('should get system health', async () => {
      const health = await HealthService.healthCheck();
      console.log('[HealthService.healthCheck] Response:', health);

      assert.ok(health);
      assert.equal(health.status, 'healthy');
      assert.ok(health.timestamp);
    });

    it('should get API info', async () => {
      const info = await HealthService.getOpenAPISpec();
      console.log('[HealthService.getOpenAPISpec] Received spec (length):', info?.length || 0);
      assert.ok(info);
      assert.ok(info.includes('openapi:'));
    });
  });

  describe('IrsService', () => {
    it('should get IRIS health', async () => {
      const health = await IrsService.irisHealth();
      console.log('[IrsService.irisHealth] Response:', health);

      assert.ok(health);
      assert.equal(health.status, 'healthy');
      assert.equal(health.service, 'IRS IRIS A2A API Server');
      assert.ok(health.features);
      assert.ok(Array.isArray(health.features));
    });

    it('should generate demo JWT', async () => {
      const result = await IrsService.irisDemoAuth({
        requestBody: {
          clientId: 'test-client-id',
          userId: 'test-user-id',
          tcc: 'ABCDE',
          privateKey: 'test-private-key',
          keyId: 'test-key-id',
        },
      });
      console.log('[IrsService.irisDemoAuth] Response:', result);

      assert.ok(result);
      assert.ok(result.clientJWT);
      assert.ok(result.userJWT);
      assert.equal(typeof result.expiresIn, 'number');
    });

    it('should validate TIN', async () => {
      const result = await IrsService.validateTin({
        requestBody: {
          tin: '12-3456789',
          name: 'Test Corporation',
        },
      });
      console.log('[IrsService.validateTin] Response:', result);

      assert.ok(result);
      assert.ok(typeof result.match === 'boolean');
      assert.ok(typeof result.code === 'number');
    });

    it('should get form schema', async () => {
      const schema = await IrsService.getFormSchema({
        formType: '1099-NEC',
      });
      console.log('[IrsService.getFormSchema] Response keys:', Object.keys(schema || {}));

      assert.ok(schema);
      assert.ok(typeof schema === 'object');
    });

    it('should submit returns', async () => {
      const result = await IrsService.submitReturns({
        requestBody: {
          transmitterId: 'ABCDE',
          filer: {
            ein: '12-3456789',
            name: 'Test Corporation',
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
      console.log('[IrsService.submitReturns] Response:', result);

      assert.ok(result);
      assert.ok(result.receiptId);
      assert.equal(result.status, 'Received');
      assert.ok(result.timestamp);

      // Test getting status with the receipt ID
      const status = await IrsService.getSubmissionStatus({
        receiptId: result.receiptId!,
      });
      console.log('[IrsService.getSubmissionStatus] Response:', status);

      assert.ok(status);
      assert.equal(status.receiptId, result.receiptId);
    });

    it('should run transmission check', async () => {
      const result = await IrsService.transmissionCheck({
        requestBody: {
          transmitterId: 'ABCDE',
          filer: {
            ein: '12-3456789',
            name: 'Test Corporation',
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
      console.log('[IrsService.transmissionCheck] Response:', result);

      assert.ok(result);
      assert.ok(typeof result.valid === 'boolean');
      assert.ok(Array.isArray(result.errors));
      assert.ok(Array.isArray(result.warnings));
    });
  });

  describe('BsoService', () => {
    it('should register BSO user', async () => {
      const result = await BsoService.bsoRegisterUser({
        requestBody: {
          username: 'testuser',
          email: 'test@example.com',
          password: 'SecurePassword123!',
          securityQuestions: [
            {
              question: 'What is your favorite color?',
              answer: 'Blue',
            },
          ],
        },
      });
      console.log('[BsoService.bsoRegisterUser] Response:', result);

      assert.ok(result);
      assert.ok(result.userId);
      assert.ok(result.status);
      assert.ok(['Pending', 'Active'].includes(result.status));
    });

    it('should submit W-2', async () => {
      const result = await BsoService.bsoSubmitW2({
        formData: {
          ein: '123456789',
          taxYear: '2024',
          file: 'mock-file-content',
        },
      });
      console.log('[BsoService.bsoSubmitW2] Response:', result);

      assert.ok(result);
      assert.ok(result.batchId);
      assert.ok(result.status);

      // Test getting status
      const status = await BsoService.bsoGetSubmissionStatus({
        batchId: result.batchId!,
      });
      console.log('[BsoService.bsoGetSubmissionStatus] Response:', status);

      assert.ok(status);
      assert.equal(status.batchId, result.batchId);
    });
  });

  describe('LedgerService', () => {
    it('should list entities', async () => {
      const entities = await LedgerService.listEntities();
      console.log('[LedgerService.listEntities] Response count:', entities?.length || 0);

      assert.ok(Array.isArray(entities));
    });

    it('should create entity', async () => {
      const entity = await LedgerService.createEntity({
        requestBody: {
          name: 'Test Trust ' + Date.now(),
          type: 0, // EntityCreate.type.TRUST
          ein: '12-3456789',
          taxYear: '2024',
        },
      });
      console.log('[LedgerService.createEntity] Response:', entity);

      assert.ok(entity);
      assert.ok(entity.id);
      assert.ok(entity.name);

      // Test getting the entity
      const fetched = await LedgerService.getEntity({
        entityId: entity.id!,
      });
      console.log('[LedgerService.getEntity] Response:', fetched);

      assert.ok(fetched);
      assert.equal(fetched.id, entity.id);
    });

    it('should list journal entries', async () => {
      const entries = await LedgerService.listJournals({});
      console.log('[LedgerService.listJournals] Response count:', entries?.length || 0);

      assert.ok(Array.isArray(entries));
    });

    it('should list accounts', async () => {
      // Use a dummy entity ID for testing
      const accounts = await LedgerService.listAccounts({
        entityId: '00000000-0000-0000-0000-000000000000',
      });
      console.log('[LedgerService.listAccounts] Response count:', accounts?.length || 0);

      assert.ok(Array.isArray(accounts));
    });
  });
});
