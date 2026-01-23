/**
 * IRS Portal Authentication API Routes
 *
 * Express router that wraps IRSPortalClient for Playwright-based IRS e-Services
 * portal authentication. Handles username/password + 2FA login with session
 * management.
 */

import express from 'express';
import { randomUUID } from 'crypto';

const router = express.Router();

// Lazy load Playwright-based client only when routes are hit
// This prevents crash on Cloud Run where browsers aren't installed
let IRSPortalClient = null;
const getPortalClient = async () => {
  if (!IRSPortalClient) {
    const module = await import('../services/iris-portal-client.js');
    IRSPortalClient = module.IRSPortalClient;
  }
  return IRSPortalClient;
};

/**
 * In-memory session storage for authentication flows
 * In production, this would use Redis or similar
 */
const authSessions = new Map();

/**
 * POST /api/irs-portal/auth/login
 *
 * Initiates IRS e-Services portal login with username/password.
 * Returns a session ID for 2FA completion.
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Validate input
  if (!username) {
    return res.status(400).json({
      error: 'missing_username',
      message: 'Username is required',
    });
  }

  if (!password) {
    return res.status(400).json({
      error: 'missing_password',
      message: 'Password is required',
    });
  }

  try {
    // Check for existing valid session (session reuse)
    const existingSession = Array.from(authSessions.values()).find(
      s => s.username === username && s.status === 'authenticated' && s.expiresAt > Date.now()
    );

    if (existingSession) {
      return res.json({
        sessionId: existingSession.id,
        status: 'authenticated',
        reused: true,
        expiresAt: existingSession.expiresAt,
      });
    }

    // Create new authentication session
    const sessionId = `session-${randomUUID()}`;
    const PortalClient = await getPortalClient();
    const client = new PortalClient({
      headless: true,
      testMode: process.env.NODE_ENV !== 'production',
    });

    // Store session
    authSessions.set(sessionId, {
      id: sessionId,
      username,
      client,
      status: 'initializing',
      createdAt: Date.now(),
      expiresAt: Date.now() + (15 * 60 * 1000), // 15 minute expiry for auth flow
    });

    // Initiate login
    const navigateResult = await client.navigateToLogin();

    if (!navigateResult.success) {
      authSessions.delete(sessionId);
      return res.status(504).json({
        error: 'timeout',
        message: 'Failed to reach IRS portal. Please try again.',
      });
    }

    const fillResult = await client.fillUsername(username);

    if (!fillResult.success) {
      authSessions.delete(sessionId);
      return res.status(500).json({
        error: 'login_failed',
        message: 'Failed to enter username.',
      });
    }

    const passwordResult = await client.fillPassword(password);

    if (!passwordResult.success) {
      authSessions.delete(sessionId);
      return res.status(500).json({
        error: 'login_failed',
        message: 'Failed to enter password.',
      });
    }

    const submitResult = await client.submitLogin();

    if (!submitResult.success) {
      authSessions.delete(sessionId);

      // Map error types
      const errorType = submitResult.error?.type || 'login_failed';

      if (errorType === 'account_locked') {
        return res.status(401).json({
          error: 'account_locked',
          message: 'Account is locked due to too many failed attempts.',
        });
      }

      if (errorType === 'invalid_credentials') {
        return res.status(401).json({
          error: 'invalid_credentials',
          message: 'Invalid username or password.',
        });
      }

      return res.status(500).json({
        error: errorType,
        message: submitResult.error?.message || 'Login failed.',
      });
    }

    // Check for 2FA prompt
    const has2FA = await client.detect2FAPrompt();

    if (!has2FA) {
      authSessions.delete(sessionId);
      return res.status(500).json({
        error: '2fa_not_available',
        message: '2FA prompt not detected. This may indicate an issue with the IRS portal.',
      });
    }

    // Get available 2FA methods
    const methods = await client.get2FAMethods();

    // Update session status
    const session = authSessions.get(sessionId);
    session.status = 'awaiting_2fa';
    session.available2FAMethods = methods;
    session.lastResend = Date.now();

    return res.json({
      sessionId,
      status: 'awaiting_2fa',
      available2FAMethods: methods,
    });

  } catch (error) {
    console.error('[IRS Portal Auth] Login error:', error);

    // Cleanup session on error
    const sessionId = `session-${username}`; // Approximate
    authSessions.delete(sessionId);

    return res.status(500).json({
      error: 'internal_error',
      message: 'An error occurred during login.',
    });
  }
});

/**
 * POST /api/irs-portal/auth/2fa
 *
 * Submits 2FA code to complete authentication.
 */
