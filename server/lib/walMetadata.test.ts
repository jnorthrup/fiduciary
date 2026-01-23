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
        _setGetFilesMock: (mock: ReturnType<typeof vi.fn>) => {
            bucket.getFiles = mock;
        },
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
    _setBucketForTesting,
    recoverMetadata,
    validateMetadata,
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

    describe('Metadata Recovery', () => {
        describe('validateMetadata', () => {
            it('should return true for valid metadata', () => {
                const metadata: WALMetadata = {
                    uid: 'test-uid',
                    entityType: 'journal_entries',
                    version: 1,
                    createdAt: '2026-01-20T10:00:00Z',
                    updatedAt: '2026-01-20T10:00:00Z',
                    walFiles: [],
                    sstables: [],
                    migrationStatus: 'none',
                    thresholdConfig: { enabled: true, value: 1000 },
                };

                expect(validateMetadata(metadata)).toBe(true);
            });

            it('should return false for null', () => {
                expect(validateMetadata(null)).toBe(false);
            });

            it('should return false for metadata missing required fields', () => {
                const invalidMetadata = {
                    uid: 'test-uid',
                    entityType: 'journal_entries',
                    // Missing version, createdAt, updatedAt
                } as unknown as WALMetadata;

                expect(validateMetadata(invalidMetadata)).toBe(false);
            });

            it('should return false for metadata with invalid migration status', () => {
                const invalidMetadata: WALMetadata = {
                    uid: 'test-uid',
                    entityType: 'journal_entries',
                    version: 1,
                    createdAt: '2026-01-20T10:00:00Z',
                    updatedAt: '2026-01-20T10:00:00Z',
                    walFiles: [],
                    sstables: [],
                    migrationStatus: 'invalid' as any,
                    thresholdConfig: { enabled: true, value: 1000 },
                };

                expect(validateMetadata(invalidMetadata)).toBe(false);
            });

            it('should return false for metadata with invalid threshold config', () => {
                const invalidMetadata: WALMetadata = {
                    uid: 'test-uid',
                    entityType: 'journal_entries',
                    version: 1,
                    createdAt: '2026-01-20T10:00:00Z',
                    updatedAt: '2026-01-20T10:00:00Z',
                    walFiles: [],
                    sstables: [],
                    migrationStatus: 'none',
                    thresholdConfig: { enabled: true, value: -100 },
                };

                expect(validateMetadata(invalidMetadata)).toBe(false);
            });

            it('should return false for metadata with negative version', () => {
                const invalidMetadata: WALMetadata = {
                    uid: 'test-uid',
                    entityType: 'journal_entries',
                    version: -1,
                    createdAt: '2026-01-20T10:00:00Z',
                    updatedAt: '2026-01-20T10:00:00Z',
                    walFiles: [],
                    sstables: [],
                    migrationStatus: 'none',
                    thresholdConfig: { enabled: true, value: 1000 },
                };

                expect(validateMetadata(invalidMetadata)).toBe(false);
            });
        });

        describe('recoverMetadata', () => {
            it('should scan GCS and rebuild metadata when corrupted', async () => {
                const uid = 'test-uid';
                const entityType = 'journal_entries';

                // Simulate corrupted metadata
                const mockMetadataFile = mockBucket._getMockFile(`users/${uid}/metadata/${entityType}.json`);
                mockMetadataFile.exists.mockResolvedValue([true]);
                mockMetadataFile.download.mockResolvedValue([Buffer.from('invalid{json')]);

                // Mock all files in GCS
                const allFiles = [
                    // WAL files
                    {
                        name: `users/${uid}/wal/${entityType}/2026-01-19.jsonl`,
                        download: vi.fn().mockResolvedValue([
                            Buffer.from([
                                '{"type":"test","payload":{"id":"1"}}',
                                '{"type":"test","payload":{"id":"2"}}',
                            ].join('\n'))
                        ]),
                        getMetadata: vi.fn().mockResolvedValue([{ size: '1024' }]),
                    },
                    {
                        name: `users/${uid}/wal/${entityType}/2026-01-20.jsonl`,
                        download: vi.fn().mockResolvedValue([
                            Buffer.from([
                                '{"type":"test","payload":{"id":"3"}}',
                            ].join('\n'))
                        ]),
                        getMetadata: vi.fn().mockResolvedValue([{ size: '512' }]),
                    },
                    // SSTable
                    {
                        name: `snapshots/${entityType}/20260120T100000-compact.jsonl`,
                        download: vi.fn().mockResolvedValue([
                            Buffer.from([
                                '{"type":"test","payload":{"id":"old1"}}',
                                '{"type":"test","payload":{"id":"old2"}}',
                                '{"type":"test","payload":{"id":"old3"}}',
                            ].join('\n'))
                        ]),
                        getMetadata: vi.fn().mockResolvedValue([{ size: '2048' }]),
                    },
                    // Index file
                    {
                        name: `snapshots/${entityType}/20260120T100000-index.json`,
                        download: vi.fn().mockResolvedValue([
                            Buffer.from(JSON.stringify({
                                startKey: '2026-01-19T00:00:00Z',
                                endKey: '2026-01-20T23:59:59Z',
                                recordCount: 3,
                            }))
                        ]),
                        getMetadata: vi.fn().mockResolvedValue([{ size: '256' }]),
                    },
                ];

                mockBucket.getFiles.mockResolvedValue([allFiles]);

                const recovered = await recoverMetadata(uid, entityType);

                // Verify metadata was reconstructed
                expect(recovered).not.toBeNull();
                expect(recovered!.uid).toBe(uid);
                expect(recovered!.entityType).toBe(entityType);
                expect(recovered!.version).toBe(1);
                expect(recovered!.walFiles).toHaveLength(2);
                expect(recovered!.walFiles[0].path).toBe(`users/${uid}/wal/${entityType}/2026-01-19.jsonl`);
                expect(recovered!.walFiles[0].date).toBe('2026-01-19');
                expect(recovered!.walFiles[0].recordCount).toBe(2);
                expect(recovered!.walFiles[1].path).toBe(`users/${uid}/wal/${entityType}/2026-01-20.jsonl`);
                expect(recovered!.walFiles[1].date).toBe('2026-01-20');
                expect(recovered!.walFiles[1].recordCount).toBe(1);
                expect(recovered!.sstables).toHaveLength(1);
                expect(recovered!.sstables[0].path).toBe(`snapshots/${entityType}/20260120T100000-compact.jsonl`);
                expect(recovered!.sstables[0].indexPath).toBe(`snapshots/${entityType}/20260120T100000-index.json`);
                expect(recovered!.sstables[0].recordCount).toBe(3);
            });

            it('should return null and not rebuild if metadata is valid', async () => {
                const uid = 'test-uid';
                const entityType = 'journal_entries';

                const validMetadata: WALMetadata = {
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

                const mockMetadataFile = mockBucket._getMockFile(`users/${uid}/metadata/${entityType}.json`);
                mockMetadataFile.exists.mockResolvedValue([true]);
                mockMetadataFile.download.mockResolvedValue([Buffer.from(JSON.stringify(validMetadata))]);

                const recovered = await recoverMetadata(uid, entityType);

                // Should not scan GCS if metadata is valid
                expect(mockBucket.getFiles).not.toHaveBeenCalled();
                expect(recovered).toBeNull();
            });

            it('should rebuild metadata if metadata file does not exist', async () => {
                const uid = 'test-uid';
                const entityType = 'journal_entries';

                const mockMetadataFile = mockBucket._getMockFile(`users/${uid}/metadata/${entityType}.json`);
                mockMetadataFile.exists.mockResolvedValue([false]);

                const allFiles = [
                    {
                        name: `users/${uid}/wal/${entityType}/2026-01-20.jsonl`,
                        download: vi.fn().mockResolvedValue([Buffer.from('{"type":"test"}\n')]),
                        getMetadata: vi.fn().mockResolvedValue([{ size: '100' }]),
                    },
                ];

                mockBucket.getFiles.mockResolvedValue([allFiles]);

                const recovered = await recoverMetadata(uid, entityType);

                expect(recovered).not.toBeNull();
                expect(recovered!.uid).toBe(uid);
                expect(recovered!.entityType).toBe(entityType);
                expect(recovered!.walFiles).toHaveLength(1);
            });

            it('should reconstruct SSTable metadata from index files', async () => {
                const uid = 'test-uid';
                const entityType = 'accounts';

                const mockMetadataFile = mockBucket._getMockFile(`users/${uid}/metadata/${entityType}.json`);
                mockMetadataFile.exists.mockResolvedValue([false]);

                const allFiles = [
                    {
                        name: `snapshots/${entityType}/20260120T120000-compact.jsonl`,
                        download: vi.fn().mockResolvedValue([Buffer.from('{"id":"1"}\n{"id":"2"}\n')]),
                        getMetadata: vi.fn().mockResolvedValue([{ size: '500' }]),
                    },
                    {
                        name: `snapshots/${entityType}/20260120T120000-index.json`,
                        download: vi.fn().mockResolvedValue([
                            Buffer.from(JSON.stringify({
                                startKey: 'acc-001',
                                endKey: 'acc-999',
                                recordCount: 2,
                                compactedAt: '2026-01-20T12:00:00Z',
                            }))
                        ]),
                        getMetadata: vi.fn().mockResolvedValue([{ size: '200' }]),
                    },
                ];

                mockBucket.getFiles.mockResolvedValue([allFiles]);

                const recovered = await recoverMetadata(uid, entityType);

                expect(recovered!.sstables).toHaveLength(1);
                expect(recovered!.sstables[0].path).toBe(`snapshots/${entityType}/20260120T120000-compact.jsonl`);
                expect(recovered!.sstables[0].indexPath).toBe(`snapshots/${entityType}/20260120T120000-index.json`);
                expect(recovered!.sstables[0].startKey).toBe('acc-001');
                expect(recovered!.sstables[0].endKey).toBe('acc-999');
                expect(recovered!.sstables[0].recordCount).toBe(2);
                expect(recovered!.sstables[0].compactedAt).toBe('2026-01-20T12:00:00Z');
            });

            it('should save recovered metadata atomically', async () => {
                const uid = 'test-uid';
                const entityType = 'journal_entries';

                const mockMetadataFile = mockBucket._getMockFile(`users/${uid}/metadata/${entityType}.json`);
                mockMetadataFile.exists.mockResolvedValue([false]);

                const allFiles = [
                    {
                        name: `users/${uid}/wal/${entityType}/2026-01-20.jsonl`,
                        download: vi.fn().mockResolvedValue([Buffer.from('{"type":"test"}\n')]),
                        getMetadata: vi.fn().mockResolvedValue([{ size: '100' }]),
                    },
                ];

                mockBucket.getFiles.mockResolvedValue([allFiles]);

                await recoverMetadata(uid, entityType);

                // Verify metadata was saved atomically
                const tempPath = `users/${uid}/metadata/${entityType}.json.tmp`;
                const mockTempFile = mockBucket._getMockFile(tempPath);
                expect(mockTempFile.save).toHaveBeenCalled();

                const savedContent = mockTempFile.save.mock.calls[0][0] as string;
                const savedMetadata = JSON.parse(savedContent);
                expect(savedMetadata.uid).toBe(uid);
                expect(savedMetadata.entityType).toBe(entityType);
                expect(mockTempFile.copy).toHaveBeenCalled();
                expect(mockTempFile.delete).toHaveBeenCalled();
            });

            it('should parse date from WAL file path format', async () => {
                const uid = 'test-uid';
                const entityType = 'transactions';

                const mockMetadataFile = mockBucket._getMockFile(`users/${uid}/metadata/${entityType}.json`);
                mockMetadataFile.exists.mockResolvedValue([false]);

                const allFiles = [
                    {
                        name: `users/${uid}/wal/${entityType}/2025-12-31.jsonl`,
                        download: vi.fn().mockResolvedValue([Buffer.from('{"type":"test"}\n')]),
                        getMetadata: vi.fn().mockResolvedValue([{ size: '100' }]),
                    },
                ];

                mockBucket.getFiles.mockResolvedValue([allFiles]);

                const recovered = await recoverMetadata(uid, entityType);

                expect(recovered!.walFiles[0].date).toBe('2025-12-31');
            });

            it('should skip WAL files that do not match expected path pattern', async () => {
                const uid = 'test-uid';
                const entityType = 'journal_entries';

                const mockMetadataFile = mockBucket._getMockFile(`users/${uid}/metadata/${entityType}.json`);
                mockMetadataFile.exists.mockResolvedValue([false]);

                const validWalFile = {
                    name: `users/${uid}/wal/${entityType}/2026-01-20.jsonl`,
                    download: vi.fn().mockResolvedValue([Buffer.from('{"type":"test"}\n')]),
                    getMetadata: vi.fn().mockResolvedValue([{ size: '100' }]),
                };

                const invalidWalFile = {
                    name: `users/${uid}/wal/${entityType}/invalid-file.txt`,
                    download: vi.fn().mockResolvedValue([Buffer.from('data')]),
                    getMetadata: vi.fn().mockResolvedValue([{ size: '50' }]),
                };

                const allFiles = [validWalFile, invalidWalFile];

                mockBucket.getFiles.mockResolvedValue([allFiles]);

                const recovered = await recoverMetadata(uid, entityType);

                // Only valid WAL file should be included
                expect(recovered!.walFiles).toHaveLength(1);
                expect(recovered!.walFiles[0].path).toBe(validWalFile.name);
            });

            it('should return null if no files found in GCS', async () => {
                const uid = 'new-uid';
                const entityType = 'unknown';

                const mockMetadataFile = mockBucket._getMockFile(`users/${uid}/metadata/${entityType}.json`);
                mockMetadataFile.exists.mockResolvedValue([false]);

                // Return empty arrays for all getFiles calls
                mockBucket.getFiles.mockResolvedValue([[]]);

                const recovered = await recoverMetadata(uid, entityType);

                expect(recovered).toBeNull();
            });

            it('should match index files to their corresponding SSTables', async () => {
                const uid = 'test-uid';
                const entityType = 'journal_entries';

                const mockMetadataFile = mockBucket._getMockFile(`users/${uid}/metadata/${entityType}.json`);
                mockMetadataFile.exists.mockResolvedValue([false]);

                const allFiles = [
                    // WAL files (none)
                    // SSTables
                    {
                        name: `snapshots/${entityType}/20260120T100000-compact.jsonl`,
                        download: vi.fn().mockResolvedValue([Buffer.from('{"id":"1"}\n')]),
                        getMetadata: vi.fn().mockResolvedValue([{ size: '200' }]),
                    },
                    {
                        name: `snapshots/${entityType}/20260121T100000-compact.jsonl`,
                        download: vi.fn().mockResolvedValue([Buffer.from('{"id":"2"}\n')]),
                        getMetadata: vi.fn().mockResolvedValue([{ size: '300' }]),
                    },
                    // Index files
                    {
                        name: `snapshots/${entityType}/20260120T100000-index.json`,
                        download: vi.fn().mockResolvedValue([
                            Buffer.from(JSON.stringify({
                                startKey: 'key-1',
                                endKey: 'key-100',
                                recordCount: 1,
                                compactedAt: '2026-01-20T10:00:00Z',
                            }))
                        ]),
                        getMetadata: vi.fn().mockResolvedValue([{ size: '100' }]),
                    },
                    {
                        name: `snapshots/${entityType}/20260121T100000-index.json`,
                        download: vi.fn().mockResolvedValue([
                            Buffer.from(JSON.stringify({
                                startKey: 'key-101',
                                endKey: 'key-200',
                                recordCount: 1,
                                compactedAt: '2026-01-21T10:00:00Z',
                            }))
                        ]),
                        getMetadata: vi.fn().mockResolvedValue([{ size: '150' }]),
                    },
                ];

                mockBucket.getFiles.mockResolvedValue([allFiles]);

                const recovered = await recoverMetadata(uid, entityType);

                expect(recovered).not.toBeNull();
                expect(recovered!.sstables).toHaveLength(2);
                // Verify correct pairing
                const sstable1 = recovered!.sstables.find(s => s.path.includes('20260120T100000'));
                const sstable2 = recovered!.sstables.find(s => s.path.includes('20260121T100000'));

                expect(sstable1!.indexPath).toBe(`snapshots/${entityType}/20260120T100000-index.json`);
                expect(sstable2!.indexPath).toBe(`snapshots/${entityType}/20260121T100000-index.json`);
                expect(sstable1!.startKey).toBe('key-1');
                expect(sstable2!.startKey).toBe('key-101');
            });
        });
    });
});
