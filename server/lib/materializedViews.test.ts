/**
 * materializedViews.test.ts
 *
 * Tests for materialized view storage and caching in GCS.
 * Phase 3.3: Materialized Views
 *
 * Test coverage:
 * - queryView function for materialized view execution
 * - Cache storage in GCS
 * - Cache invalidation on compaction
 * - View execution over SSTables + WAL files
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock GCS persistence
const mockBucket = vi.hoisted(() => {
    const mockFiles = new Map<string, {
        save: ReturnType<typeof vi.fn>;
        download: ReturnType<typeof vi.fn>;
        exists: ReturnType<typeof vi.fn>;
        getMetadata: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
        name: string;
        copy: ReturnType<typeof vi.fn>;
    }>();

    const createMockFile = (path: string) => {
        if (!mockFiles.has(path)) {
            const file = {
                save: vi.fn().mockResolvedValue(true),
                download: vi.fn().mockResolvedValue([Buffer.from('')]),
                exists: vi.fn().mockResolvedValue([false]),
                getMetadata: vi.fn().mockResolvedValue([{ size: '1024' }]),
                delete: vi.fn().mockResolvedValue(true),
                name: path,
                copy: vi.fn().mockResolvedValue(true),
            };
            mockFiles.set(path, file);
        }
        return mockFiles.get(path)!;
    };

    const bucket = {
        file: vi.fn((path: string) => createMockFile(path)),
        getFiles: vi.fn().mockResolvedValue([[]]),
        _getMockFile: (path: string) => createMockFile(path),
        _clearMockFiles: () => mockFiles.clear(),
    };

    return bucket;
});

vi.mock('@google-cloud/storage', () => {
    return {
        Storage: class {
            constructor() {
                return {
                    bucket: () => mockBucket,
                };
            }
        }
    };
});

// Mock loadMetadata and saveMetadataAtomic
const mockLoadMetadata = vi.fn();
const mockSaveMetadataAtomic = vi.fn();
vi.mock('./walMetadata.js', () => ({
    loadMetadata: () => mockLoadMetadata(),
    saveMetadataAtomic: () => mockSaveMetadataAtomic(),
}));

// Mock streamJSONL
const mockStreamJSONL = vi.fn();
vi.mock('./jsonlStream.js', () => ({
    streamJSONL: () => mockStreamJSONL(),
}));

// Set environment before importing
process.env.NODE_ENV = 'production';
process.env.GOOGLE_APPLICATION_CREDENTIALS = '/fake/path.json';
delete process.env.USE_LOCAL_PERSISTENCE;

// Import after mock and env setup
import {
    queryView,
    invalidateCache,
    getCachePath,
    ViewCacheMetadata,
    _setBucketForTesting,
    Mapper,
    Reducer,
    ReReducer,
    reduce,
    rereduce
} from './materializedViews.js';

// Set bucket mock for testing
_setBucketForTesting(mockBucket);

// Test entity types
interface JournalEntry {
    id: string;
    timestamp: string;
    amount: number;
    accountId: string;
    type: 'debit' | 'credit';
}

interface ViewResult {
    key: string;
    value: number;
}

describe('materializedViews', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockBucket._clearMockFiles();
        mockBucket.getFiles.mockResolvedValue([[]]);
        mockLoadMetadata.mockResolvedValue(null);
        mockSaveMetadataAtomic.mockResolvedValue(undefined);
    });

    describe('getCachePath', () => {
        it('should generate cache path for view', () => {
            const uid = 'user-123';
            const entityType = 'journal_entries';
            const viewName = 'account_balance';

            const path = getCachePath(uid, entityType, viewName);

            expect(path).toBe('users/user-123/views/journal_entries/account_balance.json');
        });

        it('should handle view names with special characters', () => {
            const uid = 'user-123';
            const entityType = 'journal_entries';
            const viewName = 'account-balance:by-currency';

            const path = getCachePath(uid, entityType, viewName);

            expect(path).toBe('users/user-123/views/journal_entries/account-balance-by-currency.json');
        });
    });

    describe('queryView', () => {
        const uid = 'test-user-123';
        const entityType = 'journal_entries';
        const viewName = 'account_balance';

        const testEntries: JournalEntry[] = [
            { id: 'je-001', timestamp: '2026-01-23T10:00:00Z', amount: 100, accountId: 'acct-1', type: 'credit' },
            { id: 'je-002', timestamp: '2026-01-23T11:00:00Z', amount: 50, accountId: 'acct-1', type: 'debit' },
            { id: 'je-003', timestamp: '2026-01-23T12:00:00Z', amount: 200, accountId: 'acct-2', type: 'credit' },
            { id: 'je-004', timestamp: '2026-01-23T13:00:00Z', amount: 75, accountId: 'acct-2', type: 'debit' },
        ];

        // Helper to create mapper
        const createMapper = (): Mapper<JournalEntry, string, number> => (entry) => (emit) => {
            emit(entry.accountId, entry.amount);
        };

        // Helper to create reducer
        const createReducer = (): Reducer<number, number> => (values) => {
            return reduce.sum(values);
        };

        it('should execute view over SSTables and WAL files and cache result', async () => {
            // Mock streaming to return test entries
            const asyncGenerator = async function* () {
                for (const entry of testEntries) {
                    yield entry;
                }
            };
            mockStreamJSONL.mockReturnValue(asyncGenerator());

            // Mock no existing cache
            const cachePath = getCachePath(uid, entityType, viewName);
            const cacheFile = mockBucket._getMockFile(cachePath);
            cacheFile.exists.mockResolvedValue([false]);

            const result = await queryView<JournalEntry, string, number, number>(
                uid,
                entityType,
                viewName,
                createMapper(),
                createReducer()
            );

            // Verify result: acct-1 = 150, acct-2 = 275
            expect(result).toEqual(new Map([
                ['acct-1', 150],
                ['acct-2', 275],
            ]));

            // Verify cache was saved
            expect(cacheFile.save).toHaveBeenCalled();
            const savedContent = JSON.parse(cacheFile.save.mock.calls[0][0]);
            expect(savedContent.results).toHaveLength(2);
            expect(savedContent.metadata.viewName).toBe(viewName);
        });

        it('should return cached result if cache exists and is valid', async () => {
            const cachedResults = new Map([
                ['acct-1', 150],
                ['acct-2', 275],
            ]);

            const cacheMetadata: ViewCacheMetadata = {
                viewName,
                entityType,
                createdAt: new Date().toISOString(),
                sstableVersions: ['sstable-1', 'sstable-2'],
                walVersions: ['2026-01-23'],
            };

            const cachePath = getCachePath(uid, entityType, viewName);
            const cacheFile = mockBucket._getMockFile(cachePath);
            cacheFile.exists.mockResolvedValue([true]);
            cacheFile.download.mockResolvedValue([Buffer.from(JSON.stringify({
                results: Array.from(cachedResults.entries()),
                metadata: cacheMetadata,
            }))]);

            // Mock metadata with matching versions
            mockLoadMetadata.mockResolvedValue({
                uid,
                entityType,
                version: 1,
                createdAt: '2026-01-23T00:00:00Z',
                updatedAt: '2026-01-23T12:00:00Z',
                walFiles: [{ path: 'wal/2026-01-23.jsonl', recordCount: 4, byteSize: 500, date: '2026-01-23' }],
                sstables: [
                    { path: 'sstable-1', indexPath: 'index-1', recordCount: 2, byteSize: 250, startKey: 'je-001', endKey: 'je-002', compactedAt: '2026-01-23T10:00:00Z' },
                    { path: 'sstable-2', indexPath: 'index-2', recordCount: 2, byteSize: 250, startKey: 'je-003', endKey: 'je-004', compactedAt: '2026-01-23T11:00:00Z' },
                ],
                migrationStatus: 'none',
                thresholdConfig: { enabled: true, value: 1000 },
            });

            // streamJSONL should NOT be called when cache is valid
            const asyncGenerator = async function* () {
                for (const entry of testEntries) {
                    yield entry;
                }
            };
            mockStreamJSONL.mockReturnValue(asyncGenerator());

            const result = await queryView<JournalEntry, string, number, number>(
                uid,
                entityType,
                viewName,
                createMapper(),
                createReducer()
            );

            // Should return cached result
            expect(result).toEqual(cachedResults);

            // Cache should NOT be updated
            expect(cacheFile.save).not.toHaveBeenCalled();
        });

        it('should invalidate and recompute cache if SSTable versions changed', async () => {
            const cachedResults = new Map([
                ['acct-1', 100],
            ]);

            const cacheMetadata: ViewCacheMetadata = {
                viewName,
                entityType,
                createdAt: '2026-01-23T10:00:00Z',
                sstableVersions: ['old-sstable'],
                walVersions: ['2026-01-22'],
            };

            const cachePath = getCachePath(uid, entityType, viewName);
            const cacheFile = mockBucket._getMockFile(cachePath);
            cacheFile.exists.mockResolvedValue([true]);
            cacheFile.download.mockResolvedValue([Buffer.from(JSON.stringify({
                results: Array.from(cachedResults.entries()),
                metadata: cacheMetadata,
            }))]);

            // Mock metadata with NEW SSTable versions
            mockLoadMetadata.mockResolvedValue({
                uid,
                entityType,
                version: 1,
                createdAt: '2026-01-23T00:00:00Z',
                updatedAt: '2026-01-23T12:00:00Z',
                walFiles: [],
                sstables: [
                    { path: 'new-sstable', indexPath: 'new-index', recordCount: 4, byteSize: 500, startKey: 'je-001', endKey: 'je-004', compactedAt: '2026-01-23T12:00:00Z' },
                ],
                migrationStatus: 'none',
                thresholdConfig: { enabled: true, value: 1000 },
            });

            const asyncGenerator = async function* () {
                for (const entry of testEntries) {
                    yield entry;
                }
            };
            mockStreamJSONL.mockReturnValue(asyncGenerator());

            const result = await queryView<JournalEntry, string, number, number>(
                uid,
                entityType,
                viewName,
                createMapper(),
                createReducer()
            );

            // Should return new result (not cached)
            expect(result).toEqual(new Map([
                ['acct-1', 150],
                ['acct-2', 275],
            ]));

            // Cache should be updated
            expect(cacheFile.save).toHaveBeenCalled();
        });

        it('should invalidate and recompute cache if WAL versions changed', async () => {
            const cachedResults = new Map([
                ['acct-1', 100],
            ]);

            const cacheMetadata: ViewCacheMetadata = {
                viewName,
                entityType,
                createdAt: '2026-01-23T10:00:00Z',
                sstableVersions: [],
                walVersions: ['2026-01-22'],
            };

            const cachePath = getCachePath(uid, entityType, viewName);
            const cacheFile = mockBucket._getMockFile(cachePath);
            cacheFile.exists.mockResolvedValue([true]);
            cacheFile.download.mockResolvedValue([Buffer.from(JSON.stringify({
                results: Array.from(cachedResults.entries()),
                metadata: cacheMetadata,
            }))]);

            // Mock metadata with NEW WAL versions
            mockLoadMetadata.mockResolvedValue({
                uid,
                entityType,
                version: 1,
                createdAt: '2026-01-23T00:00:00Z',
                updatedAt: '2026-01-23T12:00:00Z',
                walFiles: [
                    { path: 'wal/2026-01-23.jsonl', recordCount: 4, byteSize: 500, date: '2026-01-23' },
                ],
                sstables: [],
                migrationStatus: 'none',
                thresholdConfig: { enabled: true, value: 1000 },
            });

            const asyncGenerator = async function* () {
                for (const entry of testEntries) {
                    yield entry;
                }
            };
            mockStreamJSONL.mockReturnValue(asyncGenerator());

            const result = await queryView<JournalEntry, string, number, number>(
                uid,
                entityType,
                viewName,
                createMapper(),
                createReducer()
            );

            // Should return new result (not cached)
            expect(result).toEqual(new Map([
                ['acct-1', 150],
                ['acct-2', 275],
            ]));

            // Cache should be updated
            expect(cacheFile.save).toHaveBeenCalled();
        });

        it('should handle empty result sets', async () => {
            const asyncGenerator = async function* () {
                // No entries
            };
            mockStreamJSONL.mockReturnValue(asyncGenerator());

            const cachePath = getCachePath(uid, entityType, viewName);
            const cacheFile = mockBucket._getMockFile(cachePath);
            cacheFile.exists.mockResolvedValue([false]);

            const result = await queryView<JournalEntry, string, number, number>(
                uid,
                entityType,
                viewName,
                createMapper(),
                createReducer()
            );

            expect(result).toEqual(new Map());
            expect(cacheFile.save).toHaveBeenCalled();
        });

        it('should support re-reduce for incremental aggregation', async () => {
            const largeDataset: JournalEntry[] = Array.from({ length: 1000 }, (_, i) => ({
                id: `je-${i}`,
                timestamp: `2026-01-23T${i}:00:00Z`,
                amount: 100 + i,
                accountId: `acct-${i % 10}`,
                type: 'credit',
            }));

            const asyncGenerator = async function* () {
                for (const entry of largeDataset) {
                    yield entry;
                }
            };
            mockStreamJSONL.mockReturnValue(asyncGenerator());

            const cachePath = getCachePath(uid, entityType, viewName);
            const cacheFile = mockBucket._getMockFile(cachePath);
            cacheFile.exists.mockResolvedValue([false]);

            const result = await queryView<JournalEntry, string, number, number>(
                uid,
                entityType,
                viewName,
                createMapper(),
                createReducer()
            );

            // Should have 10 accounts with summed amounts
            expect(result.size).toBe(10);

            // Verify cache was saved
            expect(cacheFile.save).toHaveBeenCalled();
        });

        it('should throw error when mapper emits invalid types', async () => {
            const badMapper: Mapper<JournalEntry, string, number> = () => (emit) => {
                // This would be caught at compile time in TypeScript
                // but we test runtime behavior
                emit('test', 100 as unknown as number);
            };

            const asyncGenerator = async function* () {
                yield testEntries[0];
            };
            mockStreamJSONL.mockReturnValue(asyncGenerator());

            const cachePath = getCachePath(uid, entityType, viewName);
            const cacheFile = mockBucket._getMockFile(cachePath);
            cacheFile.exists.mockResolvedValue([false]);

            // Should still work with valid emit
            const result = await queryView<JournalEntry, string, number, number>(
                uid,
                entityType,
                viewName,
                badMapper,
                createReducer()
            );

            expect(result).toBeDefined();
        });
    });

    describe('invalidateCache', () => {
        const uid = 'test-user-123';
        const entityType = 'journal_entries';
        const viewName = 'account_balance';

        it('should delete cache file for specific view', async () => {
            const cachePath = getCachePath(uid, entityType, viewName);
            const cacheFile = mockBucket._getMockFile(cachePath);
            cacheFile.exists.mockResolvedValue([true]);

            await invalidateCache(uid, entityType, viewName);

            expect(cacheFile.delete).toHaveBeenCalled();
        });

        it('should not error when cache file does not exist', async () => {
            const cachePath = getCachePath(uid, entityType, viewName);
            const cacheFile = mockBucket._getMockFile(cachePath);
            cacheFile.exists.mockResolvedValue([false]);
            cacheFile.delete.mockRejectedValue(new Error('File not found'));

            // Should not throw
            await expect(invalidateCache(uid, entityType, viewName)).resolves.toBeUndefined();
        });

        it('should invalidate all views for entity type when viewName is wildcard', async () => {
            const view1Path = getCachePath(uid, entityType, 'view1');
            const view2Path = getCachePath(uid, entityType, 'view2');

            const view1File = mockBucket._getMockFile(view1Path);
            view1File.name = view1Path;
            view1File.exists.mockResolvedValue([true]);

            const view2File = mockBucket._getMockFile(view2Path);
            view2File.name = view2Path;
            view2File.exists.mockResolvedValue([true]);

            mockBucket.getFiles.mockResolvedValue([[view1File, view2File]]);

            await invalidateCache(uid, entityType, '*');

            expect(view1File.delete).toHaveBeenCalled();
            expect(view2File.delete).toHaveBeenCalled();
        });

        it('should handle delete errors gracefully', async () => {
            const cachePath = getCachePath(uid, entityType, viewName);
            const cacheFile = mockBucket._getMockFile(cachePath);
            cacheFile.exists.mockResolvedValue([true]);
            cacheFile.delete.mockRejectedValue(new Error('Permission denied'));

            // Should not throw, should log and continue
            await expect(invalidateCache(uid, entityType, viewName)).resolves.toBeUndefined();
        });
    });

    describe('cache invalidation on compaction', () => {
        const uid = 'test-user-123';
        const entityType = 'journal_entries';

        it('should detect compaction and invalidate cache', async () => {
            // Cache created before compaction
            const cachePath = getCachePath(uid, entityType, 'account_balance');
            const cacheFile = mockBucket._getMockFile(cachePath);
            cacheFile.exists.mockResolvedValue([true]);
            cacheFile.download.mockResolvedValue([Buffer.from(JSON.stringify({
                results: [['acct-1', 100]],
                metadata: {
                    viewName: 'account_balance',
                    entityType,
                    createdAt: '2026-01-23T10:00:00Z',
                    sstableVersions: ['old-sstable'],
                    walVersions: ['2026-01-22'],
                },
            }))]);

            // Metadata shows NEW SSTable after compaction
            mockLoadMetadata.mockResolvedValue({
                uid,
                entityType,
                version: 1,
                createdAt: '2026-01-23T00:00:00Z',
                updatedAt: '2026-01-23T12:00:00Z',
                walFiles: [],
                sstables: [
                    { path: 'new-compact-sstable', indexPath: 'new-index', recordCount: 10, byteSize: 1000, startKey: 'je-001', endKey: 'je-010', compactedAt: '2026-01-23T12:00:00Z' },
                ],
                migrationStatus: 'none',
                thresholdConfig: { enabled: true, value: 1000 },
            });

            const asyncGenerator = async function* () {
                yield { id: 'je-001', timestamp: '2026-01-23T10:00:00Z', amount: 100, accountId: 'acct-1', type: 'credit' };
            };
            mockStreamJSONL.mockReturnValue(asyncGenerator());

            const mapper: Mapper<JournalEntry, string, number> = (entry) => (emit) => {
                emit(entry.accountId, entry.amount);
            };
            const reducer: Reducer<number, number> = (values) => reduce.sum(values);

            // queryView should detect version mismatch and recompute
            const result = await queryView<JournalEntry, string, number, number>(
                uid,
                entityType,
                'account_balance',
                mapper,
                reducer
            );

            // Result should be recomputed, not from cache
            expect(result).toEqual(new Map([['acct-1', 100]]));
            expect(cacheFile.save).toHaveBeenCalled();
        });
    });

    describe('integration with mapReduceViews', () => {
        const entityType = 'journal_entries';

        it('should use built-in reducers correctly', async () => {
            const testEntries: JournalEntry[] = [
                { id: 'je-001', timestamp: '2026-01-23T10:00:00Z', amount: 100, accountId: 'acct-1', type: 'credit' },
                { id: 'je-002', timestamp: '2026-01-23T11:00:00Z', amount: 200, accountId: 'acct-1', type: 'credit' },
                { id: 'je-003', timestamp: '2026-01-23T12:00:00Z', amount: 150, accountId: 'acct-1', type: 'credit' },
            ];

            const asyncGenerator = async function* () {
                for (const entry of testEntries) {
                    yield entry;
                }
            };
            mockStreamJSONL.mockReturnValue(asyncGenerator());

            const cachePath = getCachePath('user', entityType, 'avg_amount');
            const cacheFile = mockBucket._getMockFile(cachePath);
            cacheFile.exists.mockResolvedValue([false]);

            // Use avg reducer
            const mapper: Mapper<JournalEntry, string, number> = (entry) => (emit) => {
                emit(entry.accountId, entry.amount);
            };

            const result = await queryView<JournalEntry, string, number, number>(
                'user',
                entityType,
                'avg_amount',
                mapper,
                reduce.avg
            );

            expect(result.get('acct-1')).toBe(150); // (100 + 200 + 150) / 3
        });

        it('should handle composite keys using string serialization', async () => {
            // Composite keys should be serialized to strings for Map lookups
            // Format: "accountId:date"

            const testEntries: JournalEntry[] = [
                { id: 'je-001', timestamp: '2026-01-23T10:00:00Z', amount: 100, accountId: 'acct-1', type: 'credit' },
                { id: 'je-002', timestamp: '2026-01-23T11:00:00Z', amount: 200, accountId: 'acct-1', type: 'credit' },
                { id: 'je-003', timestamp: '2026-01-24T10:00:00Z', amount: 150, accountId: 'acct-1', type: 'credit' },
            ];

            const asyncGenerator = async function* () {
                for (const entry of testEntries) {
                    yield entry;
                }
            };
            mockStreamJSONL.mockReturnValue(asyncGenerator());

            const cachePath = getCachePath('user', entityType, 'daily_balance');
            const cacheFile = mockBucket._getMockFile(cachePath);
            cacheFile.exists.mockResolvedValue([false]);

            const mapper: Mapper<JournalEntry, string, number> = (entry) => (emit) => {
                const date = entry.timestamp.split('T')[0];
                // Serialize composite key as string
                emit(`${entry.accountId}:${date}`, entry.amount);
            };

            const result = await queryView<JournalEntry, string, number, number>(
                'user',
                entityType,
                'daily_balance',
                mapper,
                reduce.sum
            );

            // Now string keys work properly with Map
            expect(result.get('acct-1:2026-01-23')).toBe(300);
            expect(result.get('acct-1:2026-01-24')).toBe(150);
        });
    });
});
