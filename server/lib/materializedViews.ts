/**
 * Materialized Views Module
 *
 * Implements materialized view storage and caching for LSM persistence.
 * Provides queryView function for view execution over SSTables + WAL files
 * with automatic caching in GCS and cache invalidation on compaction.
 *
 * Spec: Phase 3.3 Materialized Views
 * - View execution over SSTables + WAL files
 * - View result caching in GCS
 * - Cache invalidation on compaction
 * - Integration with mapReduceViews module
 */

import { streamJSONL, StreamOptions } from './jsonlStream.js';
import { loadMetadata, type WALMetadata } from './walMetadata.js';

// Re-export types from mapReduceViews for convenience
export type { Mapper, Reducer, ReReducer, EmitFn } from './mapReduceViews.js';
export { reduce, rereduce } from './mapReduceViews.js';

// GCS Bucket interface (minimal subset needed for testing)
interface GCSBucket {
    file(path: string): GCSFile;
    getFiles(options: { prefix: string }): Promise<[GCSFile[]]>;
}

interface GCSFile {
    name: string;
    save(content: string, options: { contentType: string; resumable: boolean }): Promise<unknown>;
    download(): Promise<[Buffer]>;
    exists(): Promise<[boolean]>;
    delete(): Promise<unknown>;
}

/**
 * Metadata for cached view results
 */
export interface ViewCacheMetadata {
    /** View name */
    viewName: string;
    /** Entity type */
    entityType: string;
    /** ISO timestamp when cache was created */
    createdAt: string;
    /** SSTable paths (versions) used for this cache */
    sstableVersions: string[];
    /** WAL file dates (versions) used for this cache */
    walVersions: string[];
}

/**
 * Cached view result structure
 */
interface ViewCacheEntry<K, V> {
    /** Array of [key, value] tuples */
    results: Array<[K, V]>;
    /** Cache metadata */
    metadata: ViewCacheMetadata;
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
 * Sanitize view name for use in file path
 * Replaces special characters with hyphens
 */
function sanitizeViewName(viewName: string): string {
    return viewName.replace(/[^a-zA-Z0-9_-]/g, '-');
}

/**
 * Get cache file path for a view
 * Path format: users/{uid}/views/{entityType}/{viewName}.json
 *
 * @param uid - User OID
 * @param entityType - Entity type
 * @param viewName - View name
 * @returns GCS path for cache file
 */
export function getCachePath(uid: string, entityType: string, viewName: string): string {
    const sanitized = sanitizeViewName(viewName);
    return `users/${uid}/views/${entityType}/${sanitized}.json`;
}

/**
 * Get current version signature from metadata
 * Returns combined signature of SSTable paths and WAL dates
 */
function getVersionSignature(metadata: WALMetadata | null): {
    sstableVersions: string[];
    walVersions: string[];
} {
    if (!metadata) {
        return { sstableVersions: [], walVersions: [] };
    }

    const sstableVersions = metadata.sstables.map(s => s.path);
    const walVersions = metadata.walFiles.map(w => w.date);

    // Sort for consistent comparison
    sstableVersions.sort();
    walVersions.sort();

    return { sstableVersions, walVersions };
}

/**
 * Compare version signatures
 * Returns true if signatures match (cache is valid)
 */
function versionsMatch(
    cache: ViewCacheMetadata,
    current: { sstableVersions: string[]; walVersions: string[] }
): boolean {
    // Compare SSTable versions
    if (cache.sstableVersions.length !== current.sstableVersions.length) {
        return false;
    }

    for (let i = 0; i < cache.sstableVersions.length; i++) {
        if (cache.sstableVersions[i] !== current.sstableVersions[i]) {
            return false;
        }
    }

    // Compare WAL versions
    if (cache.walVersions.length !== current.walVersions.length) {
        return false;
    }

    for (let i = 0; i < cache.walVersions.length; i++) {
        if (cache.walVersions[i] !== current.walVersions[i]) {
            return false;
        }
    }

    return true;
}

/**
 * Load cached view result from GCS
 *
 * @param cachePath - Path to cache file
 * @returns Promise<ViewCacheEntry<K, V> | null> - Cached entry or null if not found/invalid
 */
async function loadCache<K, V>(
    cachePath: string
): Promise<ViewCacheEntry<K, V> | null> {
    const bucket = getBucket();
    const file = bucket.file(cachePath);

    try {
        const [exists] = await file.exists();
        if (!exists) {
            return null;
        }

        const [content] = await file.download();
        const cache = JSON.parse(content.toString()) as ViewCacheEntry<K, V>;

        return cache;
    } catch (error) {
        console.warn(`Failed to load cache from ${cachePath}:`, error);
        return null;
    }
}

/**
 * Save view result to cache
 *
 * @param cachePath - Path to cache file
 * @param results - Map of results to cache
 * @param viewName - View name
 * @param entityType - Entity type
 * @param versionSignature - Current version signature
 */
async function saveCache<K, V>(
    cachePath: string,
    results: Map<K, V>,
    viewName: string,
    entityType: string,
    versionSignature: { sstableVersions: string[]; walVersions: string[] }
): Promise<void> {
    const bucket = getBucket();
    const file = bucket.file(cachePath);

    const cacheEntry: ViewCacheEntry<K, V> = {
        results: Array.from(results.entries()),
        metadata: {
            viewName,
            entityType,
            createdAt: new Date().toISOString(),
            sstableVersions: versionSignature.sstableVersions,
            walVersions: versionSignature.walVersions,
        },
    };

    try {
        await file.save(JSON.stringify(cacheEntry, null, 2), {
            contentType: 'application/json',
            resumable: false,
        });
    } catch (error) {
        console.warn(`Failed to save cache to ${cachePath}:`, error);
        // Don't throw - caching failure is non-fatal
    }
}

/**
 * Execute materialized view with caching
 *
 * Query flow:
 * 1. Load metadata to get current version signature
 * 2. Check if valid cache exists
 * 3. If cache valid: return cached results
 * 4. If cache invalid/missing:
 *    a. Stream records from SSTables + WAL using streamJSONL
 *    b. Apply mapper to emit key-value pairs
 *    c. Group by key
 *    d. Apply reducer to each group
 *    e. Cache results
 *    f. Return results
 *
 * @param uid - User OID
 * @param entityType - Entity type (e.g., 'journal_entries', 'ledger')
 * @param viewName - View name (for caching)
 * @param mapper - Mapper function (entity) => (emit) => void
 * @param reducer - Reducer function (values[]) => result
 * @param options - Optional stream options (filters, ranges)
 * @returns Promise<Map<K, R>> - View results
 *
 * Spec: Phase 3.3 Materialized Views
 */
export async function queryView<T, K, V, R>(
    uid: string,
    entityType: string,
    viewName: string,
    mapper: (entity: T) => (emit: (key: K, value: V) => void) => void,
    reducer: (values: V[]) => R,
    options?: StreamOptions<T>
): Promise<Map<K, R>> {
    // Load metadata to get current version
    const metadata = await loadMetadata(uid, entityType);
    const versionSignature = getVersionSignature(metadata);

    // Check cache
    const cachePath = getCachePath(uid, entityType, viewName);
    const cached = await loadCache<K, R>(cachePath);

    // If cache exists and versions match, return cached result
    if (cached && versionsMatch(cached.metadata, versionSignature)) {
        return new Map(cached.results);
    }

    // Cache miss or invalid - execute view
    const grouped = new Map<K, V[]>();

    // Stream records and apply mapper
    for await (const entity of streamJSONL<T>(uid, entityType, options || {})) {
        mapper(entity)((key, value) => {
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key)!.push(value);
        });
    }

