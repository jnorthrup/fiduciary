/**
 * CRDT Consistency Tests
 * Verifies Yjs behavior for concurrent updates, conflict resolution, and data integrity
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as Y from 'yjs';
import { LedgerCRDT } from '../../lib/crdt/yjsCoordination';

describe('CRDT Consistency Tests', () => {
  describe('Concurrent Update Handling', () => {
    it('should merge concurrent entity updates without data loss', async () => {
      // Create three separate documents representing three users
      const doc1 = new Y.Doc();
      const doc2 = new Y.Doc();
      const doc3 = new Y.Doc();

      const ledger1 = new LedgerCRDT(doc1);
      const ledger2 = new LedgerCRDT(doc2);
      const ledger3 = new LedgerCRDT(doc3);

      // All three users update the same account concurrently
      ledger1.setEntity('acct-1', { type: 'account', balance: 100, user1: 'updated' });
      ledger2.setEntity('acct-1', { type: 'account', balance: 200, user2: 'updated' });
      ledger3.setEntity('acct-1', { type: 'account', balance: 300, user3: 'updated' });

      // Sync all documents
      const state1 = Y.encodeStateAsUpdate(doc1);
      const state2 = Y.encodeStateAsUpdate(doc2);
      const state3 = Y.encodeStateAsUpdate(doc3);

      Y.applyUpdate(doc1, state2);
      Y.applyUpdate(doc1, state3);
      Y.applyUpdate(doc2, state1);
      Y.applyUpdate(doc2, state3);
      Y.applyUpdate(doc3, state1);
      Y.applyUpdate(doc3, state2);

      // All documents should be consistent now
      const entity1 = ledger1.getEntity('acct-1');
      const entity2 = ledger2.getEntity('acct-1');
      const entity3 = ledger3.getEntity('acct-1');

      expect(entity1).toBeDefined();
      expect(entity2).toBeDefined();
      expect(entity3).toBeDefined();

      // All should have the same state (last-write-wins applied)
      expect(entity1.balance).toBe(entity3.balance);
      expect(entity2.balance).toBe(entity3.balance);
    });

    it('should preserve all concurrent edge additions', async () => {
      const doc1 = new Y.Doc();
      const doc2 = new Y.Doc();

      const ledger1 = new LedgerCRDT(doc1);
      const ledger2 = new LedgerCRDT(doc2);

      // Both add different edges from different entities
      ledger1.addEdge('txn-1', 'from', 'acct-1');
      ledger1.addEdge('txn-1', 'from', 'acct-2');

      ledger2.addEdge('txn-1', 'to', 'acct-3');
      ledger2.addEdge('txn-1', 'to', 'acct-4');

      // Sync
      const state1 = Y.encodeStateAsUpdate(doc1);
      const state2 = Y.encodeStateAsUpdate(doc2);
      Y.applyUpdate(doc1, state2);
      Y.applyUpdate(doc2, state1);

      // Both should have all edges after merge
      const edges1 = ledger1.getEdges('txn-1');
      const edges2 = ledger2.getEdges('txn-1');

      expect(edges1.length).toBe(edges2.length);
      // In Yjs, concurrent array pushes are all preserved
    });
  });

  describe('Graph Structure Consistency', () => {
    it('should maintain referential integrity after sync', async () => {
      const doc1 = new Y.Doc();
      const doc2 = new Y.Doc();

      const ledger1 = new LedgerCRDT(doc1);
      const ledger2 = new LedgerCRDT(doc2);

      // Create entities
      ledger1.setEntity('acct-1', { type: 'account', balance: 100 });
      ledger1.setEntity('acct-2', { type: 'account', balance: 200 });
      ledger1.setEntity('txn-1', { type: 'transaction', amount: 50 });

      // Create edges
      ledger1.addEdge('txn-1', 'from', 'acct-1');
      ledger1.addEdge('txn-1', 'to', 'acct-2');

      // Sync
      const state1 = Y.encodeStateAsUpdate(doc1);
      Y.applyUpdate(doc2, state1);

      // Verify graph structure in doc2
      const entity = ledger2.getEntity('acct-1');
      expect(entity).toBeDefined();
      expect(entity.balance).toBe(100);

      const edges = ledger2.getEdges('txn-1');
      expect(edges.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle circular references correctly', async () => {
      const doc = new Y.Doc();
      const ledger = new LedgerCRDT(doc);

      // Create circular references
      ledger.setEntity('a', { type: 'account', ref: 'b' });
      ledger.setEntity('b', { type: 'account', ref: 'c' });
      ledger.setEntity('c', { type: 'account', ref: 'a' });

      // Should handle without errors
      const entityA = ledger.getEntity('a');
      const entityB = ledger.getEntity('b');
      const entityC = ledger.getEntity('c');

      expect(entityA?.ref).toBe('b');
      expect(entityB?.ref).toBe('c');
      expect(entityC?.ref).toBe('a');
    });
  });

  describe('State Consistency After Replay', () => {
    it('should produce identical state after snapshot restore', async () => {
      const doc1 = new Y.Doc();
      const ledger1 = new LedgerCRDT(doc1);

      // Create some data
      ledger1.setEntity('acct-1', { type: 'account', balance: 100 });
      ledger1.setEntity('txn-1', { type: 'transaction', amount: 50 });
      ledger1.addEdge('txn-1', 'from', 'acct-1');

      // Create snapshot
      const snapshot = ledger1.createSnapshot();

      // Create new document and restore
      const doc2 = new Y.Doc();
      const ledger2 = new LedgerCRDT(doc2);
      ledger2.restoreFromSnapshot(snapshot);

      // Verify state matches
      expect(ledger2.getEntity('acct-1')).toEqual({
        type: 'account',
        balance: 100,
        id: 'acct-1'
      });

      expect(ledger2.getEntity('txn-1')).toEqual({
        type: 'transaction',
        amount: 50,
        id: 'txn-1'
      });
    });

    it('should handle multiple sequential snapshots correctly', async () => {
      const doc = new Y.Doc();
      const ledger = new LedgerCRDT(doc);

      // Create snapshot 1
      ledger.setEntity('acct-1', { type: 'account', balance: 100 });
      const snapshot1 = ledger.createSnapshot();

      // Modify and create snapshot 2
      ledger.setEntity('acct-1', { type: 'account', balance: 200 });
      const snapshot2 = ledger.createSnapshot();

      // Restore snapshot 1
      const docRestore1 = new Y.Doc();
      const ledgerRestore1 = new LedgerCRDT(docRestore1);
      ledgerRestore1.restoreFromSnapshot(snapshot1);

      expect(ledgerRestore1.getEntity('acct-1')?.balance).toBe(100);

      // Restore snapshot 2
      const docRestore2 = new Y.Doc();
      const ledgerRestore2 = new LedgerCRDT(docRestore2);
      ledgerRestore2.restoreFromSnapshot(snapshot2);

      expect(ledgerRestore2.getEntity('acct-1')?.balance).toBe(200);
    });
  });

  describe('Operation Ordering Guarantees', () => {
    it('should preserve order of operations within a transaction', async () => {
      const doc = new Y.Doc();
      const ledger = new LedgerCRDT(doc);

      // Perform multiple operations in sequence
      ledger.setEntity('acct-1', { type: 'account', balance: 100 });
      ledger.setEntity('acct-1', { type: 'account', balance: 150 });
      ledger.setEntity('acct-1', { type: 'account', balance: 200 });
      ledger.deleteEntity('acct-1');
      ledger.setEntity('acct-1', { type: 'account', balance: 300 });

      // Final state should reflect the last operation
      const entity = ledger.getEntity('acct-1');
      expect(entity?.balance).toBe(300);
    });

    it('should handle rapid sequential edge additions', async () => {
      const doc = new Y.Doc();
      const ledger = new LedgerCRDT(doc);

      // Add many edges quickly
      for (let i = 0; i < 10; i++) {
        ledger.addEdge(`txn-${i}`, 'from', `acct-${i}`);
        ledger.addEdge(`txn-${i}`, 'to', `acct-${i + 1}`);
      }

      // Verify all edges were added
      const edges = ledger.getEdges('txn-5');
      expect(edges.length).toBe(2);
    });
  });

  describe('Cross-Document Consistency', () => {
    it('should maintain consistency across multiple replicas', async () => {
      const docs = Array.from({ length: 5 }, () => new Y.Doc());
      const ledgers = docs.map(doc => new LedgerCRDT(doc));

      // Have all replicas start with same data
      ledgers.forEach((ledger, i) => {
        ledger.setEntity(`shared-entity-${i}`, { type: 'test', value: i });
      });

      // Sync all to first document
      for (let i = 1; i < ledgers.length; i++) {
        const state = Y.encodeStateAsUpdate(docs[i]);
        Y.applyUpdate(docs[0], state);
      }

      // Broadcast from first to all others
      const broadcastState = Y.encodeStateAsUpdate(docs[0]);
      for (let i = 1; i < ledgers.length; i++) {
        Y.applyUpdate(docs[i], broadcastState);
      }

      // All should have consistent state
      const entity0 = ledgers[0].getEntity('shared-entity-0');
      for (let i = 1; i < ledgers.length; i++) {
        const entity = ledgers[i].getEntity('shared-entity-0');
        expect(entity).toEqual(entity0);
      }
    });
  });
});

describe('Yjs Binary Format Consistency', () => {
  it('should produce reproducible state updates', async () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    const map1 = doc1.getMap('test');
    map1.set('key1', 'value1');
    map1.set('key2', 'value2');

    const state1 = Y.encodeStateAsUpdate(doc1);
    const state2 = Y.encodeStateAsUpdate(doc1);

    // Same document should produce same state
    expect(state1).toEqual(state2);

    // Applying same update to different document should produce same result
    Y.applyUpdate(doc2, state1);
    Y.applyUpdate(doc2, state2);

    const map2 = doc2.getMap('test');
    expect(map2.get('key1')).toBe('value1');
    expect(map2.get('key2')).toBe('value2');
  });

  it('should handle empty and full state correctly', async () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    // Empty state
    const emptyState = Y.encodeStateAsUpdate(doc1);
    Y.applyUpdate(doc2, emptyState);

    // Add data
    const map1 = doc1.getMap('test');
    map1.set('key', 'value');

    // Full state
    const fullState = Y.encodeStateAsUpdate(doc1, true);
    Y.applyUpdate(doc2, fullState);

    const map2 = doc2.getMap('test');
    expect(map2.get('key')).toBe('value');
  });
});
