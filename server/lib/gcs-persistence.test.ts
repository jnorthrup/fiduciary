import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFile, mockBucket, mockStorageInstance } = vi.hoisted(() => {
    const file = {
        save: vi.fn(),
        download: vi.fn(),
        exists: vi.fn(),
        getMetadata: vi.fn(),
    };
    const bucket = {
        file: vi.fn(() => file),
        exists: vi.fn(),
        getFiles: vi.fn(),
    };
    const storageInstance = {
        bucket: vi.fn(() => bucket),
        createBucket: vi.fn(),
    };
    return { mockFile: file, mockBucket: bucket, mockStorageInstance: storageInstance };
});

vi.mock('@google-cloud/storage', () => {
    return {
        Storage: class {
            constructor() {
                return mockStorageInstance;
            }
        }
    };
});

// Import after mock
import { persistence } from './gcs-persistence.js';

describe('GCSPersistence', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFile.save.mockResolvedValue(true);
        mockFile.download.mockResolvedValue([Buffer.from('{"test": "data"}')]);
        mockFile.exists.mockResolvedValue([true]);
        mockFile.getMetadata.mockResolvedValue([{ size: '1024' }]);
        mockBucket.exists.mockResolvedValue([true]);
        mockBucket.getFiles.mockResolvedValue([[{ name: 'uid/ledger.json' }]]);
        mockStorageInstance.createBucket.mockResolvedValue([mockBucket]);
    });

    it('should save data correctly', async () => {
        const uid = 'test-uid';
        const component = 'ledger';
        const data = { balance: 100 };

        await persistence.saveData(uid, component, data);

        expect(mockBucket.file).toHaveBeenCalledWith('test-uid/ledger.json');
        expect(mockFile.save).toHaveBeenCalled();
        const [savedContent] = mockFile.save.mock.calls[0];
        expect(JSON.parse(savedContent)).toEqual(data);
    });

    it('should load data correctly', async () => {
        const uid = 'test-uid';
        const component = 'ledger';

        const result = await persistence.loadData(uid, component);

        expect(mockBucket.file).toHaveBeenCalledWith('test-uid/ledger.json');
        expect(result).toEqual({ test: "data" });
    });

    it('should return null if file does not exist', async () => {
        mockFile.exists.mockResolvedValueOnce([false]);

        const result = await persistence.loadData('missing-uid', 'missing-comp');
        expect(result).toBeNull();
    });

    it('should ensure bucket exists', async () => {
        mockBucket.exists.mockResolvedValueOnce([false]);

        await persistence.ensureBucket();

        expect(mockStorageInstance.createBucket).toHaveBeenCalledWith(
            persistence.bucketName,
            expect.any(Object)
        );
    });

    // =========================================================================
    // WAL Tests
    // =========================================================================

    describe('WAL Operations', () => {
        const testAction = {
            type: 'ACCOUNT_CREATE',
            payload: { id: 'acc-001', name: 'Cash' },
            timestamp: '2026-01-20T10:00:00Z',
        };

        describe('appendAction', () => {
            it('should create new WAL file if none exists', async () => {
                mockFile.exists.mockResolvedValueOnce([false]);

                await persistence.appendAction('test-uid', 'ledger', testAction);

                expect(mockBucket.file).toHaveBeenCalledWith('test-uid/ledger/wal.jsonl');
                expect(mockFile.save).toHaveBeenCalledWith(
                    JSON.stringify(testAction) + '\n',
                    expect.objectContaining({ contentType: 'application/x-ndjson' })
                );
            });

            it('should append to existing WAL file', async () => {
                const existingContent = '{"type":"EXISTING","timestamp":"2026-01-19T10:00:00Z"}\n';
                mockFile.exists.mockResolvedValueOnce([true]);
                mockFile.download.mockResolvedValueOnce([Buffer.from(existingContent)]);

                await persistence.appendAction('test-uid', 'ledger', testAction);

                const [savedContent] = mockFile.save.mock.calls[0];
                expect(savedContent).toContain(existingContent);
                expect(savedContent).toContain(JSON.stringify(testAction));
            });
        });

        describe('replayActions', () => {
            it('should replay actions from WAL', async () => {
                const walContent = [
                    '{"type":"ACCOUNT_CREATE","payload":{"id":"acc-001"},"timestamp":"2026-01-20T10:00:00Z"}',
                    '{"type":"ACCOUNT_UPDATE","payload":{"id":"acc-001","changes":{"balance":100}},"timestamp":"2026-01-20T10:01:00Z"}',
                ].join('\n');

                // Mock snapshot doesn't exist
                mockFile.exists
                    .mockResolvedValueOnce([false])  // snapshot
                    .mockResolvedValueOnce([true]);  // WAL
                mockFile.download.mockResolvedValueOnce([Buffer.from(walContent)]);

                const mockReducer = vi.fn((state, action) => ({
                    ...state,
                    actionCount: (state.actionCount || 0) + 1,
                }));

                const result = await persistence.replayActions('test-uid', 'ledger', mockReducer, {});

                expect(mockReducer).toHaveBeenCalledTimes(2);
                expect(result.actionCount).toBe(2);
            });

            it('should load snapshot before replaying WAL', async () => {
                const snapshotData = {
                    state: { accounts: [{ id: 'acc-001' }], version: 10 },
                    version: 10,
                };

                // Mock snapshot exists
                mockFile.exists
                    .mockResolvedValueOnce([true])   // snapshot
                    .mockResolvedValueOnce([false]); // WAL
                mockFile.download.mockResolvedValueOnce([Buffer.from(JSON.stringify(snapshotData))]);

                const mockReducer = vi.fn((state) => state);

                const result = await persistence.replayActions('test-uid', 'ledger', mockReducer, {});

                expect(result.accounts).toHaveLength(1);
                expect(result.version).toBe(10);
                expect(mockReducer).not.toHaveBeenCalled(); // No WAL to replay
            });

            it('should handle malformed WAL entries gracefully', async () => {
                const walContent = [
                    '{"type":"VALID","timestamp":"2026-01-20T10:00:00Z"}',
                    'this is not valid json',
                    '{"type":"ALSO_VALID","timestamp":"2026-01-20T10:02:00Z"}',
                ].join('\n');

                mockFile.exists
                    .mockResolvedValueOnce([false])  // snapshot
                    .mockResolvedValueOnce([true]);  // WAL
                mockFile.download.mockResolvedValueOnce([Buffer.from(walContent)]);

                const mockReducer = vi.fn((state, action) => ({
                    ...state,
                    count: (state.count || 0) + 1,
                }));

                const result = await persistence.replayActions('test-uid', 'ledger', mockReducer, {});

                // Only 2 valid actions should be processed
                expect(mockReducer).toHaveBeenCalledTimes(2);
                expect(result.count).toBe(2);
            });
        });

        describe('compactWal', () => {
            it('should save snapshot and archive WAL', async () => {
                const currentState = { accounts: [{ id: 'acc-001' }], version: 50 };
                const walContent = 'existing wal content';

                mockFile.exists.mockResolvedValueOnce([true]); // WAL exists
                mockFile.download.mockResolvedValueOnce([Buffer.from(walContent)]);

                const result = await persistence.compactWal('test-uid', 'ledger', currentState);

                // Should save snapshot
                expect(mockFile.save).toHaveBeenCalledWith(
                    expect.stringContaining('"version": 50'),
                    expect.objectContaining({ contentType: 'application/json' })
                );

                // Should archive WAL
                expect(mockFile.save).toHaveBeenCalledWith(
                    Buffer.from(walContent),
                    expect.objectContaining({ contentType: 'application/x-ndjson' })
                );

                // Should clear active WAL
                expect(mockFile.save).toHaveBeenCalledWith(
                    '',
                    expect.objectContaining({ contentType: 'application/x-ndjson' })
                );

                expect(result.archived).toBe(true);
                expect(result.snapshotVersion).toBe(50);
            });

            it('should handle case when no WAL exists', async () => {
                const currentState = { version: 10 };

                mockFile.exists.mockResolvedValueOnce([false]); // WAL doesn't exist

                const result = await persistence.compactWal('test-uid', 'ledger', currentState);

                // Should still save snapshot
                expect(mockFile.save).toHaveBeenCalledWith(
                    expect.stringContaining('"version": 10'),
                    expect.any(Object)
                );

                expect(result.archived).toBe(false);
            });
        });

        describe('getWalStats', () => {
            it('should return WAL statistics', async () => {
                const walContent = [
                    '{"type":"ACTION_1"}',
                    '{"type":"ACTION_2"}',
                    '{"type":"ACTION_3"}',
                ].join('\n');

                mockFile.exists
                    .mockResolvedValueOnce([true])  // WAL
                    .mockResolvedValueOnce([true]); // snapshot
                mockFile.getMetadata.mockResolvedValueOnce([{ size: '512' }]);
                mockFile.download.mockResolvedValueOnce([Buffer.from(walContent)]);

                const stats = await persistence.getWalStats('test-uid', 'ledger');

                expect(stats.entryCount).toBe(3);
                expect(stats.sizeBytes).toBe(512);
                expect(stats.hasSnapshot).toBe(true);
            });

            it('should return zeros when no WAL exists', async () => {
                mockFile.exists
                    .mockResolvedValueOnce([false])  // WAL
                    .mockResolvedValueOnce([false]); // snapshot

                const stats = await persistence.getWalStats('test-uid', 'ledger');

                expect(stats.entryCount).toBe(0);
                expect(stats.sizeBytes).toBe(0);
                expect(stats.hasSnapshot).toBe(false);
            });
        });
    });

    // =========================================================================
    // NACHA Submission Tests
    // =========================================================================

    describe('NACHA Submissions', () => {
        describe('saveNachaSubmission', () => {
            it('should save NACHA submission with traceability metadata', async () => {
                const submission = {
                    fileContent: Buffer.from('101 021000021...').toString('base64'),
                    filename: 'ACH_TEST_20260120.ach',
                    batchCount: 1,
                    entryCount: 5,
                    totalDebit: 500000,
                    totalCredit: 500000,
                    hash: '12345678',
                };

                const result = await persistence.saveNachaSubmission('test-uid', submission);

                expect(result.submissionId).toMatch(/^nacha-\d+-[a-f0-9]{16}$/);
                expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
                expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

                expect(mockBucket.file).toHaveBeenCalledWith(
                    expect.stringMatching(/^test-uid\/nacha\/submissions\/nacha-/)
                );
                expect(mockFile.save).toHaveBeenCalledWith(
                    expect.any(Buffer),
                    expect.objectContaining({
                        contentType: 'text/plain',
                        metadata: expect.objectContaining({
                            submissionId: expect.any(String),
                            uid: 'test-uid',
                            filename: 'ACH_TEST_20260120.ach',
                            batchCount: 1,
                            entryCount: 5,
                            totalDebit: 500000,
                            totalCredit: 500000,
                            hash: '12345678',
                        }),
                    })
                );
            });

            it('should calculate SHA-256 checksum of file content', async () => {
                const content = '101 021000021 021000021 260120A094101FEDERAL RESERVE';
                const submission = {
                    fileContent: Buffer.from(content).toString('base64'),
                    filename: 'test.ach',
                    batchCount: 1,
                    entryCount: 1,
                    totalDebit: 100,
                    totalCredit: 100,
                    hash: '87654321',
                };

                const result = await persistence.saveNachaSubmission('test-uid', submission);

                // Verify checksum is SHA-256 format (64 hex chars)
                expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
                // Verify checksum is deterministic
                const result2 = await persistence.saveNachaSubmission('test-uid', submission);
                expect(result.checksum).toBe(result2.checksum);
            });
        });

        describe('listNachaSubmissions', () => {
            it('should list NACHA submissions for a user', async () => {
                const mockFile1 = {
                    getMetadata: vi.fn().mockResolvedValue([
                        {
                            name: 'test-uid/nacha/submissions/nacha-1-abc.ach',
                            metadata: {
                                filename: 'ACH_TEST.ach',
                                timestamp: '2026-01-20T10:00:00Z',
                                checksum: 'abc123',
                                batchCount: 2,
                                entryCount: 10,
                                totalDebit: 100000,
                                totalCredit: 100000,
                            },
                        },
                    ]),
                };
                const mockFile2 = {
                    getMetadata: vi.fn().mockResolvedValue([
                        {
                            name: 'test-uid/nacha/submissions/nacha-2-def.ach',
                            metadata: {
                                filename: 'ACH_PAYROLL.ach',
                                timestamp: '2026-01-19T10:00:00Z',
                                checksum: 'def456',
                                batchCount: 1,
                                entryCount: 5,
                                totalDebit: 50000,
                                totalCredit: 50000,
                            },
                        },
                    ]),
                };

                const mockFiles = [
                    { ...mockFile1, name: 'test-uid/nacha/submissions/nacha-1-abc.ach', timeCreated: '2026-01-20T10:00:00Z' },
                    { ...mockFile2, name: 'test-uid/nacha/submissions/nacha-2-def.ach', timeCreated: '2026-01-19T10:00:00Z' },
                ];

                mockBucket.getFiles.mockResolvedValueOnce([mockFiles]);

                const submissions = await persistence.listNachaSubmissions('test-uid');

                expect(submissions).toHaveLength(2);
                expect(submissions[0].submissionId).toBe('nacha-1-abc'); // 2026-01-20 (later)
                expect(submissions[1].submissionId).toBe('nacha-2-def'); // 2026-01-19 (earlier)
                // Should be sorted by timestamp descending (later first)
                expect(new Date(submissions[0].timestamp).getTime()).toBeGreaterThan(
                    new Date(submissions[1].timestamp).getTime()
                );
            });

            it('should handle empty submission list', async () => {
                mockBucket.getFiles.mockResolvedValueOnce([[]]);

                const submissions = await persistence.listNachaSubmissions('empty-uid');

                expect(submissions).toEqual([]);
            });
        });

        describe('getNachaSubmission', () => {
            it('should get a specific NACHA submission', async () => {
                const content = '101 021000021...';
                mockFile.exists.mockResolvedValueOnce([true]);
                mockFile.download.mockResolvedValueOnce([Buffer.from(content)]);
                mockFile.getMetadata.mockResolvedValueOnce([
                    {
                        name: 'test-uid/nacha/submissions/nacha-1-abc.ach',
                        metadata: {
                            filename: 'TEST.ach',
                            timestamp: '2026-01-20T10:00:00Z',
                            checksum: 'abc123',
                            batchCount: 1,
                            entryCount: 5,
                            totalDebit: 50000,
                            totalCredit: 50000,
                        },
                    },
                ]);

                const result = await persistence.getNachaSubmission('test-uid', 'nacha-1-abc');

                expect(result).not.toBeNull();
                expect(result.content).toBe(Buffer.from(content).toString('base64'));
                expect(result.metadata.filename).toBe('TEST.ach');
                expect(result.metadata.checksum).toBe('abc123');
            });

            it('should return null for non-existent submission', async () => {
                mockFile.exists.mockResolvedValueOnce([false]);

                const result = await persistence.getNachaSubmission('test-uid', 'nacha-missing');

                expect(result).toBeNull();
            });
        });
    });
});