    // Apply reducer to each group
    const results = new Map<K, R>();
    for (const [key, values] of grouped) {
        results.set(key, reducer(values));
    }

    // Cache results
    await saveCache<K, R>(cachePath, results, viewName, entityType, versionSignature);

    return results;
}

/**
 * Invalidate cached view result
 *
 * Deletes cache file for specified view. Use '*' as viewName to invalidate
 * all views for an entity type.
 *
 * @param uid - User OID
 * @param entityType - Entity type
 * @param viewName - View name or '*' for all views
 * @returns Promise<void>
 *
 * Spec: Phase 3.3 Materialized Views
 */
export async function invalidateCache(
    uid: string,
    entityType: string,
    viewName: string
): Promise<void> {
    const bucket = getBucket();

    if (viewName === '*') {
        // Invalidate all views for entity type
        const prefix = `users/${uid}/views/${entityType}/`;
        const [files] = await bucket.getFiles({ prefix });

        for (const file of files) {
            try {
                await file.delete();
            } catch (error) {
                console.warn(`Failed to delete cache file ${file.name}:`, error);
                // Continue with other files
            }
        }
    } else {
        // Invalidate specific view
        const cachePath = getCachePath(uid, entityType, viewName);
        const file = bucket.file(cachePath);

        try {
            await file.delete();
        } catch (error) {
            // Ignore errors if file doesn't exist
            console.debug(`Cache file ${cachePath} not found or already deleted`);
        }
    }
}

/**
 * Invalidate caches on compaction
 *
 * Called after WAL compaction to invalidate all views for an entity type.
 * This ensures queries will recompute with fresh data.
 *
 * @param uid - User OID
 * @param entityType - Entity type
 * @returns Promise<void>
 *
 * Spec: Phase 3.3 Materialized Views
 */
export async function invalidateOnCompaction(
    uid: string,
    entityType: string
): Promise<void> {
    await invalidateCache(uid, entityType, '*');
}

export default {
    queryView,
    invalidateCache,
    invalidateOnCompaction,
    getCachePath,
};
