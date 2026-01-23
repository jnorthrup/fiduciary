/**
 * jsonlStream.test.ts
 *
 * Tests for JSONL streaming from GCS with filtering support.
 * Phase 3.1: Streaming Reads
 *
 * Test coverage:
 * - streamJSONL<T> async generator
 * - Key-range queries (startKey, endKey)
 * - Time-range queries (startDate, endDate)
 * - Predicate filtering on indexed fields
 * - Reading from both SSTables and WAL files
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
        createReadStream: ReturnType<typeof vi.fn>;
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
                createReadStream: vi.fn().mockReturnValue({
                    on: vi.fn().mockReturnThis(),
                    pipe: vi.fn().mockReturnThis(),
                }),
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

// Mock loadMetadata to control SSTable availability
const mockLoadMetadata = vi.fn().mockResolvedValue(null);
vi.mock('./walMetadata.js', () => ({
    loadMetadata: () => mockLoadMetadata(),
}));

// Set environment before importing
process.env.NODE_ENV = 'production';
process.env.GOOGLE_APPLICATION_CREDENTIALS = '/fake/path.json';
delete process.env.USE_LOCAL_PERSISTENCE;

// Import after mock and env setup
import { streamJSONL, StreamOptions, _setBucketForTesting } from './jsonlStream.js';

// Set bucket mock for testing
_setBucketForTesting(mockBucket);

describe('jsonlStream', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockBucket._clearMockFiles();
        mockBucket.getFiles.mockResolvedValue([[]]);
        // Reset to no metadata by default (WAL fallback)
        mockLoadMetadata.mockResolvedValue(null);
    });

    describe('streamJSONL', () => {
        const uid = 'test-user-123';
        const entityType = 'journal_entries';

        interface TestRecord {
            id: string;
            timestamp: string;
            amount: number;
            status: 'pending' | 'posted';
        }

        const testRecords: TestRecord[] = [
            { id: 'je-001', timestamp: '2026-01-15T10:00:00Z', amount: 100, status: 'pending' },
            { id: 'je-002', timestamp: '2026-01-16T11:00:00Z', amount: 200, status: 'posted' },
            { id: 'je-003', timestamp: '2026-01-17T12:00:00Z', amount: 300, status: 'pending' },
            { id: 'je-004', timestamp: '2026-01-18T13:00:00Z', amount: 400, status: 'posted' },
            { id: 'je-005', timestamp: '2026-01-19T14:00:00Z', amount: 500, status: 'pending' },
        ];

        // Helper to mock WAL file
        const mockWALFile = (date: string = '2026-01-19', content?: string) => {
            const walPath = `users/${uid}/wal/${entityType}/${date}.jsonl`;
            const walContent = content ?? testRecords.map(r => JSON.stringify(r)).join('\n') + '\n';

            const mockWalFile = mockBucket._getMockFile(walPath);
            mockWalFile.name = walPath;
            mockWalFile.download.mockResolvedValue([Buffer.from(walContent)]);
            mockWalFile.getMetadata.mockResolvedValue([{ size: String(walContent.length) }]);

            mockBucket.getFiles.mockResolvedValue([[mockWalFile]]);
        };

        // Helper to mock SSTable metadata
        const mockSSTableMetadata = (sstablePath?: string, indexPath?: string) => {
            mockLoadMetadata.mockResolvedValue({
                uid,
                entityType,
                version: 1,
                createdAt: '2026-01-19T00:00:00Z',
                updatedAt: '2026-01-19T00:00:00Z',
                walFiles: [],
                sstables: sstablePath ? [{
                    path: sstablePath,
                    indexPath: indexPath || sstablePath.replace('-compact.jsonl', '-index.json'),
                    recordCount: testRecords.length,
                    byteSize: 1000,
                    startKey: 'je-001',
                    endKey: 'je-005',
                    compactedAt: '2026-01-19T12:00:00Z',
                }] : [],
                migrationStatus: 'none',
                thresholdConfig: { enabled: true, value: 1000 },
            });
        };

        it('should stream all records from GCS file without filters', async () => {
            mockWALFile();

            const records: TestRecord[] = [];
            for await (const record of streamJSONL<TestRecord>(uid, entityType, {})) {
                records.push(record);
            }

            expect(records).toHaveLength(5);
            expect(records).toEqual(testRecords);
        });

        it('should filter records by key range (startKey)', async () => {
            mockWALFile();

            const options: StreamOptions<TestRecord> = {
                startKey: 'je-003',
            };

            const records: TestRecord[] = [];
            for await (const record of streamJSONL<TestRecord>(uid, entityType, options)) {
                records.push(record);
            }

            expect(records).toHaveLength(3);
            expect(records[0].id).toBe('je-003');
            expect(records[2].id).toBe('je-005');
        });

        it('should filter records by key range (endKey)', async () => {
            mockWALFile();

            const options: StreamOptions<TestRecord> = {
                endKey: 'je-003',
            };

            const records: TestRecord[] = [];
            for await (const record of streamJSONL<TestRecord>(uid, entityType, options)) {
                records.push(record);
            }

            expect(records).toHaveLength(3);
            expect(records[0].id).toBe('je-001');
            expect(records[2].id).toBe('je-003');
        });

        it('should filter records by key range (startKey and endKey)', async () => {
            mockWALFile();

            const options: StreamOptions<TestRecord> = {
                startKey: 'je-002',
                endKey: 'je-004',
            };

            const records: TestRecord[] = [];
            for await (const record of streamJSONL<TestRecord>(uid, entityType, options)) {
                records.push(record);
            }

            expect(records).toHaveLength(3);
            expect(records[0].id).toBe('je-002');
            expect(records[2].id).toBe('je-004');
        });

        it('should filter records by time range (startDate)', async () => {
            mockWALFile();

            const options: StreamOptions<TestRecord> = {
                startDate: '2026-01-17T00:00:00Z',
            };

            const records: TestRecord[] = [];
            for await (const record of streamJSONL<TestRecord>(uid, entityType, options)) {
                records.push(record);
            }

            expect(records).toHaveLength(3);
            expect(records[0].timestamp).toBe('2026-01-17T12:00:00Z');
            expect(records[2].timestamp).toBe('2026-01-19T14:00:00Z');
        });

        it('should filter records by time range (endDate)', async () => {
            mockWALFile();

            const options: StreamOptions<TestRecord> = {
                endDate: '2026-01-17T00:00:00Z',
            };

            const records: TestRecord[] = [];
            for await (const record of streamJSONL<TestRecord>(uid, entityType, options)) {
                records.push(record);
            }

            expect(records).toHaveLength(2);
            expect(records[0].timestamp).toBe('2026-01-15T10:00:00Z');
            expect(records[1].timestamp).toBe('2026-01-16T11:00:00Z');
        });

        it('should filter records by predicate function', async () => {
            mockWALFile();

            const options: StreamOptions<TestRecord> = {
                filter: (record) => record.status === 'posted',
            };

            const records: TestRecord[] = [];
            for await (const record of streamJSONL<TestRecord>(uid, entityType, options)) {
                records.push(record);
            }

            expect(records).toHaveLength(2);
            expect(records.every(r => r.status === 'posted')).toBe(true);
        });

        it('should combine key range and predicate filters', async () => {
            mockWALFile();

            const options: StreamOptions<TestRecord> = {
                startKey: 'je-002',
                endKey: 'je-004',
                filter: (record) => record.status === 'pending',
            };

            const records: TestRecord[] = [];
            for await (const record of streamJSONL<TestRecord>(uid, entityType, options)) {
                records.push(record);
            }

            expect(records).toHaveLength(1);
            expect(records[0].id).toBe('je-003');
            expect(records[0].status).toBe('pending');
        });

        it('should handle empty files', async () => {
            mockWALFile('2026-01-19', '');

            const records: TestRecord[] = [];
            for await (const record of streamJSONL<TestRecord>(uid, entityType, {})) {
                records.push(record);
            }

            expect(records).toHaveLength(0);
        });

        it('should skip malformed JSON lines and continue streaming', async () => {
            const malformedContent = [
                JSON.stringify(testRecords[0]),
                '{invalid json}',
                JSON.stringify(testRecords[1]),
                'not json at all',
                JSON.stringify(testRecords[2]),
            ].join('\n') + '\n';

            mockWALFile('2026-01-19', malformedContent);

            const records: TestRecord[] = [];
            for await (const record of streamJSONL<TestRecord>(uid, entityType, {})) {
                records.push(record);
            }

            expect(records).toHaveLength(3);
            expect(records[0].id).toBe('je-001');
            expect(records[1].id).toBe('je-002');
            expect(records[2].id).toBe('je-003');
        });

        it('should stream from WAL files when SSTables do not exist', async () => {
            // Default metadata is null, so should fall back to WAL
            mockWALFile();

            const records: TestRecord[] = [];
            for await (const record of streamJSONL<TestRecord>(uid, entityType, {})) {
                records.push(record);
            }

            expect(records).toHaveLength(5);
        });

        it('should read from SSTables using index for efficient range queries', async () => {
            const sstablePath = `snapshots/${entityType}/20260119T120000-compact.jsonl`;
            const indexPath = `snapshots/${entityType}/20260119T120000-index.json`;

            const fileContent = testRecords.map(r => JSON.stringify(r)).join('\n') + '\n';
            const indexContent = JSON.stringify({
                entries: testRecords.map((r, i) => ({
                    key: r.id,
                    offset: i * 100,
                    size: 100,
                })),
                createdAt: '2026-01-19T12:00:00Z',
                entryCount: 5,
                totalBytes: 500,
                entityType,
            });

            // Mock metadata with SSTable
            mockLoadMetadata.mockResolvedValue({
                uid,
                entityType,
                version: 1,
                createdAt: '2026-01-19T00:00:00Z',
                updatedAt: '2026-01-19T00:00:00Z',
                walFiles: [],
                sstables: [{
                    path: sstablePath,
                    indexPath,
                    recordCount: 5,
                    byteSize: 500,
                    startKey: 'je-001',
                    endKey: 'je-005',
                    compactedAt: '2026-01-19T12:00:00Z',
                }],
                migrationStatus: 'none',
                thresholdConfig: { enabled: true, value: 1000 },
            });

            const mockSstable = mockBucket._getMockFile(sstablePath);
            mockSstable.download.mockResolvedValue([Buffer.from(fileContent)]);

            const mockIndex = mockBucket._getMockFile(indexPath);
            mockIndex.download.mockResolvedValue([Buffer.from(indexContent)]);

            const options: StreamOptions<TestRecord> = {
                startKey: 'je-002',
                endKey: 'je-004',
            };

            const records: TestRecord[] = [];
            for await (const record of streamJSONL<TestRecord>(uid, entityType, options)) {
                records.push(record);
            }

            expect(records).toHaveLength(3);
        });

        it('should throw error when file cannot be read', async () => {
            const sstablePath = `snapshots/${entityType}/20260119T120000-compact.jsonl`;
            const indexPath = `snapshots/${entityType}/20260119T120000-index.json`;

            // Mock metadata with SSTable to trigger SSTable read path
            mockSSTableMetadata(sstablePath, indexPath);

            const mockSstable = mockBucket._getMockFile(sstablePath);
            mockSstable.download.mockRejectedValue(new Error('GCS read failed'));

            await expect(async () => {
                const records: TestRecord[] = [];
                for await (const record of streamJSONL<TestRecord>(uid, entityType, {})) {
                    records.push(record);
                }
            }).rejects.toThrow('GCS read failed');
        });

        it('should support custom key extraction function', async () => {
            mockWALFile();

            const options: StreamOptions<TestRecord> = {
                keyExtractor: (record) => record.timestamp,
                startKey: '2026-01-17T00:00:00Z',
            };

            const records: TestRecord[] = [];
            for await (const record of streamJSONL<TestRecord>(uid, entityType, options)) {
                records.push(record);
            }

            expect(records).toHaveLength(3);
        });

        it('should yield records lazily without loading entire file into memory', async () => {
            const largeContent = Array.from({ length: 10000 }, (_, i) =>
                JSON.stringify({ id: `rec-${i}`, timestamp: `2026-01-19T${i}:00:00Z`, value: i })
            ).join('\n') + '\n';

            mockWALFile('2026-01-19', largeContent);

            let count = 0;
            const maxToRead = 10;

            for await (const record of streamJSONL(uid, entityType, {})) {
                count++;
                if (count >= maxToRead) {
                    break;
                }
            }

            expect(count).toBe(maxToRead);
        });
    });

    describe('StreamOptions type safety', () => {
        it('should enforce type constraints on filter function', async () => {
            interface StrictRecord {
                id: string;
                value: number;
            }

            // This test validates type checking at compile time
            const options: StreamOptions<StrictRecord> = {
                filter: (record: StrictRecord) => record.value > 100,
            };

            expect(options.filter).toBeDefined();
        });
    });
});
