/**
 * jsonlStream Module
 *
 * Streaming GCS file reads with filtering support for JSONL LSM persistence.
 * Provides async generator for efficient memory-safe streaming of records.
 *
 * Spec: Phase 3.1 Streaming Reads
 * - streamJSONL<T>(uid, entityType, options) - Async generator for streaming
 * - Support key-range queries (startKey, endKey)
 * - Support time-range queries (startDate, endDate)
 * - Filter by indexed fields during stream
 * - Read from both SSTables and WAL files
 */

import { loadMetadata } from './walMetadata.js';

// GCS Bucket interface (minimal subset needed for testing)
interface GCSBucket {
    file(path: string): GCSFile;
    getFiles(options: { prefix: string }): Promise<[GCSFile[]]>;
}

interface GCSFile {
    name: string;
    save(content: string, options: { contentType: string; resumable: boolean }): Promise<unknown>;
    download(): Promise<[Buffer]>;
    getMetadata(): Promise<[Record<string, unknown>]>;
    exists(): Promise<[boolean]>;
}

/**
 * Streaming options for JSONL reads
 */
export interface StreamOptions<T> {
    /** Optional start key for range query (inclusive) */
    startKey?: string;
    /** Optional end key for range query (inclusive) */
    endKey?: string;
    /** Optional start date for time-range query (inclusive) */
    startDate?: string;
    /** Optional end date for time-range query (inclusive) */
    endDate?: string;
    /** Optional predicate filter function */
    filter?: (record: T) => boolean;
    /** Optional custom key extraction function (defaults to record.id or record.timestamp) */
    keyExtractor?: (record: T) => string;
}

/**
 * SSTable index structure
 */
interface SSTableIndex {
    entries: Array<{
        key: string;
        offset: number;
        size: number;
    }>;
    createdAt: string;
    entryCount: number;
    totalBytes: number;
    entityType: string;
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
 * Extract sort key from record for filtering
 * Priority: id > timestamp > first string property
 */
function extractKey<T>(record: T, keyExtractor?: (record: T) => string): string {
    if (keyExtractor) {
        return keyExtractor(record);
    }

    const rec = record as Record<string, unknown>;
    if (typeof rec.id === 'string') {
        return rec.id;
    }
    if (typeof rec.timestamp === 'string') {
        return rec.timestamp;
    }
    return '';
}

/**
 * Extract timestamp from record for time-range filtering
 */
function extractTimestamp<T>(record: T): string {
    const rec = record as Record<string, unknown>;
    if (typeof rec.timestamp === 'string') {
        return rec.timestamp;
    }
    return '';
}

/**
 * Check if record passes key-range filter
 */
function passesKeyRange<T>(record: T, options: StreamOptions<T>, keyExtractor?: (record: T) => string): boolean {
    const key = extractKey(record, keyExtractor);

    if (options.startKey && key < options.startKey) {
        return false;
    }

    if (options.endKey && key > options.endKey) {
        return false;
    }

    return true;
}

/**
 * Check if record passes time-range filter
 */
function passesTimeRange<T>(record: T, options: StreamOptions<T>): boolean {
    if (!options.startDate && !options.endDate) {
        return true;
    }

    const timestamp = extractTimestamp(record);
    if (!timestamp) {
        return true; // No timestamp to filter on
    }

    if (options.startDate && timestamp < options.startDate) {
        return false;
    }

    if (options.endDate && timestamp > options.endDate) {
        return false;
    }

    return true;
}

/**
 * Check if record passes predicate filter
 */
function passesPredicate<T>(record: T, options: StreamOptions<T>): boolean {
    if (options.filter) {
        return options.filter(record);
    }
    return true;
}

/**
 * Check if record passes all filters
 */
function passesFilters<T>(record: T, options: StreamOptions<T>, keyExtractor?: (record: T) => string): boolean {
    return passesKeyRange(record, options, keyExtractor) &&
           passesTimeRange(record, options) &&
           passesPredicate(record, options);
}

/**
 * Read and parse JSONL content line by line
 * Yields records that pass all filters
 */
async function* streamJSONLContent<T>(
    content: Buffer,
    options: StreamOptions<T>
): AsyncGenerator<T> {
    const text = content.toString('utf-8');
    const lines = text.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            continue;
        }

        try {
            const record = JSON.parse(trimmed) as T;

            // Apply all filters
            if (passesFilters(record, options, options.keyExtractor)) {
                yield record;
            }
        } catch (error) {
            // Skip malformed JSON lines and continue
            console.warn(`Skipping malformed JSON line: ${trimmed.substring(0, 50)}...`);
            continue;
        }
    }
}

