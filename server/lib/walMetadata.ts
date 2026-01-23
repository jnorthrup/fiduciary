/**
 * WAL Metadata Module
 *
 * Manages WAL metadata with atomic updates using temp file + rename pattern.
 * Provides WALMetadata interface and functions for loading, saving, and updating
 * metadata atomically.
 *
 * Spec: Phase 5.2 Metadata Management
 */

import path from 'path';

// GCS Bucket interface (minimal subset needed for testing)
interface GCSBucket {
    file(path: string): GCSFile;
    getFiles(prefix?: string): Promise<[Array<{ name: string; download(): Promise<[Buffer]>; getMetadata(): Promise<Array<{ size: string }>> }>]>;
}

interface GCSFile {
    name: string;
    save(content: string, options: { contentType: string; resumable: boolean }): Promise<unknown>;
    download(): Promise<[Buffer]>;
    exists(): Promise<[boolean]>;
    copy(destinationPath: string): Promise<unknown>;
    delete(): Promise<unknown>;
}

/**
 * WAL file metadata
 */
export interface WALFileMetadata {
    /** GCS path to WAL file */
    path: string;
    /** Number of records in file */
    recordCount: number;
    /** Size in bytes */
    byteSize: number;
    /** Date string (YYYY-MM-DD) */
    date: string;
}

/**
 * SSTable metadata
 */
export interface SSTableMetadata {
    /** GCS path to SSTable file */
    path: string;
    /** GCS path to index file */
    indexPath: string;
    /** Number of records in SSTable */
    recordCount: number;
    /** Size in bytes */
    byteSize: number;
    /** First sort key in SSTable */
    startKey: string;
    /** Last sort key in SSTable */
    endKey: string;
    /** ISO timestamp of compaction */
    compactedAt: string;
}

/**
 * Threshold configuration
 */
export interface ThresholdConfig {
    /** Whether threshold-based routing is enabled */
    enabled: boolean;
    /** Threshold value for dual-write vs JSONL-only mode */
    value: number;
}

/**
 * Migration status
 */
export type MigrationStatus = 'none' | 'pending' | 'complete' | 'rolledback';

/**
 * WAL metadata structure
 * Tracks WAL composition per user/entity type
 *
 * Spec: Phase 5.2 Metadata Management
 */
export interface WALMetadata {
    /** User OID */
    uid: string;
    /** Entity type (e.g., 'journal_entries', 'ledger') */
    entityType: string;
    /** Metadata version (incremented on each update) */
    version: number;
    /** ISO timestamp of creation */
    createdAt: string;
    /** ISO timestamp of last update */
    updatedAt: string;

    /** WAL segments */
    walFiles: WALFileMetadata[];

    /** SSTables */
    sstables: SSTableMetadata[];

    /** Migration status */
    migrationStatus: MigrationStatus;

