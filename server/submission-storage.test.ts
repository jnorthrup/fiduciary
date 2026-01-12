/**
 * Tests for Submission Storage
 *
 * Test file following TDD principles:
 * 1. Submission record creation with metadata
 * 2. Submission retrieval by receipt ID
 * 3. Submission persistence across requests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'http';
import { request } from 'node:http';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';

// Test server port (different from dev server)
const TEST_PORT = 30103;

describe('Submission Storage', () => {
  let server: Server;
  let app: express.Application;

  // Shared in-memory storage (simulating production)
  const submissions = new Map();
  const tinValidationCache = new Map();

  beforeAll(() => {
    // Create Express app with middleware matching server/index.js
    app = express();

    // CORS middleware
    app.use(cors({
      origin: '*',
      credentials: true,
    }));

    // JSON body parser
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Request logging middleware
    app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });

    // ============================================================================
    // Storage Routes
    // ============================================================================

    /**
     * GET /api/storage/submissions/:receiptId
     * Retrieve submission by receipt ID
     */
    app.get('/api/storage/submissions/:receiptId', (req, res) => {
      const { receiptId } = req.params;
      const submission = submissions.get(receiptId);

      if (!submission) {
        return res.status(404).json({
          code: 'RECEIPT_NOT_FOUND',
          message: `Receipt ${receiptId} not found`,
          timestamp: new Date().toISOString()
        });
      }

      res.json(submission);
    });

    /**
     * POST /api/irs/submissions
     * Submit information return batch (with storage)
     */
    app.post('/api/irs/submissions', (req, res) => {
      const authHeader = req.headers['x-irs-tcc'] || req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({
          code: 'AUTH_MISSING_TCC',
          message: 'Missing authentication credentials',
          timestamp: new Date().toISOString()
        });
      }

      const submission = req.body;

      // Basic validation
      const errors = [];

      if (!submission.transmitterId) {
        errors.push({
          code: 'MISSING_TRANSMITTER_ID',
          message: 'Transmitter ID is required',
          field: 'transmitterId',
          severity: 'ERROR'
        });
      }

      if (!submission.filer?.ein) {
        errors.push({
          code: 'MISSING_FILER_EIN',
          message: 'Filer EIN is required',
          field: 'filer.ein',
          severity: 'ERROR'
        });
      } else {
        const einPattern = /^\d{2}-\d{7}$/;
        if (!einPattern.test(submission.filer.ein)) {
          errors.push({
            code: 'INVALID_EIN_FORMAT',
            message: 'EIN must be in format XX-XXXXXXX',
            field: 'filer.ein',
            severity: 'ERROR'
          });
        }
      }

      if (!submission.payees || submission.payees.length === 0) {
        errors.push({
          code: 'NO_PAYEES',
          message: 'At least one payee is required',
          field: 'payees',
          severity: 'ERROR'
        });
      }

      // If errors, return 400
      if (errors.length > 0) {
        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'Submission validation failed',
          errors,
          timestamp: new Date().toISOString()
        });
      }

      // Generate receipt ID
      const receiptId = randomUUID();

      // Store submission with metadata
      submissions.set(receiptId, {
        ...submission,
        receiptId,
        status: 'Processing',
        submittedAt: new Date().toISOString(),
        validation: {
          valid: true,
          errors: [],
          warnings: []
        },
        metadata: {
          ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          transmissionFormat: 'json'
        }
      });

      // Return receipt
      res.status(202).json({
        receiptId,
        status: 'Received',
        timestamp: new Date().toISOString(),
        message: 'Your submission has been received and is being processed.'
      });
    });

    // Start test server
    server = createServer(app).listen(TEST_PORT);
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('Submission Record Creation', () => {
    it('should create submission record with receipt ID', async () => {
      const response = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/submissions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-irs-tcc': 'T123456789',
        },
        body: JSON.stringify({
          transmitterId: '1234567890',
          filer: { ein: '12-3456789' },
          payees: [{ tin: '12-3456789', name: 'Test Payee' }]
        }),
      });

      expect(response.statusCode).toBe(202);
      const body = JSON.parse(response.body);
      expect(body.receiptId).toBeDefined();
      expect(body.receiptId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
      expect(body.status).toBe('Received');
    });

    it('should store submission with metadata', async () => {
      const receiptId = await createTestSubmission({
        transmitterId: '1234567890',
        filer: { ein: '12-3456789' },
        payees: [{ tin: '12-3456789', name: 'Metadata Test' }]
      });

      const submission = submissions.get(receiptId);
      expect(submission).toBeDefined();
      expect(submission.receiptId).toBe(receiptId);
      expect(submission.submittedAt).toBeDefined();
      expect(submission.status).toBe('Processing');
      expect(submission.validation).toBeDefined();
      expect(submission.validation.valid).toBe(true);
      expect(submission.metadata).toBeDefined();
      expect(submission.metadata.transmissionFormat).toBe('json');
    });

    it('should store filer information with submission', async () => {
      const receiptId = await createTestSubmission({
        transmitterId: '1234567890',
        filer: { ein: '12-3456789', name: 'Test Filer Inc' },
        payees: [{ tin: '12-3456789', name: 'Test Payee' }]
      });

      const submission = submissions.get(receiptId);
      expect(submission.filer).toBeDefined();
      expect(submission.filer.ein).toBe('12-3456789');
      expect(submission.filer.name).toBe('Test Filer Inc');
    });

    it('should store payee data with submission', async () => {
      const payees = [
        { tin: '12-3456789', name: 'Payee One', amount: 1000 },
        { tin: '98-7654321', name: 'Payee Two', amount: 2000 }
      ];

      const receiptId = await createTestSubmission({
        transmitterId: '1234567890',
        filer: { ein: '12-3456789' },
        payees
      });

      const submission = submissions.get(receiptId);
      expect(submission.payees).toHaveLength(2);
      expect(submission.payees[0].name).toBe('Payee One');
      expect(submission.payees[0].amount).toBe(1000);
      expect(submission.payees[1].name).toBe('Payee Two');
    });

    it('should include validation results in stored submission', async () => {
      const receiptId = await createTestSubmission({
        transmitterId: '1234567890',
        filer: { ein: '12-3456789' },
        payees: [{ tin: '12-3456789', name: 'Test Payee' }]
      });

      const submission = submissions.get(receiptId);
      expect(submission.validation).toBeDefined();
      expect(submission.validation.valid).toBe(true);
      expect(submission.validation.errors).toEqual([]);
      expect(submission.validation.warnings).toEqual([]);
    });
  });

  describe('Submission Retrieval by Receipt ID', () => {
    it('should retrieve submission by receipt ID via API', async () => {
      const receiptId = await createTestSubmission({
        transmitterId: '1234567890',
        filer: { ein: '12-3456789' },
        payees: [{ tin: '12-3456789', name: 'Retrieve Test' }]
      });

      const response = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: `/api/storage/submissions/${receiptId}`,
        method: 'GET',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.receiptId).toBe(receiptId);
      expect(body.filer.ein).toBe('12-3456789');
      expect(body.payees).toHaveLength(1);
    });

    it('should return 404 for non-existent receipt ID', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: `/api/storage/submissions/${fakeId}`,
        method: 'GET',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('RECEIPT_NOT_FOUND');
      expect(body.message).toContain(fakeId);
    });

    it('should retrieve all submission metadata', async () => {
      const receiptId = await createTestSubmission({
        transmitterId: '1234567890',
        filer: { ein: '12-3456789' },
        payees: [{ tin: '12-3456789', name: 'Full Metadata Test' }]
      });

      const response = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: `/api/storage/submissions/${receiptId}`,
        method: 'GET',
      });

      const body = JSON.parse(response.body);
      expect(body.receiptId).toBeDefined();
      expect(body.status).toBeDefined();
      expect(body.submittedAt).toBeDefined();
      expect(body.validation).toBeDefined();
      expect(body.metadata).toBeDefined();
    });

    it('should persist submission data across multiple requests', async () => {
      // Create submission
      const receiptId = await createTestSubmission({
        transmitterId: '1234567890',
        filer: { ein: '12-3456789' },
        payees: [{ tin: '12-3456789', name: 'Persistence Test' }]
      });

      // First retrieval
      const response1 = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: `/api/storage/submissions/${receiptId}`,
        method: 'GET',
      });
      expect(response1.statusCode).toBe(200);
      const body1 = JSON.parse(response1.body);

      // Second retrieval (should be same data)
      const response2 = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: `/api/storage/submissions/${receiptId}`,
        method: 'GET',
      });
      expect(response2.statusCode).toBe(200);
      const body2 = JSON.parse(response2.body);

      expect(body1.receiptId).toBe(body2.receiptId);
      expect(body1.filer.ein).toBe(body2.filer.ein);
    });
  });

  describe('Submission Audit Trail', () => {
    it('should track submission timestamp', async () => {
      const beforeTime = new Date().toISOString();
      const receiptId = await createTestSubmission({
        transmitterId: '1234567890',
        filer: { ein: '12-3456789' },
        payees: [{ tin: '12-3456789', name: 'Timestamp Test' }]
      });
      const afterTime = new Date().toISOString();

      const submission = submissions.get(receiptId);
      const submittedAt = submission.submittedAt;
      expect(submittedAt >= beforeTime).toBe(true);
      expect(submittedAt <= afterTime).toBe(true);
    });

    it('should include metadata for audit purposes', async () => {
      const receiptId = await createTestSubmission({
        transmitterId: '1234567890',
        filer: { ein: '12-3456789' },
        payees: [{ tin: '12-3456789', name: 'Audit Test' }]
      });

      const submission = submissions.get(receiptId);
      expect(submission.metadata).toBeDefined();
      expect(submission.metadata.ipAddress).toBeDefined();
      expect(submission.metadata.userAgent).toBeDefined();
      expect(submission.metadata.transmissionFormat).toBeDefined();
    });
  });
});

/**
 * Helper function to create a test submission
 */
async function createTestSubmission(data: any): Promise<string> {
  const response = await makeRequest({
    hostname: 'localhost',
    port: 30103,
    path: '/api/irs/submissions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-irs-tcc': 'T123456789',
    },
    body: JSON.stringify(data),
  });

  const body = JSON.parse(response.body);
  return body.receiptId;
}

/**
 * Helper function to make HTTP requests
 */
function makeRequest(options: {
  hostname: string;
  port: number;
  path: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<{
  statusCode: number;
  body: string;
}> {
  return new Promise((resolve, reject) => {
    const req = request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 200,
          body: data,
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}
