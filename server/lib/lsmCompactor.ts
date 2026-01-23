/**
 * LSM Compactor Module
 *
 * Implements WAL file compaction into SSTables for JSONL LSM persistence.
 * Reads WAL files, merges and sorts them by key (timestamp or entity ID),
 * and creates SSTable with sorted index.
 *
 * Spec: Phase 2.1 SSTable Generation
 * Spec: Phase 2.2 Binary Reduction Semantics (atomic promotion)
 */

import { serializeToJSONL, deserializeJSONL, validateJSONLine } from './jsonlSerializer.ts';
import { loadMetadata, saveMetadataAtomic, addSSTable, type WALMetadata, type SSTableMetadata } from './walMetadata.ts';

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
}

/**
 * Compaction configuration options
 */
export interface CompactionConfig {
    /** Maximum number of WAL files to compact in one operation */
    maxWALFiles: number;
    /** Maximum file size in MB before compaction is skipped */
    maxFileSizeMB: number;
    /** Minimum number of records required to trigger compaction */
    minRecordsToCompact: number;
    /** Compaction strategy: 'tiered' or 'leveled' */
    strategy: 'tiered' | 'leveled';
}

/**
 * Result of WAL compaction operation
 */
export interface CompactionResult {
    /** Path to created SSTable file */
    sstablePath?: string;
    /** Path to created index file */
    indexPath?: string;
    /** Number of records compacted */
    recordCount: number;
    /** Number of invalid entries skipped */
    invalidEntries?: number;
    /** Reason for skipping compaction (if skipped) */
    skippedReason?: string;
    /** Whether metadata was updated atomically */
    metadataUpdated?: boolean;
}

/**
 * Index entry for SSTable lookups
 */
interface IndexEntry {
    /** Sort key (timestamp or entity ID) */
    key: string;
    /** Byte offset in SSTable */
    offset: number;
    /** Size of entry in bytes */
    size: number;
}

/**
 * SSTable index structure
 */
interface SSTableIndex {
    /** Sorted index entries */
    entries: IndexEntry[];
    /** ISO timestamp of creation */
    createdAt: string;
    /** Total number of entries */
    entryCount: number;
    /** Total size in bytes */
    totalBytes: number;
    /** Entity type */
    entityType: string;
}

/**
 * Parsed WAL record with sort key
 */
interface WALRecord {
    /** Original JSON object */
    data: Record<string, unknown>;
    /** Sort key for ordering */
    sortKey: string;
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
 * Extract sort key from record for ordering.
 * Priority: timestamp > id > first string property
 */
function extractSortKey(record: Record<string, unknown>): string {
    // Try timestamp first
    if (typeof record.timestamp === 'string') {
        return record.timestamp;
    }

    // Try id
    if (typeof record.id === 'string') {
        return record.id;
    }

    // Fall back to first string property
    for (const [key, value] of Object.entries(record)) {
        if (typeof value === 'string') {
            return value;
        }
    }

    // Last resort: return empty string for undefined sorts
    return '';
}

/**
 * Read and parse WAL files from GCS
 */
async function readWALFiles(uid: string, entityType: string, maxFiles: number): Promise<{
    records: WALRecord[];
    invalidCount: number;
    totalSize: number;
    walFilePaths: string[];
}> {
    const bucket = getBucket();
    const walPrefix = `users/${uid}/wal/${entityType}/`;
    const [files] = await bucket.getFiles({ prefix: walPrefix });

    // Filter only .jsonl files
    const walFiles = files
        .filter(f => f.name.endsWith('.jsonl'))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, maxFiles);

    const records: WALRecord[] = [];
    let invalidCount = 0;
    let totalSize = 0;
    const walFilePaths: string[] = [];

    for (const walFile of walFiles) {
        try {
            // Get file size
            const [metadata] = await walFile.getMetadata();
            totalSize += parseInt(metadata.size || '0', 10);

            // Track WAL file path for metadata update
            walFilePaths.push(walFile.name);

            // Read content
            const [content] = await walFile.download();
            const lines = content.toString().split('\n').filter(line => line.trim());

            for (const line of lines) {
                if (!validateJSONLine(line)) {
                    invalidCount++;
                    continue;
                }

                try {
                    const data = deserializeJSONL<Record<string, unknown>>(line);
                    const sortKey = extractSortKey(data);
                    records.push({ data, sortKey });
                } catch {
                    invalidCount++;
                }
            }
        } catch (error) {
            console.warn(`Error reading WAL file ${walFile.name}:`, error);
        }
    }

    return { records, invalidCount, totalSize, walFilePaths };
}

/**
 * Sort records by sort key
 */
function sortRecords(records: WALRecord[]): WALRecord[] {
    return records.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

/**
 * Generate SSTable timestamp for filename
 */
function generateSSTableTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}T${hour}${minute}${second}`;
}

/**
 * Create SSTable with metadata header
 */
function createSSTable(records: WALRecord[]): { content: string; index: SSTableIndex } {
    const timestamp = generateSSTableTimestamp();
    const lines: string[] = [];

    // SSTable metadata header (commented lines)
    lines.push(`# SSTable created at ${new Date().toISOString()}`);
    lines.push(`# Record count: ${records.length}`);
    lines.push(`# Format: JSONL (newline-delimited JSON)`);
    lines.push(`#`);

    const indexEntries: IndexEntry[] = [];
    let currentOffset = lines.join('\n').length + 1; // +1 for newline after header

    // Add sorted records
    for (const record of records) {
        const line = serializeToJSONL(record.data);
        const entrySize = line.length;

        lines.push(line.trim());

        indexEntries.push({
            key: record.sortKey,
            offset: currentOffset,
            size: entrySize,
        });

        currentOffset += entrySize;
    }

    const sstableContent = lines.join('\n');

    // Create index
    const index: SSTableIndex = {
        entries: indexEntries,
        createdAt: new Date().toISOString(),
        entryCount: records.length,
        totalBytes: sstableContent.length,
        entityType: 'unknown',
    };

    return { content: sstableContent, index };
}

