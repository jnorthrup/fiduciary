/**
 * IRS Portal Authentication API Tests
 *
 * Tests for the Playwright-based IRS e-Services portal authentication endpoint.
 * Verifies username/password + 2FA login flow with session management.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';

describe('IRS Portal Authentication API', () => {
  let app: Express;

  beforeAll(async () => {
    // Import the app after mocks are set up
    const { default: serverApp } = await import('../index.js');
    app = serverApp;
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('POST /api/irs-portal/auth/login', () => {
    it('should reject requests without username', async () => {
      const response = await request(app)
        .post('/api/irs-portal/auth/login')
        .send({
          password: 'testPassword123',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error).toBe('missing_username');
    });

    it('should reject requests without password', async () => {
      const response = await request(app)
        .post('/api/irs-portal/auth/login')
        .send({
          username: 'testuser@example.com',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error).toBe('missing_password');
    });

    it('should initiate login flow and return session ID', async () => {
      const response = await request(app)
        .post('/api/irs-portal/auth/login')
        .send({
          username: 'testuser@example.com',
          password: 'testPassword123',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.sessionId).toBeDefined();
      expect(response.body.sessionId).toMatch(/^session-[a-z0-9-]+$/);
      expect(response.body.status).toBe('awaiting_2fa');
      expect(response.body.available2FAMethods).toEqual(expect.arrayContaining(['sms', 'email', 'app']));
    });

    it('should handle account locked errors', async () => {
      const response = await request(app)
        .post('/api/irs-portal/auth/login')
        .send({
          username: 'locked@example.com', // Triggers locked account
          password: 'wrongPassword',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('account_locked');
      expect(response.body.message).toContain('locked');
    });

    it('should handle invalid credentials', async () => {
      const response = await request(app)
        .post('/api/irs-portal/auth/login')
        .send({
          username: 'testuser@example.com',
          password: 'wrongPassword',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('invalid_credentials');
    });

    it('should handle timeout errors gracefully', async () => {
      const response = await request(app)
        .post('/api/irs-portal/auth/login')
        .send({
          username: 'timeout@example.com', // Triggers timeout
          password: 'testPassword123',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(504);
      expect(response.body.error).toBe('timeout');
    });
  });

  describe('POST /api/irs-portal/auth/2fa', () => {
    it('should reject requests without session ID', async () => {
      const response = await request(app)
        .post('/api/irs-portal/auth/2fa')
        .send({
          code: '123456',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('missing_session_id');
    });

    it('should reject requests without 2FA code', async () => {
      const response = await request(app)
        .post('/api/irs-portal/auth/2fa')
        .send({
          sessionId: 'session-abc123',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('missing_code');
    });

    it('should reject invalid 2FA code format', async () => {
      const response = await request(app)
        .post('/api/irs-portal/auth/2fa')
        .send({
          sessionId: 'session-abc123',
          code: '12345', // Only 5 digits
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_code_format');
    });

    it('should reject expired 2FA codes', async () => {
      const response = await request(app)
        .post('/api/irs-portal/auth/2fa')
        .send({
          sessionId: 'session-expired',
          code: '123456',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('code_expired');
    });

    it('should reject incorrect 2FA codes', async () => {
      const response = await request(app)
        .post('/api/irs-portal/auth/2fa')
        .send({
          sessionId: 'session-abc123',
          code: '000000', // Wrong code
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('invalid_code');
    });

    it('should complete authentication with valid 2FA code', async () => {
      // First, initiate login
      const loginResponse = await request(app)
        .post('/api/irs-portal/auth/login')
        .send({
          username: 'testuser@example.com',
          password: 'testPassword123',
        })
        .set('Content-Type', 'application/json');

      const sessionId = loginResponse.body.sessionId;

      // Then, submit 2FA code
      const response = await request(app)
        .post('/api/irs-portal/auth/2fa')
        .send({
          sessionId,
          code: '123456', // Test code
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.authenticated).toBe(true);
      expect(response.body.sessionId).toBeDefined();
      expect(response.body.expiresAt).toBeDefined();
    });

    it('should return session cookies after successful auth', async () => {
      const loginResponse = await request(app)
        .post('/api/irs-portal/auth/login')
        .send({
          username: 'testuser@example.com',
          password: 'testPassword123',
        })
        .set('Content-Type', 'application/json');

      const sessionId = loginResponse.body.sessionId;

      const response = await request(app)
        .post('/api/irs-portal/auth/2fa')
        .send({
          sessionId,
          code: '123456',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.cookies).toBeDefined();
      expect(Array.isArray(response.body.cookies)).toBe(true);
      expect(response.body.cookies.length).toBeGreaterThan(0);
      expect(response.body.cookies[0]).toHaveProperty('name');
      expect(response.body.cookies[0]).toHaveProperty('value');
    });
  });

  describe('POST /api/irs-portal/auth/2fa/resend', () => {
    it('should resend 2FA code for valid session', async () => {
      const loginResponse = await request(app)
        .post('/api/irs-portal/auth/login')
        .send({
          username: 'testuser@example.com',
          password: 'testPassword123',
        })
        .set('Content-Type', 'application/json');

      const sessionId = loginResponse.body.sessionId;

      const response = await request(app)
        .post('/api/irs-portal/auth/2fa/resend')
        .send({ sessionId })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.sent).toBe(true);
      expect(response.body.cooldownSeconds).toBeDefined();
      expect(response.body.cooldownSeconds).toBeGreaterThan(0);
    });

    it('should enforce resend cooldown', async () => {
      const loginResponse = await request(app)
        .post('/api/irs-portal/auth/login')
        .send({
          username: 'testuser@example.com',
          password: 'testPassword123',
        })
        .set('Content-Type', 'application/json');

      const sessionId = loginResponse.body.sessionId;

      // First resend
      await request(app)
        .post('/api/irs-portal/auth/2fa/resend')
        .send({ sessionId });

      // Immediate second resend
      const response = await request(app)
        .post('/api/irs-portal/auth/2fa/resend')
        .send({ sessionId })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('cooldown_active');
      expect(response.body.cooldownSeconds).toBeDefined();
    });
  });

  describe('GET /api/irs-portal/auth/session/:sessionId', () => {
    it('should retrieve active session', async () => {
      const loginResponse = await request(app)
        .post('/api/irs-portal/auth/login')
        .send({
          username: 'testuser@example.com',
          password: 'testPassword123',
        })
        .set('Content-Type', 'application/json');

      const sessionId = loginResponse.body.sessionId;

      const response = await request(app)
        .get(`/api/irs-portal/auth/session/${sessionId}`)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.sessionId).toBe(sessionId);
      expect(response.body.status).toBeDefined();
    });

    it('should return 404 for non-existent session', async () => {
      const response = await request(app)
        .get('/api/irs-portal/auth/session/non-existent')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('session_not_found');
    });

    it('should indicate expired sessions', async () => {
      const response = await request(app)
        .get('/api/irs-portal/auth/session/session-expired')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('expired');
    });
  });

  describe('DELETE /api/irs-portal/auth/session/:sessionId', () => {
    it('should delete active session', async () => {
      const loginResponse = await request(app)
        .post('/api/irs-portal/auth/login')
        .send({
          username: 'testuser@example.com',
          password: 'testPassword123',
        })
        .set('Content-Type', 'application/json');

      const sessionId = loginResponse.body.sessionId;

      const response = await request(app)
        .delete(`/api/irs-portal/auth/session/${sessionId}`)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.deleted).toBe(true);
    });

    it('should return error when deleting non-existent session', async () => {
      const response = await request(app)
        .delete('/api/irs-portal/auth/session/non-existent')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('session_not_found');
    });
  });

  describe('Session Reuse', () => {
    it('should reuse existing valid session', async () => {
      // First login
      const login1 = await request(app)
        .post('/api/irs-portal/auth/login')
        .send({
          username: 'testuser@example.com',
          password: 'testPassword123',
        })
        .set('Content-Type', 'application/json');

      const sessionId1 = login1.body.sessionId;

      // Complete 2FA
      await request(app)
        .post('/api/irs-portal/auth/2fa')
        .send({
          sessionId: sessionId1,
          code: '123456',
        })
        .set('Content-Type', 'application/json');

      // Second login attempt with same credentials
      const login2 = await request(app)
        .post('/api/irs-portal/auth/login')
        .send({
          username: 'testuser@example.com',
          password: 'testPassword123',
        })
        .set('Content-Type', 'application/json');

      expect(login2.body.reused).toBe(true);
      expect(login2.body.sessionId).toBeDefined();
    });

    it('should force re-authentication for expired sessions', async () => {
      const response = await request(app)
        .post('/api/irs-portal/auth/login')
        .send({
          username: 'expired@example.com',
          password: 'testPassword123',
        })
        .set('Content-Type', 'application/json');

      expect(response.body.reused).toBe(false);
      expect(response.body.status).toBe('awaiting_2fa');
    });
  });
});
