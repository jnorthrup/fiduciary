/**
 * Tests for IRS API Status Polling Mechanism
 *
 * Test file following TDD principles:
 * 1. PollSubmissionStatus with timeout
 * 2. Terminal state detection
 * 3. onUpdate callback behavior
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IrsApiClient } from './irsApiClient';
import type { BatchStatus } from './irsApiClient';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('IrsApiClient - Status Polling', () => {
  let client: IrsApiClient;

  beforeEach(() => {
    client = new IrsApiClient('http://localhost:3001/api/irs');
    client.setAuth('T123456789');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('pollSubmissionStatus', () => {
    it('should poll until terminal state reached', async () => {
      let pollCount = 0;
      const receiptId = 'test-receipt-123';

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: async () => {
            pollCount++;
            // Simulate processing -> accepted after 3 polls
            if (pollCount < 3) {
              return {
                receiptId,
                status: 'Processing',
                submittedAt: new Date().toISOString(),
                recordCount: 1,
                acceptedCount: 0,
                errorCount: 0,
                warningCount: 0,
                errors: [],
                warnings: []
              } as BatchStatus;
            }
            return {
              receiptId,
              status: 'Accepted',
              submittedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              recordCount: 1,
              acceptedCount: 1,
              errorCount: 0,
              warningCount: 0,
              errors: [],
              warnings: []
            } as BatchStatus;
          }
        } as Response)
      );

      const result = await client.pollSubmissionStatus(receiptId, undefined, 100);

      expect(result.status).toBe('Accepted');
      expect(result.acceptedCount).toBe(1);
      expect(pollCount).toBe(3);
    });

    it('should call onUpdate callback with each status', async () => {
      const receiptId = 'test-receipt-456';
      const updates: BatchStatus[] = [];
      const onUpdate = vi.fn((status: BatchStatus) => {
        updates.push(status);
      });

      let pollCount = 0;
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: async () => {
            pollCount++;
            if (pollCount === 1) {
              return { status: 'Processing', recordCount: 5, acceptedCount: 0 } as BatchStatus;
            } else if (pollCount === 2) {
              return { status: 'Processing', recordCount: 5, acceptedCount: 2 } as BatchStatus;
            }
            return { status: 'Accepted', recordCount: 5, acceptedCount: 5 } as BatchStatus;
          }
        } as Response)
      );

      await client.pollSubmissionStatus(receiptId, onUpdate, 50);

      expect(onUpdate).toHaveBeenCalledTimes(3);
      expect(updates[0].status).toBe('Processing');
      expect(updates[1].status).toBe('Processing');
      expect(updates[2].status).toBe('Accepted');
    });

    it('should throw error on timeout', async () => {
      const receiptId = 'test-receipt-timeout';

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            receiptId,
            status: 'Processing',
            submittedAt: new Date().toISOString(),
            recordCount: 1,
            acceptedCount: 0,
            errorCount: 0,
            warningCount: 0,
            errors: [],
            warnings: []
          } as BatchStatus)
        } as Response)
      );

      await expect(
        client.pollSubmissionStatus(receiptId, undefined, 50, 200)
      ).rejects.toThrow('Polling timeout exceeded');
    });

    it('should detect Rejected as terminal state', async () => {
      const receiptId = 'test-receipt-rejected';

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            receiptId,
            status: 'Rejected',
            submittedAt: new Date().toISOString(),
            recordCount: 1,
            acceptedCount: 0,
            errorCount: 1,
            warningCount: 0,
            errors: [{ code: 'INVALID_DATA', message: 'Invalid TIN', field: 'payee[0].tin', severity: 'ERROR' }],
            warnings: []
          } as BatchStatus)
        } as Response)
      );

      const result = await client.pollSubmissionStatus(receiptId, undefined, 50);

      expect(result.status).toBe('Rejected');
      expect(result.errorCount).toBe(1);
      expect(result.errors?.length).toBe(1);
    });

    it('should detect AcceptedWithErrors as terminal state', async () => {
      const receiptId = 'test-receipt-warnings';

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            receiptId,
            status: 'AcceptedWithErrors',
            submittedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            recordCount: 2,
            acceptedCount: 2,
            errorCount: 0,
            warningCount: 1,
            errors: [],
            warnings: [{ code: 'MISSING_INFO', message: 'State missing', field: 'payee[1].state', severity: 'WARNING' }]
          } as BatchStatus)
        } as Response)
      );

      const result = await client.pollSubmissionStatus(receiptId, undefined, 50);

      expect(result.status).toBe('AcceptedWithErrors');
      expect(result.warningCount).toBe(1);
    });

    it('should respect custom interval parameter', async () => {
      const receiptId = 'test-receipt-interval';
      const startTime = Date.now();
      let callCount = 0;

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: async () => {
            callCount++;
            // First call returns processing, second returns accepted
            if (callCount === 1) {
              return { status: 'Processing', recordCount: 1, acceptedCount: 0 } as BatchStatus;
            }
            return { status: 'Accepted', recordCount: 1, acceptedCount: 1 } as BatchStatus;
          }
        } as Response)
      );

      await client.pollSubmissionStatus(receiptId, undefined, 100);

      // Should have waited at least 100ms between the two polls
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(100);
    });

    it('should return immediately if already in terminal state', async () => {
      const receiptId = 'test-receipt-complete';

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            receiptId,
            status: 'Accepted',
            submittedAt: new Date(Date.now() - 60000).toISOString(),
            completedAt: new Date(Date.now() - 50000).toISOString(),
            recordCount: 10,
            acceptedCount: 10,
            errorCount: 0,
            warningCount: 0,
            processingTime: 10
          } as BatchStatus)
        } as Response)
      );

      const startTime = Date.now();
      const result = await client.pollSubmissionStatus(receiptId, undefined, 50);

      expect(result.status).toBe('Accepted');
      expect(result.processingTime).toBe(10);
      // Should return immediately without waiting
      expect(Date.now() - startTime).toBeLessThan(100);
    });

    it('should detect Cancelled as terminal state', async () => {
      const receiptId = 'test-receipt-cancelled';

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            receiptId,
            status: 'Cancelled',
            submittedAt: new Date().toISOString(),
            recordCount: 0,
            acceptedCount: 0,
            errorCount: 0,
            warningCount: 0
          } as BatchStatus)
        } as Response)
      );

      const result = await client.pollSubmissionStatus(receiptId, undefined, 50);

      expect(result.status).toBe('Cancelled');
    });
  });
});
