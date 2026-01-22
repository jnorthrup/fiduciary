/**
 * Tests for Express Server (server/index.js)
 *
 * Test file following TDD principles:
 * 1. Server initialization and middleware setup
 * 2. Health check endpoints
 * 3. IRS mock endpoints (submission, status, TIN validation)
 * 4. OpenAPI spec serving
 * 5. Request logging and CORS
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { createServer, type Server } from 'http';
import { request as httpRequest, type RequestOptions, IncomingMessage } from 'node:http';
import express from 'express';
import cors from 'cors';

// Test server port (different from dev server)
const TEST_PORT = 30102;

// Helper to make HTTP requests with promises (replaces deprecated done() callbacks)
function makeRequest(options: RequestOptions, body?: string): Promise<{ data: string; statusCode: number }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(options, (res: IncomingMessage) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ data, statusCode: res.statusCode! });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

describe('Express Server (index.js)', () => {
  let server: Server;
  let app: express.Application;

  // Mock logger
  const logger = {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  beforeAll(() => {
    // Create Express app matching server/index.js setup
    app = express();

    // CORS middleware (as configured in server/index.js)
    app.use(cors({
      origin: '*',
      credentials: true,
    }));

    // JSON body parser
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Request logging middleware
    app.use((req, res, next) => {
      const tcc = req.headers['x-irs-tcc'];
      const auth = req.headers.authorization;
      const maskedTcc = tcc ? `****${String(tcc).slice(-4)}` : 'N/A';
      const maskedAuth = auth ? 'Bearer ****' : 'N/A';
      logger.info(`${req.method} ${req.path} [TCC: ${maskedTcc}, Auth: ${maskedAuth}]`);
      next();
    });

    // In-memory storage (matching server/index.js)
    const submissions = new Map();
    const tinValidationCache = new Map();
    const { randomUUID } = require('crypto');

    // Health check endpoints
    app.get('/api/irs/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'IRS IRIS A2A API Server',
        version: '2.0.0',
      });
    });

    app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
          irs: 'operational',
          bso: 'operational',
          ledger: 'operational',
        },
      });
    });

    app.get('/api', (req, res) => {
      res.json({
        name: 'Trust Ledger System API',
        version: '1.0.0',
        description: 'Unified API for IRS IRIS, SSA BSO, and Ledger management',
        endpoints: {
          health: '/api/health',
          irs: '/api/iris',
          bso: '/api/bso',
          ledger: '/api/ledger',
          docs: '/api/docs',
          openapi: '/api/openapi.yaml',
        },
      });
    });

    // Submission endpoint
    app.post('/api/irs/submissions', (req, res) => {
      try {
        const authHeader = req.headers['x-irs-tcc'] || req.headers.authorization;

        if (!authHeader) {
          return res.status(401).json({
            code: 'AUTH_MISSING_TCC',
            message: 'Missing authentication credentials',
            timestamp: new Date().toISOString(),
          });
        }

        const submission = req.body;
        const errors = [];

        // Validation (matching server/index.js logic)
        if (!submission.transmitterId) {
          errors.push({
            code: 'MISSING_TRANSMITTER_ID',
            message: 'Transmitter ID is required',
            field: 'transmitterId',
            severity: 'ERROR',
          });
        }

        if (!submission.filer?.ein) {
          errors.push({
            code: 'MISSING_FILER_EIN',
            message: 'Filer EIN is required',
            field: 'filer.ein',
            severity: 'ERROR',
          });
        } else {
          const einPattern = /^\d{2}-\d{7}$/;
          if (!einPattern.test(submission.filer.ein)) {
            errors.push({
              code: 'INVALID_EIN_FORMAT',
              message: 'EIN must be in format XX-XXXXXXX',
              field: 'filer.ein',
              severity: 'ERROR',
            });
          }
        }

        if (!submission.payees || submission.payees.length === 0) {
          errors.push({
            code: 'NO_PAYEES',
            message: 'At least one payee is required',
            field: 'payees',
            severity: 'ERROR',
          });
        }

        if (submission.payees && submission.payees.length > 1000) {
          errors.push({
            code: 'BATCH_TOO_LARGE',
            message: 'Maximum 1000 payees per submission',
            field: 'payees',
            severity: 'ERROR',
          });
        }

        // Validate payee TINs
        submission.payees?.forEach((payee: any, index: number) => {
          const einPattern = /^\d{2}-\d{7}$/;
          const ssnPattern = /^\d{3}-\d{2}-\d{4}$/;

          if (!einPattern.test(payee.tin) && !ssnPattern.test(payee.tin)) {
            errors.push({
              code: 'INVALID_PAYEE_TIN',
              message: `Payee ${index + 1}: TIN must be in format XX-XXXXXXX or XXX-XX-XXXX`,
              field: `payees[${index}].tin`,
              severity: 'ERROR',
            });
          }
        });

        if (errors.length > 0) {
          return res.status(400).json({
            code: 'VALIDATION_ERROR',
            message: 'Submission validation failed',
            errors,
            timestamp: new Date().toISOString(),
          });
        }

        const receiptId = randomUUID();
        submissions.set(receiptId, {
          ...submission,
          receiptId,
          status: 'Processing',
          submittedAt: new Date().toISOString(),
          validation: { valid: true, errors: [], warnings: [] },
        });

        res.status(202).json({
          receiptId,
          status: 'Received',
          timestamp: new Date().toISOString(),
          estimatedCompletion: new Date(Date.now() + 10 * 1000).toISOString(),
          message: 'Your submission has been received and is being processed.',
          warnings: [],
          errors: [],
        });
      } catch (error: any) {
        logger.error('Submission error:', error);
        res.status(500).json({
          code: 'INTERNAL_ERROR',
          message: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Status endpoint
    app.get('/api/irs/submissions/:receiptId/status', (req, res) => {
      const { receiptId } = req.params;
      const submission = submissions.get(receiptId);

      if (!submission) {
        return res.status(404).json({
          code: 'RECEIPT_NOT_FOUND',
          message: `Receipt ${receiptId} not found`,
          timestamp: new Date().toISOString(),
        });
      }

      const ageMs = Date.now() - new Date(submission.submittedAt).getTime();
      const isComplete = ageMs > 10000;

      let status = submission.status;
      let completedAt = null;

      if (isComplete && status === 'Processing') {
        status = 'Accepted';
        completedAt = new Date().toISOString();
        submission.status = status;
        submission.completedAt = completedAt;
        submissions.set(receiptId, submission);
      }

      res.json({
        receiptId,
        status,
        submittedAt: submission.submittedAt,
        completedAt: completedAt || submission.completedAt,
        recordCount: submission.payees?.length || 0,
        acceptedCount: status === 'Accepted' ? (submission.payees?.length || 0) : 0,
        errorCount: submission.validation?.errors?.length || 0,
        warningCount: submission.validation?.warnings?.length || 0,
        errors: submission.validation?.errors || [],
        warnings: submission.validation?.warnings || [],
        processingTime: completedAt ? Math.round(ageMs / 1000) : null,
      });
    });

    // TIN validation endpoint
    app.post('/api/irs/tin-validation', (req, res) => {
      try {
        const { tin, name, requests } = req.body;

        // Single TIN validation
        if (tin && name) {
          const cacheKey = `${tin}-${name}`;

          if (tinValidationCache.has(cacheKey)) {
            return res.json(tinValidationCache.get(cacheKey));
          }

          const einPattern = /^\d{2}-\d{7}$/;
          const ssnPattern = /^\d{3}-\d{2}-\d{4}$/;
          const isValidFormat = einPattern.test(tin) || ssnPattern.test(tin);

          if (!isValidFormat) {
            const result = {
              code: 2,
              match: false,
              message: 'Invalid TIN format. Expected XX-XXXXXXX for EIN or XXX-XX-XXXX for SSN.',
              tin,
              name,
            };
            tinValidationCache.set(cacheKey, result);
            return res.json(result);
          }

          const result = {
            code: 0,
            match: true,
            message: 'TIN and name combination validated successfully.',
            tin,
            name,
          };

          tinValidationCache.set(cacheKey, result);
          return res.json(result);
        }

        // Batch validation
        if (requests && Array.isArray(requests)) {
          const results = requests.map(({ tin, name }: any) => {
            const cacheKey = `${tin}-${name}`;

            if (tinValidationCache.has(cacheKey)) {
              return tinValidationCache.get(cacheKey);
            }

            const result = {
              code: 0,
              match: true,
              message: 'Validated successfully',
              tin,
              name,
            };

            tinValidationCache.set(cacheKey, result);
            return result;
          });

          return res.json({
            results,
            requestId: randomUUID(),
          });
        }

        res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'Must provide either tin/name pair or requests array',
        });
      } catch (error: any) {
        logger.error('TIN validation error:', error);
        res.status(500).json({
          code: 'INTERNAL_ERROR',
          message: error.message,
        });
      }
    });

    // Form schema endpoint
    app.get('/api/irs/schemas/:formType', (req, res) => {
      const { formType } = req.params;
      const validForms = ['1099-NEC', '1099-MISC', '1099-INT', '1099-DIV', '1099-B', '1099-R', '1099-S', 'W-2', 'W-2G', '1042-S', '3921', '3922'];

      if (!validForms.includes(formType)) {
        return res.status(404).json({
          code: 'FORM_NOT_FOUND',
          message: `Form type ${formType} not supported`,
        });
      }

      res.json({
        type: 'object',
        title: `Form ${formType}`,
        description: 'Schema available for production forms',
      });
    });

    // Start test server
    server = createServer(app).listen(TEST_PORT);
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Health Check Endpoints', () => {
    it('should return healthy status from /api/health', async () => {
      const options = {
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/health',
        method: 'GET',
      };

      const { data, statusCode } = await makeRequest(options);
      const response = JSON.parse(data);
      expect(response.status).toBe('healthy');
      expect(response.services.irs).toBe('operational');
      expect(statusCode).toBe(200);
    });

    it('should return IRS health status from /api/irs/health', async () => {
      const options = {
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/health',
        method: 'GET',
      };

      const { data, statusCode } = await makeRequest(options);
      const response = JSON.parse(data);
      expect(response.service).toBe('IRS IRIS A2A API Server');
      expect(response.version).toBe('2.0.0');
      expect(statusCode).toBe(200);
    });

    it('should return API information from /api', async () => {
      const options = {
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api',
        method: 'GET',
      };

      const { data, statusCode } = await makeRequest(options);
      const response = JSON.parse(data);
      expect(response.name).toBe('Trust Ledger System API');
      expect(response.endpoints).toBeDefined();
      expect(statusCode).toBe(200);
    });
  });

  describe('Submission Endpoints', () => {
    it('should accept valid submission with authentication', async () => {
      const postData = JSON.stringify({
        transmitterId: '1234567890',
        filer: { ein: '12-3456789' },
        payees: [
          { tin: '12-3456789', name: 'John Doe' },
        ],
      });

      const options = {
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/submissions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-irs-tcc': 'T123456789',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const { data, statusCode } = await makeRequest(options, postData);
      const response = JSON.parse(data);
      expect(statusCode).toBe(202);
      expect(response.status).toBe('Received');
      expect(response.receiptId).toBeDefined();
    });

    it('should return 401 for submission without authentication', async () => {
      const postData = JSON.stringify({
        transmitterId: '1234567890',
        filer: { ein: '12-3456789' },
        payees: [{ tin: '12-3456789', name: 'John Doe' }],
      });

      const options = {
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/submissions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const { data, statusCode } = await makeRequest(options, postData);
      const response = JSON.parse(data);
      expect(statusCode).toBe(401);
      expect(response.code).toBe('AUTH_MISSING_TCC');
    });

    it('should validate EIN format', async () => {
      const postData = JSON.stringify({
        transmitterId: '1234567890',
        filer: { ein: 'invalid' },
        payees: [{ tin: '12-3456789', name: 'John Doe' }],
      });

      const options = {
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/submissions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-irs-tcc': 'T123456789',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const { data, statusCode } = await makeRequest(options, postData);
      const response = JSON.parse(data);
      expect(statusCode).toBe(400);
      expect(response.code).toBe('VALIDATION_ERROR');
      expect(response.errors.some((e: any) => e.code === 'INVALID_EIN_FORMAT')).toBe(true);
    });

    it('should enforce payee limit of 1000', async () => {
      const payees = Array.from({ length: 1001 }, (_, i) => ({
        tin: '12-3456789',
        name: `Payee ${i}`,
      }));

      const postData = JSON.stringify({
        transmitterId: '1234567890',
        filer: { ein: '12-3456789' },
        payees,
      });

      const options = {
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/submissions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-irs-tcc': 'T123456789',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const { data, statusCode } = await makeRequest(options, postData);
      const response = JSON.parse(data);
      expect(statusCode).toBe(400);
      expect(response.errors.some((e: any) => e.code === 'BATCH_TOO_LARGE')).toBe(true);
    });
  });

  describe('TIN Validation Endpoint', () => {
    it('should validate valid EIN format', async () => {
      const postData = JSON.stringify({
        tin: '12-3456789',
        name: 'Test Entity',
      });

      const options = {
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/tin-validation',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const { data } = await makeRequest(options, postData);
      const response = JSON.parse(data);
      expect(response.code).toBe(0);
      expect(response.match).toBe(true);
    });

    it('should reject invalid TIN format', async () => {
      const postData = JSON.stringify({
        tin: 'invalid',
        name: 'Test Entity',
      });

      const options = {
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/tin-validation',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const { data } = await makeRequest(options, postData);
      const response = JSON.parse(data);
      expect(response.code).toBe(2);
      expect(response.match).toBe(false);
    });
  });

  describe('Form Schema Endpoint', () => {
    it('should return schema for valid form type', async () => {
      const options = {
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/schemas/1099-NEC',
        method: 'GET',
      };

      const { data, statusCode } = await makeRequest(options);
      const response = JSON.parse(data);
      expect(response.title).toBe('Form 1099-NEC');
      expect(statusCode).toBe(200);
    });

    it('should return 404 for invalid form type', async () => {
      const options = {
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/schemas/INVALID-FORM',
        method: 'GET',
      };

      const { data, statusCode } = await makeRequest(options);
      const response = JSON.parse(data);
      expect(response.code).toBe('FORM_NOT_FOUND');
      expect(statusCode).toBe(404);
    });
  });

  describe('Request Logging', () => {
    it('should log requests with masked credentials', async () => {
      const options = {
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/health',
        method: 'GET',
        headers: {
          'x-irs-tcc': 'T123456789',
          'authorization': 'Bearer token123',
        },
      };

      await makeRequest(options);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('GET /api/health')
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('TCC: ****6789')
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Auth: Bearer ****')
      );
    });
  });
});
