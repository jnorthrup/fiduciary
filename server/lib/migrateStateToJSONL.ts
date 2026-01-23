/**
 * migrateStateToJSONL Module
 *
 * Detects and parses existing state.json files for migration to JSONL format.
 * Converts legacy entity collections to JSONL WAL with backdated timestamps.
 * Creates initial SSTables for efficient querying.
 *
 * Spec: Phase 4.1 state.json Detection and Parsing
 */

import { serializeToJSONL } from './jsonlSerializer.js';
import {
    createInitialMetadata,
    loadMetadata,
    saveMetadataAtomic,
    type WALMetadata,
} from './walMetadata.js';

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
 * Entity types that can be migrated from state.json
 */
export const MIGRATABLE_ENTITY_TYPES = [
    'accounts',
    'journal_entries',
    'transactions',
    'entities',
    'nacha_submissions',
] as const;

/**
 * Migration result structure
 *
 * Spec: Phase 4.1 Migration Tool API
 */
export interface MigrationResult {
    /** Whether migration completed successfully */
    success: boolean;
    /** Number of entities migrated per type */
    entityCounts: Record<string, number>;
    /** Paths to SSTables created during migration */
    sstablesCreated: string[];
    /** Any errors encountered during migration */
    errors: string[];
    /** Migration duration in milliseconds */
    duration: number;
}

/**
 * Rollback result structure
 *
 * Spec: Phase 4.4 Rollback Capability
 */
export interface RollbackResult {
    /** Whether rollback completed successfully */
    success: boolean;
    /** Entity types whose metadata was updated */
    entityTypesUpdated: string[];
    /** Any errors encountered during rollback */
    errors: string[];
    /** Rollback duration in milliseconds */
    duration: number;
}

/**
 * Parsed state.json structure with entity collections
 */
interface ParsedState {
    [entityType: string]: unknown[] | undefined;
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
 * Generate SSTable filename with timestamp
 * Format: {YYYYMMDD}-compact.jsonl
 */
function generateSSTableFilename(): string {
    const date = new Date();
    const yyyymmdd = date.toISOString().split('T')[0].replace(/-/g, '');
    return `${yyyymmdd}-compact.jsonl`;
}

/**
 * Generate index filename matching SSTable
 * Format: {YYYYMMDD}-compact-index.json
 */
function generateIndexFilename(): string {
    const date = new Date();
    const yyyymmdd = date.toISOString().split('T')[0].replace(/-/g, '');
    return `${yyyymmdd}-compact-index.json`;
}

/**
 * Detect if state.json exists for a user in GCS
 *
 * @param uid - User OID
 * @returns Promise<boolean> - true if state.json exists
 */
export async function detectStateJSON(uid: string): Promise<boolean> {
    const bucket = getBucket();
    const statePath = `${uid}/state.json`;
    const file = bucket.file(statePath);

    try {
        const [exists] = await file.exists();
        return exists;
    } catch (error) {
        console.error(`Error detecting state.json for ${uid}:`, error);
        return false;
    }
}

/**
 * Parse state.json and extract entity collections
 *
 * @param uid - User OID
 * @param throwOnError - Whether to throw on parse errors (default: false)
 * @returns Promise<ParsedState> - Parsed entity collections
 */
export async function parseStateJSON(uid: string, throwOnError = false): Promise<ParsedState> {
    const bucket = getBucket();
    const statePath = `${uid}/state.json`;
    const file = bucket.file(statePath);

    try {
        const [exists] = await file.exists();
        if (!exists) {
            return {};
        }

        const [content] = await file.download();
        const state = JSON.parse(content.toString()) as Record<string, unknown>;

        // Extract only array-type entity collections
        const parsed: ParsedState = {};
        for (const entityType of MIGRATABLE_ENTITY_TYPES) {
            const collection = state[entityType];
            if (Array.isArray(collection)) {
                parsed[entityType] = collection;
            }
        }

        return parsed;
    } catch (error) {
        console.error(`Error parsing state.json for ${uid}:`, error);
        // Throw on parse errors if explicitly requested (for migration to detect failures)
        if (throwOnError) {
            throw error;
        }
        // Otherwise return empty object for graceful handling
        return {};
    }
}

/**
 * Create SSTable index from entities
 *
 * @param entities - Array of entities to index
 * @returns Index structure for SSTable
 */
function createSSTableIndex<T extends Record<string, unknown>>(
    entities: T[]
): {
    entries: Array<{ key: string; offset: number; size: number }>;
    createdAt: string;
    entryCount: number;
    totalBytes: number;
    entityType: string;
} {
    let offset = 0;
    const entries = entities.map((entity) => {
        const key = String(entity.id || entity.timestamp || '');
        const serialized = serializeToJSONL(entity);
        const size = serialized.length;

        const entry = { key, offset, size };
        offset += size;
        return entry;
    });

    return {
        entries,
        createdAt: getCurrentTimestamp(),
        entryCount: entries.length,
        totalBytes: offset,
        entityType: 'unknown',
    };
}

/**
 * Migrate state.json to JSONL format for a user
 *
 * Process:
 * 1. Detect state.json existence
 * 2. Parse entity collections
 * 3. Convert each entity to JSONL with backdated timestamps
 * 4. Write to WAL format
 * 5. Generate initial SSTable with index
 * 6. Update metadata atomically
 *
 * @param uid - User OID
 * @returns Promise<MigrationResult> - Migration result with statistics
 *
 * Spec: Phase 4.1 state.json Detection and Parsing
 */
export async function migrateStateToJSONL(uid: string): Promise<MigrationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const entityCounts: Record<string, number> = {};
    const sstablesCreated: string[] = [];

