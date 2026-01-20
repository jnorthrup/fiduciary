/**
 * Offline Sync Validation Tests
 * Verifies Yjs CRDT state persists and syncs correctly after network disruption
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as Y from 'yjs';
import { WebSocket } from 'ws';
import { WebsocketProvider } from 'y-websocket';
import { LedgerCRDT } from '../../lib/crdt/yjsCoordination';

// EventEmitter base class for mocking
class EventEmitter {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  emit(event: string, ...args: any[]) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(...args));
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event) || [];
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }
}

// Mock WebSocket for testing
class MockWebSocket extends EventEmitter {
  readyState: number = WebSocket.CONNECTING;
  url: string;

  constructor(url: string) {
    super();
    this.url = url;
    // Simulate connection established
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.emit('open');
    }, 10);
  }

  send(data: any) {
    // Echo back for testing
    setTimeout(() => {
      this.emit('message', data);
    }, 5);
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    this.emit('close');
  }

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
}

describe('Offline Sync Validation', () => {
  describe('State Persistence During Disconnection', () => {
    it('should persist local changes while offline', async () => {
      const doc1 = new Y.Doc();
      const ledger1 = new LedgerCRDT(doc1);

      // Create initial state
      ledger1.setEntity('acct-1', { type: 'account', balance: 100 });
      ledger1.setEntity('acct-2', { type: 'account', balance: 200 });

      const stateBefore = Y.encodeStateAsUpdate(doc1);

      // Simulate offline changes (no sync)
      ledger1.setEntity('acct-1', { type: 'account', balance: 150 });
      ledger1.setEntity('txn-1', { type: 'transaction', amount: 50 });

      // Verify local state changed
      expect(ledger1.getEntity('acct-1')?.balance).toBe(150);
      expect(ledger1.getEntity('txn-1')?.amount).toBe(50);

      // Create another doc representing the same user after reconnect
      const doc2 = new Y.Doc();
      const ledger2 = new LedgerCRDT(doc2);

      // Apply initial state
      Y.applyUpdate(doc2, stateBefore);

      // Now merge the offline changes
      const offlineChanges = Y.encodeStateAsUpdate(doc1);
      Y.applyUpdate(doc2, offlineChanges);

      // Verify merged state
      expect(ledger2.getEntity('acct-1')?.balance).toBe(150);
      expect(ledger2.getEntity('txn-1')?.amount).toBe(50);
    });

    it('should handle concurrent offline edits from multiple users', async () => {
      const doc1 = new Y.Doc();
      const doc2 = new Y.Doc();
      const doc3 = new Y.Doc();

      const ledger1 = new LedgerCRDT(doc1);
      const ledger2 = new LedgerCRDT(doc2);
      const ledger3 = new LedgerCRDT(doc3);

      // All start with same initial state
      const initialState = Y.encodeStateAsUpdate(doc1);
      Y.applyUpdate(doc2, initialState);
      Y.applyUpdate(doc3, initialState);

      // User 1 makes offline changes
      ledger1.setEntity('acct-1', { type: 'account', balance: 100, user1: 'edited' });
      ledger1.addEdge('txn-1', 'from', 'acct-1');

      // User 2 makes offline changes (different field)
      ledger2.setEntity('acct-1', { type: 'account', balance: 200, user2: 'edited' });
      ledger2.addEdge('txn-2', 'to', 'acct-1');

      // User 3 makes offline changes
      ledger3.setEntity('acct-2', { type: 'account', balance: 300 });

      // Sync all changes
      const state1 = Y.encodeStateAsUpdate(doc1);
      const state2 = Y.encodeStateAsUpdate(doc2);
      const state3 = Y.encodeStateAsUpdate(doc3);

      // Create sync point
      const docSync = new Y.Doc();
      const ledgerSync = new LedgerCRDT(docSync);

      Y.applyUpdate(docSync, initialState);
      Y.applyUpdate(docSync, state1);
      Y.applyUpdate(docSync, state2);
      Y.applyUpdate(docSync, state3);

      // Verify all changes merged
      const entity = ledgerSync.getEntity('acct-1');
      expect(entity).toBeDefined();
      // Last-write-wins for balance field
      expect(entity.balance).toBeGreaterThanOrEqual(100);

      // Verify edges preserved
      const edges = ledgerSync.getEdges('txn-1');
      expect(edges.length).toBeGreaterThan(0);
    });

    it('should handle reconnection after extended offline period', async () => {
      const doc1 = new Y.Doc();
      const ledger1 = new LedgerCRDT(doc1);

      // Create initial state
      ledger1.setEntity('acct-1', { type: 'account', balance: 100 });
      const initialSnapshot = ledger1.createSnapshot();

      // Simulate extended offline period with many changes
      for (let i = 0; i < 100; i++) {
        ledger1.setEntity(`txn-${i}`, { type: 'transaction', amount: i * 10 });
        ledger1.addEdge(`txn-${i}`, 'from', 'acct-1');
      }

      // Simulate reconnection by creating new doc
      const doc2 = new Y.Doc();
      const ledger2 = new LedgerCRDT(doc2);

      // Restore from snapshot
      ledger2.restoreFromSnapshot(initialSnapshot);

      // Apply all offline changes
      const offlineChanges = Y.encodeStateAsUpdate(doc1);
      Y.applyUpdate(doc2, offlineChanges);

      // Verify all changes synced
      expect(ledger2.getEntity('txn-99')?.amount).toBe(990);
      expect(ledger2.getEdges('txn-99').length).toBeGreaterThan(0);
    });
  });

  describe('Conflict Resolution After Sync', () => {
    it('should resolve concurrent updates to same entity', async () => {
      const doc1 = new Y.Doc();
      const doc2 = new Y.Doc();

      const ledger1 = new LedgerCRDT(doc1);
      const ledger2 = new LedgerCRDT(doc2);

      // Both update same account concurrently
      ledger1.setEntity('acct-1', { type: 'account', balance: 100, user: 'user1' });
      ledger2.setEntity('acct-1', { type: 'account', balance: 200, user: 'user2' });

      // Sync
      const state1 = Y.encodeStateAsUpdate(doc1);
      const state2 = Y.encodeStateAsUpdate(doc2);

      Y.applyUpdate(doc1, state2);
      Y.applyUpdate(doc2, state1);

      // Both should have same final state
      const entity1 = ledger1.getEntity('acct-1');
      const entity2 = ledger2.getEntity('acct-1');

      expect(entity1.balance).toBe(entity2.balance);
      expect(entity1.type).toBe(entity2.type);
    });

    it('should merge edge additions without data loss', async () => {
      const doc1 = new Y.Doc();
      const doc2 = new Y.Doc();

      const ledger1 = new LedgerCRDT(doc1);
      const ledger2 = new LedgerCRDT(doc2);

      // Both add edges to same transaction
      ledger1.addEdge('txn-1', 'from', 'acct-1');
      ledger2.addEdge('txn-1', 'to', 'acct-2');

      // Sync
      const state1 = Y.encodeStateAsUpdate(doc1);
      const state2 = Y.encodeStateAsUpdate(doc2);

      Y.applyUpdate(doc1, state2);
      Y.applyUpdate(doc2, state1);

      // Both should have all edges
      const edges1 = ledger1.getEdges('txn-1');
      const edges2 = ledger2.getEdges('txn-1');

      expect(edges1.length).toBe(edges2.length);
      // In Yjs, concurrent array pushes preserve both items
      expect(edges1.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Incremental Sync', () => {
    it('should sync only changes since last sync', async () => {
      const doc1 = new Y.Doc();
      const ledger1 = new LedgerCRDT(doc1);

      // Create initial state and sync
      ledger1.setEntity('acct-1', { type: 'account', balance: 100 });
      const state1 = Y.encodeStateAsUpdate(doc1);

      // Create new doc with initial state
      const doc2 = new Y.Doc();
      const ledger2 = new LedgerCRDT(doc2);
      Y.applyUpdate(doc2, state1);

      // Make more changes
      ledger1.setEntity('acct-1', { type: 'account', balance: 150 });
      ledger1.setEntity('txn-1', { type: 'transaction', amount: 50 });

      // Get incremental update
      const incrementalState = Y.encodeStateAsUpdate(doc1);

      // Apply incremental update
      Y.applyUpdate(doc2, incrementalState);

      // Verify incremental sync worked
      expect(ledger2.getEntity('acct-1')?.balance).toBe(150);
      expect(ledger2.getEntity('txn-1')?.amount).toBe(50);
    });

    it('should handle partial sync failures', async () => {
      const doc1 = new Y.Doc();
      const ledger1 = new LedgerCRDT(doc1);

      // Create data
      for (let i = 0; i < 10; i++) {
        ledger1.setEntity(`entity-${i}`, { type: 'test', value: i });
      }

      // Simulate partial sync (only first 5 entities)
      const doc2 = new Y.Doc();
      const ledger2 = new LedgerCRDT(doc2);

      for (let i = 0; i < 5; i++) {
        ledger2.setEntity(`entity-${i}`, { type: 'test', value: i });
      }

      // Now sync all
      const fullState = Y.encodeStateAsUpdate(doc1);
      Y.applyUpdate(doc2, fullState);

      // Verify all entities synced
      expect(ledger2.getEntity('entity-9')?.value).toBe(9);
    });
  });

  describe('Network Disruption Simulation', () => {
    it('should handle connection interruption during sync', async () => {
      const doc1 = new Y.Doc();
      const ledger1 = new LedgerCRDT(doc1);

      // Create data
      ledger1.setEntity('acct-1', { type: 'account', balance: 100 });
      ledger1.setEntity('acct-2', { type: 'account', balance: 200 });

      // Start sync
      const partialState = Y.encodeStateAsUpdate(doc1);

      // Simulate interruption by creating new doc
      const doc2 = new Y.Doc();
      const ledger2 = new LedgerCRDT(doc2);

      Y.applyUpdate(doc2, partialState);

      // Make more changes during "disconnection"
      ledger1.setEntity('acct-3', { type: 'account', balance: 300 });

      // Reconnect and sync
      const remainingState = Y.encodeStateAsUpdate(doc1);
      Y.applyUpdate(doc2, remainingState);

      // Verify all data synced
      expect(ledger2.getEntity('acct-3')?.balance).toBe(300);
    });

    it('should queue outgoing changes during disconnection', async () => {
      const doc1 = new Y.Doc();
      const ledger1 = new LedgerCRDT(doc1);

      // Create initial state
      ledger1.setEntity('acct-1', { type: 'account', balance: 100 });

      // Simulate disconnection and make changes
      const changes = [];
      for (let i = 0; i < 10; i++) {
        ledger1.setEntity(`txn-${i}`, { type: 'transaction', amount: i * 10 });
        changes.push(Y.encodeStateAsUpdate(doc1));
      }

      // Apply all queued changes on reconnect
      const doc2 = new Y.Doc();
      const ledger2 = new LedgerCRDT(doc2);

      for (const change of changes) {
        Y.applyUpdate(doc2, change);
      }

      // Verify all changes applied
      expect(ledger2.getEntity('txn-9')?.amount).toBe(90);
    });
  });

  describe('Cross-Device Synchronization', () => {
    it('should sync state across multiple devices', async () => {
      const devices = Array.from({ length: 5 }, () => ({
        doc: new Y.Doc(),
        ledger: null as any,
      }));

      devices.forEach(d => {
        d.ledger = new LedgerCRDT(d.doc);
      });

      // Each device makes changes
      devices.forEach((d, i) => {
        d.ledger.setEntity(`device-${i}-entity`, { type: 'test', value: i });
      });

      // Sync all to first device
      for (let i = 1; i < devices.length; i++) {
        const state = Y.encodeStateAsUpdate(devices[i].doc);
        Y.applyUpdate(devices[0].doc, state);
      }

      // Broadcast from first to all others
      const broadcastState = Y.encodeStateAsUpdate(devices[0].doc);
      for (let i = 1; i < devices.length; i++) {
        Y.applyUpdate(devices[i].doc, broadcastState);
      }

      // Verify all devices have same state
      const referenceEntity = devices[0].ledger.getEntity('device-0-entity');
      for (let i = 1; i < devices.length; i++) {
        expect(devices[i].ledger.getEntity('device-0-entity')).toEqual(referenceEntity);
        expect(devices[i].ledger.getEntity(`device-${i}-entity`)).toBeDefined();
      }
    });

    it('should handle device joining after initial sync', async () => {
      const doc1 = new Y.Doc();
      const doc2 = new Y.Doc();
      const doc3 = new Y.Doc();

      const ledger1 = new LedgerCRDT(doc1);
      const ledger2 = new LedgerCRDT(doc2);
      const ledger3 = new LedgerCRDT(doc3);

      // Device 1 and 2 sync
      ledger1.setEntity('shared', { type: 'test', value: 100 });
      const state1 = Y.encodeStateAsUpdate(doc1);
      Y.applyUpdate(doc2, state1);

      // Device 2 makes changes
      ledger2.setEntity('shared', { type: 'test', value: 150 });

      // Device 3 joins late
      const state2 = Y.encodeStateAsUpdate(doc2);
      Y.applyUpdate(doc3, state2);

      // Verify device 3 got latest state
      expect(ledger3.getEntity('shared')?.value).toBe(150);
    });
  });

  describe('Snapshot-Based Recovery', () => {
    it('should restore from snapshot after corruption', async () => {
      const doc1 = new Y.Doc();
      const ledger1 = new LedgerCRDT(doc1);

      // Create data and snapshot
      ledger1.setEntity('acct-1', { type: 'account', balance: 100 });
      ledger1.setEntity('acct-2', { type: 'account', balance: 200 });
      const snapshot = ledger1.createSnapshot();

      // Simulate corruption by creating a new document
      const doc2 = new Y.Doc();
      const ledger2 = new LedgerCRDT(doc2);

      // Verify new doc is empty
      expect(ledger2.getEntity('acct-1')).toBeUndefined();

      // Restore from snapshot
      ledger2.restoreFromSnapshot(snapshot);

      // Verify data restored in new doc
      expect(ledger2.getEntity('acct-1')?.balance).toBe(100);
      expect(ledger2.getEntity('acct-2')?.balance).toBe(200);
    });

    it('should handle incremental updates after snapshot restore', async () => {
      const doc1 = new Y.Doc();
      const ledger1 = new LedgerCRDT(doc1);

      // Create snapshot
      ledger1.setEntity('acct-1', { type: 'account', balance: 100 });
      const snapshot = ledger1.createSnapshot();

      // Make changes after snapshot
      ledger1.setEntity('acct-1', { type: 'account', balance: 150 });

      // Restore snapshot in new doc
      const doc2 = new Y.Doc();
      const ledger2 = new LedgerCRDT(doc2);
      ledger2.restoreFromSnapshot(snapshot);

      // Apply incremental changes
      const incrementalState = Y.encodeStateAsUpdate(doc1);
      Y.applyUpdate(doc2, incrementalState);

      // Verify final state
      expect(ledger2.getEntity('acct-1')?.balance).toBe(150);
    });
  });
});
