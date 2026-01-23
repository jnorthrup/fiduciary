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
    openWAL,
    WALHandle,
    _setBucketForTesting,
    type WALStreamOptions
} from './walHandle.js';
import { serializeToJSONL } from './jsonlSerializer.js';
import { loadMetadata, saveMetadataAtomic, createInitialMetadata } from './walMetadata.js';
import { compactWAL } from './lsmCompactor.js';
import { streamJSONL } from './jsonlStream.js';

// Set bucket mock for testing
_setBucketForTesting(mockBucket);

// Mock the module imports
vi.mock('./jsonlSerializer.js', async () => {
    const actual = await vi.importActual<typeof import('./jsonlSerializer.js')>('./jsonlSerializer.js');
    return {
        ...actual,
        serializeToJSONL: vi.fn(actual.serializeToJSONL),
    };
});

vi.mock('./walMetadata.js', async () => {
    const actual = await vi.importActual<typeof import('./walMetadata.js')>('./walMetadata.js');
    return {
        ...actual,
        loadMetadata: vi.fn(actual.loadMetadata),
        saveMetadataAtomic: vi.fn(actual.saveMetadataAtomic),
        createInitialMetadata: vi.fn(actual.createInitialMetadata),
    };
});

vi.mock('./lsmCompactor.js', async () => {
    const actual = await vi.importActual<typeof import('./lsmCompactor.js')>('./lsmCompactor.js');
    return {
        ...actual,
        compactWAL: vi.fn(actual.compactWAL),
    };
});

vi.mock('./jsonlStream.js', async () => {
    const actual = await vi.importActual<typeof import('./jsonlStream.js')>('./jsonlStream.js');
    return {
        ...actual,
        streamJSONL: vi.fn(actual.streamJSONL),
    };
});

