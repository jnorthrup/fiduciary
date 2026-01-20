/**
 * Performance Benchmarks
 * Audits GKE cold-start latency, CRDT sync performance, and encryption overhead
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as Y from 'yjs';
import { LedgerCRDT } from '../../lib/crdt/yjsCoordination';
import { CryptoService } from '../../services/cryptoService';

interface BenchmarkResult {
  name: string;
  duration: number;
  iterations: number;
  avgPerIteration: number;
  passed: boolean;
  threshold: number;
}

describe('Performance Benchmarks', () => {
  let cryptoService: CryptoService;

  beforeEach(() => {
    cryptoService = new CryptoService();
  });

  function runBenchmark(
    name: string,
    fn: () => void | Promise<void>,
    threshold: number
  ): BenchmarkResult {
    const iterations = 100;
    const start = Date.now();

    for (let i = 0; i < iterations; i++) {
      fn();
    }

    const duration = Date.now() - start;
    const avgPerIteration = duration / iterations;
    const passed = avgPerIteration < threshold;

    return {
      name,
      duration,
      iterations,
      avgPerIteration,
      passed,
      threshold,
    };
  }

  async function runAsyncBenchmark(
    name: string,
    fn: () => Promise<void>,
    threshold: number
  ): Promise<BenchmarkResult> {
    const iterations = 10;
    const start = Date.now();

    for (let i = 0; i < iterations; i++) {
      await fn();
    }

    const duration = Date.now() - start;
    const avgPerIteration = duration / iterations;
    const passed = avgPerIteration < threshold;

    return {
      name,
      duration,
      iterations,
      avgPerIteration,
      passed,
      threshold,
    };
  }

  describe('CRDT Operation Performance', () => {
    it('should perform entity creation under threshold', () => {
      const doc = new Y.Doc();
      const ledger = new LedgerCRDT(doc);

      const result = runBenchmark(
        'Entity Creation',
        () => {
          ledger.setEntity(`test-${Math.random()}`, {
            type: 'account',
            balance: Math.random() * 1000,
          });
        },
        1 // 1ms per operation
      );

      expect(result.passed).toBe(true);
      expect(result.avgPerIteration).toBeLessThan(result.threshold);
    });

    it('should perform entity reads under threshold', () => {
      const doc = new Y.Doc();
      const ledger = new LedgerCRDT(doc);

      // Pre-populate
      for (let i = 0; i < 100; i++) {
        ledger.setEntity(`acct-${i}`, { type: 'account', balance: i });
      }

      const result = runBenchmark(
        'Entity Read',
        () => {
          const id = `acct-${Math.floor(Math.random() * 100)}`;
          ledger.getEntity(id);
        },
        0.1 // 0.1ms per operation
      );

      expect(result.passed).toBe(true);
    });

    it('should perform edge additions under threshold', () => {
      const doc = new Y.Doc();
      const ledger = new LedgerCRDT(doc);

      const result = runBenchmark(
        'Edge Addition',
        () => {
          const id = `txn-${Math.floor(Math.random() * 100)}`;
          ledger.addEdge(id, 'from', `acct-${Math.floor(Math.random() * 10)}`);
        },
        0.5 // 0.5ms per operation
      );

      expect(result.passed).toBe(true);
    });

    it('should handle batch updates efficiently', () => {
      const doc = new Y.Doc();
      const ledger = new LedgerCRDT(doc);

      const batchSize = 100;
      const start = Date.now();

      doc.transact(() => {
        for (let i = 0; i < batchSize; i++) {
          ledger.setEntity(`batch-${i}`, { type: 'test', value: i });
        }
      });

      const duration = Date.now() - start;
      const avgPerOp = duration / batchSize;

      // Batch should be faster than individual operations
      expect(avgPerOp).toBeLessThan(0.5);
    });
  });

  describe('State Encoding/Decoding Performance', () => {
    it('should encode state updates efficiently', () => {
      const doc = new Y.Doc();
      const ledger = new LedgerCRDT(doc);

      // Create substantial data
      for (let i = 0; i < 100; i++) {
        ledger.setEntity(`entity-${i}`, {
          type: 'account',
          balance: i * 100,
          metadata: { created: Date.now(), updated: Date.now() },
        });
      }

      const result = runBenchmark(
        'State Encoding',
        () => {
          Y.encodeStateAsUpdate(doc);
        },
        10 // 10ms per encoding
      );

      expect(result.passed).toBe(true);
    });

    it('should decode state updates efficiently', () => {
      const doc = new Y.Doc();
      const ledger = new LedgerCRDT(doc);

      for (let i = 0; i < 100; i++) {
        ledger.setEntity(`entity-${i}`, { type: 'account', balance: i });
      }

      const state = Y.encodeStateAsUpdate(doc);

      const result = runBenchmark(
        'State Decoding',
        () => {
          const newDoc = new Y.Doc();
          Y.applyUpdate(newDoc, state);
        },
        10 // 10ms per decoding
      );

      expect(result.passed).toBe(true);
    });

    it('should handle incremental updates efficiently', () => {
      const doc = new Y.Doc();
      const ledger = new LedgerCRDT(doc);

      const initialStates: Uint8Array[] = [];
      for (let i = 0; i < 10; i++) {
        ledger.setEntity(`entity-${i}`, { type: 'test', value: i });
        initialStates.push(Y.encodeStateAsUpdate(doc));
      }

      const result = runBenchmark(
        'Incremental Update Application',
        () => {
          const newDoc = new Y.Doc();
          initialStates.forEach(state => {
            Y.applyUpdate(newDoc, state);
          });
        },
        20 // 20ms for all incremental updates
      );

      expect(result.passed).toBe(true);
    });
  });

  describe('Encryption Performance', () => {
    it('should perform key derivation within acceptable time', async () => {
      const result = await runAsyncBenchmark(
        'Key Derivation',
        async () => {
          const salt = cryptoService.generateSalt();
          await cryptoService.deriveKey('test-password', salt);
        },
        200 // 200ms per key derivation (100k PBKDF2 iterations)
      );

      expect(result.passed).toBe(true);
      expect(result.avgPerIteration).toBeLessThan(result.threshold);
    });

    it('should perform encryption efficiently', async () => {
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveKey('password', salt);
      const plaintext = JSON.stringify({
        type: 'account',
        balance: 1234.56,
        transactions: Array.from({ length: 100 }, (_, i) => ({
          id: `txn-${i}`,
          amount: i * 10,
        })),
      });

      const result = await runAsyncBenchmark(
        'Encryption',
        async () => {
          await cryptoService.encrypt(plaintext, key);
        },
        5 // 5ms per encryption
      );

      expect(result.passed).toBe(true);
    });

    it('should perform decryption efficiently', async () => {
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveKey('password', salt);
      const plaintext = 'x'.repeat(10000); // 10KB payload
      const { ciphertext, iv } = await cryptoService.encrypt(plaintext, key);

      const result = await runAsyncBenchmark(
        'Decryption',
        async () => {
          await cryptoService.decrypt(ciphertext, key, iv);
        },
        5 // 5ms per decryption
      );

      expect(result.passed).toBe(true);
    });

    it('should handle large payload encryption', async () => {
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveKey('password', salt);
      const largePayload = JSON.stringify({
        // Simulate large ledger state
        accounts: Array.from({ length: 1000 }, (_, i) => ({
          id: `acct-${i}`,
          balance: i * 100,
          transactions: Array.from({ length: 50 }, (_, j) => ({
            id: `txn-${i}-${j}`,
            amount: j * 10,
          })),
        })),
      });

      const start = Date.now();
      const { ciphertext, iv } = await cryptoService.encrypt(largePayload, key);
      const encryptTime = Date.now() - start;

      const decryptStart = Date.now();
      await cryptoService.decrypt(ciphertext, key, iv);
      const decryptTime = Date.now() - decryptStart;

      // Large payloads should still complete quickly
      expect(encryptTime).toBeLessThan(100); // < 100ms
      expect(decryptTime).toBeLessThan(100); // < 100ms
    });
  });

  describe('Memory Usage', () => {
    it('should maintain reasonable memory for large datasets', () => {
      const doc = new Y.Doc();
      const ledger = new LedgerCRDT(doc);

      const entityCount = 1000;

      for (let i = 0; i < entityCount; i++) {
        ledger.setEntity(`entity-${i}`, {
          type: 'account',
          balance: i * 100,
          data: 'x'.repeat(100), // 100 bytes per entity
        });
      }

      const state = Y.encodeStateAsUpdate(doc);
      const sizeInMB = state.byteLength / (1024 * 1024);

      // 1000 entities * ~100 bytes = ~100KB + overhead
      // Should be under 5MB including Yjs overhead
      expect(sizeInMB).toBeLessThan(5);
    });

    it('should handle snapshot creation efficiently', () => {
      const doc = new Y.Doc();
      const ledger = new LedgerCRDT(doc);

      for (let i = 0; i < 1000; i++) {
        ledger.setEntity(`entity-${i}`, { type: 'test', value: i });
      }

      const result = runBenchmark(
        'Snapshot Creation',
        () => {
          ledger.createSnapshot();
        },
        50 // 50ms per snapshot
      );

      expect(result.passed).toBe(true);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent writes efficiently', () => {
      const docs = Array.from({ length: 10 }, () => new Y.Doc());
      const ledgers = docs.map(doc => new LedgerCRDT(doc));

      const start = Date.now();

      // All docs make concurrent writes
      ledgers.forEach((ledger, i) => {
        for (let j = 0; j < 100; j++) {
          ledger.setEntity(`writer-${i}-entity-${j}`, {
            type: 'test',
            value: i * 1000 + j,
          });
        }
      });

      const writeTime = Date.now() - start;

      // 10 docs * 100 writes = 1000 writes
      // Should complete quickly
      expect(writeTime).toBeLessThan(500); // < 500ms

      // Sync all
      const syncStart = Date.now();
      const mergedDoc = new Y.Doc();
      const mergedLedger = new LedgerCRDT(mergedDoc);

      docs.forEach(doc => {
        const state = Y.encodeStateAsUpdate(doc);
        Y.applyUpdate(mergedDoc, state);
      });

      const syncTime = Date.now() - syncStart;
      expect(syncTime).toBeLessThan(200); // < 200ms
    });

    it('should merge concurrent updates efficiently', () => {
      const doc1 = new Y.Doc();
      const doc2 = new Y.Doc();
      const doc3 = new Y.Doc();

      const ledger1 = new LedgerCRDT(doc1);
      const ledger2 = new LedgerCRDT(doc2);
      const ledger3 = new LedgerCRDT(doc3);

      // Each doc makes changes
      for (let i = 0; i < 100; i++) {
        ledger1.setEntity(`doc1-${i}`, { value: i });
        ledger2.setEntity(`doc2-${i}`, { value: i });
        ledger3.setEntity(`doc3-${i}`, { value: i });
      }

      // Merge all
      const start = Date.now();
      const mergedDoc = new Y.Doc();

      const state1 = Y.encodeStateAsUpdate(doc1);
      const state2 = Y.encodeStateAsUpdate(doc2);
      const state3 = Y.encodeStateAsUpdate(doc3);

      Y.applyUpdate(mergedDoc, state1);
      Y.applyUpdate(mergedDoc, state2);
      Y.applyUpdate(mergedDoc, state3);

      const mergeTime = Date.now() - start;

      // 3 updates with 100 entities each
      expect(mergeTime).toBeLessThan(100); // < 100ms
    });
  });

  describe('Simulated Cold-Start Latency', () => {
    it('should initialize LedgerCRDT quickly on cold start', () => {
      const iterations = 100;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        const doc = new Y.Doc();
        const ledger = new LedgerCRDT(doc);
        times.push(Date.now() - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / iterations;

      // Cold start initialization should be fast
      expect(avgTime).toBeLessThan(5); // < 5ms
    });

    it('should load existing state quickly on cold start', () => {
      // Create a document with data
      const sourceDoc = new Y.Doc();
      const sourceLedger = new LedgerCRDT(sourceDoc);

      for (let i = 0; i < 100; i++) {
        sourceLedger.setEntity(`entity-${i}`, { type: 'account', balance: i });
      }

      const state = Y.encodeStateAsUpdate(sourceDoc);

      // Simulate loading on cold start
      const iterations = 100;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        const doc = new Y.Doc();
        Y.applyUpdate(doc, state);
        const ledger = new LedgerCRDT(doc);
        times.push(Date.now() - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / iterations;

      // Loading state should be fast
      expect(avgTime).toBeLessThan(20); // < 20ms
    });
  });
});
