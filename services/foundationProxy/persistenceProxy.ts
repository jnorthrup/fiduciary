/**
 * Persistence Proxy - Bridges Yjs CRDT updates to FoundationDB
 * Handles WAL flushing, LSM compaction, and recovery
 */

import * as Y from 'yjs';
import { createFDBClient, FDBClient } from './fdbClient';

/**
 * Persistence configuration
 */
export interface PersistenceConfig {
  fdbClusterFile?: string;
  walFlushInterval?: number;
  walSegmentSize?: number;
  namespace?: string;
}

/**
 * WAL entry
 */
export interface WALEntry {
  sequence: bigint;
  timestamp: number;
  update: Uint8Array;
  size: number;
}

/**
 * Persistence proxy options
 */
export interface PersistenceProxyOptions {
  autoFlush?: boolean;
  flushInterval?: number;
  segmentSize?: number;
}

/**
 * Persistence Proxy - Bridges Yjs to FoundationDB
 */
export class PersistenceProxy {
  private fdb: FDBClient;
  private doc: Y.Doc;
  private config: PersistenceConfig;
  private flushTimer?: NodeJS.Timeout;
  private currentSegment: WALEntry[] = [];
  private currentSegmentSize = 0;
  private sequence = 0n;
  private options: Required<PersistenceProxyOptions>;

  constructor(doc: Y.Doc, config: PersistenceConfig = {}) {
    this.doc = doc;
    this.config = config;
    this.options = {
      autoFlush: true,
      flushInterval: config.walFlushInterval ?? 30000, // 30 seconds
      segmentSize: config.walSegmentSize ?? 64 * 1024 * 1024, // 64MB
    };

    // FDB client will be initialized via init()
    this.fdb = {} as FDBClient;

    // Observe Yjs document updates
    this.doc.on('update', this.handleUpdate.bind(this));
  }

  /**
   * Initialize persistence layer
   */
  async init(): Promise<void> {
    this.fdb = await createFDBClient({
      clusterFile: this.config?.fdbClusterFile
    });

    // Load last sequence number
    await this.loadSequence();

    // Start auto-flush if enabled
    if (this.options.autoFlush) {
      this.startAutoFlush();
    }
  }

  /**
   * Handle Yjs document update
   */
  private async handleUpdate(update: Uint8Array, origin: any): Promise<void> {
    // Ignore updates from ourselves (during restore)
    if (origin === 'fdb-restore') {
      return;
    }

    // Add to current WAL segment
    const entry: WALEntry = {
      sequence: ++this.sequence,
      timestamp: Date.now(),
      update,
      size: update.length
    };

    this.currentSegment.push(entry);
    this.currentSegmentSize += entry.size;

    // Flush if segment size threshold reached
    if (this.currentSegmentSize >= this.options.segmentSize) {
      await this.flushWAL();
    }
  }

  /**
   * Flush WAL segment to FoundationDB
   */
  async flushWAL(): Promise<void> {
    if (this.currentSegment.length === 0) {
      return;
    }

    const segment = [...this.currentSegment];
    this.currentSegment = [];
    this.currentSegmentSize = 0;

    // Write to FoundationDB in a transaction
    const segmentKey = `wal/segment/${segment[0].sequence}`;
    // Convert BigInt to string for JSON serialization
    const serializableSegment = segment.map(entry => ({
      ...entry,
      sequence: entry.sequence.toString()
    }));
    const segmentData = JSON.stringify(serializableSegment);

    await this.fdb.set(segmentKey, segmentData);

    // Update LSM index
    await this.updateLSMIndex(segment);

    // Update sequence checkpoint
    await this.fdb.set('wal/checkpoint', Buffer.from(this.sequence.toString()));
  }

  /**
   * Update LSM index for range queries
   */
  private async updateLSMIndex(segment: WALEntry[]): Promise<void> {
    const batchOps = segment.map(entry => ({
      type: 'set' as const,
      key: `lsm/by-sequence/${entry.sequence}`,
      value: JSON.stringify({
        timestamp: entry.timestamp,
        size: entry.size,
        segmentKey: `wal/segment/${segment[0].sequence}`
      })
    }));

    await this.fdb.batch(batchOps);
  }

