import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set environment before importing gcs-persistence
process.env.NODE_ENV = 'production';
process.env.GOOGLE_APPLICATION_CREDENTIALS = '/fake/path.json';
delete process.env.USE_LOCAL_PERSISTENCE;

const { mockFile, mockBucket, mockStorageInstance } = vi.hoisted(() => {
    const file = {
        save: vi.fn(),
        download: vi.fn(),
        exists: vi.fn(),
        getMetadata: vi.fn(),
        delete: vi.fn(),
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

// Import after mock and env setup
import { persistence } from './gcs-persistence.js';

describe('GCSPersistence', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFile.save.mockResolvedValue(true);
        mockFile.download.mockResolvedValue([Buffer.from('{"test": "data"}')]);
        mockFile.exists.mockResolvedValue([true]);
        mockFile.getMetadata.mockResolvedValue([{ size: '1024' }]);
        mockFile.delete.mockResolvedValue(true);
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
            it('should create new WAL file with spec-compliant path structure', async () => {
                mockFile.exists.mockResolvedValueOnce([false]);

                const result = await persistence.appendAction('test-uid', 'ledger', testAction);

                // Verify path format: users/<uid>/wal/<component>/<YYYY-MM-DD>/actions.jsonl
                const expectedPathPattern = /^users\/test-uid\/wal\/ledger\/\d{4}-\d{2}-\d{2}\/actions\.jsonl$/;
                expect(mockBucket.file).toHaveBeenCalledWith(expect.stringMatching(expectedPathPattern));
                expect(mockFile.save).toHaveBeenCalledWith(
                    expect.stringContaining('"type":"ACCOUNT_CREATE"'),
                    expect.objectContaining({ contentType: 'application/x-ndjson' })
                );
                expect(result.success).toBe(true);
                expect(result.path).toMatch(expectedPathPattern);
            });

            it('should append to existing WAL file with spec-compliant path', async () => {
                const existingContent = '{"type":"EXISTING","timestamp":"2026-01-19T10:00:00Z"}\n';
                mockFile.exists.mockResolvedValueOnce([true]);
                mockFile.download.mockResolvedValueOnce([Buffer.from(existingContent)]);

                const result = await persistence.appendAction('test-uid', 'ledger', testAction);

                const expectedPathPattern = /^users\/test-uid\/wal\/ledger\/\d{4}-\d{2}-\d{2}\/actions\.jsonl$/;
                expect(result.success).toBe(true);
                expect(result.path).toMatch(expectedPathPattern);

                const [savedContent] = mockFile.save.mock.calls[0];
                expect(savedContent).toContain(existingContent);
                expect(savedContent).toContain(JSON.stringify(testAction));
            });

            it('should inject timestamp into action object if not present', async () => {
                mockFile.exists.mockResolvedValueOnce([false]);
                const actionWithoutTimestamp = {
                    type: 'TEST_ACTION',
                    payload: { data: 'test' }
                };

                await persistence.appendAction('test-uid', 'ledger', actionWithoutTimestamp);

                const [savedContent] = mockFile.save.mock.calls[0];
                const savedAction = JSON.parse(savedContent.trim());
                expect(savedAction.timestamp).toBeDefined();
                expect(savedAction.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            });

            it('should preserve existing timestamp in action object', async () => {
                mockFile.exists.mockResolvedValueOnce([false]);
                const existingTimestamp = '2026-01-20T10:00:00Z';

                await persistence.appendAction('test-uid', 'ledger', testAction);

                const [savedContent] = mockFile.save.mock.calls[0];
                const savedAction = JSON.parse(savedContent.trim());
                expect(savedAction.timestamp).toBe(existingTimestamp);
            });

            it('should return error object on failure', async () => {
                mockFile.exists.mockRejectedValueOnce(new Error('Storage unavailable'));

                const result = await persistence.appendAction('test-uid', 'ledger', testAction);

                expect(result.success).toBe(false);
                expect(result.error).toBeDefined();
                expect(result.path).toBeUndefined();
            });
        });

        describe('replayActions', () => {
            it('should replay actions from date-partitioned WAL files and return { state, actionsCount }', async () => {
                const walContent1 = Buffer.from([
                    '{"type":"ACCOUNT_CREATE","payload":{"id":"acc-001"},"timestamp":"2026-01-19T10:00:00Z"}',
                    '{"type":"ACCOUNT_UPDATE","payload":{"id":"acc-001","changes":{"balance":100}},"timestamp":"2026-01-19T11:00:00Z"}',
                ].join('\n'));

                const walContent2 = Buffer.from([
                    '{"type":"ACCOUNT_CREATE","payload":{"id":"acc-002"},"timestamp":"2026-01-20T10:00:00Z"}',
                ].join('\n'));

                const mockWalFile1 = {
                    name: 'users/test-uid/wal/ledger/2026-01-19/actions.jsonl',
                    download: vi.fn().mockResolvedValue([walContent1]),
                };
                const mockWalFile2 = {
                    name: 'users/test-uid/wal/ledger/2026-01-20/actions.jsonl',
                    download: vi.fn().mockResolvedValue([walContent2]),
                };

                // Mock no snapshots, multiple WAL files
                mockBucket.getFiles
                    .mockResolvedValueOnce([[]])  // no snapshots
                    .mockResolvedValueOnce([[mockWalFile1, mockWalFile2]]); // WAL files

                const mockReducer = vi.fn((state, action) => ({
                    ...state,
                    actionCount: (state.actionCount || 0) + 1,
                }));

                const result = await persistence.replayActions('test-uid', 'ledger', mockReducer, {});

                expect(mockReducer).toHaveBeenCalledTimes(3);
                expect(result.state.actionCount).toBe(3);
                expect(result.actionsCount).toBe(3);
                expect(result.error).toBeUndefined();
            });

            it('should load latest snapshot before replaying WAL files', async () => {
                const snapshotData = {
                    state: { accounts: [{ id: 'acc-001' }], version: 10 },
                    version: 10,
                };

                const mockSnapshotFile = {
                    name: 'users/test-uid/snapshots/ledger/2026-01-20T10-00-00-000Z.json',
                    download: vi.fn().mockResolvedValue([Buffer.from(JSON.stringify(snapshotData))]),
                };

                // Mock snapshot exists, no WAL files
                mockBucket.getFiles
                    .mockResolvedValueOnce([[mockSnapshotFile]])  // snapshots
                    .mockResolvedValueOnce([[]]); // no WAL files

                const mockReducer = vi.fn((state) => state);

                const result = await persistence.replayActions('test-uid', 'ledger', mockReducer, {});

                expect(result.state.accounts).toHaveLength(1);
                expect(result.state.version).toBe(10);
                expect(result.actionsCount).toBe(0);
                expect(mockReducer).not.toHaveBeenCalled(); // No WAL to replay
            });

            it('should handle malformed WAL entries gracefully', async () => {
                const walContent = Buffer.from([
                    '{"type":"VALID","timestamp":"2026-01-20T10:00:00Z"}',
                    'this is not valid json',
                    '{"type":"ALSO_VALID","timestamp":"2026-01-20T10:02:00Z"}',
                ].join('\n'));

                const mockWalFile = {
                    name: 'users/test-uid/wal/ledger/2026-01-20/actions.jsonl',
                    download: vi.fn().mockResolvedValue([walContent]),
                };

                mockBucket.getFiles
                    .mockResolvedValueOnce([[]])  // no snapshots
                    .mockResolvedValueOnce([[mockWalFile]]); // WAL files

                const mockReducer = vi.fn((state, action) => ({
                    ...state,
                    count: (state.count || 0) + 1,
                }));

                const result = await persistence.replayActions('test-uid', 'ledger', mockReducer, {});

                // Only 2 valid actions should be processed
                expect(mockReducer).toHaveBeenCalledTimes(2);
                expect(result.state.count).toBe(2);
                expect(result.actionsCount).toBe(2);
            });

            it('should return error object on failure', async () => {
                mockBucket.getFiles.mockRejectedValueOnce(new Error('Storage unavailable'));

                const mockReducer = vi.fn((state) => state);
                const result = await persistence.replayActions('test-uid', 'ledger', mockReducer, {});

                expect(result.error).toBeDefined();
                expect(result.error).toBe('Storage unavailable');
                expect(result.actionsCount).toBe(0);
            });
        });

        describe('compactWal', () => {
            it('should save snapshot with spec-compliant path and delete WAL files', async () => {
                const currentState = { accounts: [{ id: 'acc-001' }], version: 50 };

                const mockWalFile = {
                    name: 'users/test-uid/wal/ledger/2026-01-20/actions.jsonl',
                    delete: vi.fn().mockResolvedValue(true),
                };

                mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile]]);

                const result = await persistence.compactWal('test-uid', 'ledger', currentState);

                // Should save snapshot at spec-compliant path
                expect(mockFile.save).toHaveBeenCalledWith(
                    expect.stringContaining('"version": 50'),
                    expect.objectContaining({ contentType: 'application/json' })
                );

                // Should delete WAL files
                expect(mockWalFile.delete).toHaveBeenCalled();

                // Should return snapshot path and version
                expect(result.snapshotPath).toMatch(/^users\/test-uid\/snapshots\/ledger\//);
                expect(result.snapshotVersion).toBe(50);
            });

            it('should handle case when no WAL files exist', async () => {
                const currentState = { version: 10 };

                mockBucket.getFiles.mockResolvedValueOnce([[]]); // No WAL files

                const result = await persistence.compactWal('test-uid', 'ledger', currentState);

                // Should still save snapshot
                expect(mockFile.save).toHaveBeenCalledWith(
                    expect.stringContaining('"version": 10'),
                    expect.any(Object)
                );

                // Should not attempt deletion
                expect(mockFile.delete).not.toHaveBeenCalled();

                expect(result.snapshotPath).toBeDefined();
                expect(result.snapshotVersion).toBe(10);
            });
        });

        describe('getWalStats', () => {
            it('should return WAL statistics from spec-compliant paths', async () => {
                const walContent1 = Buffer.from([
                    '{"type":"ACTION_1"}',
                    '{"type":"ACTION_2"}',
                ].join('\n'));

                const walContent2 = Buffer.from([
                    '{"type":"ACTION_3"}',
                ].join('\n'));

                const mockWalFile1 = {
                    name: 'users/test-uid/wal/ledger/2026-01-19/actions.jsonl',
                    download: vi.fn().mockResolvedValue([walContent1]),
                    getMetadata: vi.fn().mockResolvedValue([{ size: '256' }]),
                };

                const mockWalFile2 = {
                    name: 'users/test-uid/wal/ledger/2026-01-20/actions.jsonl',
                    download: vi.fn().mockResolvedValue([walContent2]),
                    getMetadata: vi.fn().mockResolvedValue([{ size: '128' }]),
                };

                const mockSnapshotFile = {
                    name: 'users/test-uid/snapshots/ledger/2026-01-20T10-00-00Z.json',
                };

                mockBucket.getFiles
                    .mockResolvedValueOnce([[mockSnapshotFile]])  // snapshots
                    .mockResolvedValueOnce([[mockWalFile1, mockWalFile2]]); // WAL files

                const stats = await persistence.getWalStats('test-uid', 'ledger');

                expect(stats.entryCount).toBe(3);
                expect(stats.sizeBytes).toBe(384); // 256 + 128
                expect(stats.hasSnapshot).toBe(true);
            });

            it('should return zeros when no WAL files exist', async () => {
                mockBucket.getFiles
                    .mockResolvedValueOnce([[]])  // no snapshots
                    .mockResolvedValueOnce([[]]); // no WAL files

                const stats = await persistence.getWalStats('test-uid', 'ledger');

                expect(stats.entryCount).toBe(0);
                expect(stats.sizeBytes).toBe(0);
                expect(stats.hasSnapshot).toBe(false);
            });
        });

        // =========================================================================
        // JSONL WAL Methods (Phase 1.2)
        // =========================================================================

        describe('JSONL WAL Methods', () => {
            describe('getWALPath', () => {
                it('should resolve path with spec-compliant format: users/{uid}/wal/{entityType}/{YYYY-MM-DD}.jsonl', () => {
                    const uid = 'test-uid';
                    const entityType = 'journal_entries';
                    const date = new Date('2026-01-20T12:00:00Z');

                    const path = persistence.getWALPath(uid, entityType, date);

                    expect(path).toBe('users/test-uid/wal/journal_entries/2026-01-20.jsonl');
                });

                it('should use today\'s date when date parameter is omitted', () => {
                    const uid = 'test-uid';
                    const entityType = 'ledger';
                    const today = new Date().toISOString().split('T')[0];

                    const path = persistence.getWALPath(uid, entityType);

                    expect(path).toBe(`users/test-uid/wal/ledger/${today}.jsonl`);
                });

                it('should accept date string in YYYY-MM-DD format', () => {
                    const uid = 'test-uid';
                    const entityType = 'accounts';
                    const dateString = '2026-01-15';

                    const path = persistence.getWALPath(uid, entityType, dateString);

                    expect(path).toBe('users/test-uid/wal/accounts/2026-01-15.jsonl');
                });
            });

            describe('appendJSONL', () => {
                it('should create new WAL file with spec-compliant path using jsonlSerializer', async () => {
                    mockFile.exists.mockResolvedValueOnce([false]);

                    const line = { type: 'CREATE', payload: { id: 'acc-001' }, timestamp: '2026-01-20T10:00:00Z' };
                    const result = await persistence.appendJSONL('test-uid', 'journal_entries', line);

                    // Verify spec-compliant path format
                    const expectedPathPattern = /^users\/test-uid\/wal\/journal_entries\/\d{4}-\d{2}-\d{2}\.jsonl$/;
                    expect(result.success).toBe(true);
                    expect(result.path).toMatch(expectedPathPattern);

                    // Verify jsonlSerializer was used (JSON + newline)
                    const [savedContent] = mockFile.save.mock.calls[0];
                    expect(savedContent).toBe(JSON.stringify(line) + '\n');
                });

                it('should append to existing WAL file using compose() or read-modify-write', async () => {
                    const existingLine = { type: 'EXISTING', timestamp: '2026-01-19T10:00:00Z' };
                    const newLine = { type: 'NEW', timestamp: '2026-01-20T10:00:00Z' };
                    const existingContent = JSON.stringify(existingLine) + '\n';

                    mockFile.exists.mockResolvedValueOnce([true]);
                    mockFile.download.mockResolvedValueOnce([Buffer.from(existingContent)]);

                    const result = await persistence.appendJSONL('test-uid', 'journal_entries', newLine);

                    expect(result.success).toBe(true);

                    // Verify both lines are in the saved content
                    const [savedContent] = mockFile.save.mock.calls[0];
                    expect(savedContent).toContain(JSON.stringify(existingLine) + '\n');
                    expect(savedContent).toContain(JSON.stringify(newLine) + '\n');
                });

                it('should use jsonlSerializer for serialization', async () => {
                    mockFile.exists.mockResolvedValueOnce([false]);

                    const line = { type: 'TEST', data: { nested: 'value' } };
                    await persistence.appendJSONL('test-uid', 'ledger', line);

                    const [savedContent] = mockFile.save.mock.calls[0];
                    // Verify newline termination (jsonlSerializer behavior)
                    expect(savedContent.endsWith('\n')).toBe(true);

                    // Verify line can be parsed back
                    const parsed = JSON.parse(savedContent.trim());
                    expect(parsed).toEqual(line);
                });

                it('should return error object on failure', async () => {
                    mockFile.exists.mockRejectedValueOnce(new Error('Storage unavailable'));

                    const result = await persistence.appendJSONL('test-uid', 'ledger', { type: 'FAIL' });

                    expect(result.success).toBe(false);
                    expect(result.error).toBeDefined();
                    expect(result.path).toBeUndefined();
                });
            });

            describe('flushWAL', () => {
                it('should ensure persistence for entity type WAL files', async () => {
                    const mockWalFiles = [
                        {
                            name: 'users/test-uid/wal/journal_entries/2026-01-20.jsonl',
                            getMetadata: vi.fn().mockResolvedValue([{ size: '512' }]),
                        },
                        {
                            name: 'users/test-uid/wal/journal_entries/2026-01-19.jsonl',
                            getMetadata: vi.fn().mockResolvedValue([{ size: '256' }]),
                        },
                    ];

                    mockBucket.getFiles.mockResolvedValueOnce([mockWalFiles]);

                    const result = await persistence.flushWAL('test-uid', 'journal_entries');

                    expect(result.success).toBe(true);
                    expect(result.filesFlushed).toBe(2);
                    expect(result.totalBytes).toBe(768);
                });

                it('should handle empty WAL (no files to flush)', async () => {
                    mockBucket.getFiles.mockResolvedValueOnce([[]]);

                    const result = await persistence.flushWAL('test-uid', 'nonexistent');

                    expect(result.success).toBe(true);
                    expect(result.filesFlushed).toBe(0);
                    expect(result.totalBytes).toBe(0);
                });

                it('should return error object on failure', async () => {
                    mockBucket.getFiles.mockRejectedValueOnce(new Error('Storage unavailable'));

                    const result = await persistence.flushWAL('test-uid', 'ledger');

                    expect(result.success).toBe(false);
                    expect(result.error).toBeDefined();
                });

                it('should verify file integrity by reading and validating JSONL lines', async () => {
                    const validContent = Buffer.from([
                        '{"type":"ACTION_1"}',
                        '{"type":"ACTION_2"}',
                    ].join('\n'));

                    const mockWalFile = {
                        name: 'users/test-uid/wal/ledger/2026-01-20.jsonl',
                        download: vi.fn().mockResolvedValue([validContent]),
                        getMetadata: vi.fn().mockResolvedValue([{ size: validContent.length }]),
                    };

                    mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile]]);

                    const result = await persistence.flushWAL('test-uid', 'ledger');

                    expect(result.success).toBe(true);
                    expect(result.validLines).toBe(2);
                });

                it('should report invalid lines during integrity check', async () => {
                    const mixedContent = Buffer.from([
                        '{"type":"VALID"}',
                        'this is not valid json',
                        '{"type":"ALSO_VALID"}',
                    ].join('\n'));

                    const mockWalFile = {
                        name: 'users/test-uid/wal/ledger/2026-01-20.jsonl',
                        download: vi.fn().mockResolvedValue([mixedContent]),
                        getMetadata: vi.fn().mockResolvedValue([{ size: mixedContent.length }]),
                    };

                    mockBucket.getFiles.mockResolvedValueOnce([[mockWalFile]]);

                    const result = await persistence.flushWAL('test-uid', 'ledger');

                    expect(result.success).toBe(true);
                    expect(result.validLines).toBe(2);
                    expect(result.invalidLines).toBe(1);
                });
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