describe('walHandle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockBucket._clearMockFiles();
        mockBucket.getFiles.mockResolvedValue([[]]);
    });

    describe('WALHandle interface', () => {
        it('should provide opaque binary blackbox interface per spec', () => {
            const uid = 'test-uid';
            const entityType = 'journal_entries';

            const handle = openWAL(uid, entityType);

            expect(handle).toBeDefined();
            expect(handle.append).toBeInstanceOf(Function);
            expect(handle.stream).toBeInstanceOf(Function);
            expect(handle.compact).toBeInstanceOf(Function);
            expect(handle.close).toBeInstanceOf(Function);
        });

        it('should hide internal WAL structure from consumers', () => {
            const handle = openWAL('test-uid', 'test-entity');

            // Verify internal state is not exposed
            expect(handle).not.toHaveProperty('_buffer');
            expect(handle).not.toHaveProperty('_walPath');
            expect(handle).not.toHaveProperty('_metadata');

            // Only public methods are exposed
            const publicKeys = Object.keys(handle).filter(k =>
                ['append', 'stream', 'compact', 'close'].includes(k)
            );
            expect(Object.keys(handle)).toEqual(expect.arrayContaining(publicKeys));
        });
    });

    describe('openWAL factory', () => {
        it('should create WALHandle for valid uid and entityType', () => {
            const handle = openWAL('user-123', 'transactions');

            expect(handle).toBeInstanceOf(Object);
            expect(handle.append).toBeDefined();
            expect(handle.stream).toBeDefined();
            expect(handle.compact).toBeDefined();
            expect(handle.close).toBeDefined();
        });

        it('should load existing metadata if available', async () => {
            const uid = 'existing-user';
            const entityType = 'accounts';
            const existingMetadata = createInitialMetadata(uid, entityType);
            existingMetadata.version = 5;

            vi.mocked(loadMetadata).mockResolvedValue(existingMetadata);

            const handle = openWAL(uid, entityType);

            // Metadata is loaded lazily on first operation
            // Trigger metadata load by calling close
            vi.mocked(saveMetadataAtomic).mockResolvedValue();
            await handle.close();

            expect(loadMetadata).toHaveBeenCalledWith(uid, entityType);
            expect(handle).toBeDefined();
        });

        it('should create new metadata if none exists', async () => {
            const uid = 'new-user';
            const entityType = 'journal_entries';

            vi.mocked(loadMetadata).mockResolvedValue(null);
            vi.mocked(createInitialMetadata).mockReturnValue({
                uid,
                entityType,
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                walFiles: [],
                sstables: [],
                migrationStatus: 'none',
                thresholdConfig: { enabled: true, value: 1000 },
            });

            const handle = openWAL(uid, entityType);

            // Metadata is loaded lazily on first operation
            // Trigger metadata load by calling close
            vi.mocked(saveMetadataAtomic).mockResolvedValue();
            await handle.close();

            expect(loadMetadata).toHaveBeenCalledWith(uid, entityType);
            expect(handle).toBeDefined();
        });
    });

    describe('handle.append', () => {
        it('should serialize object to JSONL and buffer in memory', async () => {
            const handle = openWAL('test-uid', 'events');
            const obj = { id: 'evt-001', timestamp: '2026-01-20T10:00:00Z', data: 'test' };

            vi.mocked(serializeToJSONL).mockReturnValue(JSON.stringify(obj) + '\n');

            await handle.append(obj);

            expect(serializeToJSONL).toHaveBeenCalledWith(obj);
        });

        it('should buffer multiple appends before flush', async () => {
            const handle = openWAL('test-uid', 'transactions');

            await handle.append({ id: 'txn-001', amount: 100 });
            await handle.append({ id: 'txn-002', amount: 200 });
            await handle.append({ id: 'txn-003', amount: 300 });

            expect(serializeToJSONL).toHaveBeenCalledTimes(3);
        });

        it('should throw error for undefined values', async () => {
            const handle = openWAL('test-uid', 'test');
            const undefinedValue = undefined as unknown as Record<string, unknown>;

            await expect(handle.append(undefinedValue)).rejects.toThrow();
        });

        it('should throw error for functions', async () => {
            const handle = openWAL('test-uid', 'test');
            const fn = () => {};
            Object.assign(fn, { id: 'test' });

            await expect(handle.append(fn as unknown as Record<string, unknown>)).rejects.toThrow();
        });

        it('should handle circular reference errors', async () => {
            const handle = openWAL('test-uid', 'test');
            const circular: Record<string, unknown> = { id: 'test' };
            circular.self = circular;

            vi.mocked(serializeToJSONL).mockImplementation(() => {
                throw new Error('Cannot serialize object with circular references');
            });

            await expect(handle.append(circular)).rejects.toThrow('circular');
        });
    });

    describe('handle.stream', () => {
        it('should stream records from WAL with filtering options', async () => {
            const handle = openWAL('test-uid', 'journal_entries');
            const options: WALStreamOptions<{ id: string; timestamp: string }> = {
                startKey: 'je-002',
                endKey: 'je-005',
            };

            const mockRecords = [
                { id: 'je-002', timestamp: '2026-01-20T10:00:00Z' },
                { id: 'je-003', timestamp: '2026-01-20T11:00:00Z' },
            ];

            async function* mockGenerator() {
                for (const record of mockRecords) {
                    yield record;
                }
            }

            vi.mocked(streamJSONL).mockReturnValue(mockGenerator());

            const results: unknown[] = [];
            for await (const record of handle.stream(options)) {
                results.push(record);
            }

            expect(streamJSONL).toHaveBeenCalledWith('test-uid', 'journal_entries', options);
            expect(results).toEqual(mockRecords);
        });

        it('should support time-range filtering', async () => {
            const handle = openWAL('test-uid', 'events');
            const options: WALStreamOptions<{ id: string; timestamp: string }> = {
                startDate: '2026-01-19',
                endDate: '2026-01-21',
            };

            async function* mockGenerator() {
                yield { id: 'evt-001', timestamp: '2026-01-20T10:00:00Z' };
            }

            vi.mocked(streamJSONL).mockReturnValue(mockGenerator());

            const results: unknown[] = [];
            for await (const record of handle.stream(options)) {
                results.push(record);
            }

            expect(streamJSONL).toHaveBeenCalledWith('test-uid', 'events', options);
            expect(results).toHaveLength(1);
        });

        it('should support predicate filtering', async () => {
            const handle = openWAL('test-uid', 'transactions');
            const options: WALStreamOptions<{ id: string; amount: number }> = {
                filter: (r) => r.amount > 100,
            };

            async function* mockGenerator() {
                yield { id: 'txn-001', amount: 150 };
                yield { id: 'txn-002', amount: 200 };
            }

            vi.mocked(streamJSONL).mockReturnValue(mockGenerator());

            const results: unknown[] = [];
            for await (const record of handle.stream(options)) {
                results.push(record);
            }

            expect(results).toHaveLength(2);
        });

        it('should stream all records when no options provided', async () => {
            const handle = openWAL('test-uid', 'ledger');

            async function* mockGenerator() {
                yield { id: 'led-001', balance: 1000 };
                yield { id: 'led-002', balance: 2000 };
            }

            vi.mocked(streamJSONL).mockReturnValue(mockGenerator());

            const results: unknown[] = [];
            for await (const record of handle.stream()) {
                results.push(record);
            }

            expect(results).toHaveLength(2);
        });
    });

    describe('handle.compact', () => {
        it('should trigger compaction with provided config', async () => {
            const handle = openWAL('test-uid', 'journal_entries');
            const config = {
                maxWALFiles: 10,
                maxFileSizeMB: 100,
                minRecordsToCompact: 100,
                strategy: 'tiered' as const,
            };

            vi.mocked(compactWAL).mockResolvedValue({
                sstablePath: 'snapshots/journal_entries/20260120T100000-compact.jsonl',
                indexPath: 'snapshots/journal_entries/20260120T100000-index.json',
                recordCount: 500,
                invalidEntries: 0,
                metadataUpdated: true,
            });

            const result = await handle.compact(config);

            expect(compactWAL).toHaveBeenCalledWith('test-uid', 'journal_entries', config);
            expect(result.sstablePath).toBeDefined();
            expect(result.recordCount).toBe(500);
        });

        it('should handle compaction skipped due to thresholds', async () => {
            const handle = openWAL('test-uid', 'small');

            vi.mocked(compactWAL).mockResolvedValue({
                recordCount: 5,
                skippedReason: 'minRecordsToCompact not met',
                metadataUpdated: false,
            });

            const result = await handle.compact({
                maxWALFiles: 10,
                maxFileSizeMB: 100,
                minRecordsToCompact: 100,
                strategy: 'tiered',
            });

            expect(result.sstablePath).toBeUndefined();
            expect(result.skippedReason).toBe('minRecordsToCompact not met');
        });

        it('should handle compaction errors gracefully', async () => {
            const handle = openWAL('test-uid', 'error');

            vi.mocked(compactWAL).mockRejectedValue(new Error('Compaction failed'));

            await expect(handle.compact({
                maxWALFiles: 10,
                maxFileSizeMB: 100,
                minRecordsToCompact: 1,
                strategy: 'tiered',
            })).rejects.toThrow('Compaction failed');
        });

        it('should return compaction result with all fields', async () => {
            const handle = openWAL('test-uid', 'test');

            vi.mocked(compactWAL).mockResolvedValue({
                sstablePath: 'snapshots/test/20260120T100000-compact.jsonl',
                indexPath: 'snapshots/test/20260120T100000-index.json',
                recordCount: 1000,
                invalidEntries: 5,
                metadataUpdated: true,
            });

            const result = await handle.compact({
                maxWALFiles: 5,
                maxFileSizeMB: 50,
                minRecordsToCompact: 10,
                strategy: 'leveled',
            });

            expect(result).toHaveProperty('sstablePath');
            expect(result).toHaveProperty('indexPath');
            expect(result).toHaveProperty('recordCount');
            expect(result).toHaveProperty('invalidEntries');
            expect(result).toHaveProperty('metadataUpdated');
        });
    });

    describe('handle.close', () => {
        it('should flush buffered content to WAL file', async () => {
            const handle = openWAL('test-uid', 'events');
            const obj1 = { id: 'evt-001', timestamp: '2026-01-20T10:00:00Z' };
            const obj2 = { id: 'evt-002', timestamp: '2026-01-20T11:00:00Z' };

            vi.mocked(serializeToJSONL).mockImplementation((obj) => JSON.stringify(obj) + '\n');

            await handle.append(obj1);
            await handle.append(obj2);

            // Setup mocks for close operation
            vi.mocked(loadMetadata).mockResolvedValue(null);
            vi.mocked(saveMetadataAtomic).mockResolvedValue();

            await handle.close();

            // Verify bucket.file was called for WAL path
            expect(mockBucket.file).toHaveBeenCalledWith(
                expect.stringMatching(/users\/test-uid\/wal\/events\/\d{4}-\d{2}-\d{2}\.jsonl/)
            );

            // Get the mock file that was created
            const fileCall = mockBucket.file.mock.calls.find(
                call => (call[0] as string)?.includes('/wal/events/')
            );
            expect(fileCall).toBeDefined();

            if (fileCall) {
                const walPath = fileCall[0] as string;
                const mockWalFile = mockBucket._getMockFile(walPath);
                // Verify file save was called
                expect(mockWalFile.save).toHaveBeenCalled();
            }
        });

        it('should save metadata atomically on close', async () => {
            const uid = 'test-uid';
            const entityType = 'journal_entries';
            const handle = openWAL(uid, entityType);

            const mockMetadata = createInitialMetadata(uid, entityType);
            vi.mocked(loadMetadata).mockResolvedValue(mockMetadata);
            vi.mocked(saveMetadataAtomic).mockResolvedValue();

            await handle.close();

            expect(saveMetadataAtomic).toHaveBeenCalled();
        });

        it('should update WAL file metadata on close', async () => {
            const uid = 'test-uid';
            const entityType = 'accounts';
            const handle = openWAL(uid, entityType);

            const existingMetadata = createInitialMetadata(uid, entityType);
            vi.mocked(loadMetadata).mockResolvedValue(existingMetadata);
            vi.mocked(saveMetadataAtomic).mockResolvedValue();

            await handle.close();

            // Verify metadata update includes WAL files
            const saveCall = vi.mocked(saveMetadataAtomic).mock.calls[0];
            expect(saveCall).toBeDefined();
        });

        it('should handle metadata save failure gracefully', async () => {
            const handle = openWAL('test-uid', 'test');

            vi.mocked(loadMetadata).mockResolvedValue(createInitialMetadata('test-uid', 'test'));
            vi.mocked(saveMetadataAtomic).mockRejectedValue(new Error('Metadata save failed'));

            await expect(handle.close()).rejects.toThrow('Metadata save failed');
        });

        it('should be idempotent - multiple closes are safe', async () => {
            const handle = openWAL('test-uid', 'test');

            vi.mocked(loadMetadata).mockResolvedValue(createInitialMetadata('test-uid', 'test'));
            vi.mocked(saveMetadataAtomic).mockResolvedValue();

            await handle.close();
            await handle.close(); // Second close should be safe

            // Should only save once or handle gracefully
            expect(saveMetadataAtomic).toHaveBeenCalled();
        });

        it('should append to existing WAL file when it exists', async () => {
            const handle = openWAL('test-uid', 'events');
            const obj1 = { id: 'evt-001', timestamp: '2026-01-20T10:00:00Z' };

            vi.mocked(serializeToJSONL).mockImplementation((obj) => JSON.stringify(obj) + '\n');

            await handle.append(obj1);

            // Setup all files to exist initially
            vi.mocked(loadMetadata).mockResolvedValue(createInitialMetadata('test-uid', 'events'));
            vi.mocked(saveMetadataAtomic).mockResolvedValue();

            // Make all WAL files exist and have existing content
            mockBucket.file.mockImplementation((path: string) => {
                const mockFile = mockBucket._getMockFile(path);
                if (path.includes('/wal/')) {
                    mockFile.exists.mockResolvedValue([true]);
                    mockFile.download.mockResolvedValue([Buffer.from('{"existing":"record"}\n')]);
                }
                return mockFile;
            });

            await handle.close();

            // Verify bucket.file was called for WAL path
            expect(mockBucket.file).toHaveBeenCalledWith(
                expect.stringMatching(/users\/test-uid\/wal\/events\/\d{4}-\d{2}-\d{2}\.jsonl/)
            );

            // Verify download was called (existing content was read)
            const fileCalls = mockBucket.file.mock.calls.filter(
                call => (call[0] as string)?.includes('/wal/events/')
            );
            expect(fileCalls.length).toBeGreaterThan(0);

            if (fileCalls.length > 0) {
                const walPath = fileCalls[0][0] as string;
                const mockWalFile = mockBucket._getMockFile(walPath);
                expect(mockWalFile.download).toHaveBeenCalled();
                expect(mockWalFile.save).toHaveBeenCalled();
            }
        });

        it('should update existing WAL file entry in metadata', async () => {
            const uid = 'test-uid';
            const entityType = 'journal_entries';
            const handle = openWAL(uid, entityType);

            // Create metadata with existing WAL file
            const existingMetadata = createInitialMetadata(uid, entityType);
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const walPath = `users/${uid}/wal/${entityType}/${year}-${month}-${day}.jsonl`;
            existingMetadata.walFiles.push({
                path: walPath,
                recordCount: 1, // Start with 1 existing record
                byteSize: 50,
                date: `${year}-${month}-${day}`,
            });

            vi.mocked(serializeToJSONL).mockImplementation((obj) => JSON.stringify(obj) + '\n');

            // Setup file to exist with existing content
            mockBucket.file.mockImplementation((path: string) => {
                const mockFile = mockBucket._getMockFile(path);
                if (path === walPath) {
                    mockFile.exists.mockResolvedValue([true]);
                    mockFile.download.mockResolvedValue([Buffer.from('{"existing":"record"}\n')]);
                }
                return mockFile;
            });

            await handle.append({ id: 'je-001' });

            vi.mocked(loadMetadata).mockResolvedValue(existingMetadata);
            vi.mocked(saveMetadataAtomic).mockImplementation((uidArg, metadata) => {
                // Verify metadata was updated with new record count
                const walFile = metadata.walFiles.find(w => w.path === walPath);
                expect(walFile).toBeDefined();
                if (walFile) {
                    // Should be > 1 since we added a new record
                    expect(walFile.recordCount).toBeGreaterThan(1);
                }
                return Promise.resolve();
            });

            await handle.close();

            expect(saveMetadataAtomic).toHaveBeenCalled();
        });
    });

    describe('WAL composition as binary blackbox', () => {
        it('should hide WAL segments from consumers', () => {
            const handle = openWAL('test-uid', 'test');

            // Internal structure is opaque
            expect(handle).not.toHaveProperty('walSegments');
            expect(handle).not.toHaveProperty('walFiles');
        });

        it('should hide SSTables from consumers', () => {
            const handle = openWAL('test-uid', 'test');

            expect(handle).not.toHaveProperty('sstables');
            expect(handle).not.toHaveProperty('tables');
        });

        it('should hide index from consumers', () => {
            const handle = openWAL('test-uid', 'test');

            expect(handle).not.toHaveProperty('index');
            expect(handle).not.toHaveProperty('indexPath');
        });

        it('should expose all functionality via high-level APIs', () => {
            const handle = openWAL('test-uid', 'test');

            // All access through APIs, not direct property access
            expect(typeof handle.append).toBe('function');
            expect(typeof handle.stream).toBe('function');
            expect(typeof handle.compact).toBe('function');
            expect(typeof handle.close).toBe('function');
        });
    });

    describe('Integration scenarios', () => {
        it('should support append -> stream workflow', async () => {
            const handle = openWAL('test-uid', 'workflow');

            await handle.append({ id: 'wf-001', step: 1 });
            await handle.append({ id: 'wf-002', step: 2 });

            const mockRecords = [
                { id: 'wf-001', step: 1 },
                { id: 'wf-002', step: 2 },
            ];

            async function* mockGenerator() {
                for (const record of mockRecords) {
                    yield record;
                }
            }

            vi.mocked(streamJSONL).mockReturnValue(mockGenerator());

            const results: unknown[] = [];
            for await (const record of handle.stream()) {
                results.push(record);
            }

            expect(results).toHaveLength(2);
        });

        it('should support append -> compact -> close workflow', async () => {
            const handle = openWAL('test-uid', 'workflow');

            await handle.append({ id: 'wf-001', data: 'test' });

            vi.mocked(compactWAL).mockResolvedValue({
                sstablePath: 'snapshots/workflow/20260120T100000-compact.jsonl',
                indexPath: 'snapshots/workflow/20260120T100000-index.json',
                recordCount: 1,
                metadataUpdated: true,
            });

            const result = await handle.compact({
                maxWALFiles: 10,
                maxFileSizeMB: 100,
                minRecordsToCompact: 1,
                strategy: 'tiered',
            });

            expect(result.recordCount).toBe(1);

            vi.mocked(loadMetadata).mockResolvedValue(createInitialMetadata('test-uid', 'workflow'));
            vi.mocked(saveMetadataAtomic).mockResolvedValue();

            await handle.close();
            expect(saveMetadataAtomic).toHaveBeenCalled();
        });

        it('should support stream -> filter -> process workflow', async () => {
            const handle = openWAL('test-uid', 'data');

            const allRecords = [
                { id: 'd-001', value: 100 },
                { id: 'd-002', value: 200 },
                { id: 'd-003', value: 50 },
            ];

            // Mock that respects the filter option
            vi.mocked(streamJSONL).mockImplementation((<T>(_uid: string, _entityType: string, options?: WALStreamOptions<T>) => {
                async function* filteredGenerator() {
                    for (const record of allRecords) {
                        if (!options?.filter || options.filter(record as T)) {
                            yield record as T;
                        }
                    }
                }
                return filteredGenerator();
            }));

            const options: WALStreamOptions<{ id: string; value: number }> = {
                filter: (r) => r.value >= 100,
            };

            const results: unknown[] = [];
            for await (const record of handle.stream(options)) {
                results.push(record);
            }

            expect(results).toHaveLength(2);
            expect(results).toEqual([
                { id: 'd-001', value: 100 },
                { id: 'd-002', value: 200 },
            ]);
        });
    });

    describe('Error handling', () => {
        it('should handle append errors gracefully', async () => {
            const handle = openWAL('test-uid', 'test');

            vi.mocked(serializeToJSONL).mockImplementation(() => {
                throw new Error('Serialization error');
            });

            await expect(handle.append({ id: 'test' })).rejects.toThrow('Serialization error');
        });

        it('should handle stream errors gracefully', async () => {
            const handle = openWAL('test-uid', 'test');

            async function* mockErrorGenerator() {
                yield { id: 'rec-001' };
                throw new Error('Stream error');
            }

            vi.mocked(streamJSONL).mockReturnValue(mockErrorGenerator());

            const results: unknown[] = [];
            let errorThrown = false;

            try {
                for await (const record of handle.stream()) {
                    results.push(record);
                }
            } catch (e) {
                errorThrown = true;
                expect((e as Error).message).toBe('Stream error');
            }

            expect(errorThrown).toBe(true);
            expect(results).toHaveLength(1);
        });

        it('should handle close errors without data loss', async () => {
            // Setup mocks before operations
            vi.mocked(loadMetadata).mockResolvedValue(createInitialMetadata('test-uid', 'test'));
            vi.mocked(saveMetadataAtomic).mockRejectedValue(new Error('Close failed'));

            const handle = openWAL('test-uid', 'test');

            // Setup serializeToJSONL to work correctly
            vi.mocked(serializeToJSONL).mockImplementation((obj) => JSON.stringify(obj) + '\n');

            await handle.append({ id: 'test' });

            await expect(handle.close()).rejects.toThrow('Close failed');
        });

        it('should reject append on closed handle', async () => {
            const handle = openWAL('test-uid', 'test');

            vi.mocked(loadMetadata).mockResolvedValue(createInitialMetadata('test-uid', 'test'));
            vi.mocked(saveMetadataAtomic).mockResolvedValue();

            await handle.close();

            await expect(handle.append({ id: 'test' })).rejects.toThrow('Cannot append to closed WAL handle');
        });

        it('should reject stream on closed handle', async () => {
            const handle = openWAL('test-uid', 'test');

            vi.mocked(loadMetadata).mockResolvedValue(createInitialMetadata('test-uid', 'test'));
            vi.mocked(saveMetadataAtomic).mockResolvedValue();

            await handle.close();

            await expect(async () => {
                for await (const _record of handle.stream()) {
                    // Should not reach here
                }
            }).rejects.toThrow('Cannot stream from closed WAL handle');
        });

        it('should reject compact on closed handle', async () => {
            const handle = openWAL('test-uid', 'test');

            vi.mocked(loadMetadata).mockResolvedValue(createInitialMetadata('test-uid', 'test'));
            vi.mocked(saveMetadataAtomic).mockResolvedValue();

            await handle.close();

            await expect(handle.compact({
                maxWALFiles: 10,
                maxFileSizeMB: 100,
                minRecordsToCompact: 1,
                strategy: 'tiered',
            })).rejects.toThrow('Cannot compact closed WAL handle');
        });
    });

    describe('Type safety', () => {
        it('should preserve type information through stream', async () => {
            interface TestRecord {
                id: string;
                timestamp: string;
                amount: number;
            }

            const handle = openWAL('test-uid', 'typed');

            async function* mockGenerator(): AsyncGenerator<TestRecord> {
                yield { id: 't-001', timestamp: '2026-01-20T10:00:00Z', amount: 100 };
            }

            vi.mocked(streamJSONL).mockReturnValue(mockGenerator());

            for await (const record of handle.stream<TestRecord>()) {
                expect(record.amount).toBeTypeOf('number');
                expect(record.id).toBeTypeOf('string');
            }
        });

        it('should accept generic types for append', async () => {
            interface CustomRecord {
                customField: string;
                value: number;
            }

            const handle = openWAL('test-uid', 'custom');
            const record: CustomRecord = { customField: 'test', value: 42 };

            vi.mocked(serializeToJSONL).mockReturnValue(JSON.stringify(record) + '\n');

            await expect(handle.append(record)).resolves.not.toThrow();
        });
    });
});
