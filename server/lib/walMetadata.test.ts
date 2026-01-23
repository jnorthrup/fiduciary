import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock GCS persistence
const mockBucket = vi.hoisted(() => {
    const mockFiles = new Map<string, {
        save: ReturnType<typeof vi.fn>;
        download: ReturnType<typeof vi.fn>;
        exists: ReturnType<typeof vi.fn>;
        getMetadata: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
        copy: ReturnType<typeof vi.fn>;
        name: string;
    }>();

    const createMockFile = (path: string) => {
        if (!mockFiles.has(path)) {
            const file = {
                save: vi.fn().mockResolvedValue(true),
                download: vi.fn().mockResolvedValue([Buffer.from('{}')]),
                exists: vi.fn().mockResolvedValue([false]),
                getMetadata: vi.fn().mockResolvedValue([{ size: '1024' }]),
                delete: vi.fn().mockResolvedValue(true),
                copy: vi.fn().mockResolvedValue(true),
                name: path,
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

// Set environment before importing
process.env.NODE_ENV = 'production';
process.env.GOOGLE_APPLICATION_CREDENTIALS = '/fake/path.json';
delete process.env.USE_LOCAL_PERSISTENCE;

// Import after mock and env setup
import {
    WALMetadata,
    loadMetadata,
    saveMetadataAtomic,
    updateMetadata,
    createInitialMetadata,
    _setBucketForTesting
} from './walMetadata.js';

// Set bucket mock for testing
_setBucketForTesting(mockBucket);

describe('walMetadata', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockBucket._clearMockFiles();
        mockBucket.getFiles.mockResolvedValue([[]]);
    });

    describe('WALMetadata interface', () => {
        it('should have all required fields per spec', () => {
            const metadata: WALMetadata = {
                uid: 'test-uid',
                entityType: 'journal_entries',
                version: 1,
                createdAt: '2026-01-20T10:00:00Z',
                updatedAt: '2026-01-20T10:00:00Z',
                walFiles: [],
                sstables: [],
                migrationStatus: 'none',
                thresholdConfig: {
                    enabled: true,
                    value: 1000,
                },
            };

            expect(metadata.uid).toBe('test-uid');
            expect(metadata.entityType).toBe('journal_entries');
            expect(metadata.version).toBe(1);
            expect(metadata.walFiles).toEqual([]);
            expect(metadata.sstables).toEqual([]);
            expect(metadata.migrationStatus).toBe('none');
            expect(metadata.thresholdConfig.enabled).toBe(true);
            expect(metadata.thresholdConfig.value).toBe(1000);
        });

        it('should accept valid migration status values', () => {
            const validStatuses: Array<WALMetadata['migrationStatus']> = ['none', 'pending', 'complete', 'rolledback'];

            validStatuses.forEach(status => {
                const metadata: WALMetadata = {
                    uid: 'test-uid',
                    entityType: 'test',
                    version: 1,
                    createdAt: '2026-01-20T10:00:00Z',
                    updatedAt: '2026-01-20T10:00:00Z',
                    walFiles: [],
                    sstables: [],
                    migrationStatus: status,
                    thresholdConfig: { enabled: true, value: 1000 },
                };
                expect(metadata.migrationStatus).toBe(status);
            });
        });
    });

    describe('createInitialMetadata', () => {
        it('should create initial metadata with current timestamp', () => {
            const metadata = createInitialMetadata('test-uid', 'journal_entries');

            expect(metadata.uid).toBe('test-uid');
            expect(metadata.entityType).toBe('journal_entries');
            expect(metadata.version).toBe(1);
            expect(metadata.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            expect(metadata.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            expect(metadata.walFiles).toEqual([]);
            expect(metadata.sstables).toEqual([]);
            expect(metadata.migrationStatus).toBe('none');
            expect(metadata.thresholdConfig.enabled).toBe(true);
            expect(metadata.thresholdConfig.value).toBe(1000);
        });

        it('should accept custom threshold config', () => {
            const metadata = createInitialMetadata('test-uid', 'transactions', {
                enabled: false,
                value: 500,
            });

            expect(metadata.thresholdConfig.enabled).toBe(false);
            expect(metadata.thresholdConfig.value).toBe(500);
        });
    });

    describe('loadMetadata', () => {
        it('should load metadata from spec-compliant path: users/{uid}/metadata/{entityType}.json', async () => {
            const uid = 'test-uid';
            const entityType = 'journal_entries';
            const mockMetadata: WALMetadata = {
                uid,
                entityType,
                version: 5,
                createdAt: '2026-01-20T10:00:00Z',
                updatedAt: '2026-01-20T11:00:00Z',
                walFiles: [
                    {
                        path: `users/${uid}/wal/${entityType}/2026-01-20.jsonl`,
                        recordCount: 100,
                        byteSize: 10240,
                        date: '2026-01-20',
                    },
                ],
                sstables: [],
                migrationStatus: 'none',
                thresholdConfig: { enabled: true, value: 1000 },
            };

            const mockFile = mockBucket._getMockFile(`users/${uid}/metadata/${entityType}.json`);
            mockFile.exists.mockResolvedValue([true]);
            mockFile.download.mockResolvedValue([Buffer.from(JSON.stringify(mockMetadata))]);

            const metadata = await loadMetadata(uid, entityType);

            expect(metadata).toEqual(mockMetadata);
            expect(mockBucket.file).toHaveBeenCalledWith(`users/${uid}/metadata/${entityType}.json`);
        });

        it('should return null if metadata file does not exist', async () => {
            const mockFile = mockBucket._getMockFile('users/test-uid/metadata/journal_entries.json');
            mockFile.exists.mockResolvedValue([false]);

            const metadata = await loadMetadata('test-uid', 'journal_entries');

            expect(metadata).toBeNull();
        });

        it('should throw error if metadata is corrupted (invalid JSON)', async () => {
            const mockFile = mockBucket._getMockFile('users/test-uid/metadata/journal_entries.json');
            mockFile.exists.mockResolvedValue([true]);
            mockFile.download.mockResolvedValue([Buffer.from('invalid json{')]);

            await expect(loadMetadata('test-uid', 'journal_entries')).rejects.toThrow();
        });
    });

    describe('saveMetadataAtomic', () => {
        it('should write metadata to temp file first, then rename for atomicity', async () => {
            const uid = 'test-uid';
            const entityType = 'journal_entries';
            const metadata: WALMetadata = createInitialMetadata(uid, entityType);

            const metadataPath = `users/${uid}/metadata/${entityType}.json`;
            const tempPath = `${metadataPath}.tmp`;

            const mockMetadataFile = mockBucket._getMockFile(metadataPath);
            const mockTempFile = mockBucket._getMockFile(tempPath);

            await saveMetadataAtomic(uid, metadata);

            // Verify temp file was written first with incremented version
            expect(mockBucket.file).toHaveBeenCalledWith(tempPath);
            expect(mockTempFile.save).toHaveBeenCalled();

            const savedContent = mockTempFile.save.mock.calls[0][0] as string;
            const savedMetadata = JSON.parse(savedContent);

            expect(savedMetadata.version).toBe(metadata.version + 1); // Incremented
            expect(mockTempFile.save).toHaveBeenCalledWith(
                expect.any(String),
                {
                    contentType: 'application/json',
                    resumable: false,
                }
            );

            // Verify atomic rename (copy temp -> target)
            expect(mockTempFile.copy).toHaveBeenCalledWith(metadataPath);

            // Verify temp file was deleted after successful copy
            expect(mockTempFile.delete).toHaveBeenCalled();
        });

        it('should not update target file if temp file write fails', async () => {
            const uid = 'test-uid';
            const entityType = 'journal_entries';
            const metadata: WALMetadata = createInitialMetadata(uid, entityType);

            const tempPath = `users/${uid}/metadata/${entityType}.json.tmp`;
            const mockTempFile = mockBucket._getMockFile(tempPath);
            mockTempFile.save.mockRejectedValue(new Error('Write failed'));

            const mockMetadataFile = mockBucket._getMockFile(`users/${uid}/metadata/${entityType}.json`);

            await expect(saveMetadataAtomic(uid, metadata)).rejects.toThrow('Write failed');

            // Verify target file was not touched
            expect(mockMetadataFile.save).not.toHaveBeenCalled();
            expect(mockTempFile.copy).not.toHaveBeenCalled();
        });

        it('should not leave temp file if copy fails', async () => {
            const uid = 'test-uid';
            const entityType = 'journal_entries';
            const metadata: WALMetadata = createInitialMetadata(uid, entityType);

            const tempPath = `users/${uid}/metadata/${entityType}.json.tmp`;
            const mockTempFile = mockBucket._getMockFile(tempPath);
            mockTempFile.copy.mockRejectedValue(new Error('Copy failed'));

            await expect(saveMetadataAtomic(uid, metadata)).rejects.toThrow('Copy failed');

            // Verify cleanup was attempted even on failure
            expect(mockTempFile.delete).toHaveBeenCalled();
        });

        it('should increment version and update updatedAt timestamp on save', async () => {
            const uid = 'test-uid';
            const entityType = 'journal_entries';
            const metadata: WALMetadata = createInitialMetadata(uid, entityType);
            metadata.version = 5;
            metadata.updatedAt = '2026-01-20T10:00:00Z';

            const tempPath = `users/${uid}/metadata/${entityType}.json.tmp`;
            const mockTempFile = mockBucket._getMockFile(tempPath);

            await saveMetadataAtomic(uid, metadata);

            const savedContent = mockTempFile.save.mock.calls[0][0] as string;
            const savedMetadata = JSON.parse(savedContent);

            expect(savedMetadata.version).toBe(6); // Incremented
            expect(savedMetadata.updatedAt).not.toBe('2026-01-20T10:00:00Z'); // Updated
            expect(savedMetadata.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });
    });

    describe('updateMetadata', () => {
        it('should load existing metadata, apply updates, and save atomically', async () => {
            const uid = 'test-uid';
            const entityType = 'journal_entries';
            const existingMetadata: WALMetadata = {
                uid,
                entityType,
                version: 5,
                createdAt: '2026-01-20T10:00:00Z',
                updatedAt: '2026-01-20T11:00:00Z',
                walFiles: [],
                sstables: [],
                migrationStatus: 'none',
                thresholdConfig: { enabled: true, value: 1000 },
            };

            const mockFile = mockBucket._getMockFile(`users/${uid}/metadata/${entityType}.json`);
            mockFile.exists.mockResolvedValue([true]);
            mockFile.download.mockResolvedValue([Buffer.from(JSON.stringify(existingMetadata))]);

            const updates = {
                migrationStatus: 'complete' as const,
                sstables: [
                    {
                        path: 'snapshots/journal_entries/20260120T100000-compact.jsonl',
                        indexPath: 'snapshots/journal_entries/20260120T100000-index.json',
                        recordCount: 1000,
                        byteSize: 102400,
                        startKey: '2026-01-19T00:00:00Z',
                        endKey: '2026-01-20T23:59:59Z',
                        compactedAt: '2026-01-20T10:00:00Z',
                    },
                ],
            };

            await updateMetadata(uid, entityType, updates);

            // Verify metadata was loaded
            expect(mockFile.download).toHaveBeenCalled();

            // Verify metadata was saved atomically
            const tempPath = `users/${uid}/metadata/${entityType}.json.tmp`;
            const mockTempFile = mockBucket._getMockFile(tempPath);
            expect(mockTempFile.save).toHaveBeenCalled();

            const savedContent = mockTempFile.save.mock.calls[0][0] as string;
            const savedMetadata = JSON.parse(savedContent);

            expect(savedMetadata.migrationStatus).toBe('complete');
            expect(savedMetadata.sstables).toEqual(updates.sstables);
            expect(savedMetadata.version).toBe(6); // Incremented
        });

        it('should create new metadata if none exists', async () => {
            const uid = 'new-uid';
            const entityType = 'transactions';

            const mockFile = mockBucket._getMockFile(`users/${uid}/metadata/${entityType}.json`);
            mockFile.exists.mockResolvedValue([false]);

            const updates = {
                migrationStatus: 'pending' as const,
            };

            await updateMetadata(uid, entityType, updates);

            // Verify new metadata was created (version is 2 because saveMetadataAtomic increments it)
            const tempPath = `users/${uid}/metadata/${entityType}.json.tmp`;
            const mockTempFile = mockBucket._getMockFile(tempPath);
            const savedContent = mockTempFile.save.mock.calls[0][0] as string;
            const savedMetadata = JSON.parse(savedContent);

            expect(savedMetadata.uid).toBe(uid);
            expect(savedMetadata.entityType).toBe(entityType);
            expect(savedMetadata.migrationStatus).toBe('pending');
            expect(savedMetadata.version).toBe(2); // 1 (initial) + 1 (incremented by saveMetadataAtomic)
        });
    });

    describe('Atomic promotion pattern', () => {
        it('should only update metadata after successful compaction (promotion)', async () => {
            const uid = 'test-uid';
            const entityType = 'journal_entries';

            // Simulate compaction result
            const compactionResult = {
                sstablePath: 'snapshots/journal_entries/20260120T100000-compact.jsonl',
                indexPath: 'snapshots/journal_entries/20260120T100000-index.json',
                recordCount: 500,
            };

            // Load existing metadata
            const existingMetadata: WALMetadata = {
                uid,
                entityType,
                version: 3,
                createdAt: '2026-01-20T09:00:00Z',
                updatedAt: '2026-01-20T10:00:00Z',
                walFiles: [
                    {
                        path: `users/${uid}/wal/${entityType}/2026-01-20.jsonl`,
                        recordCount: 500,
                        byteSize: 51200,
                        date: '2026-01-20',
                    },
                ],
                sstables: [],
                migrationStatus: 'none',
                thresholdConfig: { enabled: true, value: 1000 },
            };

            const mockMetadataFile = mockBucket._getMockFile(`users/${uid}/metadata/${entityType}.json`);
            mockMetadataFile.exists.mockResolvedValue([true]);
            mockMetadataFile.download.mockResolvedValue([Buffer.from(JSON.stringify(existingMetadata))]);

            // Perform atomic promotion
            await updateMetadata(uid, entityType, {
                sstables: [
                    {
                        path: compactionResult.sstablePath,
                        indexPath: compactionResult.indexPath,
                        recordCount: compactionResult.recordCount,
                        byteSize: 102400,
                        startKey: '2026-01-20T00:00:00Z',
                        endKey: '2026-01-20T23:59:59Z',
                        compactedAt: new Date().toISOString(),
                    },
                ],
                // WAL files are retained until promotion confirmed
                walFiles: existingMetadata.walFiles,
            });

            // Verify metadata was updated atomically
            const tempPath = `users/${uid}/metadata/${entityType}.json.tmp`;
            const mockTempFile = mockBucket._getMockFile(tempPath);
            expect(mockTempFile.save).toHaveBeenCalled();

            const savedContent = mockTempFile.save.mock.calls[0][0] as string;
            const savedMetadata = JSON.parse(savedContent);

            expect(savedMetadata.sstables).toHaveLength(1);
            expect(savedMetadata.sstables[0].path).toBe(compactionResult.sstablePath);
            expect(savedMetadata.walFiles).toEqual(existingMetadata.walFiles); // Retained
            expect(savedMetadata.version).toBe(4); // Incremented
        });

        it('should retain source files until promotion confirmed', async () => {
            const uid = 'test-uid';
            const entityType = 'accounts';

            const existingMetadata: WALMetadata = {
                uid,
                entityType,
                version: 2,
                createdAt: '2026-01-20T09:00:00Z',
                updatedAt: '2026-01-20T10:00:00Z',
                walFiles: [
                    {
                        path: `users/${uid}/wal/${entityType}/2026-01-19.jsonl`,
                        recordCount: 200,
                        byteSize: 20480,
                        date: '2026-01-19',
                    },
                    {
                        path: `users/${uid}/wal/${entityType}/2026-01-20.jsonl`,
                        recordCount: 300,
                        byteSize: 30720,
                        date: '2026-01-20',
                    },
                ],
                sstables: [],
                migrationStatus: 'none',
                thresholdConfig: { enabled: true, value: 1000 },
            };

            const mockMetadataFile = mockBucket._getMockFile(`users/${uid}/metadata/${entityType}.json`);
            mockMetadataFile.exists.mockResolvedValue([true]);
            mockMetadataFile.download.mockResolvedValue([Buffer.from(JSON.stringify(existingMetadata))]);

            // Simulate pre-promotion state (compaction done, not yet promoted)
            await updateMetadata(uid, entityType, {
                sstables: [
                    {
                        path: 'snapshots/accounts/20260120T110000-compact.jsonl',
                        indexPath: 'snapshots/accounts/20260120T110000-index.json',
                        recordCount: 500,
                        byteSize: 51200,
                        startKey: 'acc-001',
                        endKey: 'acc-500',
                        compactedAt: '2026-01-20T11:00:00Z',
                    },
                ],
                // WAL files still retained
            });

            const tempPath = `users/${uid}/metadata/${entityType}.json.tmp`;
            const mockTempFile = mockBucket._getMockFile(tempPath);
            const savedContent = mockTempFile.save.mock.calls[0][0] as string;
            const savedMetadata = JSON.parse(savedContent);

            // Verify WAL files are still present in metadata
            expect(savedMetadata.walFiles).toHaveLength(2);
            expect(savedMetadata.walFiles).toEqual(existingMetadata.walFiles);
        });
    });
});
