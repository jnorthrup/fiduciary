/**
 * Tests for IRS API Server Middleware
 *
 * Test file following TDD principles:
 * 1. CORS middleware configuration
 * 2. Request logging middleware
 * 3. Express app initialization
 */

import { describe, it, expect, beforeAll, afterAll, vi, afterEach } from 'vitest';
import { createServer, type Server } from 'http';
import { request } from 'node:http';
import express from 'express';
import cors from 'cors';

// Test server port (different from dev server)
const TEST_PORT = 30101;

describe('Express Server Setup', () => {
  let server: Server;
  let app: express.Application;

  beforeAll(() => {
    // Create Express app with middleware
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
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });

    // Test endpoint
    app.get('/test', (req, res) => {
      res.json({ message: 'test' });
    });

    // Start test server
    server = createServer(app).listen(TEST_PORT);
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('CORS Middleware', () => {
    it('should include Access-Control-Allow-Origin header', async () => {
      const response = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/test',
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:3000',
        },
      });

      expect(response.headers['access-control-allow-origin']).toBe('*');
    });

    it('should include Access-Control-Allow-Credentials header', async () => {
      const response = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/test',
        method: 'GET',
      });

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should accept requests from any origin', async () => {
      const origins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://example.com',
        'http://192.168.1.1:3000',
      ];

      for (const origin of origins) {
        const response = await makeRequest({
          hostname: 'localhost',
          port: TEST_PORT,
          path: '/test',
          method: 'GET',
          headers: { Origin: origin },
        });

        expect(response.headers['access-control-allow-origin']).toBe('*');
      }
    });
  });

  describe('JSON Body Parser', () => {
    it('should parse JSON requests', async () => {
      app.post('/echo', (req, res) => {
        res.json(req.body);
      });

      const response = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/echo',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'data' }),
      });

      expect(response.statusCode).toBe(200);
    });

    it('should handle empty JSON body', async () => {
      app.post('/echo', (req, res) => {
        res.json(req.body);
      });

      const response = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/echo',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{}',
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Request Logging', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should log requests to console', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log');

      await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/test',
        method: 'GET',
      });

      // Verify console.log was called with timestamp and request info
      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0][0];
      expect(logCall).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z GET \/test/);
    });

    it('should log different HTTP methods', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log');

      app.post('/test-post', (req, res) => {
        res.json({});
      });

      await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/test-post',
        method: 'POST',
        body: '{}',
        headers: { 'Content-Type': 'application/json' },
      });

      const logCall = consoleLogSpy.mock.calls[0][0];
      expect(logCall).toContain('POST /test-post');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for undefined routes', async () => {
      const response = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/nonexistent',
        method: 'GET',
      });

      expect(response.statusCode).toBe(404);
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
  headers: Record<string, string>;
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
          headers: res.headers as Record<string, string>,
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
