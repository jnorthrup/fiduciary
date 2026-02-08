/**
 * Yjs CRDT Coordination Layer for Ledger JSON Graph
 * Provides real-time conflict-free document synchronization
 */

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

/**
 * Entity types in the Ledger JSON Graph
 */
export type LedgerNodeType = 'account' | 'transaction' | 'settlement' | 'user' | 'document';

/**
 * Base entity structure
 */
export interface LedgerEntity {
  id: string;
  type: LedgerNodeType;
  [key: string]: any;
}

/**
 * Graph edge for relationships
 */
export interface GraphEdge {
  type: string;
  target: string;
  properties?: Record<string, any>;
}

/**
 * Redux action compatible with CRDT updates
 */
export interface CRDTAction {
  type: string;
  payload: any;
  timestamp: string;
}

/**
 * Yjs CRDT Coordination Layer
 * Manages real-time synchronization of Ledger JSON Graph
 */
export class LedgerCRDT {
  private doc: Y.Doc;
  private root: Y.Map<any>;
  private entities: Y.Map<LedgerEntity>;
  private edgesMap: Y.Map<Y.Array<GraphEdge>>;
  private provider?: any;
  private eventCallbacks: Map<string, Function[]> = new Map();

  constructor(doc: Y.Doc) {
    this.doc = doc;
    this.root = doc.getMap('ledger');
    this.entities = doc.getMap('ledger-entities') as Y.Map<LedgerEntity>;
    this.edgesMap = doc.getMap('ledger-edges') as Y.Map<Y.Array<GraphEdge>>;

    // Observe document changes
    this.doc.on('update', (update: any, origin: any) => {
      this.emit('update', update);
      this.emit('reduxAction', this.updateToAction(update));
    });
  }

  /**
   * Get the root Yjs Map
   */
  getRoot(): Y.Map<any> {
    return this.root;
  }

  /**
   * Set or update an entity in the CRDT
   */
  setEntity(id: string, entity: LedgerEntity): void {
    this.doc.transact(() => {
      this.entities.set(id, { ...entity, id });
      // Broadcast to provider if available
      if (this.provider && this.provider.broadcast) {
        this.provider.broadcast({ type: 'update', id, entity });
      }
    });
  }

  /**
   * Get an entity by ID
   */
  getEntity(id: string): LedgerEntity | undefined {
    return this.entities.get(id);
  }

  /**
   * Delete an entity
   */
  deleteEntity(id: string): void {
    this.entities.delete(id);
  }

  /**
   * Add a graph edge (relationship)
   */
  addEdge(fromId: string, edgeType: string, toId: string, properties?: Record<string, any>): void {
    this.doc.transact(() => {
      let edges = this.edgesMap.get(fromId);
      if (!edges) {
        edges = new Y.Array<GraphEdge>();
        this.edgesMap.set(fromId, edges);
      }
      edges.push([{ type: edgeType, target: toId, properties }]);
    });
  }

  /**
   * Get all edges for an entity
   */
  getEdges(fromId: string): GraphEdge[] {
    const edges = this.edgesMap.get(fromId);
    if (!edges) return [];
    return edges.toArray();
  }

  /**
   * Traverse graph from a starting node
   */
  traverse(startId: string, options: { direction: 'incoming' | 'outgoing'; depth: number }): string[] {
    const visited = new Set<string>();
    const queue: [string, number][] = [[startId, 0]];
    const results: string[] = [];

    while (queue.length > 0) {
      const [currentId, currentDepth] = queue.shift()!;

      if (visited.has(currentId) || currentDepth > options.depth) continue;
      visited.add(currentId);

      if (currentDepth > 0) {
        results.push(currentId);
      }

      if (currentDepth < options.depth) {
        const edges = this.getEdges(currentId);
        for (const edge of edges) {
          queue.push([edge.target, currentDepth + 1]);
        }
      }
    }

    return results;
  }

  /**
   * Persist document state to IndexedDB
   */
  async persistToIndexedDB(name: string): Promise<any> {
    const provider = new IndexeddbPersistence(name, this.doc);
    await provider.whenSynced;
    return provider;
  }

  /**
   * Load document from IndexedDB
   */
  async loadFromIndexedDB(name: string): Promise<void> {
    const provider = new IndexeddbPersistence(name, this.doc);
    await provider.whenSynced;
  }

  /**
   * Create a binary snapshot of the document
   */
  createSnapshot(): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc);
  }

  /**
   * Restore document from snapshot
   */
  restoreFromSnapshot(snapshot: Uint8Array): void {
    Y.applyUpdate(this.doc, snapshot);
  }

  /**
   * Set WebRTC provider for peer-to-peer sync
   */
  setProvider(provider: any): void {
    this.provider = provider;
  }

  /**
   * Apply a Redux action to the CRDT
   */
  applyReduxAction(action: CRDTAction): void {
    this.doc.transact(() => {
      switch (action.type) {
        case 'account/create':
        case 'account/update':
        case 'account/credit':
          const accountId = action.payload.accountId || action.payload.id;
          const existing = this.entities.get(accountId);
          this.entities.set(accountId, {
            type: 'account',
            ...existing,
            ...action.payload,
            id: accountId
          });
          break;

        case 'transaction/create':
          const txnId = action.payload.id;
          this.entities.set(txnId, {
            type: 'transaction',
            ...action.payload
          });
          // Add edges
          if (action.payload.from) {
            this.addEdge(txnId, 'from', action.payload.from);
          }
          if (action.payload.to) {
            this.addEdge(txnId, 'to', action.payload.to);
          }
          break;
      }
    });
  }

  /**
   * Convert Yjs update to Redux action
   */
  private updateToAction(update: any): CRDTAction {
    return {
      type: 'CRDT/update',
      payload: { update },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Event emitter for document changes
   */
  on(event: string, callback: Function): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }

  private emit(event: string, data: any): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  /**
   * Get current document state as JSON
   */
  toJSON(): Record<string, any> {
    return {
      entities: this.entities.toJSON(),
      edges: Array.from(this.edgesMap.entries()).map(([id, edges]) => [
        id,
        edges.toArray()
      ])
    };
  }

  /**
   * Destroy the CRDT instance
   */
  destroy(): void {
    this.doc.destroy();
    this.eventCallbacks.clear();
  }
}

/**
 * Factory function to create a new Ledger CRDT document
 */
export function createLedgerCRDT(): LedgerCRDT {
  const doc = new Y.Doc();
  return new LedgerCRDT(doc);
}

/**
 * Merge multiple CRDT documents (for conflict resolution)
 */
export function mergeCRDTs(docs: Y.Doc[]): Y.Doc {
  const merged = new Y.Doc();
  for (const doc of docs) {
    const state = Y.encodeStateAsUpdate(doc);
    Y.applyUpdate(merged, state);
  }
  return merged;
}