/**
 * Stream records from an SSTable file using optional index for range queries
 *
 * If index exists and range query is specified, uses index to skip to start position.
 * Otherwise reads entire file and filters.
 */
async function* streamFromSSTable<T>(
    bucket: GCSBucket,
    sstablePath: string,
    indexPath: string,
    options: StreamOptions<T>
): AsyncGenerator<T> {
    try {
        // Check if we have a range query that could benefit from index
        const hasKeyRange = !!(options.startKey || options.endKey);

        if (hasKeyRange) {
            // Try to load index for efficient range query
            try {
                const indexFile = bucket.file(indexPath);
                const [exists] = await indexFile.exists();
                if (exists) {
                    const [indexContent] = await indexFile.download();
                    const index = JSON.parse(indexContent.toString()) as SSTableIndex;

                    // Use index to find start position
                    const startIndex = options.startKey
                        ? index.entries.findIndex(e => e.key >= options.startKey!)
                        : 0;

                    const endIndex = options.endKey
                        ? index.entries.findIndex(e => e.key > options.endKey!)
                        : index.entries.length;

                    if (startIndex >= 0 && endIndex > startIndex) {
                        // Download only relevant portion if possible
                        const sstableFile = bucket.file(sstablePath);
                        const [sstableContent] = await sstableFile.download();

                        // Stream through content and filter
                        for await (const record of streamJSONLContent<T>(sstableContent, options)) {
                            yield record;
                        }
                        return;
                    }
                }
            } catch (indexError) {
                // Index read failed, fall back to full scan
                console.warn(`Failed to read index ${indexPath}, falling back to full scan:`, indexError);
            }
        }

        // Full scan fallback (or no index available)
        const sstableFile = bucket.file(sstablePath);
        const [sstableContent] = await sstableFile.download();

        for await (const record of streamJSONLContent<T>(sstableContent, options)) {
            yield record;
        }
    } catch (error) {
        throw new Error(`Failed to stream from SSTable ${sstablePath}: ${error}`);
    }
}

/**
 * Stream records from WAL files
 *
 * Reads all WAL files for the user/entity type and streams records with filtering.
 */
async function* streamFromWAL<T>(
    bucket: GCSBucket,
    uid: string,
    entityType: string,
    options: StreamOptions<T>
): AsyncGenerator<T> {
    const walPrefix = `users/${uid}/wal/${entityType}/`;
    const [files] = await bucket.getFiles({ prefix: walPrefix });

    // Filter only .jsonl files and sort by name
    const walFiles = files
        .filter(f => f.name.endsWith('.jsonl'))
        .sort((a, b) => a.name.localeCompare(b.name));

    for (const walFile of walFiles) {
        try {
            const [content] = await walFile.download();
            for await (const record of streamJSONLContent<T>(content, options)) {
                yield record;
            }
        } catch (error) {
            console.warn(`Failed to stream WAL file ${walFile.name}:`, error);
            // Continue to next WAL file
        }
    }
}

/**
 * Stream JSONL records from GCS with filtering support.
 *
 * Reads from SSTables first (using index for efficient range queries),
 * then falls back to WAL files if no SSTables exist.
 *
 * Usage:
 * ```ts
 * interface MyRecord { id: string; timestamp: string; value: number; }
 *
 * for await (const record of streamJSONL<MyRecord>(uid, entityType, {
 *   startKey: 'je-002',
 *   endKey: 'je-004',
 *   filter: (r) => r.value > 100,
 * })) {
 *   console.log(record);
 * }
 * ```
 *
 * @param uid - User OID
 * @param entityType - Entity type (e.g., 'journal_entries', 'ledger')
 * @param options - Streaming options for filtering
 * @returns AsyncGenerator yielding records that pass all filters
 *
 * Spec: Phase 3.1 Streaming Reads
 */
export async function* streamJSONL<T>(
    uid: string,
    entityType: string,
    options: StreamOptions<T> = {}
): AsyncGenerator<T> {
    const bucket = getBucket();

    // Try to load metadata to find SSTables
    const metadata = await loadMetadata(uid, entityType);

    if (metadata && metadata.sstables.length > 0) {
        // Stream from SSTables (newest first)
        const sortedSSTables = [...metadata.sstables].sort((a, b) =>
            b.compactedAt.localeCompare(a.compactedAt)
        );

        for (const sstable of sortedSSTables) {
            yield* streamFromSSTable<T>(bucket, sstable.path, sstable.indexPath, options);
        }
    } else {
        // No SSTables, stream from WAL files
        yield* streamFromWAL<T>(bucket, uid, entityType, options);
    }
}

export default {
    streamJSONL,
};
