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

export default {
    createInitialMetadata,
    loadMetadata,
    saveMetadataAtomic,
    updateMetadata,
    addWALFile,
    addSSTable,
    removeWALFiles,
};
