/**
 * WAL Handle Module
 *
 * WAL Composition as Binary Blackbox
 * Provides high-level API for WAL operations, hiding internal structure.
 *
 * Spec: Phase 5.1 WAL Handle API
 * - WAL is binary blackbox - internal structure opaque to consumers
 * - All access via high-level APIs (append, stream, compact, close)
 * - Internal structure: [WAL segments] + [SSTables] + [Index]
 *
 * Usage:
 * ```ts
 * const handle = openWAL(uid, entityType);
 * await handle.append({ id: 'je-001', timestamp: '2026-01-20T10:00:00Z', data: 'test' });
 *
 * for await (const record of handle.stream({ startKey: 'je-001', endKey: 'je-100' })) {
 *   console.log(record);
 * }
 *
 * const result = await handle.compact({ maxWALFiles: 10, strategy: 'tiered' });
 * await handle.close();
 * ```
 */

import { serializeToJSONL } from './jsonlSerializer.js';
import { loadMetadata, saveMetadataAtomic, createInitialMetadata, type WALMetadata } from './walMetadata.js';
import { compactWAL, type CompactionConfig, type CompactionResult } from './lsmCompactor.js';
import { streamJSONL, type StreamOptions } from './jsonlStream.js';

// GCS Bucket interface (minimal subset needed for testing)
interface GCSBucket {
    file(path: string): GCSFile;
}

interface GCSFile {
    name: string;
    save(content: string, options: { contentType: string; resumable: boolean }): Promise<unknown>;
    exists(): Promise<[boolean]>;
}

// Default GCS bucket (will be initialized lazily)
let _bucket: GCSBucket | null = null;

/**
 * Get or create GCS bucket instance
 */
function getBucket(): GCSBucket {
    if (_bucket) {
        return _bucket;
    }

    // Lazy import of @google-cloud/storage only when needed
    const { Storage } = require('@google-cloud/storage');
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'fiduciary-dev';
    const bucketName = `fiduciary-persistence-${projectId}`;
    const storage = new Storage({ projectId });
    _bucket = storage.bucket(bucketName);
    return _bucket;
}

/**
 * Set bucket for testing purposes (internal)
 */
export function _setBucketForTesting(bucket: GCSBucket): void {
    _bucket = bucket;
}

/**
 * Streaming options for WAL stream API
 */
export type WALStreamOptions<T> = StreamOptions<T>;

/**
 * WAL Handle - Binary blackbox interface for WAL operations
 *
 * Internal structure (WAL segments + SSTables + Index) is opaque to consumers.
 * All access through high-level APIs.
 *
 * Spec: Phase 5.1 WAL Handle API
 */
export interface WALHandle {
    /**
     * Append record to WAL buffer
     * Records are buffered in memory and flushed on close()
     *
     * @param obj - Object to append to WAL
     * @returns Promise<void>
     */
    append<T extends Record<string, unknown>>(obj: T): Promise<void>;

    /**
     * Stream records from WAL with optional filtering
     * Reads from SSTables (if available) or WAL files
     *
     * @param options - Optional streaming filters (key range, time range, predicate)
     * @returns AsyncGenerator yielding records
     */
    stream<T = Record<string, unknown>>(options?: WALStreamOptions<T>): AsyncGenerator<T>;

    /**
     * Trigger WAL compaction into SSTable
     * Creates SSTable from WAL files and updates metadata atomically
     *
     * @param config - Compaction configuration
     * @returns Promise<CompactionResult> with paths and counts
     */
    compact(config: CompactionConfig): Promise<CompactionResult>;

    /**
     * Close WAL handle, flush buffer, and save metadata atomically
     *
     * @returns Promise<void>
     */
    close(): Promise<void>;
}

/**
 * WAL Handle implementation
 *
 * Internal state is private to maintain blackbox abstraction.
 */
class WALHandleImpl implements WALHandle {
    private readonly uid: string;
    private readonly entityType: string;
    private metadata: WALMetadata | null;
    private metadataLoaded: boolean;
    private buffer: string[];
    private isClosed: boolean;

    constructor(uid: string, entityType: string, initialMetadata: WALMetadata | null) {
        this.uid = uid;
        this.entityType = entityType;
        this.metadata = initialMetadata;
        this.metadataLoaded = false;
        this.buffer = [];
        this.isClosed = false;
    }

    /**
     * Lazily load metadata when needed
     */
    private async ensureMetadataLoaded(): Promise<void> {
        if (!this.metadataLoaded) {
            this.metadata = await loadMetadata(this.uid, this.entityType);
            this.metadataLoaded = true;
        }
    }

    /**
     * Get WAL file path for current date
     */
    private getWALPath(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const date = `${year}-${month}-${day}`;
        return `users/${this.uid}/wal/${this.entityType}/${date}.jsonl`;
    }