/**
 * Compact WAL files into SSTable.
 *
 * Path format:
 * - WAL read: users/{uid}/wal/{entityType}/{YYYY-MM-DD}.jsonl
 * - SSTable write: snapshots/{entityType}/{timestamp}-compact.jsonl
 * - Index write: snapshots/{entityType}/{timestamp}-index.json
 * - Metadata update: users/{uid}/metadata/{entityType}.json (atomic)
 *
 * Spec: Phase 2.2 Binary Reduction Semantics
 * - Compaction is pure function (no side effects on source files)
 * - Atomic promotion: metadata update only after successful compaction
 * - Source files retained until promotion confirmed
 *
 * @param uid - User OID
 * @param entityType - Entity type (e.g., 'journal_entries', 'ledger')
 * @param config - Compaction configuration
 * @returns Promise<CompactionResult> with paths and counts
 */
export async function compactWAL(
    uid: string,
    entityType: string,
    config: CompactionConfig
): Promise<CompactionResult> {
    const bucket = getBucket();

    // Read WAL files (pure read operation)
    const { records, invalidCount, totalSize, walFilePaths } = await readWALFiles(
        uid,
        entityType,
        config.maxWALFiles
    );

    // Check if we have any WAL files
    if (records.length === 0) {
        return {
            recordCount: 0,
            invalidEntries: invalidCount,
            skippedReason: invalidCount > 0 ? 'no valid records' : 'no WAL files found',
            metadataUpdated: false,
        };
    }

    // Check max file size threshold FIRST (convert MB to bytes)
    const maxSizeBytes = config.maxFileSizeMB * 1024 * 1024;
    if (totalSize > maxSizeBytes) {
        return {
            recordCount: records.length,
            invalidEntries: invalidCount,
            skippedReason: 'maxFileSizeMB exceeded',
            metadataUpdated: false,
        };
    }

    // Check min records threshold SECOND
    if (records.length < config.minRecordsToCompact) {
        return {
            recordCount: records.length,
            invalidEntries: invalidCount,
            skippedReason: 'minRecordsToCompact not met',
            metadataUpdated: false,
        };
    }

    // Sort records by key
    const sortedRecords = sortRecords(records);

    // Create SSTable content and index
    const { content: sstableContent, index } = createSSTable(sortedRecords);
    index.entityType = entityType;

    // Generate paths
    const timestamp = generateSSTableTimestamp();
    const sstablePath = `snapshots/${entityType}/${timestamp}-compact.jsonl`;
    const indexPath = `snapshots/${entityType}/${timestamp}-index.json`;

    // Write SSTable (to new location only, no modification of source)
    const sstableFile = bucket.file(sstablePath);
    await sstableFile.save(sstableContent, {
        contentType: 'application/x-ndjson',
        resumable: false,
    });

    // Write index
    const indexFile = bucket.file(indexPath);
    await indexFile.save(JSON.stringify(index, null, 2), {
        contentType: 'application/json',
        resumable: false,
    });

    console.info(
        `Compacted ${records.length} records from ${entityType} WAL to ${sstablePath}`
    );

    // Atomic promotion: update metadata only after successful compaction
    let metadataUpdated = false;
    try {
        // Load existing metadata or create new
        const metadata = await loadMetadata(uid, entityType);

        // Create SSTable metadata entry
        const sstableMeta: SSTableMetadata = {
            path: sstablePath,
            indexPath,
            recordCount: records.length,
            byteSize: sstableContent.length,
            startKey: sortedRecords[0]?.sortKey || '',
            endKey: sortedRecords[sortedRecords.length - 1]?.sortKey || '',
            compactedAt: new Date().toISOString(),
        };

        if (metadata) {
            // Update existing metadata with new SSTable
            // WAL files are retained until promotion confirmed
            await saveMetadataAtomic(uid, {
                ...metadata,
                sstables: [...metadata.sstables, sstableMeta],
                // walFiles remains unchanged (retained for rollback)
            });
            metadataUpdated = true;
            console.info(
                `Updated metadata for ${uid}/${entityType} with SSTable ${sstablePath}`
            );
        } else {
            // Create new metadata if none exists
            const { createInitialMetadata } = await import('./walMetadata.js');
            const newMetadata = createInitialMetadata(uid, entityType);
            await saveMetadataAtomic(uid, {
                ...newMetadata,
                sstables: [sstableMeta],
                // No WAL files tracked yet (new entity type)
            });
            metadataUpdated = true;
            console.info(
                `Created new metadata for ${uid}/${entityType} with SSTable ${sstablePath}`
            );
        }
    } catch (error) {
        console.error(
            `Failed to update metadata for ${uid}/${entityType} after compaction:`,
            error
        );
        // Compaction succeeded but metadata update failed
        // SSTable exists but metadata is stale (will be recovered on next load)
    }

    return {
        sstablePath,
        indexPath,
        recordCount: records.length,
        invalidEntries: invalidCount,
        metadataUpdated,
    };
}

export default compactWAL;