    /** Threshold configuration */
    thresholdConfig: ThresholdConfig;
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
 * Get current ISO timestamp
 */
function getCurrentTimestamp(): string {
    return new Date().toISOString();
}

/**
 * Get metadata file path for a user and entity type
 * Path format: users/{uid}/metadata/{entityType}.json
 */
function getMetadataPath(uid: string, entityType: string): string {
    return `users/${uid}/metadata/${entityType}.json`;
}

/**
 * Create initial metadata for a user and entity type
 *
 * @param uid - User OID
 * @param entityType - Entity type
 * @param thresholdConfig - Optional threshold configuration
 * @returns WALMetadata with initial values
 */
export function createInitialMetadata(
    uid: string,
    entityType: string,
    thresholdConfig?: ThresholdConfig
): WALMetadata {
    const now = getCurrentTimestamp();

    return {
        uid,
        entityType,
        version: 1,
        createdAt: now,
        updatedAt: now,
        walFiles: [],
        sstables: [],
        migrationStatus: 'none',
        thresholdConfig: thresholdConfig || {
            enabled: true,
            value: 1000,
        },
    };
}

/**
 * Load metadata from GCS
 *
 * @param uid - User OID
 * @param entityType - Entity type
 * @returns Promise<WALMetadata | null> - Metadata or null if not found
 */
export async function loadMetadata(
    uid: string,
    entityType: string
): Promise<WALMetadata | null> {
    const bucket = getBucket();
    const metadataPath = getMetadataPath(uid, entityType);
    const file = bucket.file(metadataPath);

    try {
        const [exists] = await file.exists();
        if (!exists) {
            return null;
        }

        const [content] = await file.download();
        const metadata = JSON.parse(content.toString()) as WALMetadata;

        return metadata;
    } catch (error) {
        throw new Error(`Failed to load metadata for ${uid}/${entityType}: ${error}`);
    }
}

/**
 * Save metadata atomically using temp file + rename pattern
 *
 * Pattern:
 * 1. Write metadata to temp file ({path}.tmp)
 * 2. Copy temp file to target path (atomic in GCS)
 * 3. Delete temp file
 *
 * If any step fails, no partial update occurs (atomicity guaranteed)
 *
 * @param uid - User OID
 * @param metadata - Metadata to save (version will be incremented)
 * @returns Promise<void>
 */
export async function saveMetadataAtomic(uid: string, metadata: WALMetadata): Promise<void> {
    const bucket = getBucket();
    const metadataPath = getMetadataPath(uid, metadata.entityType);
    const tempPath = `${metadataPath}.tmp`;

    const tempFile = bucket.file(tempPath);
    const targetFile = bucket.file(metadataPath);

    try {
        // Increment version and update timestamp
        const metadataToSave: WALMetadata = {
            ...metadata,
            version: metadata.version + 1,
            updatedAt: getCurrentTimestamp(),
        };

        // Step 1: Write to temp file
        await tempFile.save(JSON.stringify(metadataToSave, null, 2), {
            contentType: 'application/json',
            resumable: false,
        });

        // Step 2: Atomic rename via copy (GCS doesn't have true rename, copy is atomic)
        await tempFile.copy(metadataPath);

        // Step 3: Delete temp file
        await tempFile.delete();
    } catch (error) {
        // Attempt cleanup even if save/copy failed
        try {
            await tempFile.delete();
        } catch {
            // Ignore cleanup errors
        }

        throw new Error(`Failed to save metadata atomically for ${uid}/${metadata.entityType}: ${error}`);
    }
}

/**
 * Update metadata with partial updates
 *
 * Loads existing metadata, applies updates, and saves atomically.
 * Creates new metadata if none exists.
 *
 * @param uid - User OID
 * @param entityType - Entity type
 * @param updates - Partial updates to apply
 * @returns Promise<WALMetadata> - Updated metadata
 */
export async function updateMetadata(
    uid: string,
    entityType: string,
    updates: Partial<Omit<WALMetadata, 'uid' | 'entityType' | 'version' | 'createdAt' | 'updatedAt'>>
): Promise<WALMetadata> {
    // Load existing metadata or create new
    const existing = await loadMetadata(uid, entityType);
    const metadata = existing || createInitialMetadata(uid, entityType);

    // Apply updates
    const updated: WALMetadata = {
        ...metadata,
        ...updates,
        // Ensure uid and entityType are not overwritten
        uid: metadata.uid,
        entityType: metadata.entityType,
        // Preserve version and timestamps (will be updated by saveMetadataAtomic)
        version: metadata.version,
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt,
    };

    // Save atomically
    await saveMetadataAtomic(uid, updated);

    return updated;
}

/**
 * Add WAL file to metadata
 *
 * @param uid - User OID
 * @param entityType - Entity type
 * @param walFile - WAL file metadata to add
 * @returns Promise<WALMetadata> - Updated metadata
 */
export async function addWALFile(
    uid: string,
    entityType: string,
    walFile: WALFileMetadata
): Promise<WALMetadata> {
    return updateMetadata(uid, entityType, {
        walFiles: [...(await loadMetadata(uid, entityType))?.walFiles || [], walFile],
    });
}

/**
 * Add SSTable to metadata
 *
 * @param uid - User OID
 * @param entityType - Entity type
 * @param sstable - SSTable metadata to add
 * @returns Promise<WALMetadata> - Updated metadata
 */
export async function addSSTable(
    uid: string,
    entityType: string,
    sstable: SSTableMetadata
): Promise<WALMetadata> {
    return updateMetadata(uid, entityType, {
        sstables: [...(await loadMetadata(uid, entityType))?.sstables || [], sstable],
    });
}

/**
 * Remove WAL files from metadata (after promotion confirmation)
 *
 * @param uid - User OID
 * @param entityType - Entity type
 * @param walPaths - Paths to WAL files to remove
 * @returns Promise<WALMetadata> - Updated metadata
 */
export async function removeWALFiles(
    uid: string,
    entityType: string,
    walPaths: string[]
): Promise<WALMetadata> {
    const existing = await loadMetadata(uid, entityType);
    if (!existing) {
        throw new Error(`No metadata found for ${uid}/${entityType}`);
    }

    return updateMetadata(uid, entityType, {
        walFiles: existing.walFiles.filter(wal => !walPaths.includes(wal.path)),
    });
}

/**
 * Validate metadata structure and values
 *
 * @param metadata - Metadata to validate
 * @returns true if valid, false otherwise
 */
export function validateMetadata(metadata: WALMetadata | null): boolean {
    if (metadata === null) {
        return false;
    }

    // Check required fields
    if (
        typeof metadata.uid !== 'string' ||
        typeof metadata.entityType !== 'string' ||
        typeof metadata.version !== 'number' ||
        typeof metadata.createdAt !== 'string' ||
        typeof metadata.updatedAt !== 'string' ||
        !Array.isArray(metadata.walFiles) ||
        !Array.isArray(metadata.sstables) ||
        typeof metadata.migrationStatus !== 'string' ||
        typeof metadata.thresholdConfig !== 'object' ||
        metadata.thresholdConfig === null
    ) {
        return false;
    }

    // Validate migration status
    const validStatuses: MigrationStatus[] = ['none', 'pending', 'complete', 'rolledback'];
    if (!validStatuses.includes(metadata.migrationStatus)) {
        return false;
    }

    // Validate threshold config
    if (
        typeof metadata.thresholdConfig.enabled !== 'boolean' ||
        typeof metadata.thresholdConfig.value !== 'number' ||
        metadata.thresholdConfig.value < 0
    ) {
        return false;
    }

    // Validate version is positive
    if (metadata.version < 0) {
        return false;
    }

    return true;
}

/**
 * Extract date from WAL file path
 * Expected format: users/{uid}/wal/{entityType}/YYYY-MM-DD.jsonl
 *
 * @param path - WAL file path
 * @returns Date string (YYYY-MM-DD) or null if pattern doesn't match
 */
function extractDateFromWALPath(path: string): string | null {
    const match = path.match(/\/(\d{4}-\d{2}-\d{2})\.jsonl$/);
    return match ? match[1] : null;
}

/**
 * Extract base filename from SSTable path
 * Expected format: snapshots/{entityType}/YYYYMMDDTHHMMSS-compact.jsonl
 *
 * @param path - SSTable file path
 * @returns Base filename (without extension) or null
 */
function extractSSTableBaseName(path: string): string | null {
    const match = path.match(/\/(\d{8}T\d{6}-compact)\.jsonl$/);
    return match ? match[1] : null;
}

/**
 * Count JSONL records in buffer
 *
 * @param buffer - Buffer containing JSONL data
 * @returns Number of records
 */
function countJSONLRecords(buffer: Buffer): number {
    const content = buffer.toString('utf-8').trim();
    if (!content) {
        return 0;
    }
    return content.split('\n').filter(line => line.trim().length > 0).length;
}

/**
 * Recover metadata from GCS file listing
 *
 * Rebuilds WALMetadata by scanning GCS for WAL files and SSTables.
 * Used when metadata is corrupted or missing.
 *
 * Process:
 * 1. Check if existing metadata is valid
 * 2. List WAL files in users/{uid}/wal/{entityType}/
 * 3. List SSTables in snapshots/{entityType}/
 * 4. List index files in snapshots/{entityType}/
 * 5. Reconstruct metadata structure from file listing
 * 6. Save recovered metadata atomically
 *
 * @param uid - User OID
 * @param entityType - Entity type
 * @returns Promise<WALMetadata | null> - Recovered metadata, or null if no files found
 */
export async function recoverMetadata(
    uid: string,
    entityType: string
): Promise<WALMetadata | null> {
    const bucket = getBucket();

    // Try to load existing metadata first
    let existingMetadata: WALMetadata | null = null;
    try {
        existingMetadata = await loadMetadata(uid, entityType);
    } catch {
        // Metadata is corrupted, will recover
    }

    // If metadata is valid, no recovery needed
    if (validateMetadata(existingMetadata)) {
        return null;
    }

    // Scan for WAL files
    const walPrefix = `users/${uid}/wal/${entityType}/`;
    const [allWalFiles] = await bucket.getFiles();
    const walFiles = allWalFiles.filter((f: { name: string }) => f.name.startsWith(walPrefix));

    // Scan for SSTables
    const sstablePrefix = `snapshots/${entityType}/`;
    const [allSstableFiles] = await bucket.getFiles();
    const sstableDataFiles = allSstableFiles
        .filter((f: { name: string }) => f.name.startsWith(sstablePrefix))
        .filter((f: { name: string }) => f.name.endsWith('-compact.jsonl'));

    // Scan for index files
    const [allIndexFiles] = await bucket.getFiles();
    const sstableIndexFiles = allIndexFiles
        .filter((f: { name: string }) => f.name.startsWith(sstablePrefix))
        .filter((f: { name: string }) => f.name.endsWith('-index.json'));

    // If no files found, return null
    if (walFiles.length === 0 && sstableDataFiles.length === 0) {
        return null;
    }

    // Reconstruct WAL file metadata
    const reconstructedWalFiles: WALFileMetadata[] = [];

    for (const walFile of walFiles) {
        const date = extractDateFromWALPath(walFile.name);

        if (!date) {
            // Skip files that don't match expected pattern
            continue;
        }

        try {
            const [content] = await walFile.download();
            const [metadata] = await walFile.getMetadata();

            reconstructedWalFiles.push({
                path: walFile.name,
                recordCount: countJSONLRecords(content),
                byteSize: parseInt(metadata.size, 10),
                date,
            });
        } catch (error) {
            // Skip files that can't be read
            continue;
        }
    }

    // Reconstruct SSTable metadata
    const reconstructedSSTables: SSTableMetadata[] = [];

    // Create a map of index files by base name for easy lookup
    // Map from the SSTable base name (e.g., "20260120T100000-compact") to index data
    const indexFileMap = new Map<string, { path: string; data: { startKey: string; endKey: string; recordCount: number; compactedAt?: string } }>();

    for (const indexFile of sstableIndexFiles) {
        try {
            const [content] = await indexFile.download();
            const indexData = JSON.parse(content.toString('utf-8'));
            // Extract base name by removing -index.json suffix
            // e.g., "snapshots/journal_entries/20260120T100000-index.json" -> "snapshots/journal_entries/20260120T100000"
            const basePathWithoutExt = indexFile.name.replace(/-index\.json$/, '');
            // Now we need to match with SSTable files which are "20260120T100000-compact.jsonl"
            // So we extract just the timestamp part
            const timestampMatch = basePathWithoutExt.match(/(\d{8}T\d{6})$/);
            if (timestampMatch) {
                const timestamp = timestampMatch[1];
                indexFileMap.set(timestamp, {
                    path: indexFile.name,
                    data: indexData,
                });
            }
        } catch {
            // Skip corrupted index files
            continue;
        }
    }

    for (const sstableFile of sstableDataFiles) {
        const baseName = extractSSTableBaseName(sstableFile.name);

        if (!baseName) {
            continue;
        }

        try {
            const [content] = await sstableFile.download();
            const [metadata] = await sstableFile.getMetadata();

            // Extract timestamp from baseName to match with index files
            // e.g., "20260120T100000-compact" -> "20260120T100000"
            const timestampMatch = baseName.match(/^(\d{8}T\d{6})/);
            const timestamp = timestampMatch ? timestampMatch[1] : null;
            const indexEntry = timestamp ? indexFileMap.get(timestamp) : undefined;

            reconstructedSSTables.push({
                path: sstableFile.name,
                indexPath: indexEntry?.path || '',
                recordCount: indexEntry?.data.recordCount || countJSONLRecords(content),
                byteSize: parseInt(metadata.size, 10),
                startKey: indexEntry?.data.startKey || '',
                endKey: indexEntry?.data.endKey || '',
                compactedAt: indexEntry?.data.compactedAt || new Date().toISOString(),
            });
        } catch {
            // Skip files that can't be read
            continue;
        }
    }

    // Create recovered metadata
    const recoveredMetadata: WALMetadata = {
        uid,
        entityType,
        version: 1,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
        walFiles: reconstructedWalFiles,
        sstables: reconstructedSSTables,
        migrationStatus: 'none',
        thresholdConfig: {
            enabled: true,
            value: 1000,
        },
    };

    // Save recovered metadata atomically
    await saveMetadataAtomic(uid, recoveredMetadata);

    return recoveredMetadata;
}

export default {
    createInitialMetadata,
    loadMetadata,
    saveMetadataAtomic,
    updateMetadata,
    addWALFile,
    addSSTable,
    removeWALFiles,
    validateMetadata,
    recoverMetadata,
};