router.post('/2fa', async (req, res) => {
  const { sessionId, code } = req.body;

  // Validate input
  if (!sessionId) {
    return res.status(400).json({
      error: 'missing_session_id',
      message: 'Session ID is required',
    });
  }

  if (!code) {
    return res.status(400).json({
      error: 'missing_code',
      message: '2FA code is required',
    });
  }

  // Validate code format
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({
      error: 'invalid_code_format',
      message: '2FA code must be 6 digits',
    });
  }

  // Get session
  const session = authSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({
      error: 'session_not_found',
      message: 'Session not found or expired.',
    });
  }

  // Check session expiry
  if (Date.now() >= session.expiresAt) {
    authSessions.delete(sessionId);
    await session.client.close();
    return res.status(404).json({
      error: 'session_expired',
      message: 'Session has expired. Please start over.',
    });
  }

  // Check session status
  if (session.status !== 'awaiting_2fa') {
    return res.status(400).json({
      error: 'invalid_session_state',
      message: `Session is in invalid state: ${session.status}`,
    });
  }

  try {
    // Submit 2FA code
    const result = await session.client.enter2FACode(code);

    if (!result.success) {
      const errorType = result.error?.type || 'verification_failed';

      if (errorType === 'code_expired') {
        authSessions.delete(sessionId);
        await session.client.close();
        return res.status(401).json({
          error: 'code_expired',
          message: '2FA code has expired. Please request a new code.',
        });
      }

      if (errorType === 'invalid_code') {
        return res.status(401).json({
          error: 'invalid_code',
          message: 'Incorrect verification code.',
        });
      }

      return res.status(500).json({
        error: errorType,
        message: result.error?.message || '2FA verification failed.',
      });
    }

    // Get session cookies
    const sessionData = await session.client.getSession();

    // Update session
    session.status = 'authenticated';
    session.sessionData = sessionData;
    session.expiresAt = Date.now() + (8 * 60 * 60 * 1000); // 8 hours

    // Save session to disk
    await session.client.saveSession(session.username);

    return res.json({
      authenticated: true,
      sessionId: session.id,
      expiresAt: session.expiresAt,
      cookies: sessionData.cookies,
    });

  } catch (error) {
    console.error('[IRS Portal Auth] 2FA error:', error);

    // Cleanup session
    authSessions.delete(sessionId);
    await session.client.close();

    return res.status(500).json({
      error: 'internal_error',
      message: 'An error occurred during 2FA verification.',
    });
  }
});

/**
 * POST /api/irs-portal/auth/2fa/resend
 *
 * Resends 2FA code (for SMS/email methods).
 */
router.post('/2fa/resend', async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({
      error: 'missing_session_id',
      message: 'Session ID is required',
    });
  }

  const session = authSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({
      error: 'session_not_found',
      message: 'Session not found or expired.',
    });
  }

  // Check cooldown (30 seconds)
  const cooldownSeconds = 30;
  const timeSinceResend = Date.now() - (session.lastResend || 0);

  if (timeSinceResend < cooldownSeconds * 1000) {
    const remaining = Math.ceil((cooldownSeconds * 1000 - timeSinceResend) / 1000);
    return res.status(429).json({
      error: 'cooldown_active',
      message: 'Please wait before requesting another code.',
      cooldownSeconds: remaining,
    });
  }

  try {
    // Select 2FA method to trigger resend
    const methods = await session.client.get2FAMethods();
    const currentMethod = methods[0] || 'sms';

    await session.client.select2FAMethod(currentMethod);

    // Update resend timestamp
    session.lastResend = Date.now();

    return res.json({
      sent: true,
      cooldownSeconds,
    });

  } catch (error) {
    console.error('[IRS Portal Auth] Resend error:', error);

    return res.status(500).json({
      error: 'internal_error',
      message: 'Failed to resend code.',
    });
  }
});

/**
 * GET /api/irs-portal/auth/session/:sessionId
 *
 * Retrieves session status and metadata.
 */
router.get('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  const session = authSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({
      error: 'session_not_found',
      message: 'Session not found or expired.',
    });
  }

  // Check if expired
  if (Date.now() >= session.expiresAt) {
    return res.json({
      sessionId: session.id,
      status: 'expired',
      expiresAt: session.expiresAt,
    });
  }

  return res.json({
    sessionId: session.id,
    status: session.status,
    username: session.username,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
  });
});

/**
 * DELETE /api/irs-portal/auth/session/:sessionId
 *
 * Deletes an authentication session and cleans up resources.
 */
router.delete('/session/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  const session = authSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({
      error: 'session_not_found',
      message: 'Session not found.',
    });
  }

  try {
    // Close browser client
    await session.client.close();

    // Remove from memory
    authSessions.delete(sessionId);

    return res.json({
      deleted: true,
    });

  } catch (error) {
    console.error('[IRS Portal Auth] Delete session error:', error);

    // Still remove from memory even if close fails
    authSessions.delete(sessionId);

    return res.json({
      deleted: true,
    });
  }
});

/**
 * Cleanup expired sessions periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of authSessions.entries()) {
    if (now >= session.expiresAt) {
      console.log(`[IRS Portal Auth] Cleaning up expired session: ${id}`);
      session.client.close().catch(() => {});
      authSessions.delete(id);
    }
  }
}, 60 * 1000); // Every minute

export default router;
