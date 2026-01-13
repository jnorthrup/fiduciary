/**
 * Session Monitor Tests
 *
 * Tests for time-series session monitoring and event capture.
 * Verifies session state recording, event tracking, and replay validation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionMonitor } from './session-monitor';
import type { Cookie } from 'playwright';

describe('Session Monitor', () => {
  let monitor: SessionMonitor;
  let testStorageDir: string;
  let testRecordingDir: string;

  beforeEach(async () => {
    // Use temporary directories for tests
    const path = await import('path');
    testStorageDir = path.join(process.cwd(), 'test', 'session-monitor-test');
    testRecordingDir = path.join(process.cwd(), 'test', 'session-recordings-test');

    monitor = new SessionMonitor({
      storageDir: testStorageDir,
      recordingDir: testRecordingDir,
    });
  });

  afterEach(async () => {
    const fs = await import('fs/promises');
    // Cleanup test files
    try {
      await fs.rm(testStorageDir, { recursive: true, force: true });
      await fs.rm(testRecordingDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Session Event Capture', () => {
    it('should capture page navigation events', async () => {
      const sessionId = 'test-session-001';

      await monitor.captureEvent(sessionId, {
        type: 'navigation',
        url: 'https://irs-e-services.irs.gov/login',
        timestamp: Date.now(),
      });

      const events = await monitor.getSessionEvents(sessionId);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('navigation');
      expect(events[0].url).toBe('https://irs-e-services.irs.gov/login');
    });

    it('should capture form input events', async () => {
      const sessionId = 'test-session-002';

      await monitor.captureEvent(sessionId, {
        type: 'input',
        selector: '#username',
        value: 'testuser@example.com',
        timestamp: Date.now(),
      });

      const events = await monitor.getSessionEvents(sessionId);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('input');
      expect(events[0].selector).toBe('#username');
      expect(events[0].value).toBe('testuser@example.com');
    });

    it('should capture click events', async () => {
      const sessionId = 'test-session-003';

      await monitor.captureEvent(sessionId, {
        type: 'click',
        selector: 'button[type="submit"]',
        timestamp: Date.now(),
      });

      const events = await monitor.getSessionEvents(sessionId);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('click');
      expect(events[0].selector).toBe('button[type="submit"]');
    });

    it('should capture network request events', async () => {
      const sessionId = 'test-session-004';

      await monitor.captureEvent(sessionId, {
        type: 'request',
        method: 'POST',
        url: '/api/v2/submissions',
        statusCode: 200,
        timestamp: Date.now(),
      });

      const events = await monitor.getSessionEvents(sessionId);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('request');
      expect(events[0].method).toBe('POST');
      expect(events[0].statusCode).toBe(200);
    });

    it('should capture console messages', async () => {
      const sessionId = 'test-session-005';

      await monitor.captureEvent(sessionId, {
        type: 'console',
        level: 'error',
        text: 'Authentication failed: Invalid credentials',
        timestamp: Date.now(),
      });

      const events = await monitor.getSessionEvents(sessionId);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('console');
      expect(events[0].level).toBe('error');
      expect(events[0].text).toContain('Authentication failed');
    });

    it('should capture cookie changes', async () => {
      const sessionId = 'test-session-006';
      const cookie: Cookie = {
        name: 'JSESSIONID',
        value: 'new-session-value-123',
        domain: '.irs.gov',
        path: '/',
        expires: Date.now() / 1000 + 3600,
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
      };

      await monitor.captureEvent(sessionId, {
        type: 'cookie',
        action: 'set',
        cookie,
        timestamp: Date.now(),
      });

      const events = await monitor.getSessionEvents(sessionId);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('cookie');
      expect(events[0].action).toBe('set');
      expect(events[0].cookie?.name).toBe('JSESSIONID');
    });

    it('should maintain event order by timestamp', async () => {
      const sessionId = 'test-session-007';
      const baseTime = Date.now();

      // Capture events out of order
      await monitor.captureEvent(sessionId, {
        type: 'click',
        selector: '#button3',
        timestamp: baseTime + 300,
      });

      await monitor.captureEvent(sessionId, {
        type: 'click',
        selector: '#button1',
        timestamp: baseTime + 100,
      });

      await monitor.captureEvent(sessionId, {
        type: 'click',
        selector: '#button2',
        timestamp: baseTime + 200,
      });

      const events = await monitor.getSessionEvents(sessionId);
      expect(events).toHaveLength(3);
      expect(events[0].selector).toBe('#button1');
      expect(events[1].selector).toBe('#button2');
      expect(events[2].selector).toBe('#button3');
    });

    it('should capture page screenshot state', async () => {
      const sessionId = 'test-session-008';

      await monitor.captureEvent(sessionId, {
        type: 'screenshot',
        screenshotPath: '/recordings/session-001-step-5.png',
        timestamp: Date.now(),
      });

      const events = await monitor.getSessionEvents(sessionId);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('screenshot');
      expect(events[0].screenshotPath).toContain('.png');
    });

    it('should capture error events', async () => {
      const sessionId = 'test-session-009';

      await monitor.captureEvent(sessionId, {
        type: 'error',
        message: 'Timeout waiting for selector: #dashboard',
        stack: 'Error: Timeout\n    at Page.waitForSelector',
        timestamp: Date.now(),
      });

      const events = await monitor.getSessionEvents(sessionId);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('error');
      expect(events[0].message).toContain('Timeout');
    });

    it('should associate events with session metadata', async () => {
      const sessionId = 'test-session-010';

      await monitor.setSessionMetadata(sessionId, {
        username: 'testuser@example.com',
        startTime: Date.now(),
        userAgent: 'Mozilla/5.0 Test Browser',
      });

      await monitor.captureEvent(sessionId, {
        type: 'navigation',
        url: 'https://irs.gov',
        timestamp: Date.now(),
      });

      const metadata = await monitor.getSessionMetadata(sessionId);
      expect(metadata?.username).toBe('testuser@example.com');
      expect(metadata?.userAgent).toBe('Mozilla/5.0 Test Browser');
    });
  });

  describe('Time-Series State Recording', () => {
    it('should record full page state snapshot', async () => {
      const sessionId = 'test-session-020';

      await monitor.recordState(sessionId, {
        url: 'https://irs-e-services.irs.gov/dashboard',
        title: 'IRS e-Services Dashboard',
        cookies: [
          {
            name: 'JSESSIONID',
            value: 'abc123',
            domain: '.irs.gov',
            path: '/',
            expires: -1,
            httpOnly: true,
            secure: true,
            sameSite: 'Lax',
          },
        ],
        localStorage: {
          'userPreference': '{"theme":"dark"}',
        },
        sessionStorage: {
          'csrfToken': 'xyz789',
        },
        timestamp: Date.now(),
      });

      const states = await monitor.getStateSnapshots(sessionId);
      expect(states).toHaveLength(1);
      expect(states[0].url).toContain('dashboard');
      expect(states[0].cookies).toHaveLength(1);
    });

    it('should record multiple state snapshots over time', async () => {
      const sessionId = 'test-session-021';
      const baseTime = Date.now();

      await monitor.recordState(sessionId, {
        url: 'https://irs.gov/login',
        cookies: [],
        localStorage: {},
        sessionStorage: {},
        timestamp: baseTime,
      });

      await monitor.recordState(sessionId, {
        url: 'https://irs.gov/dashboard',
        cookies: [
          {
            name: 'SESSION',
            value: 'authenticated',
            domain: '.irs.gov',
            path: '/',
            expires: -1,
            httpOnly: false,
            secure: true,
            sameSite: 'Lax',
          },
        ],
        localStorage: {},
        sessionStorage: {},
        timestamp: baseTime + 5000,
      });

      const states = await monitor.getStateSnapshots(sessionId);
      expect(states).toHaveLength(2);
      expect(states[0].url).toContain('login');
      expect(states[1].url).toContain('dashboard');
    });

    it('should persist recordings to disk', async () => {
      const sessionId = 'test-session-022';

      await monitor.captureEvent(sessionId, {
        type: 'navigation',
        url: 'https://irs.gov',
        timestamp: Date.now(),
      });

      await monitor.saveRecording(sessionId);

      const fs = await import('fs/promises');
      const path = await import('path');
      const recordingPath = path.join(testRecordingDir, `${sessionId}.json`);

      const exists = await fs
        .access(recordingPath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);
    });

    it('should load recordings from disk', async () => {
      const sessionId = 'test-session-023';

      await monitor.captureEvent(sessionId, {
        type: 'navigation',
        url: 'https://irs.gov/login',
        timestamp: Date.now(),
      });

      await monitor.saveRecording(sessionId);

      // Create new monitor instance
      const newMonitor = new SessionMonitor({
        storageDir: testStorageDir,
        recordingDir: testRecordingDir,
      });

      await newMonitor.loadRecording(sessionId);
      const events = await newMonitor.getSessionEvents(sessionId);

      expect(events).toHaveLength(1);
      expect(events[0].url).toBe('https://irs.gov/login');
    });
  });

  describe('Session Replay Validation', () => {
    it('should detect state differences between recordings', async () => {
      const sessionId = 'test-session-030';

      // Record expected state
      await monitor.recordExpectedState(sessionId, {
        url: 'https://irs.gov/dashboard',
        elementStates: {
          '#welcome-message': { visible: true, text: 'Welcome, User' },
          '#submit-btn': { visible: true, enabled: true },
        },
      });

      // Replay with actual state
      const validation = await monitor.validateState(sessionId, {
        url: 'https://irs.gov/dashboard',
        elementStates: {
          '#welcome-message': { visible: true, text: 'Welcome, User' },
          '#submit-btn': { visible: true, enabled: false }, // Different!
        },
      });

      expect(validation.isValid).toBe(false);
      expect(validation.differences).toHaveLength(1);
      expect(validation.differences[0].path).toBe('#submit-btn.enabled');
    });

    it('should validate correct session replay', async () => {
      const sessionId = 'test-session-031';

      await monitor.recordExpectedState(sessionId, {
        url: 'https://irs.gov/success',
        elementStates: {
          '#success-message': { visible: true },
        },
      });

      const validation = await monitor.validateState(sessionId, {
        url: 'https://irs.gov/success',
        elementStates: {
          '#success-message': { visible: true },
        },
      });

      expect(validation.isValid).toBe(true);
      expect(validation.differences).toHaveLength(0);
    });

    it('should detect navigation differences', async () => {
      const sessionId = 'test-session-032';

      await monitor.recordExpectedState(sessionId, {
        url: 'https://irs.gov/expected-page',
        elementStates: {},
      });

      const validation = await monitor.validateState(sessionId, {
        url: 'https://irs.gov/wrong-page',
        elementStates: {},
      });

      expect(validation.isValid).toBe(false);
      expect(validation.differences).toContain('url');
    });

    it('should report validation errors with context', async () => {
      const sessionId = 'test-session-033';

      await monitor.recordExpectedState(sessionId, {
        url: 'https://irs.gov/form',
        elementStates: {
          '#field1': { visible: true, value: 'test' },
          '#field2': { visible: true, value: '12345' },
        },
      });

      const validation = await monitor.validateState(sessionId, {
        url: 'https://irs.gov/form',
        elementStates: {
          '#field1': { visible: true, value: 'test' },
          '#field2': { visible: false, value: '' }, // Element not visible
        },
      });

      expect(validation.isValid).toBe(false);
      expect(validation.differences).toContain('element #field2.visible');
    });
  });
});