  /**
   * Load last sequence number from FoundationDB
   */
  private async loadSequence(): Promise<void> {
    const checkpoint = await this.fdb.get('wal/checkpoint');
    if (checkpoint) {
      this.sequence = BigInt(checkpoint.toString());
    }
  }

  /**
   * Create a snapshot checkpoint
   */
  async checkpoint(): Promise<string> {
    // Flush any pending WAL
    await this.flushWAL();

    // Create snapshot
    const snapshot = Y.encodeStateAsUpdate(this.doc);
    const checkpointKey = `snapshot/${Date.now()}`;
    const checkpointData = {
      sequence: this.sequence.toString(),
      timestamp: Date.now(),
      snapshot: snapshot.toString('base64')
    };

    await this.fdb.set(checkpointKey, JSON.stringify(checkpointData));

    // Update latest checkpoint reference
    await this.fdb.set('snapshot/latest', checkpointKey);

    return checkpointKey;
  }

  /**
   * Restore document from snapshot
   */
  async restore(checkpointKey?: string): Promise<void> {
    const key = checkpointKey || await this.fdb.get('snapshot/latest');

    if (!key) {
      throw new Error('No checkpoint found');
    }

    const checkpointDataStr = await this.fdb.get(key.toString());
    if (!checkpointDataStr) {
      throw new Error(`Checkpoint not found: ${key}`);
    }

    const checkpointData = JSON.parse(checkpointDataStr.toString());
    const snapshot = Buffer.from(checkpointData.snapshot, 'base64');

    // Apply snapshot to Yjs document
    Y.applyUpdate(this.doc, snapshot, 'fdb-restore');

    // Update sequence
    this.sequence = BigInt(checkpointData.sequence);
  }

  /**
   * Replay WAL from a sequence number
   */
  async replayWAL(fromSequence: bigint): Promise<void> {
    // Get all WAL segments after the sequence
    const startKey = `wal/segment/${fromSequence + 1n}`;
    const endKey = `wal/segment/~`;

    const segments = await this.fdb.getRange(startKey, endKey);

    for (const segment of segments) {
      // Deserialize and convert sequence back to BigInt
      const entries: WALEntry[] = JSON.parse(segment.value.toString()).map((e: any) => ({
        ...e,
        sequence: BigInt(e.sequence)
      }));

      for (const entry of entries) {
        if (entry.sequence > fromSequence) {
          Y.applyUpdate(this.doc, entry.update, 'fdb-restore');
          this.sequence = entry.sequence;
        }
      }
    }
  }

  /**
   * Query range from LSM
   */
  async queryRange(
    startSequence: bigint,
    endSequence: bigint
  ): Promise<Array<{ sequence: bigint; timestamp: number }>> {
    const startKey = `lsm/by-sequence/${startSequence}`;
    const endKey = `lsm/by-sequence/${endSequence}`;

    const results = await this.fdb.getRange(startKey, endKey);

    return results.map(r => {
      const data = JSON.parse(r.value.toString());
      return {
        sequence: BigInt(r.key.toString().split('/').pop()!),
        timestamp: data.timestamp
      };
    });
  }

  /**
   * Start auto-flush timer
   */
  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushWAL().catch(err => {
        console.error('Auto-flush failed:', err);
      });
    }, this.options.flushInterval);
  }

  /**
   * Stop auto-flush timer
   */
  private stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Close the persistence proxy
   */
  async close(): Promise<void> {
    this.stopAutoFlush();
    await this.flushWAL();
    await this.fdb.close();
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      sequence: this.sequence,
      pendingEntries: this.currentSegment.length,
      pendingSize: this.currentSegmentSize,
      autoFlush: this.options.autoFlush
    };
  }
}

/**
 * Factory function to create persistence proxy
 */
export async function createPersistenceProxy(
  doc: Y.Doc,
  config?: PersistenceConfig
): Promise<PersistenceProxy> {
  const proxy = new PersistenceProxy(doc, config);
  await proxy.init();
  return proxy;
}