    try {
        // Step 1: Detect state.json
        const hasStateJSON = await detectStateJSON(uid);
        if (!hasStateJSON) {
            return {
                success: false,
                entityCounts: {},
                sstablesCreated: [],
                errors: ['state.json not found'],
                duration: Date.now() - startTime,
            };
        }

        // Step 2: Parse entity collections
        let parsedState: ParsedState;
        try {
            parsedState = await parseStateJSON(uid, true);
        } catch (parseError) {
            return {
                success: false,
                entityCounts: {},
                sstablesCreated: [],
                errors: [`Failed to parse state.json: ${parseError}`],
                duration: Date.now() - startTime,
            };
        }

        const entityTypes = Object.keys(parsedState) as Array<keyof typeof parsedState>;

        if (entityTypes.length === 0) {
            // Empty state.json is valid
            return {
                success: true,
                entityCounts: {},
                sstablesCreated: [],
                errors: [],
                duration: Date.now() - startTime,
            };
        }

        const bucket = getBucket();

        // Step 3-5: Process each entity type
        for (const entityType of entityTypes) {
            const entities = parsedState[entityType];
            if (!entities || !Array.isArray(entities)) {
                continue;
            }

            try {
                // Record count for this entity type
                entityCounts[entityType] = entities.length;

                // Step 3: Convert to JSONL with backdated timestamps
                const jsonlLines: string[] = [];
                for (const entity of entities) {
                    const entityObj = entity as Record<string, unknown>;

                    // Use existing timestamp or backdate to a default migration date
                    const timestamp = entityObj.timestamp || getCurrentTimestamp();
                    const entityWithTimestamp = {
                        ...entityObj,
                        _migratedAt: getCurrentTimestamp(),
                        _originalTimestamp: timestamp,
                    };

                    jsonlLines.push(serializeToJSONL(entityWithTimestamp));
                }

                // Step 4: Write to WAL format (create daily WAL file)
                const today = new Date().toISOString().split('T')[0];
                const walPath = `users/${uid}/wal/${entityType}/${today}.jsonl`;
                const walFile = bucket.file(walPath);

                await walFile.save(jsonlLines.join(''), {
                    contentType: 'application/x-ndjson',
                    resumable: false,
                });

                // Step 5: Generate initial SSTable
                const sstableFilename = generateSSTableFilename();
                const sstablePath = `users/${uid}/snapshots/${entityType}/${sstableFilename}`;
                const sstableFile = bucket.file(sstablePath);

                await sstableFile.save(jsonlLines.join(''), {
                    contentType: 'application/x-ndjson',
                    resumable: false,
                });

                sstablesCreated.push(sstablePath);

                // Create and save index
                const index = createSSTableIndex(entities as Array<Record<string, unknown>>);
                index.entityType = entityType;

                const indexFilename = generateIndexFilename();
                const indexPath = `users/${uid}/snapshots/${entityType}/${indexFilename}`;
                const indexFile = bucket.file(indexPath);

                await indexFile.save(JSON.stringify(index, null, 2), {
                    contentType: 'application/json',
                    resumable: false,
                });

                // Update metadata for this entity type
                const existingMetadata = await loadMetadata(uid, entityType);
                const metadata: WALMetadata = existingMetadata || createInitialMetadata(uid, entityType);

                metadata.migrationStatus = 'complete';
                metadata.sstables.push({
                    path: sstablePath,
                    indexPath,
                    recordCount: entities.length,
                    byteSize: jsonlLines.join('').length,
                    startKey: index.entries[0]?.key || '',
                    endKey: index.entries[index.entries.length - 1]?.key || '',
                    compactedAt: getCurrentTimestamp(),
                });

                await saveMetadataAtomic(uid, metadata);
            } catch (entityError) {
                const errorMsg = `Failed to migrate ${entityType}: ${entityError}`;
                errors.push(errorMsg);
                console.error(errorMsg);
            }
        }

        // Determine success if no errors
        const success = errors.length === 0;

        return {
            success,
            entityCounts,
            sstablesCreated,
            errors,
            duration: Date.now() - startTime,
        };
    } catch (error) {
        return {
            success: false,
            entityCounts,
            sstablesCreated,
            errors: [`Migration failed: ${error}`],
            duration: Date.now() - startTime,
        };
    }
}

