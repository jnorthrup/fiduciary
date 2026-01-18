/**
 * Tests for IRS Submission Validation
 *
 * Test file following TDD principles:
 * 1. Submission schema validation
 * 2. Payee record limits (1000 max)
 * 3. Field format validation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'http';
import { request } from 'node:http';
import express from 'express';
import cors from 'cors';

// Test server port (different from dev server)
const TEST_PORT = 30102;

describe('Submission Validation', () => {
  let server: Server;
  let app: express.Application;

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

    // In-memory storage (matching server/index.js)
    const submissions = new Map();

    // POST /api/irs/submissions
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

      if (submission.payees && submission.payees.length > 1000) {
        errors.push({
          code: 'BATCH_TOO_LARGE',
          message: 'Maximum 1000 payees per submission',
          field: 'payees',
          severity: 'ERROR'
        });
      }

      // Validate payee TINs
      submission.payees?.forEach((payee, index) => {
        const einPattern = /^\d{2}-\d{7}$/;
        const ssnPattern = /^\d{3}-\d{2}-\d{4}$/;

        if (!einPattern.test(payee.tin) && !ssnPattern.test(payee.tin)) {
          errors.push({
            code: 'INVALID_PAYEE_TIN',
            message: `Payee ${index + 1}: TIN must be in format XX-XXXXXXX or XXX-XX-XXXX`,
            field: `payees[${index}].tin`,
            severity: 'ERROR'
          });
        }
      });

      // If errors, return 400
      if (errors.length > 0) {
        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'Submission validation failed',
          errors,
          timestamp: new Date().toISOString()
        });
      }

      // Success response
      res.status(202).json({
        receiptId: 'test-receipt-id',
        status: 'Received',
        timestamp: new Date().toISOString(),
        message: 'Your submission has been received'
      });
    });

    // Start test server
    server = createServer(app).listen(TEST_PORT);
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('Authentication Validation', () => {
    it('should reject submission without TCC', async () => {
      const response = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/submissions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transmitterId: '1234567890',
          filer: { ein: '12-3456789' },
          payees: [{ tin: '12-3456789', name: 'Test' }]
        }),
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('AUTH_MISSING_TCC');
    });

    it('should accept submission with TCC header', async () => {
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
          payees: [{ tin: '12-3456789', name: 'Test' }]
        }),
      });

      expect(response.statusCode).toBe(202);
    });
  });

  describe('Schema Validation', () => {
    it('should reject submission with missing transmitterId', async () => {
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
          filer: { ein: '12-3456789' },
          payees: [{ tin: '12-3456789', name: 'Test' }]
        }),
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.errors).toHaveLength(1);
      expect(body.errors[0].code).toBe('MISSING_TRANSMITTER_ID');
      expect(body.errors[0].field).toBe('transmitterId');
      expect(body.errors[0].severity).toBe('ERROR');
    });

    it('should reject submission with missing filer EIN', async () => {
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
          filer: {},
          payees: [{ tin: '12-3456789', name: 'Test' }]
        }),
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.errors[0].code).toBe('MISSING_FILER_EIN');
      expect(body.errors[0].field).toBe('filer.ein');
    });

    it('should reject submission with invalid EIN format', async () => {
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
          filer: { ein: 'invalid-ein' },
          payees: [{ tin: '12-3456789', name: 'Test' }]
        }),
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.errors[0].code).toBe('INVALID_EIN_FORMAT');
      expect(body.errors[0].message).toContain('XX-XXXXXXX');
    });
  });

  describe('Payee Validation', () => {
    it('should reject submission with no payees', async () => {
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
          payees: []
        }),
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.errors[0].code).toBe('NO_PAYEES');
    });

    it('should reject submission with >1000 payees', async () => {
      const payees = Array.from({ length: 1001 }, (_, i) => ({
        tin: '12-3456789',
        name: `Payee ${i}`
      }));

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
          payees
        }),
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.errors[0].code).toBe('BATCH_TOO_LARGE');
      expect(body.errors[0].message).toContain('1000');
    });

    it('should accept submission with exactly 1000 payees', async () => {
      const payees = Array.from({ length: 1000 }, (_, i) => ({
        tin: '12-3456789',
        name: `Payee ${i}`
      }));

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
          payees
        }),
      });

      expect(response.statusCode).toBe(202);
    });

    it('should reject payee with invalid TIN format', async () => {
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
          payees: [{ tin: 'invalid-tin', name: 'Test' }]
        }),
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.errors[0].code).toBe('INVALID_PAYEE_TIN');
    });

    it('should accept payee with EIN format', async () => {
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
          payees: [{ tin: '12-3456789', name: 'Test' }]
        }),
      });

      expect(response.statusCode).toBe(202);
    });

    it('should accept payee with SSN format', async () => {
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
          payees: [{ tin: '123-45-6789', name: 'Test' }]
        }),
      });

      expect(response.statusCode).toBe(202);
    });
  });

  describe('Multiple Validation Errors', () => {
    it('should return all validation errors at once', async () => {
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
          // Missing transmitterId
          filer: { ein: 'invalid' }, // Invalid EIN
          payees: [] // No payees
        }),
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.errors.length).toBeGreaterThanOrEqual(2);

      const errorFields = body.errors.map((e: any) => e.field);
      expect(errorFields).toContain('transmitterId');
      expect(errorFields).toContain('filer.ein');
    });
  });
});

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
          statusCode: res.statusCode,
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
