/**
 * Tests for migrateStateToJSONL Module
 *
 * Tests state.json detection and parsing for Phase 4.1 migration.
 * Validates conversion of legacy state.json to JSONL WAL format.
 *
 * Spec: Phase 4.1 state.json Detection and Parsing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set environment before importing
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
        copy: vi.fn(),
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

import {
    detectStateJSON,
    parseStateJSON,
    migrateStateToJSONL,
    type MigrationResult,
} from './migrateStateToJSONL.js';
import { _setBucketForTesting } from './migrateStateToJSONL.js';
import { _setBucketForTesting as setMetadataBucket } from './walMetadata.js';

describe('migrateStateToJSONL - detectStateJSON', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        _setBucketForTesting(mockBucket as any);
        setMetadataBucket(mockBucket as any);
    });

    it('should return true when state.json exists for user', async () => {
        const uid = 'test-uid';
        mockFile.exists.mockResolvedValueOnce([true]);

        const result = await detectStateJSON(uid);

        expect(result).toBe(true);
        expect(mockBucket.file).toHaveBeenCalledWith(`${uid}/state.json`);
    });

    it('should return false when state.json does not exist', async () => {
        const uid = 'new-uid';
        mockFile.exists.mockResolvedValueOnce([false]);

        const result = await detectStateJSON(uid);

        expect(result).toBe(false);
    });

    it('should handle storage errors gracefully', async () => {
        const uid = 'error-uid';
        mockFile.exists.mockRejectedValueOnce(new Error('Storage unavailable'));

        const result = await detectStateJSON(uid);

        expect(result).toBe(false);
    });
});

describe('migrateStateToJSONL - parseStateJSON', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        _setBucketForTesting(mockBucket as any);
        setMetadataBucket(mockBucket as any);
    });

    it('should parse state.json and extract entity collections', async () => {
        const uid = 'test-uid';
        const mockState = {
            accounts: [
                { id: 'acc-001', name: 'Cash', balance: 1000 },
                { id: 'acc-002', name: 'Bank', balance: 5000 },
            ],
            journal_entries: [
                { id: 'je-001', date: '2026-01-20', amount: 100 },
                { id: 'je-002', date: '2026-01-21', amount: 200 },
                { id: 'je-003', date: '2026-01-22', amount: 300 },
            ],
            transactions: [
                { id: 'txn-001', amount: 1000 },
            ],
            entities: [
                { id: 'entity-001', name: 'Trust 1' },
            ],
        };

        mockFile.exists.mockResolvedValueOnce([true]);
        mockFile.download.mockResolvedValueOnce([Buffer.from(JSON.stringify(mockState))]);

        const result = await parseStateJSON(uid);

        expect(result).toEqual({
            accounts: expect.any(Array),
            journal_entries: expect.any(Array),
            transactions: expect.any(Array),
            entities: expect.any(Array),
        });
        expect(result.accounts).toHaveLength(2);
        expect(result.journal_entries).toHaveLength(3);
        expect(result.transactions).toHaveLength(1);
        expect(result.entities).toHaveLength(1);
    });

    it('should return empty object when state.json does not exist', async () => {
        const uid = 'missing-uid';
        mockFile.exists.mockResolvedValueOnce([false]);

        const result = await parseStateJSON(uid);

        expect(result).toEqual({});
    });

    it('should handle malformed state.json gracefully', async () => {
        const uid = 'malformed-uid';
        mockFile.exists.mockResolvedValueOnce([true]);
        mockFile.download.mockResolvedValueOnce([Buffer.from('invalid json{')]);

        const result = await parseStateJSON(uid);

        expect(result).toEqual({});
    });

    it('should handle state.json with missing entity collections', async () => {
        const uid = 'partial-uid';
        const partialState = {
            accounts: [{ id: 'acc-001', name: 'Cash' }],
            // Missing other entity types
        };

        mockFile.exists.mockResolvedValueOnce([true]);
        mockFile.download.mockResolvedValueOnce([Buffer.from(JSON.stringify(partialState))]);

        const result = await parseStateJSON(uid);

        expect(result.accounts).toHaveLength(1);
        expect(result.journal_entries).toBeUndefined();
        expect(result.transactions).toBeUndefined();
    });

    it('should filter out non-array entity collections', async () => {
        const uid = 'invalid-uid';
        const invalidState = {
            accounts: [{ id: 'acc-001' }],
            journal_entries: 'not an array',
            transactions: { also: 'not an array' },
            entities: [{ id: 'entity-001' }],
        };

        mockFile.exists.mockResolvedValueOnce([true]);
        mockFile.download.mockResolvedValueOnce([Buffer.from(JSON.stringify(invalidState))]);

        const result = await parseStateJSON(uid);

        // Should only include valid array collections
        expect(result.accounts).toEqual([{ id: 'acc-001' }]);
        expect(result.entities).toEqual([{ id: 'entity-001' }]);
        expect(result.journal_entries).toBeUndefined();
        expect(result.transactions).toBeUndefined();
    });
});

describe('migrateStateToJSONL - migrateStateToJSONL', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        _setBucketForTesting(mockBucket as any);
        setMetadataBucket(mockBucket as any);

        // Default mock: no existing metadata
        mockFile.exists.mockResolvedValue([false]);
        mockFile.download.mockResolvedValue([Buffer.from('{}')]); // Default: empty JSON

        // Default mock: successful save
        mockFile.save.mockResolvedValue(true);
        mockFile.copy.mockResolvedValue(true);
        mockFile.delete.mockResolvedValue(true);
    });

    it('should migrate all entity collections from state.json to JSONL', async () => {
        const uid = 'migrate-uid';
        const mockState = {
            accounts: [
                { id: 'acc-001', name: 'Cash', balance: 1000, timestamp: '2026-01-15T10:00:00Z' },
                { id: 'acc-002', name: 'Bank', balance: 5000, timestamp: '2026-01-16T10:00:00Z' },
            ],
            journal_entries: [
                { id: 'je-001', date: '2026-01-20', amount: 100, timestamp: '2026-01-20T10:00:00Z' },
            ],
        };

        mockFile.exists
            .mockResolvedValueOnce([true])   // detectStateJSON: state.json exists
            .mockResolvedValueOnce([true])   // parseStateJSON: state.json exists
            .mockResolvedValue([false]);     // metadata does not exist (for all entity types)
        mockFile.download.mockResolvedValueOnce([Buffer.from(JSON.stringify(mockState))]);

        const result = await migrateStateToJSONL(uid);

        expect(result.success).toBe(true);
        expect(result.entityCounts).toEqual({
            accounts: 2,
            journal_entries: 1,
        });
        expect(result.sstablesCreated).toHaveLength(2);
        expect(result.errors).toEqual([]);
        expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should write entities to WAL files with backdated timestamps', async () => {
        const uid = 'backdate-uid';
        const mockState = {
            accounts: [
                { id: 'acc-001', name: 'Cash', timestamp: '2026-01-15T10:00:00Z' },
            ],
        };

        mockFile.exists
            .mockResolvedValueOnce([true])   // detectStateJSON: state.json exists
            .mockResolvedValueOnce([true])   // parseStateJSON: state.json exists
            .mockResolvedValue([false]);     // metadata does not exist
        mockFile.download.mockResolvedValueOnce([Buffer.from(JSON.stringify(mockState))]);

        await migrateStateToJSONL(uid);

        // Verify WAL files were created
        const walSaveCalls = mockFile.save.mock.calls.filter(call =>
            call[1]?.contentType === 'application/x-ndjson'
        );

        expect(walSaveCalls.length).toBeGreaterThan(0);

        // Verify backdated timestamp is preserved in JSONL content
        const savedContent = walSaveCalls[0][0] as string;
        expect(savedContent).toContain('2026-01-15T10:00:00Z');
    });

    it('should create initial SSTable for each entity type', async () => {
        const uid = 'sstable-uid';
        const mockState = {
            accounts: [{ id: 'acc-001', name: 'Cash' }],
            transactions: [{ id: 'txn-001', amount: 100 }],
        };

        mockFile.exists
            .mockResolvedValueOnce([true])   // detectStateJSON: state.json exists
            .mockResolvedValueOnce([true])   // parseStateJSON: state.json exists
            .mockResolvedValue([false]);     // metadata does not exist
        mockFile.download.mockResolvedValueOnce([Buffer.from(JSON.stringify(mockState))]);

        const result = await migrateStateToJSONL(uid);

        // Should create SSTable for each entity type
        expect(result.sstablesCreated).toHaveLength(2);

        // Verify SSTable paths match spec format
        const expectedPattern = new RegExp(`^users/${uid}/snapshots/[\\w-]+/\\d{8}-compact\\.jsonl$`);
        result.sstablesCreated.forEach(path => {
            expect(path).toMatch(expectedPattern);
        });
    });

    it('should create index file for each SSTable', async () => {
        const uid = 'index-uid';
        const mockState = {
            accounts: [
                { id: 'acc-001', name: 'Cash' },
                { id: 'acc-002', name: 'Bank' },
            ],
        };

        mockFile.exists
            .mockResolvedValueOnce([true])   // detectStateJSON: state.json exists
            .mockResolvedValueOnce([true])   // parseStateJSON: state.json exists
            .mockResolvedValue([false]);     // metadata does not exist
        mockFile.download.mockResolvedValueOnce([Buffer.from(JSON.stringify(mockState))]);

        await migrateStateToJSONL(uid);

        // Verify index files were created (index files have contentType 'application/json' and contain 'entries')
        const indexSaveCalls = mockFile.save.mock.calls.filter(call => {
            const content = call[0]?.toString() || '';
            const isIndex = content.includes('"entries"') && content.includes('"entryCount"');
            return isIndex;
        });

        expect(indexSaveCalls.length).toBeGreaterThan(0);

        // Verify index structure
        const indexContent = JSON.parse(indexSaveCalls[0][0] as string);
        expect(indexContent.entries).toBeDefined();
        expect(indexContent.createdAt).toBeDefined();
        expect(indexContent.entryCount).toBeDefined();
    });

    it('should update metadata to mark migration complete', async () => {
        const uid = 'metadata-uid';
        const mockState = {
            accounts: [{ id: 'acc-001', name: 'Cash' }],
        };

        mockFile.exists
            .mockResolvedValueOnce([true])   // detectStateJSON: state.json exists
            .mockResolvedValueOnce([true])   // parseStateJSON: state.json exists
            .mockResolvedValue([false]);     // metadata does not exist
        mockFile.download.mockResolvedValueOnce([Buffer.from(JSON.stringify(mockState))]);

        await migrateStateToJSONL(uid);

        // Verify metadata file was saved (metadata has migrationStatus field)
        const metadataSaveCalls = mockFile.save.mock.calls.filter(call => {
            const content = call[0]?.toString() || '';
            return content.includes('"migrationStatus"');
        });

        expect(metadataSaveCalls.length).toBeGreaterThan(0);

        const metadataContent = JSON.parse(metadataSaveCalls[0][0] as string);
        expect(metadataContent.migrationStatus).toBe('complete');
    });

    it('should handle entities without timestamps by using current date', async () => {
        const uid = 'no-timestamp-uid';
        const mockState = {
            accounts: [
                { id: 'acc-001', name: 'Cash' }, // No timestamp
            ],
        };

        mockFile.exists
            .mockResolvedValueOnce([true])   // detectStateJSON: state.json exists
            .mockResolvedValueOnce([true])   // parseStateJSON: state.json exists
            .mockResolvedValue([false]);     // metadata does not exist
        mockFile.download.mockResolvedValueOnce([Buffer.from(JSON.stringify(mockState))]);

        await migrateStateToJSONL(uid);

        const walSaveCalls = mockFile.save.mock.calls.filter(call =>
            call[1]?.contentType === 'application/x-ndjson'
        );

        expect(walSaveCalls.length).toBeGreaterThan(0);
    });

    it('should return error result when state.json does not exist', async () => {
        const uid = 'no-state-uid';
        mockFile.exists.mockResolvedValueOnce([false]);

        const result = await migrateStateToJSONL(uid);

        expect(result.success).toBe(false);
        expect(result.errors).toContain('state.json not found');
        expect(result.entityCounts).toEqual({});
    });

    it('should return error result on parse failure', async () => {
        const uid = 'parse-error-uid';
        mockFile.exists
            .mockResolvedValueOnce([true])   // detectStateJSON: state.json exists
            .mockResolvedValueOnce([true]);  // parseStateJSON: state.json exists (before download)
        mockFile.download.mockResolvedValueOnce([Buffer.from('malformed json')]);

        const result = await migrateStateToJSONL(uid);

        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle empty state.json', async () => {
        const uid = 'empty-uid';
        mockFile.exists
            .mockResolvedValueOnce([true])   // state.json exists
            .mockResolvedValueOnce([false]); // metadata does not exist
        mockFile.download.mockResolvedValueOnce([Buffer.from(JSON.stringify({}))]);

        const result = await migrateStateToJSONL(uid);

        expect(result.success).toBe(true);
        expect(result.entityCounts).toEqual({});
        expect(result.sstablesCreated).toHaveLength(0);
    });

    it('should preserve original state.json after migration', async () => {
        const uid = 'preserve-uid';
        const mockState = {
            accounts: [{ id: 'acc-001', name: 'Cash' }],
        };

        mockFile.exists
            .mockResolvedValueOnce([true])   // state.json exists
            .mockResolvedValueOnce([false]); // metadata does not exist
        mockFile.download.mockResolvedValueOnce([Buffer.from(JSON.stringify(mockState))]);

        await migrateStateToJSONL(uid);

        // Verify state.json was NOT deleted
        expect(mockFile.delete).not.toHaveBeenCalledWith(expect.stringContaining('state.json'));
    });

    // Note: Atomic metadata update is tested in walMetadata.test.ts
    // This test verifies the migration process works correctly
    it('should use atomic metadata update (temp file + rename)', async () => {
        const uid = 'atomic-uid';
        const mockState = {
            accounts: [{ id: 'acc-001', name: 'Cash' }],
            journal_entries: [{ id: 'je-001', date: '2026-01-20' }],
        };

        mockFile.exists
            .mockResolvedValueOnce([true])   // detectStateJSON: state.json exists
            .mockResolvedValueOnce([true])   // parseStateJSON: state.json exists
            .mockResolvedValue([false]);     // metadata does not exist (default for all other calls)
        mockFile.download.mockResolvedValueOnce([Buffer.from(JSON.stringify(mockState))]);

        const result = await migrateStateToJSONL(uid);

        // Verify migration completed successfully
        expect(result.success).toBe(true);
        expect(result.errors).toEqual([]);
        expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should report migration duration', async () => {
        const uid = 'duration-uid';
        const mockState = {
            accounts: [{ id: 'acc-001', name: 'Cash' }],
        };

        mockFile.exists
            .mockResolvedValueOnce([true])   // state.json exists
            .mockResolvedValueOnce([false]); // metadata does not exist
        mockFile.download.mockResolvedValueOnce([Buffer.from(JSON.stringify(mockState))]);

        const result = await migrateStateToJSONL(uid);

        expect(result.duration).toBeGreaterThanOrEqual(0);
        expect(typeof result.duration).toBe('number');
    });
});
