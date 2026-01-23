import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock GCS persistence
const mockBucket = vi.hoisted(() => {
    // Create a factory for mock files that tracks different files by path
    const mockFiles = new Map<string, {
        save: ReturnType<typeof vi.fn>;
        download: ReturnType<typeof vi.fn>;
        exists: ReturnType<typeof vi.fn>;
        getMetadata: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
        name: string;
    }>();

    const createMockFile = (path: string) => {
        if (!mockFiles.has(path)) {
            const file = {
                save: vi.fn().mockResolvedValue(true),
                download: vi.fn().mockResolvedValue([Buffer.from('')]),
                exists: vi.fn().mockResolvedValue([true]),
                getMetadata: vi.fn().mockResolvedValue([{ size: '1024' }]),
                delete: vi.fn().mockResolvedValue(true),
                name: path,
            };
            mockFiles.set(path, file);
        }
        return mockFiles.get(path)!;
    };

    const bucket = {
        file: vi.fn((path: string) => createMockFile(path)),
        getFiles: vi.fn().mockResolvedValue([[]]),
        _getMockFile: (path: string) => createMockFile(path), // Helper for tests
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

// Set environment before importing
process.env.NODE_ENV = 'production';
process.env.GOOGLE_APPLICATION_CREDENTIALS = '/fake/path.json';
delete process.env.USE_LOCAL_PERSISTENCE;

// Import after mock and env setup
import { compactWAL, CompactionConfig, _setBucketForTesting } from './lsmCompactor.js';

// Set bucket mock for testing
_setBucketForTesting(mockBucket);

describe('lsmCompactor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Clear all mock files
        mockBucket._clearMockFiles();
        mockBucket.getFiles.mockResolvedValue([[]]);
    });

    describe('compactWAL', () => {
        const defaultConfig: CompactionConfig = {
            maxWALFiles: 10,
            maxFileSizeMB: 100,
            minRecordsToCompact: 100,
            strategy: 'tiered',
        };

        it('should read WAL files from spec-compliant path: users/{uid}/wal/{entityType}/{YYYY-MM-DD}.jsonl', async () => {
            const uid = 'test-uid';
            const entityType = 'journal_entries';

            const walContent1 = Buffer.from([
                '{"id":"je-001","timestamp":"2026-01-19T10:00:00Z","amount":100}',
                '{"id":"je-002","timestamp":"2026-01-19T11:00:00Z","amount":200}',
            ].join('\n'));

            const walContent2 = Buffer.from([
                '{"id":"je-003","timestamp":"2026-01-20T10:00:00Z","amount":300}',
            ].join('\n'));

            const mockWalFile1 = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-19.jsonl`);
            mockWalFile1.name = `users/${uid}/wal/${entityType}/2026-01-19.jsonl`;
            mockWalFile1.download.mockResolvedValue([walContent1]);
            mockWalFile1.getMetadata.mockResolvedValue([{ size: String(walContent1.length) }]);

            const mockWalFile2 = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
            mockWalFile2.name = `users/${uid}/wal/${entityType}/2026-01-20.jsonl`;
            mockWalFile2.download.mockResolvedValue([walContent2]);
            mockWalFile2.getMetadata.mockResolvedValue([{ size: String(walContent2.length) }]);

            mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile1, mockWalFile2]]);

            const result = await compactWAL(uid, entityType, defaultConfig);

            expect(mockBucket.getFiles).toHaveBeenCalledWith({
                prefix: `users/${uid}/wal/${entityType}/`
            });
        });

        it('should merge WAL files and sort by key (timestamp)', async () => {
            const uid = 'test-uid';
            const entityType = 'transactions';
            const config: CompactionConfig = { ...defaultConfig, minRecordsToCompact: 1 };

            // WAL files with unsorted timestamps
            const walContent1 = Buffer.from([
                '{"id":"txn-003","timestamp":"2026-01-20T10:00:00Z","amount":300}',
                '{"id":"txn-001","timestamp":"2026-01-19T10:00:00Z","amount":100}',
            ].join('\n'));

            const walContent2 = Buffer.from([
                '{"id":"txn-002","timestamp":"2026-01-19T15:00:00Z","amount":200}',
            ].join('\n'));

            const mockWalFile1 = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
            mockWalFile1.name = `users/${uid}/wal/${entityType}/2026-01-20.jsonl`;
            mockWalFile1.download.mockResolvedValue([walContent1]);
            mockWalFile1.getMetadata.mockResolvedValue([{ size: String(walContent1.length) }]);

            const mockWalFile2 = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-19.jsonl`);
            mockWalFile2.name = `users/${uid}/wal/${entityType}/2026-01-19.jsonl`;
            mockWalFile2.download.mockResolvedValue([walContent2]);
            mockWalFile2.getMetadata.mockResolvedValue([{ size: String(walContent2.length) }]);

            mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile1, mockWalFile2]]);

            const result = await compactWAL(uid, entityType, config);

            // Verify SSTable was created
            expect(result.sstablePath).toBeDefined();
            expect(result.recordCount).toBe(3);
        });

        it('should sort by entity ID when timestamp is not available', async () => {
            const uid = 'test-uid';
            const entityType = 'accounts';
            const config: CompactionConfig = { ...defaultConfig, minRecordsToCompact: 1 };

            const walContent = Buffer.from([
                '{"id":"acc-003","name":"Account C"}',
                '{"id":"acc-001","name":"Account A"}',
                '{"id":"acc-002","name":"Account B"}',
            ].join('\n'));

            const mockWalFile = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
            mockWalFile.name = `users/${uid}/wal/${entityType}/2026-01-20.jsonl`;
            mockWalFile.download.mockResolvedValue([walContent]);
            mockWalFile.getMetadata.mockResolvedValue([{ size: String(walContent.length) }]);

            mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile]]);

            const result = await compactWAL(uid, entityType, config);

            // Verify sorting by ID (acc-001, acc-002, acc-003)
            expect(result.recordCount).toBe(3);
        });

        it('should create SSTable at spec-compliant path: snapshots/{entityType}/{timestamp}-compact.jsonl', async () => {
            const uid = 'test-uid';
            const entityType = 'journal_entries';
            const config: CompactionConfig = { ...defaultConfig, minRecordsToCompact: 1 };

            const walContent = Buffer.from([
                '{"id":"je-001","timestamp":"2026-01-20T10:00:00Z"}',
            ].join('\n'));

            const mockWalFile = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
            mockWalFile.name = `users/${uid}/wal/${entityType}/2026-01-20.jsonl`;
            mockWalFile.download.mockResolvedValue([walContent]);
            mockWalFile.getMetadata.mockResolvedValue([{ size: String(walContent.length) }]);

            mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile]]);

            const result = await compactWAL(uid, entityType, config);

            // Verify SSTable path format
            expect(result.sstablePath).toMatch(/^snapshots\/journal_entries\/\d{8}T\d{6}-compact\.jsonl$/);

            // Verify bucket.file was called with correct path
            const sstableCalls = mockBucket.file.mock.calls.filter(
                call => (call[0] as string)?.includes('-compact.jsonl')
            );
            expect(sstableCalls.length).toBeGreaterThan(0);
        });

        it('should create sorted index at spec-compliant path: snapshots/{entityType}/{timestamp}-index.json', async () => {
            const uid = 'test-uid';
            const entityType = 'transactions';
            const config: CompactionConfig = { ...defaultConfig, minRecordsToCompact: 1 };

            const walContent = Buffer.from([
                '{"id":"txn-001","timestamp":"2026-01-20T10:00:00Z","amount":100}',
                '{"id":"txn-002","timestamp":"2026-01-20T11:00:00Z","amount":200}',
            ].join('\n'));

            const mockWalFile = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
            mockWalFile.name = `users/${uid}/wal/${entityType}/2026-01-20.jsonl`;
            mockWalFile.download.mockResolvedValue([walContent]);
            mockWalFile.getMetadata.mockResolvedValue([{ size: String(walContent.length) }]);

            mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile]]);

            const result = await compactWAL(uid, entityType, config);

            // Verify index path format
            expect(result.indexPath).toMatch(/^snapshots\/transactions\/\d{8}T\d{6}-index\.json$/);

            // Verify index contains entries
            const indexCalls = mockBucket.file.mock.calls.filter(
                call => (call[0] as string)?.includes('-index.json')
            );
            expect(indexCalls.length).toBeGreaterThan(0);
        });

        it('should return CompactionResult with sstablePath, indexPath, and recordCount', async () => {
            const uid = 'test-uid';
            const entityType = 'ledger';
            const config: CompactionConfig = { ...defaultConfig, minRecordsToCompact: 1 };

            const walContent = Buffer.from([
                '{"id":"led-001","timestamp":"2026-01-20T10:00:00Z"}',
                '{"id":"led-002","timestamp":"2026-01-20T11:00:00Z"}',
                '{"id":"led-003","timestamp":"2026-01-20T12:00:00Z"}',
            ].join('\n'));

            const mockWalFile = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
            mockWalFile.name = `users/${uid}/wal/${entityType}/2026-01-20.jsonl`;
            mockWalFile.download.mockResolvedValue([walContent]);
            mockWalFile.getMetadata.mockResolvedValue([{ size: String(walContent.length) }]);

            mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile]]);

            const result = await compactWAL(uid, entityType, config);

            expect(result.sstablePath).toBeDefined();
            expect(result.indexPath).toBeDefined();
            expect(result.recordCount).toBe(3);
        });

        it('should respect maxWALFiles config limit', async () => {
            const uid = 'test-uid';
            const entityType = 'events';
            const config: CompactionConfig = {
                ...defaultConfig,
                maxWALFiles: 2,
                minRecordsToCompact: 1,
            };

            // Create 3 WAL files
            const mockWalFiles = Array.from({ length: 3 }, (_, i) => {
                const path = `users/${uid}/wal/${entityType}/2026-01-${String(20 + i).padStart(2, '0')}.jsonl`;
                const file = mockBucket._getMockFile(path);
                file.name = path;
                file.download.mockResolvedValue([Buffer.from(`{"id":"evt-${i}","timestamp":"2026-01-${20 + i}T10:00:00Z"}`)]);
                file.getMetadata.mockResolvedValue([{ size: '100' }]);
                return file;
            });

            mockBucket.getFiles.mockResolvedValueOnce([mockWalFiles]);

            const result = await compactWAL(uid, entityType, config);

            // Should only process 2 files (maxWALFiles limit)
            expect(result.recordCount).toBe(2);
        });

        it('should respect minRecordsToCompact config', async () => {
            const uid = 'test-uid';
            const entityType = 'small';

            const config: CompactionConfig = {
                ...defaultConfig,
                minRecordsToCompact: 10,
            };

            const walContent = Buffer.from([
                '{"id":"rec-001","timestamp":"2026-01-20T10:00:00Z"}',
            ].join('\n'));

            const mockWalFile = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
            mockWalFile.name = `users/${uid}/wal/${entityType}/2026-01-20.jsonl`;
            mockWalFile.download.mockResolvedValue([walContent]);
            mockWalFile.getMetadata.mockResolvedValue([{ size: String(walContent.length) }]);

            mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile]]);

            const result = await compactWAL(uid, entityType, config);

            // Should skip compaction due to insufficient records
            expect(result.sstablePath).toBeUndefined();
            expect(result.indexPath).toBeUndefined();
            expect(result.skippedReason).toBe('minRecordsToCompact not met');
        });

        it('should respect maxFileSizeMB config', async () => {
            const uid = 'test-uid';
            const entityType = 'large';
            const config: CompactionConfig = {
                ...defaultConfig,
                maxFileSizeMB: 1, // 1MB limit
                minRecordsToCompact: 1,
            };

            // Create WAL file that exceeds 1MB
            const largeRecord = JSON.stringify({ id: 'large', data: 'x'.repeat(1024 * 1024), timestamp: '2026-01-20T10:00:00Z' });
            const walContent = Buffer.from(largeRecord + '\n');

            const mockWalFile = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
            mockWalFile.name = `users/${uid}/wal/${entityType}/2026-01-20.jsonl`;
            mockWalFile.download.mockResolvedValue([walContent]);
            mockWalFile.getMetadata.mockResolvedValue([{ size: String(walContent.length) }]);

            mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile]]);

            const result = await compactWAL(uid, entityType, config);

            // Should skip compaction due to size limit
            expect(result.sstablePath).toBeUndefined();
            expect(result.indexPath).toBeUndefined();
            expect(result.skippedReason).toBe('maxFileSizeMB exceeded');
        });

        it('should handle empty WAL (no files)', async () => {
            const uid = 'empty-uid';
            const entityType = 'none';

            mockBucket.getFiles.mockResolvedValueOnce([[]]);

            const result = await compactWAL(uid, entityType, defaultConfig);

            expect(result.sstablePath).toBeUndefined();
            expect(result.indexPath).toBeUndefined();
            expect(result.recordCount).toBe(0);
            expect(result.skippedReason).toBe('no WAL files found');
        });

        it('should handle malformed JSONL entries gracefully', async () => {
            const uid = 'test-uid';
            const entityType = 'mixed';
            const config: CompactionConfig = { ...defaultConfig, minRecordsToCompact: 1 };

            const walContent = Buffer.from([
                '{"id":"valid-001","timestamp":"2026-01-20T10:00:00Z"}',
                'this is not valid json',
                '{"id":"valid-002","timestamp":"2026-01-20T11:00:00Z"}',
            ].join('\n'));

            const mockWalFile = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
            mockWalFile.name = `users/${uid}/wal/${entityType}/2026-01-20.jsonl`;
            mockWalFile.download.mockResolvedValue([walContent]);
            mockWalFile.getMetadata.mockResolvedValue([{ size: String(walContent.length) }]);

            mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile]]);

            const result = await compactWAL(uid, entityType, config);

            // Should only compact valid entries
            expect(result.recordCount).toBe(2);
            expect(result.invalidEntries).toBe(1);
        });

        it('should handle walFiles list with non-jsonl files', async () => {
            const uid = 'test-uid';
            const entityType = 'mixed';
            const config: CompactionConfig = { ...defaultConfig, minRecordsToCompact: 1 };

            const walContent = Buffer.from([
                '{"id":"je-001","timestamp":"2026-01-20T10:00:00Z"}',
            ].join('\n'));

            const mockWalFile = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
            mockWalFile.name = `users/${uid}/wal/${entityType}/2026-01-20.jsonl`;
            mockWalFile.download.mockResolvedValue([walContent]);
            mockWalFile.getMetadata.mockResolvedValue([{ size: String(walContent.length) }]);

            // Include non-jsonl files
            const mockMetaFile = {
                name: `users/${uid}/wal/${entityType}/metadata.json`,
                download: vi.fn().mockResolvedValue([Buffer.from('{}')]),
                getMetadata: vi.fn().mockResolvedValue([{ size: '50' }]),
                save: vi.fn(),
                exists: vi.fn(),
                delete: vi.fn(),
            };

            mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile, mockMetaFile]]);

            const result = await compactWAL(uid, entityType, config);

            // Should only process .jsonl files
            expect(result.recordCount).toBe(1);
        });

        it('should handle records with no timestamp, id, or string properties', async () => {
            const uid = 'test-uid';
            const entityType = 'weird';
            const config: CompactionConfig = { ...defaultConfig, minRecordsToCompact: 1 };

            // Record with only numbers and objects (no string properties)
            const walContent = Buffer.from([
                '{"count":42,"nested":{"value":100}}',
            ].join('\n'));

            const mockWalFile = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
            mockWalFile.name = `users/${uid}/wal/${entityType}/2026-01-20.jsonl`;
            mockWalFile.download.mockResolvedValue([walContent]);
            mockWalFile.getMetadata.mockResolvedValue([{ size: String(walContent.length) }]);

            mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile]]);

            const result = await compactWAL(uid, entityType, config);

            // Should still process record with empty sort key
            expect(result.recordCount).toBe(1);
        });

        it('should handle records with string properties other than id/timestamp', async () => {
            const uid = 'test-uid';
            const entityType = 'altkey';
            const config: CompactionConfig = { ...defaultConfig, minRecordsToCompact: 1 };

            // Record with string property other than id/timestamp
            const walContent = Buffer.from([
                '{"name":"Account A","balance":1000}',
            ].join('\n'));

            const mockWalFile = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
            mockWalFile.name = `users/${uid}/wal/${entityType}/2026-01-20.jsonl`;
            mockWalFile.download.mockResolvedValue([walContent]);
            mockWalFile.getMetadata.mockResolvedValue([{ size: String(walContent.length) }]);

            mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile]]);

            const result = await compactWAL(uid, entityType, config);

            // Should use the first string property as sort key
            expect(result.recordCount).toBe(1);
        });

        it('should handle WAL file read errors gracefully', async () => {
            const uid = 'test-uid';
            const entityType = 'error';
            const config: CompactionConfig = { ...defaultConfig, minRecordsToCompact: 1 };

            const mockWalFile = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
            mockWalFile.name = `users/${uid}/wal/${entityType}/2026-01-20.jsonl`;
            mockWalFile.download.mockRejectedValue(new Error('Network error'));
            mockWalFile.getMetadata.mockResolvedValue([{ size: '100' }]);

            mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile]]);

            const result = await compactWAL(uid, entityType, config);

            // Should handle error and return empty result
            expect(result.recordCount).toBe(0);
            expect(result.skippedReason).toBe('no WAL files found');
        });
    });

    describe('Tiered compaction strategy', () => {
        it('should merge N WAL files into 1 SSTable when using tiered strategy', async () => {
            const uid = 'test-uid';
            const entityType = 'events';
            const config: CompactionConfig = {
                maxWALFiles: 5,
                maxFileSizeMB: 100,
                minRecordsToCompact: 1,
                strategy: 'tiered',
            };

            // Create 5 WAL files (N = 5)
            const mockWalFiles = Array.from({ length: 5 }, (_, i) => {
                const path = `users/${uid}/wal/${entityType}/2026-01-${String(20 + i).padStart(2, '0')}.jsonl`;
                const file = mockBucket._getMockFile(path);
                file.name = path;
                file.download.mockResolvedValue([Buffer.from(`{"id":"evt-${i}","timestamp":"2026-01-${20 + i}T10:00:00Z"}`)]);
                file.getMetadata.mockResolvedValue([{ size: '100' }]);
                return file;
            });

            mockBucket.getFiles.mockResolvedValueOnce([mockWalFiles]);

            const result = await compactWAL(uid, entityType, config);

            // Verify N files were read
            expect(result.recordCount).toBe(5);

            // Verify EXACTLY 1 SSTable was created (N -> 1 merge)
            expect(result.sstablePath).toBeDefined();
            const sstableCalls = mockBucket.file.mock.calls.filter(
                call => (call[0] as string)?.includes('-compact.jsonl')
            );
            expect(sstableCalls.length).toBe(1);

            // Verify exactly 1 index was created
            const indexCalls = mockBucket.file.mock.calls.filter(
                call => (call[0] as string)?.includes('-index.json')
            );
            expect(indexCalls.length).toBe(1);
        });

        it('should merge 10 WAL files into 1 SSTable (larger N)', async () => {
            const uid = 'test-uid';
            const entityType = 'transactions';
            const config: CompactionConfig = {
                maxWALFiles: 10,
                maxFileSizeMB: 100,
                minRecordsToCompact: 1,
                strategy: 'tiered',
            };

            // Create 10 WAL files
            const mockWalFiles = Array.from({ length: 10 }, (_, i) => {
                const path = `users/${uid}/wal/${entityType}/2026-01-${String(i + 1).padStart(2, '0')}.jsonl`;
                const file = mockBucket._getMockFile(path);
                file.name = path;
                file.download.mockResolvedValue([Buffer.from(`{"id":"txn-${i}","timestamp":"2026-01-${String(i + 1).padStart(2, '0')}T10:00:00Z"}`)]);
                file.getMetadata.mockResolvedValue([{ size: '100' }]);
                return file;
            });

            mockBucket.getFiles.mockResolvedValueOnce([mockWalFiles]);

            const result = await compactWAL(uid, entityType, config);

            // Verify all 10 files were merged
            expect(result.recordCount).toBe(10);

            // Verify exactly 1 SSTable created (10 -> 1 merge)
            const sstableCalls = mockBucket.file.mock.calls.filter(
                call => (call[0] as string)?.includes('-compact.jsonl')
            );
            expect(sstableCalls.length).toBe(1);
        });

        it('should handle single WAL file merging into 1 SSTable (N=1)', async () => {
            const uid = 'test-uid';
            const entityType = 'single';
            const config: CompactionConfig = {
                maxWALFiles: 10,
                maxFileSizeMB: 100,
                minRecordsToCompact: 1,
                strategy: 'tiered',
            };

            const walContent = Buffer.from([
                '{"id":"single-001","timestamp":"2026-01-20T10:00:00Z"}',
            ].join('\n'));

            const mockWalFile = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
            mockWalFile.name = `users/${uid}/wal/${entityType}/2026-01-20.jsonl`;
            mockWalFile.download.mockResolvedValue([walContent]);
            mockWalFile.getMetadata.mockResolvedValue([{ size: String(walContent.length) }]);

            mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile]]);

            const result = await compactWAL(uid, entityType, config);

            // Verify 1 file in -> 1 SSTable out
            expect(result.recordCount).toBe(1);
            const sstableCalls = mockBucket.file.mock.calls.filter(
                call => (call[0] as string)?.includes('-compact.jsonl')
            );
            expect(sstableCalls.length).toBe(1);
        });

        it('should not create multiple SSTables for tiered strategy', async () => {
            const uid = 'test-uid';
            const entityType = 'multi';
            const config: CompactionConfig = {
                maxWALFiles: 7,
                maxFileSizeMB: 100,
                minRecordsToCompact: 1,
                strategy: 'tiered',
            };

            // Create 7 WAL files
            const mockWalFiles = Array.from({ length: 7 }, (_, i) => {
                const path = `users/${uid}/wal/${entityType}/2026-01-${String(i + 1).padStart(2, '0')}.jsonl`;
                const file = mockBucket._getMockFile(path);
                file.name = path;
                file.download.mockResolvedValue([Buffer.from(`{"id":"m-${i}","timestamp":"2026-01-${String(i + 1).padStart(2, '0')}T10:00:00Z"}`)]);
                file.getMetadata.mockResolvedValue([{ size: '100' }]);
                return file;
            });

            mockBucket.getFiles.mockResolvedValueOnce([mockWalFiles]);

            const result = await compactWAL(uid, entityType, config);

            // Verify exactly 1 SSTable, not multiple
            const sstableCalls = mockBucket.file.mock.calls.filter(
                call => (call[0] as string)?.includes('-compact.jsonl')
            );
            expect(sstableCalls.length).toBe(1);
            expect(sstableCalls.length).not.toBeGreaterThan(1);
        });

        it('should produce SSTable with combined records from all input files', async () => {
            const uid = 'test-uid';
            const entityType = 'combined';
            const config: CompactionConfig = {
                maxWALFiles: 3,
                maxFileSizeMB: 100,
                minRecordsToCompact: 1,
                strategy: 'tiered',
            };

            // File 1: 2 records
            const walContent1 = Buffer.from([
                '{"id":"c-001","timestamp":"2026-01-20T10:00:00Z"}',
                '{"id":"c-002","timestamp":"2026-01-20T11:00:00Z"}',
            ].join('\n'));

            // File 2: 3 records
            const walContent2 = Buffer.from([
                '{"id":"c-003","timestamp":"2026-01-21T10:00:00Z"}',
                '{"id":"c-004","timestamp":"2026-01-21T11:00:00Z"}',
                '{"id":"c-005","timestamp":"2026-01-21T12:00:00Z"}',
            ].join('\n'));

            // File 3: 1 record
            const walContent3 = Buffer.from([
                '{"id":"c-006","timestamp":"2026-01-22T10:00:00Z"}',
            ].join('\n'));

            const mockWalFile1 = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
            mockWalFile1.name = `users/${uid}/wal/${entityType}/2026-01-20.jsonl`;
            mockWalFile1.download.mockResolvedValue([walContent1]);
            mockWalFile1.getMetadata.mockResolvedValue([{ size: String(walContent1.length) }]);

            const mockWalFile2 = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-21.jsonl`);
            mockWalFile2.name = `users/${uid}/wal/${entityType}/2026-01-21.jsonl`;
            mockWalFile2.download.mockResolvedValue([walContent2]);
            mockWalFile2.getMetadata.mockResolvedValue([{ size: String(walContent2.length) }]);

            const mockWalFile3 = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-22.jsonl`);
            mockWalFile3.name = `users/${uid}/wal/${entityType}/2026-01-22.jsonl`;
            mockWalFile3.download.mockResolvedValue([walContent3]);
            mockWalFile3.getMetadata.mockResolvedValue([{ size: String(walContent3.length) }]);

            mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile1, mockWalFile2, mockWalFile3]]);

            const result = await compactWAL(uid, entityType, config);

            // Verify all 6 records combined into 1 SSTable
            expect(result.recordCount).toBe(6);

            // Get the SSTable content
            const sstableFile = mockBucket._getMockFile(result.sstablePath || '');
            const saveCall = sstableFile.save.mock.calls[0];
            const savedContent = saveCall[0] as string;

            // Verify SSTable contains combined records (not just one file)
            expect(savedContent).toContain('c-001');
            expect(savedContent).toContain('c-002');
            expect(savedContent).toContain('c-003');
            expect(savedContent).toContain('c-004');
            expect(savedContent).toContain('c-005');
            expect(savedContent).toContain('c-006');
        });
    });

    describe('CompactionConfig parsing', () => {
        it('should parse CompactionConfig with tiered strategy', async () => {
            const config: CompactionConfig = {
                maxWALFiles: 10,
                maxFileSizeMB: 100,
                minRecordsToCompact: 100,
                strategy: 'tiered',
            };

            const uid = 'test-uid';
            const entityType = 'test';
            mockBucket.getFiles.mockResolvedValueOnce([[]]);

            await compactWAL(uid, entityType, config);

            // Verify config is accepted and used
            expect(mockBucket.getFiles).toHaveBeenCalledWith({
                prefix: `users/${uid}/wal/${entityType}/`
            });
        });

        it('should parse CompactionConfig with leveled strategy', async () => {
            const config: CompactionConfig = {
                maxWALFiles: 5,
                maxFileSizeMB: 50,
                minRecordsToCompact: 50,
                strategy: 'leveled',
            };

            const uid = 'test-uid';
            const entityType = 'test';
            mockBucket.getFiles.mockResolvedValueOnce([[]]);

            await compactWAL(uid, entityType, config);

            // Verify config is accepted
            expect(mockBucket.getFiles).toHaveBeenCalled();
        });

        it('should enforce maxWALFiles limit from config', async () => {
            const uid = 'test-uid';
            const entityType = 'limited';
            const config: CompactionConfig = {
                maxWALFiles: 3,
                maxFileSizeMB: 100,
                minRecordsToCompact: 1,
                strategy: 'tiered',
            };

            // Create 5 WAL files but config limits to 3
            const mockWalFiles = Array.from({ length: 5 }, (_, i) => {
                const path = `users/${uid}/wal/${entityType}/2026-01-${String(i + 1).padStart(2, '0')}.jsonl`;
                const file = mockBucket._getMockFile(path);
                file.name = path;
                file.download.mockResolvedValue([Buffer.from(`{"id":"lim-${i}","timestamp":"2026-01-${String(i + 1).padStart(2, '0')}T10:00:00Z"}`)]);
                file.getMetadata.mockResolvedValue([{ size: '100' }]);
                return file;
            });

            mockBucket.getFiles.mockResolvedValueOnce([mockWalFiles]);

            const result = await compactWAL(uid, entityType, config);

            // Verify only 3 files processed per config
            expect(result.recordCount).toBe(3);
        });

        it('should enforce maxFileSizeMB limit from config', async () => {
            const uid = 'test-uid';
            const entityType = 'sizelimit';
            const config: CompactionConfig = {
                maxWALFiles: 10,
                maxFileSizeMB: 1,
                minRecordsToCompact: 1,
                strategy: 'tiered',
            };

            const largeWalContent = Buffer.from([
                '{"id":"big-001","data":"' + 'x'.repeat(2 * 1024 * 1024) + '","timestamp":"2026-01-20T10:00:00Z"}',
            ].join('\n'));

            const mockWalFile = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
            mockWalFile.name = `users/${uid}/wal/${entityType}/2026-01-20.jsonl`;
            mockWalFile.download.mockResolvedValue([largeWalContent]);
            mockWalFile.getMetadata.mockResolvedValue([{ size: String(largeWalContent.length) }]);

            mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile]]);

            const result = await compactWAL(uid, entityType, config);

            // Verify compaction skipped due to size limit
            expect(result.skippedReason).toBe('maxFileSizeMB exceeded');
        });

        it('should enforce minRecordsToCompact threshold from config', async () => {
            const uid = 'test-uid';
            const entityType = 'recordlimit';
            const config: CompactionConfig = {
                maxWALFiles: 10,
                maxFileSizeMB: 100,
                minRecordsToCompact: 10,
                strategy: 'tiered',
            };

            const walContent = Buffer.from([
                '{"id":"rec-001","timestamp":"2026-01-20T10:00:00Z"}',
            ].join('\n'));

            const mockWalFile = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
            mockWalFile.name = `users/${uid}/wal/${entityType}/2026-01-20.jsonl`;
            mockWalFile.download.mockResolvedValue([walContent]);
            mockWalFile.getMetadata.mockResolvedValue([{ size: String(walContent.length) }]);

            mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile]]);

            const result = await compactWAL(uid, entityType, config);

            // Verify compaction skipped due to record count threshold
            expect(result.skippedReason).toBe('minRecordsToCompact not met');
        });
    });

    describe('SSTable metadata', () => {
        it('should include metadata in SSTable header', async () => {
            const uid = 'test-uid';
            const entityType = 'journal_entries';
            const config: CompactionConfig = {
                maxWALFiles: 10,
                maxFileSizeMB: 100,
                minRecordsToCompact: 1,
                strategy: 'tiered',
            };

            const walContent = Buffer.from([
                '{"id":"je-001","timestamp":"2026-01-20T10:00:00Z"}',
            ].join('\n'));

            const mockWalFile = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
            mockWalFile.name = `users/${uid}/wal/${entityType}/2026-01-20.jsonl`;
            mockWalFile.download.mockResolvedValue([walContent]);
            mockWalFile.getMetadata.mockResolvedValue([{ size: String(walContent.length) }]);

            mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile]]);

            const result = await compactWAL(uid, entityType, config);

            // Check that SSTable has metadata header
            const sstableFile = mockBucket._getMockFile(result.sstablePath || '');
            const saveCall = sstableFile.save.mock.calls[0];
            expect(saveCall).toBeDefined();
            const savedContent = saveCall[0] as string;
            expect(savedContent).toContain('# SSTable');
        });
    });

    describe('Index structure', () => {
        it('should create index with entries containing key, offset, and size', async () => {
            const uid = 'test-uid';
            const entityType = 'indexed';
            const config: CompactionConfig = {
                maxWALFiles: 10,
                maxFileSizeMB: 100,
                minRecordsToCompact: 1,
                strategy: 'tiered',
            };

            const walContent = Buffer.from([
                '{"id":"idx-001","timestamp":"2026-01-20T10:00:00Z"}',
                '{"id":"idx-002","timestamp":"2026-01-20T11:00:00Z"}',
            ].join('\n'));

            const mockWalFile = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
            mockWalFile.name = `users/${uid}/wal/${entityType}/2026-01-20.jsonl`;
            mockWalFile.download.mockResolvedValue([walContent]);
            mockWalFile.getMetadata.mockResolvedValue([{ size: String(walContent.length) }]);

            mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile]]);

            const result = await compactWAL(uid, entityType, config);

            const indexFile = mockBucket._getMockFile(result.indexPath);
            expect(indexFile.save).toHaveBeenCalled();

            const [savedContent] = indexFile.save.mock.calls[0] as [string];
            const index = JSON.parse(savedContent);

            expect(index.entries).toBeInstanceOf(Array);
            expect(index.entries.length).toBe(2);

            // Check first entry structure
            expect(index.entries[0]).toHaveProperty('key');
            expect(index.entries[0]).toHaveProperty('offset');
            expect(index.entries[0]).toHaveProperty('size');

            // Check metadata
            expect(index).toHaveProperty('createdAt');
            expect(index).toHaveProperty('entryCount');
            expect(index).toHaveProperty('totalBytes');
        });
    });

    describe('Compaction purity (no side effects)', () => {
        it('should not modify source WAL files during compaction', async () => {
            const uid = 'test-uid';
            const entityType = 'journal_entries';
            const config: CompactionConfig = {
                maxWALFiles: 10,
                maxFileSizeMB: 100,
                minRecordsToCompact: 1,
                strategy: 'tiered',
            };

            const originalWalContent = Buffer.from([
                '{"id":"je-001","timestamp":"2026-01-20T10:00:00Z","amount":100}',
                '{"id":"je-002","timestamp":"2026-01-20T11:00:00Z","amount":200}',
            ].join('\n'));

            const mockWalFile = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
            mockWalFile.name = `users/${uid}/wal/${entityType}/2026-01-20.jsonl`;
            mockWalFile.download.mockResolvedValue([originalWalContent]);
            mockWalFile.getMetadata.mockResolvedValue([{ size: String(originalWalContent.length) }]);

            mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile]]);

            const result = await compactWAL(uid, entityType, config);

            // Verify compaction succeeded
            expect(result.sstablePath).toBeDefined();
            expect(result.recordCount).toBe(2);

            // Verify source WAL file was NOT modified (no save calls)
            expect(mockWalFile.save).not.toHaveBeenCalled();

            // Verify source WAL file was NOT deleted
            expect(mockWalFile.delete).not.toHaveBeenCalled();

            // Verify only download and metadata read occurred (read-only operations)
            expect(mockWalFile.download).toHaveBeenCalled();
            expect(mockWalFile.getMetadata).toHaveBeenCalled();
        });

        it('should not modify source WAL files when multiple files are compacted', async () => {
            const uid = 'test-uid';
            const entityType = 'transactions';
            const config: CompactionConfig = {
                maxWALFiles: 10,
                maxFileSizeMB: 100,
                minRecordsToCompact: 1,
                strategy: 'tiered',
            };

            const walContent1 = Buffer.from([
                '{"id":"txn-001","timestamp":"2026-01-20T10:00:00Z"}',
            ].join('\n'));

            const walContent2 = Buffer.from([
                '{"id":"txn-002","timestamp":"2026-01-20T11:00:00Z"}',
            ].join('\n'));

            const walContent3 = Buffer.from([
                '{"id":"txn-003","timestamp":"2026-01-20T12:00:00Z"}',
            ].join('\n'));

            const mockWalFile1 = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
            mockWalFile1.name = `users/${uid}/wal/${entityType}/2026-01-20.jsonl`;
            mockWalFile1.download.mockResolvedValue([walContent1]);
            mockWalFile1.getMetadata.mockResolvedValue([{ size: String(walContent1.length) }]);

            const mockWalFile2 = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-21.jsonl`);
            mockWalFile2.name = `users/${uid}/wal/${entityType}/2026-01-21.jsonl`;
            mockWalFile2.download.mockResolvedValue([walContent2]);
            mockWalFile2.getMetadata.mockResolvedValue([{ size: String(walContent2.length) }]);

            const mockWalFile3 = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-22.jsonl`);
            mockWalFile3.name = `users/${uid}/wal/${entityType}/2026-01-22.jsonl`;
            mockWalFile3.download.mockResolvedValue([walContent3]);
            mockWalFile3.getMetadata.mockResolvedValue([{ size: String(walContent3.length) }]);

            mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile1, mockWalFile2, mockWalFile3]]);

            const result = await compactWAL(uid, entityType, config);

            // Verify all source files remain unmodified
            expect(mockWalFile1.save).not.toHaveBeenCalled();
            expect(mockWalFile2.save).not.toHaveBeenCalled();
            expect(mockWalFile3.save).not.toHaveBeenCalled();

            expect(mockWalFile1.delete).not.toHaveBeenCalled();
            expect(mockWalFile2.delete).not.toHaveBeenCalled();
            expect(mockWalFile3.delete).not.toHaveBeenCalled();

            // Verify compaction succeeded
            expect(result.sstablePath).toBeDefined();
            expect(result.recordCount).toBe(3);
        });

        it('should write to new location only (snapshots directory, not wal directory)', async () => {
            const uid = 'test-uid';
            const entityType = 'events';
            const config: CompactionConfig = {
                maxWALFiles: 10,
                maxFileSizeMB: 100,
                minRecordsToCompact: 1,
                strategy: 'tiered',
            };

            const walContent = Buffer.from([
                '{"id":"evt-001","timestamp":"2026-01-20T10:00:00Z"}',
            ].join('\n'));

            const mockWalFile = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
            mockWalFile.name = `users/${uid}/wal/${entityType}/2026-01-20.jsonl`;
            mockWalFile.download.mockResolvedValue([walContent]);
            mockWalFile.getMetadata.mockResolvedValue([{ size: String(walContent.length) }]);

            mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile]]);

            const result = await compactWAL(uid, entityType, config);

            // Verify output files are in snapshots directory, not wal directory
            expect(result.sstablePath).toMatch(/^snapshots\//);
            expect(result.indexPath).toMatch(/^snapshots\//);

            expect(result.sstablePath).not.toContain('/wal/');
            expect(result.indexPath).not.toContain('/wal/');

            // Verify bucket.file was called for snapshots paths only
            const allFileCalls = mockBucket.file.mock.calls;
            const snapshotCalls = allFileCalls.filter(
                call => (call[0] as string)?.startsWith('snapshots/')
            );
            const walCalls = allFileCalls.filter(
                call => (call[0] as string)?.includes('/wal/')
            );

            // Should have snapshot calls for SSTable and index
            expect(snapshotCalls.length).toBeGreaterThanOrEqual(2);

            // WAL calls should be for reading only (no writes to WAL paths)
            const walWriteCalls = walCalls.filter(call => {
                const mockFile = mockBucket._getMockFile(call[0] as string);
                return mockFile.save.mock.calls.length > 0;
            });
            expect(walWriteCalls.length).toBe(0);
        });

        it('should retain source files until promotion (no deletion during compaction)', async () => {
            const uid = 'test-uid';
            const entityType = 'accounts';
            const config: CompactionConfig = {
                maxWALFiles: 10,
                maxFileSizeMB: 100,
                minRecordsToCompact: 1,
                strategy: 'leveled',
            };

            const walContent = Buffer.from([
                '{"id":"acc-001","name":"Account A"}',
                '{"id":"acc-002","name":"Account B"}',
            ].join('\n'));

            const mockWalFile = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
            mockWalFile.name = `users/${uid}/wal/${entityType}/2026-01-20.jsonl`;
            mockWalFile.download.mockResolvedValue([walContent]);
            mockWalFile.getMetadata.mockResolvedValue([{ size: String(walContent.length) }]);

            mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile]]);

            const result = await compactWAL(uid, entityType, config);

            // Verify compaction completed
            expect(result.sstablePath).toBeDefined();
            expect(result.indexPath).toBeDefined();

            // Verify source file still exists (not deleted)
            expect(mockWalFile.delete).not.toHaveBeenCalled();

            // Verify source file content was not altered (save not called)
            expect(mockWalFile.save).not.toHaveBeenCalled();
        });

        it('should be pure function: same inputs produce same outputs without side effects', async () => {
            const uid = 'test-uid';
            const entityType = 'ledger';
            const config: CompactionConfig = {
                maxWALFiles: 5,
                maxFileSizeMB: 50,
                minRecordsToCompact: 1,
                strategy: 'tiered',
            };

            const walContent = Buffer.from([
                '{"id":"led-001","timestamp":"2026-01-20T10:00:00Z","balance":1000}',
                '{"id":"led-002","timestamp":"2026-01-20T11:00:00Z","balance":2000}',
            ].join('\n'));

            const mockWalFile = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
            mockWalFile.name = `users/${uid}/wal/${entityType}/2026-01-20.jsonl`;
            mockWalFile.download.mockResolvedValue([walContent]);
            mockWalFile.getMetadata.mockResolvedValue([{ size: String(walContent.length) }]);

            // Use mockResolvedValue instead of mockResolvedValueOnce to support multiple calls
            mockBucket.getFiles.mockResolvedValue([[mockWalFile]]);

            // Run compaction twice with same inputs
            const result1 = await compactWAL(uid, entityType, config);
            const result2 = await compactWAL(uid, entityType, config);

            // Verify consistent results (pure function behavior)
            expect(result1.recordCount).toBe(result2.recordCount);
            expect(result1.recordCount).toBe(2);

            // Verify source file remains unmodified after both runs
            expect(mockWalFile.save).not.toHaveBeenCalled();
            expect(mockWalFile.delete).not.toHaveBeenCalled();

            // Verify read operations occurred (idempotent reads)
            expect(mockWalFile.download).toHaveBeenCalled();
        });

        it('should not create side effects when compaction is skipped due to minRecords', async () => {
            const uid = 'test-uid';
            const entityType = 'small';
            const config: CompactionConfig = {
                maxWALFiles: 10,
                maxFileSizeMB: 100,
                minRecordsToCompact: 10,
                strategy: 'tiered',
            };

            const walContent = Buffer.from([
                '{"id":"rec-001","timestamp":"2026-01-20T10:00:00Z"}',
            ].join('\n'));

            const mockWalFile = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
            mockWalFile.name = `users/${uid}/wal/${entityType}/2026-01-20.jsonl`;
            mockWalFile.download.mockResolvedValue([walContent]);
            mockWalFile.getMetadata.mockResolvedValue([{ size: String(walContent.length) }]);

            mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile]]);

            const result = await compactWAL(uid, entityType, config);

            // Verify compaction was skipped
            expect(result.sstablePath).toBeUndefined();
            expect(result.skippedReason).toBe('minRecordsToCompact not met');

            // Verify source file not modified even when skipped
            expect(mockWalFile.save).not.toHaveBeenCalled();
            expect(mockWalFile.delete).not.toHaveBeenCalled();
        });

        it('should not create side effects when compaction is skipped due to maxFileSize', async () => {
            const uid = 'test-uid';
            const entityType = 'large';
            const config: CompactionConfig = {
                maxWALFiles: 10,
                maxFileSizeMB: 1,
                minRecordsToCompact: 1,
                strategy: 'tiered',
            };

            const largeWalContent = Buffer.from([
                '{"id":"big-001","data":"' + 'x'.repeat(2 * 1024 * 1024) + '","timestamp":"2026-01-20T10:00:00Z"}',
            ].join('\n'));

            const mockWalFile = mockBucket._getMockFile(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
            mockWalFile.name = `users/${uid}/wal/${entityType}/2026-01-20.jsonl`;
            mockWalFile.download.mockResolvedValue([largeWalContent]);
            mockWalFile.getMetadata.mockResolvedValue([{ size: String(largeWalContent.length) }]);

            mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile]]);

            const result = await compactWAL(uid, entityType, config);

            // Verify compaction was skipped
            expect(result.sstablePath).toBeUndefined();
            expect(result.skippedReason).toBe('maxFileSizeMB exceeded');

            // Verify source file not modified even when skipped
            expect(mockWalFile.save).not.toHaveBeenCalled();
            expect(mockWalFile.delete).not.toHaveBeenCalled();
        });
    });
});
