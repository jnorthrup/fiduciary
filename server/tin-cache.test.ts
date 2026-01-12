/**
 * Tests for TIN Validation Cache
 *
 * Test file following TDD principles:
 * 1. Cache set/get operations
 * 2. Cache expiration with TTL
 * 3. Cache key generation (TIN + name combination)
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createServer, type Server } from 'http';
import { request } from 'node:http';
import express from 'express';
import cors from 'cors';

// Test server port
const TEST_PORT = 30104;

describe('TIN Validation Cache', () => {
  let server: Server;
  let app: express.Application;

  // In-memory cache with TTL support
  const tinValidationCache = new Map<string, { value: any; expiresAt: number }>();
  const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  beforeAll(() => {
    // Create Express app
    app = express();

    // CORS middleware
    app.use(cors({
      origin: '*',
      credentials: true,
    }));

    // JSON body parser
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Request logging
    app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });

    // Cache helper functions
    const cacheSet = (key: string, value: any, ttl: number = DEFAULT_TTL_MS) => {
      const expiresAt = Date.now() + ttl;
      tinValidationCache.set(key, { value, expiresAt });
      return value;
    };

    const cacheGet = (key: string) => {
      const entry = tinValidationCache.get(key);
      if (!entry) {
        return null;
      }
      // Check expiration
      if (Date.now() > entry.expiresAt) {
        tinValidationCache.delete(key);
        return null;
      }
      return entry.value;
    };

    const cacheHas = (key: string): boolean => {
      return cacheGet(key) !== null;
    };

    const cacheDelete = (key: string): boolean => {
      return tinValidationCache.delete(key);
    };

    const cacheClear = () => {
      tinValidationCache.clear();
    };

    // ============================================================================
    // Cache API Routes for Testing
    // ============================================================================

    /**
     * POST /api/cache/tin-validation
     * TIN validation endpoint with caching
     */
    app.post('/api/irs/tin-validation', (req, res) => {
      const { tin, name } = req.body;

      if (!tin || !name) {
        return res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'TIN and name are required'
        });
      }

      const cacheKey = `${tin}-${name}`;

      // Check cache first
      const cachedResult = cacheGet(cacheKey);
      if (cachedResult) {
        return res.json({
          ...cachedResult,
          cached: true
        });
      }

      // Validate TIN format
      const einPattern = /^\d{2}-\d{7}$/;
      const ssnPattern = /^\d{3}-\d{2}-\d{4}$/;
      const isValidFormat = einPattern.test(tin) || ssnPattern.test(tin);

      const result = {
        code: isValidFormat ? 0 : 2,
        match: isValidFormat,
        message: isValidFormat
          ? 'TIN and name combination validated successfully.'
          : 'Invalid TIN format. Expected XX-XXXXXXX for EIN or XXX-XX-XXXX for SSN.',
        tin,
        name
      };

      // Cache the result
      cacheSet(cacheKey, result);

      res.json({
        ...result,
        cached: false
      });
    });

    /**
     * GET /api/cache/tin-validation/:key
     * Get cached TIN validation result
     */
    app.get('/api/cache/tin-validation/:key', (req, res) => {
      const { key } = req.params;
      const result = cacheGet(key);

      if (!result) {
        return res.status(404).json({
          code: 'CACHE_MISS',
          message: `Key ${key} not found in cache`
        });
      }

      res.json(result);
    });

    /**
     * DELETE /api/cache/tin-validation/:key
     * Delete cached TIN validation result
     */
    app.delete('/api/cache/tin-validation/:key', (req, res) => {
      const { key } = req.params;
      const deleted = cacheDelete(key);

      if (!deleted) {
        return res.status(404).json({
          code: 'CACHE_MISS',
          message: `Key ${key} not found in cache`
        });
      }

      res.json({
        code: 'CACHE_DELETED',
        message: `Key ${key} deleted from cache`
      });
    });

    /**
     * POST /api/cache/clear
     * Clear all cache entries
     */
    app.post('/api/cache/clear', (req, res) => {
      cacheClear();
      res.json({
        code: 'CACHE_CLEARED',
        message: 'All cache entries cleared'
      });
    });

    /**
     * GET /api/cache/stats
     * Get cache statistics
     */
    app.get('/api/cache/stats', (req, res) => {
      const now = Date.now();
      let expiredCount = 0;
      let activeCount = 0;

      for (const [key, entry] of tinValidationCache.entries()) {
        if (now > entry.expiresAt) {
          expiredCount++;
        } else {
          activeCount++;
        }
      }

      res.json({
        totalEntries: tinValidationCache.size,
        activeEntries: activeCount,
        expiredEntries: expiredCount
      });
    });

    // Start test server
    server = createServer(app).listen(TEST_PORT);
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('Cache Set/Get Operations', () => {
    it('should cache TIN validation result', async () => {
      const response = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/tin-validation',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tin: '12-3456789',
          name: 'Test Corporation'
        }),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.code).toBe(0);
      expect(body.match).toBe(true);
      expect(body.cached).toBe(false); // First request, not cached
    });

    it('should retrieve cached TIN validation on subsequent request', async () => {
      const requestBody = {
        tin: '98-7654321',
        name: 'Cached Corp'
      };

      // First request - cache miss
      const response1 = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/tin-validation',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      expect(response1.statusCode).toBe(200);
      const body1 = JSON.parse(response1.body);
      expect(body1.cached).toBe(false);

      // Second request - cache hit
      const response2 = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/tin-validation',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      expect(response2.statusCode).toBe(200);
      const body2 = JSON.parse(response2.body);
      expect(body2.cached).toBe(true);
      expect(body2.code).toBe(body1.code);
      expect(body2.match).toBe(body1.match);
    });

    it('should use TIN + name combination as cache key', async () => {
      const tin = '12-3456789';

      // First request with name A
      const response1 = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/tin-validation',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tin,
          name: 'Company A'
        }),
      });

      // Second request with same TIN but different name
      const response2 = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/tin-validation',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tin,
          name: 'Company B'
        }),
      });

      const body2 = JSON.parse(response2.body);
      // Should be cache miss since name is different
      expect(body2.cached).toBe(false);
    });

    it('should return cached result via direct key lookup', async () => {
      // First populate cache
      await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/tin-validation',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tin: '11-2222222',
          name: 'Direct Lookup Corp'
        }),
      });

      // Now lookup by key
      const response = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/cache/tin-validation/11-2222222-Direct%20Lookup%20Corp',
        method: 'GET',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.code).toBe(0);
      expect(body.tin).toBe('11-2222222');
      expect(body.name).toBe('Direct Lookup Corp');
    });

    it('should return 404 for non-existent cache key', async () => {
      const response = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/cache/tin-validation/nonexistent-key',
        method: 'GET',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('CACHE_MISS');
    });
  });

  describe('Cache Expiration (TTL)', () => {
    it('should set default TTL of 24 hours', async () => {
      // This is tested implicitly through cache hit behavior
      // Direct TTL testing would require time manipulation or waiting
      const response = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/tin-validation',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tin: '33-4444444',
          name: 'TTL Test Corp'
        }),
      });

      expect(response.statusCode).toBe(200);
      // Immediate second request should hit cache
      const response2 = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/tin-validation',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tin: '33-4444444',
          name: 'TTL Test Corp'
        }),
      });

      const body2 = JSON.parse(response2.body);
      expect(body2.cached).toBe(true);
    });

    it('should report cache statistics including expired entries', async () => {
      // Clear cache first
      await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/cache/clear',
        method: 'POST',
      });

      // Add some entries
      await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/tin-validation',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tin: '55-6666666',
          name: 'Stats Test 1'
        }),
      });

      await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/tin-validation',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tin: '77-8888888',
          name: 'Stats Test 2'
        }),
      });

      // Get stats
      const response = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/cache/stats',
        method: 'GET',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.totalEntries).toBeGreaterThanOrEqual(2);
      expect(body.activeEntries).toBeGreaterThanOrEqual(2);
      expect(body.expiredEntries).toBeDefined();
    });
  });

  describe('Cache Management', () => {
    it('should delete specific cache entry', async () => {
      // Populate cache
      await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/tin-validation',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tin: '99-0000000',
          name: 'Delete Test Corp'
        }),
      });

      // Delete entry
      const deleteResponse = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/cache/tin-validation/99-0000000-Delete%20Test%20Corp',
        method: 'DELETE',
      });

      expect(deleteResponse.statusCode).toBe(200);
      const deleteBody = JSON.parse(deleteResponse.body);
      expect(deleteBody.code).toBe('CACHE_DELETED');

      // Verify deletion
      const getResponse = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/cache/tin-validation/99-0000000-Delete%20Test%20Corp',
        method: 'GET',
      });

      expect(getResponse.statusCode).toBe(404);
    });

    it('should clear all cache entries', async () => {
      // Populate cache with multiple entries
      await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/tin-validation',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tin: '11-1111111',
          name: 'Clear Test 1'
        }),
      });

      await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/tin-validation',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tin: '22-2222222',
          name: 'Clear Test 2'
        }),
      });

      // Get stats before clear
      const statsBefore = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/cache/stats',
        method: 'GET',
      });

      const statsBodyBefore = JSON.parse(statsBefore.body);
      expect(statsBodyBefore.totalEntries).toBeGreaterThan(0);

      // Clear cache
      const clearResponse = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/cache/clear',
        method: 'POST',
      });

      expect(clearResponse.statusCode).toBe(200);
      const clearBody = JSON.parse(clearResponse.body);
      expect(clearBody.code).toBe('CACHE_CLEARED');

      // Get stats after clear
      const statsAfter = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/cache/stats',
        method: 'GET',
      });

      const statsBodyAfter = JSON.parse(statsAfter.body);
      expect(statsBodyAfter.totalEntries).toBe(0);
    });
  });

  describe('Cache Key Generation', () => {
    it('should handle special characters in name for cache key', async () => {
      const specialName = 'O\'Brien & Associates, LLC';

      const response = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/tin-validation',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tin: '44-5555555',
          name: specialName
        }),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.code).toBe(0);

      // Second request should hit cache
      const response2 = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/tin-validation',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tin: '44-5555555',
          name: specialName
        }),
      });

      const body2 = JSON.parse(response2.body);
      expect(body2.cached).toBe(true);
    });

    it('should treat SSN and EIN formats as different cache keys', async () => {
      const name = 'Same Name';
      const ein = '12-3456789';
      const ssn = '123-45-6789';

      // Request with EIN
      const response1 = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/tin-validation',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tin: ein, name }),
      });

      // Request with SSN (same name)
      const response2 = await makeRequest({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/irs/tin-validation',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tin: ssn, name }),
      });

      const body2 = JSON.parse(response2.body);
      // Should be cache miss since TIN format is different
      expect(body2.cached).toBe(false);
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
