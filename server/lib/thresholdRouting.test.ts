/**
 * Threshold Routing Tests
 *
 * Phase 5.3: Per-Entity-Type Threshold Configuration
 * Tests for threshold-based routing between state.json and JSONL
 * using ThresholdConfig from WALMetadata.
 *
 * Spec requirements:
 * - Check thresholdConfig in metadata for routing decision
 * - If threshold enabled and object count < threshold: dual-write (state.json + JSONL)
 * - If threshold exceeded: JSONL only, mark state.json as "delegated"
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
    routeByThreshold,
    countObjectsFromState,
    DelegatedMarker,
    type RoutingResult,
} from './thresholdRouting.js';
import {
    loadMetadata,
    createInitialMetadata,
    saveMetadataAtomic,
    type WALMetadata,
    type ThresholdConfig,
    _setBucketForTesting,
} from './walMetadata.js';

// Set bucket mock for testing
_setBucketForTesting(mockBucket);

describe('thresholdRouting (Phase 5.3)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockBucket._clearMockFiles();
        mockBucket.getFiles.mockResolvedValue([[]]);
    });

    describe('countObjectsFromState', () => {
        it('should count objects of entity type from state.json', async () => {
            const uid = 'test-uid';
            const entityType = 'journal_entries';

            const mockState = {
                journal_entries: [
                    { id: 'je-001', timestamp: '2026-01-20T10:00:00Z' },
                    { id: 'je-002', timestamp: '2026-01-20T11:00:00Z' },
                    { id: 'je-003', timestamp: '2026-01-20T12:00:00Z' },
                ]
            };

            const statePath = `${uid}/state.json`;
            const mockStateFile = mockBucket._getMockFile(statePath);
            mockStateFile.exists.mockResolvedValue([true]);
            mockStateFile.download.mockResolvedValue([Buffer.from(JSON.stringify(mockState))]);

            const count = await countObjectsFromState(uid, entityType);

            expect(count).toBe(3);
            expect(mockBucket.file).toHaveBeenCalledWith(statePath);
        });

        it('should return 0 when state.json does not exist', async () => {
            const uid = 'new-uid';
            const entityType = 'journal_entries';

            const statePath = `${uid}/state.json`;
            const mockStateFile = mockBucket._getMockFile(statePath);
            mockStateFile.exists.mockResolvedValue([false]);

            const count = await countObjectsFromState(uid, entityType);

            expect(count).toBe(0);
        });

        it('should return 0 when entity type array is missing from state.json', async () => {
            const uid = 'test-uid';
            const entityType = 'accounts';

            const mockState = {
                journal_entries: [{ id: 'je-001' }]
            };

            const statePath = `${uid}/state.json`;
            const mockStateFile = mockBucket._getMockFile(statePath);
            mockStateFile.exists.mockResolvedValue([true]);
            mockStateFile.download.mockResolvedValue([Buffer.from(JSON.stringify(mockState))]);

            const count = await countObjectsFromState(uid, entityType);

            expect(count).toBe(0);
        });

        it('should handle malformed state.json gracefully', async () => {
            const uid = 'test-uid';
            const entityType = 'transactions';

            const statePath = `${uid}/state.json`;
            const mockStateFile = mockBucket._getMockFile(statePath);
            mockStateFile.exists.mockResolvedValue([true]);
            mockStateFile.download.mockResolvedValue([Buffer.from('invalid json{')]);

            const count = await countObjectsFromState(uid, entityType);

            expect(count).toBe(0);
        });

        it('should return 0 when state.json has delegated marker', async () => {
            const uid = 'delegated-uid';
            const entityType = 'journal_entries';

            const delegatedState: DelegatedMarker = {
                _delegatedTo: {
                    format: 'jsonl',
                    entityType,
                    threshold: 1000,
                    at: '2026-01-20T10:00:00Z',
                }
            };

            const statePath = `${uid}/state.json`;
            const mockStateFile = mockBucket._getMockFile(statePath);
            mockStateFile.exists.mockResolvedValue([true]);
            mockStateFile.download.mockResolvedValue([Buffer.from(JSON.stringify(delegatedState))]);

            const count = await countObjectsFromState(uid, entityType);

            expect(count).toBe(0); // Delegated means no count from state.json
        });
    });

    describe('routeByThreshold - Dual-Write Mode', () => {
        it('should route to dual-write when threshold enabled and count < threshold', async () => {
            const uid = 'small-uid';
            const entityType = 'journal_entries';

            // Metadata with threshold config
            const thresholdConfig: ThresholdConfig = {
                enabled: true,
                value: 1000,
            };

            const metadata = createInitialMetadata(uid, entityType, thresholdConfig);

            // Mock loadMetadata to return metadata with threshold config
            vi.fn(loadMetadata).mockResolvedValue(metadata);

            // Mock state.json with 500 objects (< threshold)
            const mockState = {
                journal_entries: Array(500).fill(null).map((_, i) => ({
                    id: `je-${i}`,
                    timestamp: '2026-01-20T10:00:00Z'
                }))
            };

            const statePath = `${uid}/state.json`;
            const mockStateFile = mockBucket._getMockFile(statePath);
            mockStateFile.exists.mockResolvedValue([true]);
            mockStateFile.download.mockResolvedValue([Buffer.from(JSON.stringify(mockState))]);

            const result = await routeByThreshold(uid, entityType);

            expect(result.mode).toBe('dual-write');
            expect(result.writeTo).toEqual(['state.json', 'jsonl']);
            expect(result.delegated).toBe(false);
        });

        it('should route to dual-write when threshold is 0 (never exceed)', async () => {
            const uid = 'zero-threshold-uid';
            const entityType = 'accounts';

            const thresholdConfig: ThresholdConfig = {
                enabled: true,
                value: 0, // Always dual-write
            };

            const metadata = createInitialMetadata(uid, entityType, thresholdConfig);
            vi.fn(loadMetadata).mockResolvedValue(metadata);

            const result = await routeByThreshold(uid, entityType);

            expect(result.mode).toBe('dual-write');
            expect(result.writeTo).toEqual(['state.json', 'jsonl']);
        });
    });

    describe('routeByThreshold - JSONL-Only Mode', () => {
        it('should route to JSONL-only when count >= threshold', async () => {
            const uid = 'large-uid';
            const entityType = 'journal_entries';

            const thresholdConfig: ThresholdConfig = {
                enabled: true,
                value: 1000,
            };

            const metadata = createInitialMetadata(uid, entityType, thresholdConfig);
            vi.fn(loadMetadata).mockResolvedValue(metadata);

            // Mock state.json with 1000 objects (>= threshold)
            const mockState = {
                journal_entries: Array(1000).fill(null).map((_, i) => ({
                    id: `je-${i}`,
                    timestamp: '2026-01-20T10:00:00Z'
                }))
            };

            const statePath = `${uid}/state.json`;
            const mockStateFile = mockBucket._getMockFile(statePath);
            mockStateFile.exists.mockResolvedValue([true]);
            mockStateFile.download.mockResolvedValue([Buffer.from(JSON.stringify(mockState))]);

            const result = await routeByThreshold(uid, entityType);

            expect(result.mode).toBe('jsonl-only');
            expect(result.writeTo).toEqual(['jsonl']);
            expect(result.delegated).toBe(true);
        });

        it('should route to JSONL-only when threshold disabled', async () => {
            const uid = 'disabled-uid';
            const entityType = 'transactions';

            const thresholdConfig: ThresholdConfig = {
                enabled: false, // Disabled
                value: 1000,
            };

            const metadata = createInitialMetadata(uid, entityType, thresholdConfig);
            vi.fn(loadMetadata).mockResolvedValue(metadata);

            const result = await routeByThreshold(uid, entityType);

            expect(result.mode).toBe('jsonl-only');
            expect(result.writeTo).toEqual(['jsonl']);
            expect(result.delegated).toBe(true);
        });

        it('should include threshold value in JSONL-only result', async () => {
            const uid = 'threshold-info-uid';
            const entityType = 'ledger';

            const thresholdConfig: ThresholdConfig = {
                enabled: true,
                value: 500,
            };

            const metadata = createInitialMetadata(uid, entityType, thresholdConfig);
            vi.fn(loadMetadata).mockResolvedValue(metadata);

            // Mock state.json with 600 objects (>= threshold of 500)
            const mockState = {
                ledger: Array(600).fill(null).map((_, i) => ({
                    id: `led-${i}`,
                }))
            };

            const statePath = `${uid}/state.json`;
            const mockStateFile = mockBucket._getMockFile(statePath);
            mockStateFile.exists.mockResolvedValue([true]);
            mockStateFile.download.mockResolvedValue([Buffer.from(JSON.stringify(mockState))]);

            const result = await routeByThreshold(uid, entityType);

            expect(result.mode).toBe('jsonl-only');
            expect(result.threshold).toBe(500);
            expect(result.delegated).toBe(true);
        });
    });

    describe('routeByThreshold - Edge Cases', () => {
        it('should default to dual-write when metadata does not exist', async () => {
            const uid = 'no-metadata-uid';
            const entityType = 'unknown';

            // No metadata exists
            vi.fn(loadMetadata).mockResolvedValue(null);

            // Empty state.json
            const statePath = `${uid}/state.json`;
            const mockStateFile = mockBucket._getMockFile(statePath);
            mockStateFile.exists.mockResolvedValue([false]);

            const result = await routeByThreshold(uid, entityType);

            // Should use default threshold and dual-write
            expect(result.mode).toBe('dual-write');
            expect(result.writeTo).toEqual(['state.json', 'jsonl']);
        });

        it('should handle missing thresholdConfig gracefully', async () => {
            const uid = 'missing-config-uid';
            const entityType = 'accounts';

            // Metadata without thresholdConfig (legacy)
            const incompleteMetadata: WALMetadata = {
                uid,
                entityType,
                version: 1,
                createdAt: '2026-01-20T10:00:00Z',
                updatedAt: '2026-01-20T10:00:00Z',
                walFiles: [],
                sstables: [],
                migrationStatus: 'none',
                // @ts-expect-error - Testing missing thresholdConfig
                thresholdConfig: undefined,
            };

            vi.mocked(loadMetadata).mockResolvedValue(incompleteMetadata);

            const result = await routeByThreshold(uid, entityType);

            // Should default to dual-write with default threshold
            expect(result.mode).toBe('dual-write');
            expect(result.writeTo).toEqual(['state.json', 'jsonl']);
        });

        it('should route to JSONL-only when state.json already delegated', async () => {
            const uid = 'already-delegated-uid';
            const entityType = 'journal_entries';

            const thresholdConfig: ThresholdConfig = {
                enabled: true,
                value: 1000,
            };

            const metadata = createInitialMetadata(uid, entityType, thresholdConfig);
            vi.fn(loadMetadata).mockResolvedValue(metadata);

            // State.json already has delegated marker
            const delegatedState: DelegatedMarker = {
                _delegatedTo: {
                    format: 'jsonl',
                    entityType,
                    threshold: 1000,
                    at: '2026-01-19T10:00:00Z',
                }
            };

            const statePath = `${uid}/state.json`;
            const mockStateFile = mockBucket._getMockFile(statePath);
            mockStateFile.exists.mockResolvedValue([true]);
            mockStateFile.download.mockResolvedValue([Buffer.from(JSON.stringify(delegatedState))]);

            const result = await routeByThreshold(uid, entityType);

            expect(result.mode).toBe('jsonl-only');
            expect(result.delegated).toBe(true);
            expect(result.alreadyDelegated).toBe(true);
        });
    });

    describe('routeByThreshold - Per-Entity-Type Configuration', () => {
        it('should use different thresholds for different entity types', async () => {
            const uid = 'multi-entity-uid';

            // Journal entries: threshold 500
            const journalMetadata = createInitialMetadata(uid, 'journal_entries', {
                enabled: true,
                value: 500,
            });

            // Transactions: threshold 2000
            const transactionMetadata = createInitialMetadata(uid, 'transactions', {
                enabled: true,
                value: 2000,
            });

            // Mock 750 objects in state.json (exceeds journal threshold, under transaction threshold)
            const mockState = {
                journal_entries: Array(750).fill(null).map((_, i) => ({ id: `je-${i}` })),
                transactions: Array(750).fill(null).map((_, i) => ({ id: `txn-${i}` })),
            };

            const statePath = `${uid}/state.json`;
            const mockStateFile = mockBucket._getMockFile(statePath);
            mockStateFile.exists.mockResolvedValue([true]);
            mockStateFile.download.mockResolvedValue([Buffer.from(JSON.stringify(mockState))]);

            // Test journal_entries routing (750 >= 500, should be JSONL-only)
            vi.mocked(loadMetadata).mockResolvedValue(journalMetadata);
            const journalResult = await routeByThreshold(uid, 'journal_entries');
            expect(journalResult.mode).toBe('jsonl-only');
            expect(journalResult.threshold).toBe(500);

            // Test transactions routing (750 < 2000, should be dual-write)
            vi.mocked(loadMetadata).mockResolvedValue(transactionMetadata);
            const transactionResult = await routeByThreshold(uid, 'transactions');
            expect(transactionResult.mode).toBe('dual-write');
            expect(transactionResult.threshold).toBe(2000);
        });

        it('should handle one entity type delegated while another is dual-write', async () => {
            const uid = 'mixed-mode-uid';

            // Accounts: threshold 100, already exceeded
            const accountsMetadata = createInitialMetadata(uid, 'accounts', {
                enabled: true,
                value: 100,
            });

            // Journal entries: threshold 10000, not exceeded
            const journalMetadata = createInitialMetadata(uid, 'journal_entries', {
                enabled: true,
                value: 10000,
            });

            // State with delegated marker for accounts, but normal array for journal_entries
            const mockState = {
                _delegatedTo: {
                    format: 'jsonl',
                    entityType: 'accounts',
                    threshold: 100,
                    at: '2026-01-19T10:00:00Z',
                },
                // Note: When delegated, individual entity arrays may not be in state.json
                // But for this test, we'll include journal_entries
                journal_entries: Array(50).fill(null).map((_, i) => ({ id: `je-${i}` })),
            };

            const statePath = `${uid}/state.json`;
            const mockStateFile = mockBucket._getMockFile(statePath);
            mockStateFile.exists.mockResolvedValue([true]);
            mockStateFile.download.mockResolvedValue([Buffer.from(JSON.stringify(mockState))]);

            // Accounts should be JSONL-only
            vi.mocked(loadMetadata).mockResolvedValue(accountsMetadata);
            const accountsResult = await routeByThreshold(uid, 'accounts');
            expect(accountsResult.mode).toBe('jsonl-only');

            // Journal entries should be dual-write
            vi.mocked(loadMetadata).mockResolvedValue(journalMetadata);
            const journalResult = await routeByThreshold(uid, 'journal_entries');
            expect(journalResult.mode).toBe('dual-write');
        });
    });

    describe('RoutingResult type', () => {
        it('should return complete RoutingResult for dual-write mode', async () => {
            const uid = 'result-dual-uid';
            const entityType = 'test';

            const metadata = createInitialMetadata(uid, entityType, {
                enabled: true,
                value: 1000,
            });
            vi.fn(loadMetadata).mockResolvedValue(metadata);

            const statePath = `${uid}/state.json`;
            const mockStateFile = mockBucket._getMockFile(statePath);
            mockStateFile.exists.mockResolvedValue([true]);
            mockStateFile.download.mockResolvedValue([Buffer.from('{"test":[]}')]);

            const result = await routeByThreshold(uid, entityType);

            // Verify RoutingResult interface
            expect(result).toMatchObject({
                mode: expect.any(String),
                writeTo: expect.any(Array<string>),
                threshold: expect.any(Number),
                delegated: expect.any(Boolean),
                objectCount: expect.any(Number),
                alreadyDelegated: expect.any(Boolean),
            });
        });

        it('should return complete RoutingResult for JSONL-only mode', async () => {
            const uid = 'result-jsonl-uid';
            const entityType = 'test';

            const metadata = createInitialMetadata(uid, entityType, {
                enabled: true,
                value: 10,
            });
            vi.fn(loadMetadata).mockResolvedValue(metadata);

            const mockState = {
                test: Array(100).fill(null).map((_, i) => ({ id: `t-${i}` }))
            };

            const statePath = `${uid}/state.json`;
            const mockStateFile = mockBucket._getMockFile(statePath);
            mockStateFile.exists.mockResolvedValue([true]);
            mockStateFile.download.mockResolvedValue([Buffer.from(JSON.stringify(mockState))]);

            const result = await routeByThreshold(uid, entityType);

            expect(result.mode).toBe('jsonl-only');
            expect(result.objectCount).toBe(100);
            expect(result.threshold).toBe(10);
        });
    });
});