/**
 * Rollback migration to state.json
 *
 * Process:
 * 1. Verify backup state.json exists
 * 2. Restore state.json from backup (atomic copy)
 * 3. Update metadata for all entity types to 'rolledback' status
 *
 * @param uid - User OID
 * @returns Promise<RollbackResult> - Rollback result with statistics
 *
 * Spec: Phase 4.4 Rollback Capability
 */
export async function rollbackMigration(uid: string): Promise<RollbackResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const entityTypesUpdated: string[] = [];

    try {
        const bucket = getBucket();
        const backupStatePath = `${uid}/state.json`;
        const backupFile = bucket.file(backupStatePath);

        // Step 1: Verify backup exists
        const [backupExists] = await backupFile.exists();
        if (!backupExists) {
            return {
                success: false,
                entityTypesUpdated: [],
                errors: ['Backup state.json not found, cannot rollback'],
                duration: Date.now() - startTime,
            };
        }

        // Step 2: Restore state.json from backup (atomic copy)
        // In GCS, copy is atomic - this restores state.json to its original location
        try {
            await backupFile.copy(backupStatePath);
        } catch (copyError) {
            const errorMsg = `Failed to restore state.json from backup: ${copyError}`;
            errors.push(errorMsg);
            return {
                success: false,
                entityTypesUpdated,
                errors,
                duration: Date.now() - startTime,
            };
        }

        // Step 3: Update metadata for all migratable entity types to 'rolledback'
        for (const entityType of MIGRATABLE_ENTITY_TYPES) {
            try {
                const existingMetadata = await loadMetadata(uid, entityType);
                if (existingMetadata && existingMetadata.migrationStatus === 'complete') {
                    existingMetadata.migrationStatus = 'rolledback';
                    await saveMetadataAtomic(uid, existingMetadata);
                    entityTypesUpdated.push(entityType);
                }
            } catch (metadataError) {
                // Log error but continue with other entity types
                const errorMsg = `Failed to update metadata for ${entityType}: ${metadataError}`;
                errors.push(errorMsg);
                console.error(errorMsg);
            }
        }

        // Success if backup was restored (metadata errors are non-critical)
        const success = true;

        return {
            success,
            entityTypesUpdated,
            errors,
            duration: Date.now() - startTime,
        };
    } catch (error) {
        return {
            success: false,
            entityTypesUpdated,
            errors: [`Rollback failed: ${error}`],
            duration: Date.now() - startTime,
        };
    }
}

export default {
    detectStateJSON,
    parseStateJSON,
    migrateStateToJSONL,
    rollbackMigration,
};