    /**
     * Append record to WAL buffer
     */
    async append<T extends Record<string, unknown>>(obj: T): Promise<void> {
        if (this.isClosed) {
            throw new Error('Cannot append to closed WAL handle');
        }

        // Validate input before serialization
        if (obj === undefined) {
            throw new Error('Cannot append undefined value');
        }

        if (typeof obj === 'function') {
            throw new Error('Cannot serialize function');
        }

        const jsonl = serializeToJSONL(obj);
        this.buffer.push(jsonl);
    }

    /**
     * Stream records from WAL with filtering
     */
    async *stream<T = Record<string, unknown>>(options?: WALStreamOptions<T>): AsyncGenerator<T> {
        if (this.isClosed) {
            throw new Error('Cannot stream from closed WAL handle');
        }

        // Stream from persistent storage using jsonlStream module
        yield* streamJSONL<T>(this.uid, this.entityType, options);
    }

    /**
     * Trigger WAL compaction
     */
    async compact(config: CompactionConfig): Promise<CompactionResult> {
        if (this.isClosed) {
            throw new Error('Cannot compact closed WAL handle');
        }

        // Delegate to lsmCompactor module
        return compactWAL(this.uid, this.entityType, config);
    }

    /**
     * Flush buffer to WAL file
     */
    private async flush(): Promise<void> {
        if (this.buffer.length === 0) {
            return;
        }

        const bucket = getBucket();
        const walPath = this.getWALPath();
        const walFile = bucket.file(walPath);

        // Check if file exists
        const [exists] = await walFile.exists();

        // Read existing content if file exists
        let existingContent = '';
        if (exists) {
            const [content] = await walFile.download();
            existingContent = content.toString();
        }

        // Append buffered content
        const newContent = this.buffer.join('');
        const combinedContent = existingContent + newContent;

        // Write to file
        await walFile.save(combinedContent, {
            contentType: 'application/x-ndjson',
            resumable: false,
        });

        // Clear buffer
        this.buffer = [];

        // Update metadata with WAL file info
        await this.updateWALMetadata(walPath, combinedContent);
    }

    /**
     * Update metadata with current WAL file information
     */
    private async updateWALMetadata(walPath: string, content: string): Promise<void> {
        // Load or create metadata
        if (!this.metadata) {
            this.metadata = createInitialMetadata(this.uid, this.entityType);
        }

        // Check if WAL file is already tracked
        const walPathExists = this.metadata.walFiles.some(wal => wal.path === walPath);

        if (!walPathExists) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const date = `${year}-${month}-${day}`;

            // Add WAL file to metadata
            this.metadata.walFiles.push({
                path: walPath,
                recordCount: content.split('\n').filter(line => line.trim()).length,
                byteSize: content.length,
                date,
            });
        } else {
            // Update existing WAL file entry
            const walFileEntry = this.metadata.walFiles.find(wal => wal.path === walPath);
            if (walFileEntry) {
                walFileEntry.recordCount = content.split('\n').filter(line => line.trim()).length;
                walFileEntry.byteSize = content.length;
            }
        }
    }

    /**
     * Close WAL handle and save metadata atomically
     */
    async close(): Promise<void> {
        if (this.isClosed) {
            // Idempotent - multiple closes are safe
            return;
        }

        // Flush buffer to WAL file
        await this.flush();

        // Ensure metadata is loaded before saving
        await this.ensureMetadataLoaded();

        // Save metadata atomically (throw on error)
        if (this.metadata) {
            await saveMetadataAtomic(this.uid, this.metadata);
        } else {
            // Create metadata if it doesn't exist
            this.metadata = createInitialMetadata(this.uid, this.entityType);
            await saveMetadataAtomic(this.uid, this.metadata);
        }

        this.isClosed = true;
    }
}

/**
 * Open WAL handle for user and entity type
 *
 * Factory function that creates WALHandle instance.
 * Loads existing metadata if available, creates new otherwise.
 *
 * Spec: Phase 5.1 WAL Handle API
 *
 * @param uid - User OID
 * @param entityType - Entity type (e.g., 'journal_entries', 'ledger')
 * @returns WALHandle instance
 */
export function openWAL(uid: string, entityType: string): WALHandle {
    // Load existing metadata or create new
    const metadata = loadMetadataSync(uid, entityType);
    return new WALHandleImpl(uid, entityType, metadata);
}

/**
 * Load metadata synchronously for handle construction
 *
 * Note: This is a synchronous wrapper for the async loadMetadata.
 * The actual metadata loading happens lazily when needed.
 *
 * @param uid - User OID
 * @param entityType - Entity type
 * @returns WALMetadata or null
 */
function loadMetadataSync(uid: string, entityType: string): WALMetadata | null {
    // For now, return null and let handle load metadata lazily
    // This avoids async constructor pattern issues
    return null;
}

export default {
    openWAL,
};
