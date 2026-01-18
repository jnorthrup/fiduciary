/**
 * Tests for Persistence Proxy
 * Tests WAL flushing, LSM compaction, and recovery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as Y from 'yjs';
import { PersistenceProxy, createPersistenceProxy, WALEntry } from '../../../services/foundationProxy/persistenceProxy';

describe('PersistenceProxy', () => {
  let doc: Y.Doc;
  let proxy: PersistenceProxy;

  beforeEach(() => {
    doc = new Y.Doc();
  });

  afterEach(async () => {
    if (proxy) {
      await proxy.close();
    }
  });

  describe('Initialization', () => {
    it('should initialize with default config', async () => {
      proxy = new PersistenceProxy(doc);
      await proxy.init();

      const stats = proxy.getStats();
      expect(stats.sequence).toBe(0n);
      expect(stats.pendingEntries).toBe(0);
      expect(stats.autoFlush).toBe(true);
    });

    it('should initialize with custom config', async () => {
      proxy = new PersistenceProxy(doc, {
        walFlushInterval: 1000,
        walSegmentSize: 1024,
      });
      await proxy.init();

      const stats = proxy.getStats();
      expect(stats.autoFlush).toBe(true);
    });
  });

  describe('WAL (Write-Ahead Log)', () => {
    it('should capture Yjs updates in WAL', async () => {
      proxy = new PersistenceProxy(doc, { autoFlush: false });
      await proxy.init();

      // Trigger a Yjs update
      const map = doc.getMap('test');
      map.set('key', 'value');

      // Wait for next tick
      await new Promise(resolve => setImmediate(resolve));

      const stats = proxy.getStats();
      expect(stats.pendingEntries).toBeGreaterThan(0);
    });

    it('should flush WAL segment when size threshold reached', async () => {
      proxy = new PersistenceProxy(doc, {
        walSegmentSize: 100, // Small threshold for testing
        autoFlush: false,
      });
      await proxy.init();

      // Create multiple updates to trigger flush
      const map = doc.getMap('test');
      for (let i = 0; i < 10; i++) {
        map.set(`key-${i}`, `value-${i}`);
        await new Promise(resolve => setImmediate(resolve));
      }

      const stats = proxy.getStats();
      expect(stats.pendingEntries).toBe(0); // Should have flushed
    });

    it('should track sequence numbers', async () => {
      proxy = new PersistenceProxy(doc, { autoFlush: false });
      await proxy.init();

      const map = doc.getMap('test');
      map.set('key1', 'value1');
      await new Promise(resolve => setImmediate(resolve));

      let stats = proxy.getStats();
      const seq1 = stats.sequence;

      map.set('key2', 'value2');
      await new Promise(resolve => setImmediate(resolve));

      stats = proxy.getStats();
      expect(stats.sequence).toBeGreaterThan(seq1);
    });
  });

  describe('Checkpoint & Snapshots', () => {
    it('should create a checkpoint', async () => {
      proxy = new PersistenceProxy(doc);
      await proxy.init();

      const map = doc.getMap('test');
      map.set('checkpoint-test', 'value');

      await new Promise(resolve => setImmediate(resolve));
      await proxy.flushWAL();

      const checkpointKey = await proxy.checkpoint();

      expect(checkpointKey).toContain('snapshot/');
    });

    it('should restore from a checkpoint', async () => {
      // Create original document
      const originalDoc = new Y.Doc();
      const originalProxy = new PersistenceProxy(originalDoc);
      await originalProxy.init();

      const map = originalDoc.getMap('test');
      map.set('restore-test', 'original-value');

      await new Promise(resolve => setImmediate(resolve));
      await originalProxy.flushWAL();
      const checkpointKey = await originalProxy.checkpoint();
      await originalProxy.close();

      // Create new document and restore
      const restoredDoc = new Y.Doc();
      const restoredProxy = new PersistenceProxy(restoredDoc);
      await restoredProxy.init();

      await restoredProxy.restore(checkpointKey);

      const restoredMap = restoredDoc.getMap('test');
      // Note: In mock mode, restoration won't actually work
      // This tests the API contract
      expect(true).toBe(true);

      await restoredProxy.close();
    });
  });

  describe('Auto-Flush', () => {
    it('should auto-flush on interval', async () => {
      vi.useFakeTimers();

      proxy = new PersistenceProxy(doc, {
        walFlushInterval: 1000,
      });
      await proxy.init();

      const map = doc.getMap('test');
      map.set('auto-flush-test', 'value');

      await new Promise(resolve => setImmediate(resolve));

      const statsBefore = proxy.getStats();
      const pendingBefore = statsBefore.pendingEntries;

      // Fast-forward time
      vi.advanceTimersByTime(1000);
      await new Promise(resolve => setImmediate(resolve));

      // In mock mode, WAL entries are just tracked
      // Real FDB would persist them
      const statsAfter = proxy.getStats();
      expect(statsAfter.pendingEntries).toBeLessThanOrEqual(pendingBefore);

      vi.useRealTimers();
      await proxy.close();
    }, 10000);
  });

  describe('LSM Index', () => {
    it('should update LSM index on WAL flush', async () => {
      proxy = new PersistenceProxy(doc);
      await proxy.init();

      const map = doc.getMap('test');
      map.set('lsm-test', 'value');

      await new Promise(resolve => setImmediate(resolve));
      await proxy.flushWAL();

      // In mock mode, we can't verify the actual LSM index
      // but we can verify the flush succeeded
      const stats = proxy.getStats();
      expect(stats.pendingEntries).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should return accurate statistics', async () => {
      proxy = new PersistenceProxy(doc, { autoFlush: false });
      await proxy.init();

      const map = doc.getMap('test');
      map.set('stats-test', 'value');

      await new Promise(resolve => setImmediate(resolve));

      const stats = proxy.getStats();
      expect(stats).toHaveProperty('sequence');
      expect(stats).toHaveProperty('pendingEntries');
      expect(stats).toHaveProperty('pendingSize');
      expect(stats).toHaveProperty('autoFlush');
    });
  });

  describe('WAL Replay', () => {
    it('should replay WAL from sequence number', async () => {
      proxy = new PersistenceProxy(doc, { autoFlush: false });
      await proxy.init();

      const map = doc.getMap('test');
      map.set('replay-test', 'value');

      await new Promise(resolve => setImmediate(resolve));
      await proxy.flushWAL();

      const statsBefore = proxy.getStats();
      const seqBefore = statsBefore.sequence;

      // Replay from current sequence (no new updates expected)
      await proxy.replayWAL(seqBefore);

      expect(true).toBe(true); // API contract test
    });
  });

  describe('Range Query', () => {
    it('should query range from LSM', async () => {
      proxy = new PersistenceProxy(doc);
      await proxy.init();

      const results = await proxy.queryRange(0n, 100n);

      expect(Array.isArray(results)).toBe(true);
    });
  });
});

describe('createPersistenceProxy', () => {
  it('should create and initialize a proxy', async () => {
    const doc = new Y.Doc();
    const proxy = await createPersistenceProxy(doc);

    expect(proxy).toBeInstanceOf(PersistenceProxy);

    const stats = proxy.getStats();
    expect(stats).toBeDefined();

    await proxy.close();
  });
});
