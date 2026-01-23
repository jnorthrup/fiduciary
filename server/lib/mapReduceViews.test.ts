/**
 * MapReduce Views Tests
 *
 * Tests for MapReduce-style query layer for LSM persistence.
 * Phase 3.2 Query Layer
 *
 * Workflow: Red -> Green -> Refactor -> Coverage -> Commit
 */

import { describe, it, expect } from 'vitest';
import {
    Mapper,
    Reducer,
    ReReducer,
    EmitFn,
    BuiltInReducer,
    reduce,
    rereduce
} from './mapReduceViews';

// Test entity types
interface JournalEntry {
    id: string;
    timestamp: string;
    amount: number;
    accountId: string;
    type: 'debit' | 'credit';
}

interface Ledger {
    id: string;
    accountId: string;
    balance: number;
    currency: string;
}

describe('mapReduceViews - Type Definitions', () => {
    describe('Mapper function type', () => {
        it('should accept entity and emit function with key-value pair', () => {
            // Mapper type should be: (entity: T) => (emit: EmitFn<K, V>) => void
            const mapper: Mapper<JournalEntry, string, number> = (entry) => (emit) => {
                emit(entry.accountId, entry.amount);
            };

            const testEntry: JournalEntry = {
                id: 'je-001',
                timestamp: '2026-01-23T10:00:00Z',
                amount: 100,
                accountId: 'acct-123',
                type: 'debit'
            };

            // Verify mapper can be called with emit function
            const emitted: Array<[string, number]> = [];
            const emitFn: EmitFn<string, number> = (key, value) => {
                emitted.push([key, value]);
            };

            mapper(testEntry)(emitFn);
            expect(emitted).toEqual([['acct-123', 100]]);
        });

        it('should support composite keys', () => {
            const mapper: Mapper<JournalEntry, [string, string], number> = (entry) => (emit) => {
                emit([entry.accountId, entry.type], entry.amount);
            };

            const testEntry: JournalEntry = {
                id: 'je-001',
                timestamp: '2026-01-23T10:00:00Z',
                amount: 100,
                accountId: 'acct-123',
                type: 'debit'
            };

            const emitted: Array<[[string, string], number]> = [];
            mapper(testEntry)((key, value) => {
                emitted.push([key, value]);
            });

            expect(emitted).toEqual([[['acct-123', 'debit'], 100]]);
        });
    });

    describe('Reducer function type', () => {
        it('should accept array of values and return reduced value', () => {
            // Reducer type should be: (values: V[]) => R
            const reducer: Reducer<number, number> = (values) => {
                return values.reduce((sum, v) => sum + v, 0);
            };

            const result = reducer([10, 20, 30]);
            expect(result).toBe(60);
        });

        it('should support different input and output types', () => {
            // Reducer can transform type: number[] -> string
            const reducer: Reducer<number, string> = (values) => {
                return values.map(v => v.toString()).join(',');
            };

            const result = reducer([10, 20, 30]);
            expect(result).toBe('10,20,30');
        });
    });

    describe('ReReducer function type', () => {
        it('should accept array of reduced values and return re-reduced value', () => {
            // ReReducer type should be: (reducedValues: R[]) => R
            const rereducer: ReReducer<number> = (reducedValues) => {
                return reducedValues.reduce((sum, v) => sum + v, 0);
            };

            const result = rereducer([10, 20, 30]);
            expect(result).toBe(60);
        });

        it('should handle incremental aggregation', () => {
            // Simulate re-reducing previously reduced results
            const rereducer: ReReducer<{ sum: number; count: number }> = (reducedValues) => {
                return reducedValues.reduce(
                    (acc, v) => ({ sum: acc.sum + v.sum, count: acc.count + v.count }),
                    { sum: 0, count: 0 }
                );
            };

            const partialResults = [
                { sum: 100, count: 2 },
                { sum: 200, count: 3 }
            ];

            const result = rereducer(partialResults);
            expect(result).toEqual({ sum: 300, count: 5 });
        });
    });
});

describe('mapReduceViews - Built-in Reducers', () => {
    describe('sum reducer', () => {
        it('should sum array of numbers', () => {
            const result = reduce.sum([1, 2, 3, 4, 5]);
            expect(result).toBe(15);
        });

        it('should return 0 for empty array', () => {
            const result = reduce.sum([]);
            expect(result).toBe(0);
        });

        it('should handle negative numbers', () => {
            const result = reduce.sum([10, -5, 3, -2]);
            expect(result).toBe(6);
        });

        it('should re-reduce partial sums correctly', () => {
            const partialSums = [10, 20, 30];
            const result = rereduce.sum(partialSums);
            expect(result).toBe(60);
        });

        it('should re-reduce empty array to 0', () => {
            const result = rereduce.sum([]);
            expect(result).toBe(0);
        });
    });

    describe('avg reducer', () => {
        it('should calculate average of numbers', () => {
            const result = reduce.avg([10, 20, 30, 40]);
            expect(result).toBe(25);
        });

        it('should return 0 for empty array', () => {
            const result = reduce.avg([]);
            expect(result).toBe(0);
        });

        it('should handle decimal precision', () => {
            const result = reduce.avg([1, 2, 3]);
            expect(result).toBeCloseTo(2, 5);
        });

        it('should re-reduce partial averages with weights', () => {
            // Partial results: { sum: number, count: number }
            const partials = [
                { sum: 30, count: 2 },  // avg: 15
                { sum: 80, count: 4 }   // avg: 20
            ];
            const result = rereduce.avg(partials);
            expect(result).toBeCloseTo(18.33, 2); // (30 + 80) / (2 + 4) = 110 / 6 ≈ 18.33
        });

        it('should handle re-reduce with zero count', () => {
            // Edge case: partial results with zero total count
            const partials = [
                { sum: 0, count: 0 },
                { sum: 0, count: 0 }
            ];
            const result = rereduce.avg(partials);
            expect(result).toBe(0);
        });

        it('should re-reduce empty array to 0', () => {
            const result = rereduce.avg([]);
            expect(result).toBe(0);
        });
    });

    describe('min reducer', () => {
        it('should find minimum value', () => {
            const result = reduce.min([5, 2, 8, 1, 9]);
            expect(result).toBe(1);
        });

        it('should return Infinity for empty array', () => {
            const result = reduce.min([]);
            expect(result).toBe(Infinity);
        });

        it('should handle negative numbers', () => {
            const result = reduce.min([-5, -10, 3, 0]);
            expect(result).toBe(-10);
        });

        it('should re-reduce partial minimums', () => {
            const partialMins = [5, 2, 8, 1];
            const result = rereduce.min(partialMins);
            expect(result).toBe(1);
        });

        it('should re-reduce empty array to Infinity', () => {
            const result = rereduce.min([]);
            expect(result).toBe(Infinity);
        });
    });

    describe('max reducer', () => {
        it('should find maximum value', () => {
            const result = reduce.max([5, 2, 8, 1, 9]);
            expect(result).toBe(9);
        });

        it('should return -Infinity for empty array', () => {
            const result = reduce.max([]);
            expect(result).toBe(-Infinity);
        });

        it('should handle negative numbers', () => {
            const result = reduce.max([-5, -10, 3, 0]);
            expect(result).toBe(3);
        });

        it('should re-reduce partial maximums', () => {
            const partialMaxs = [5, 2, 8, 1];
            const result = rereduce.max(partialMaxs);
            expect(result).toBe(8);
        });

        it('should re-reduce empty array to -Infinity', () => {
            const result = rereduce.max([]);
            expect(result).toBe(-Infinity);
        });
    });

    describe('count reducer', () => {
        it('should count elements in array', () => {
            const result = reduce.count([1, 2, 3, 4, 5]);
            expect(result).toBe(5);
        });

        it('should return 0 for empty array', () => {
            const result = reduce.count([]);
            expect(result).toBe(0);
        });

        it('should count all values regardless of content', () => {
            const result = reduce.count([1, 1, 1, 1]);
            expect(result).toBe(4);
        });

        it('should re-reduce partial counts', () => {
            const partialCounts = [3, 5, 2];
            const result = rereduce.count(partialCounts);
            expect(result).toBe(10);
        });

        it('should re-reduce empty array to 0', () => {
            const result = rereduce.count([]);
            expect(result).toBe(0);
        });
    });
});

describe('mapReduceViews - Entity Type Mappers', () => {
    describe('JournalEntry mapper', () => {
        it('should map journal entry to account key with amount value', () => {
            const mapper: Mapper<JournalEntry, string, number> = (entry) => (emit) => {
                emit(entry.accountId, entry.amount);
            };

            const entry: JournalEntry = {
                id: 'je-001',
                timestamp: '2026-01-23T10:00:00Z',
                amount: 150.50,
                accountId: 'account-abc',
                type: 'credit'
            };

            const results: Array<[string, number]> = [];
            mapper(entry)((key, value) => {
                results.push([key, value]);
            });

            expect(results).toEqual([['account-abc', 150.50]]);
        });

        it('should support multiple emit calls per entity', () => {
            // Emit both by account and by type
            const mapper: Mapper<JournalEntry, string, number> = (entry) => (emit) => {
                emit(`account:${entry.accountId}`, entry.amount);
                emit(`type:${entry.type}`, entry.amount);
            };

            const entry: JournalEntry = {
                id: 'je-001',
                timestamp: '2026-01-23T10:00:00Z',
                amount: 100,
                accountId: 'acct-123',
                type: 'debit'
            };

            const results: Array<[string, number]> = [];
            mapper(entry)((key, value) => {
                results.push([key, value]);
            });

            expect(results).toEqual([
                ['account:acct-123', 100],
                ['type:debit', 100]
            ]);
        });
    });

    describe('Ledger mapper', () => {
        it('should map ledger to currency key with balance value', () => {
            const mapper: Mapper<Ledger, string, number> = (ledger) => (emit) => {
                emit(ledger.currency, ledger.balance);
            };

            const ledger: Ledger = {
                id: 'ledger-001',
                accountId: 'acct-xyz',
                balance: 5000.00,
                currency: 'USD'
            };

            const results: Array<[string, number]> = [];
            mapper(ledger)((key, value) => {
                results.push([key, value]);
            });

            expect(results).toEqual([['USD', 5000.00]]);
        });
    });
});

describe('mapReduceViews - Integration Scenarios', () => {
    it('should perform map-reduce for account balance aggregation', () => {
        const entries: JournalEntry[] = [
            { id: 'je-001', timestamp: '2026-01-23T10:00:00Z', amount: 100, accountId: 'acct-1', type: 'credit' },
            { id: 'je-002', timestamp: '2026-01-23T11:00:00Z', amount: 50, accountId: 'acct-1', type: 'debit' },
            { id: 'je-003', timestamp: '2026-01-23T12:00:00Z', amount: 200, accountId: 'acct-2', type: 'credit' },
        ];

        // Map phase: emit account -> amount
        const grouped = new Map<string, number[]>();
        const mapper: Mapper<JournalEntry, string, number> = (entry) => (emit) => {
            emit(entry.accountId, entry.amount);
        };

        for (const entry of entries) {
            mapper(entry)((key, value) => {
                if (!grouped.has(key)) {
                    grouped.set(key, []);
                }
                grouped.get(key)!.push(value);
            });
        }

        // Reduce phase: sum amounts per account
        const reduced = new Map<string, number>();
        for (const [key, values] of grouped) {
            reduced.set(key, reduce.sum(values));
        }

        expect(reduced.get('acct-1')).toBe(150);
        expect(reduced.get('acct-2')).toBe(200);
    });

    it('should perform incremental aggregation with re-reduce', () => {
        // Simulate two batches of data
        const batch1: JournalEntry[] = [
            { id: 'je-001', timestamp: '2026-01-23T10:00:00Z', amount: 100, accountId: 'acct-1', type: 'credit' },
            { id: 'je-002', timestamp: '2026-01-23T11:00:00Z', amount: 200, accountId: 'acct-1', type: 'credit' },
        ];

        const batch2: JournalEntry[] = [
            { id: 'je-003', timestamp: '2026-01-23T12:00:00Z', amount: 150, accountId: 'acct-1', type: 'credit' },
        ];

        // Reduce batch 1
        const sum1 = reduce.sum(batch1.map(e => e.amount));
        expect(sum1).toBe(300);

        // Reduce batch 2
        const sum2 = reduce.sum(batch2.map(e => e.amount));
        expect(sum2).toBe(150);

        // Re-reduce combined results
        const total = rereduce.sum([sum1, sum2]);
        expect(total).toBe(450);

        // Verify matches direct reduction
        const allEntries = [...batch1, ...batch2];
        const directSum = reduce.sum(allEntries.map(e => e.amount));
        expect(total).toBe(directSum);
    });

    it('should calculate average across shards with re-reduce', () => {
        // Shard 1: values [10, 20, 30] -> sum: 60, count: 3
        const shard1Avg = reduce.avg([10, 20, 30]);
        expect(shard1Avg).toBe(20);

        // Shard 2: values [40, 50] -> sum: 90, count: 2
        const shard2Avg = reduce.avg([40, 50]);
        expect(shard2Avg).toBe(45);

        // Re-reduce using weighted average
        // avg.avg returns intermediate format: { sum, count }
        const shard1Intermediate = { sum: 60, count: 3 };
        const shard2Intermediate = { sum: 90, count: 2 };
        const finalAvg = rereduce.avg([shard1Intermediate, shard2Intermediate]);

        // (60 + 90) / (3 + 2) = 150 / 5 = 30
        expect(finalAvg).toBe(30);

        // Verify matches direct calculation
        const allValues = [10, 20, 30, 40, 50];
        const directAvg = reduce.avg(allValues);
        expect(finalAvg).toBe(directAvg);
    });
});

describe('mapReduceViews - Type Safety', () => {
    it('should enforce type safety in mapper key-value types', () => {
        // This test verifies TypeScript compilation catches type errors
        const mapper: Mapper<JournalEntry, string, number> = (entry) => (emit) => {
            // Valid: string key, number value
            emit(entry.accountId, entry.amount);

            // Invalid calls would cause TypeScript errors (tested at compile time):
            // emit(123, entry.amount);        // Error: key must be string
            // emit(entry.accountId, 'foo');   // Error: value must be number
        };

        const entry: JournalEntry = {
            id: 'je-001',
            timestamp: '2026-01-23T10:00:00Z',
            amount: 100,
            accountId: 'acct-1',
            type: 'credit'
        };

        const results: Array<[string, number]> = [];
        mapper(entry)((key, value) => {
            results.push([key, value]);
        });

        expect(results).toHaveLength(1);
        expect(results[0][0]).toBe('acct-1');
        expect(typeof results[0][1]).toBe('number');
    });

    it('should support complex key types for composite queries', () => {
        // Complex key: [accountId, date] for time-series queries
        type ComplexKey = [string, string];  // [accountId, date]

        const mapper: Mapper<JournalEntry, ComplexKey, number> = (entry) => (emit) => {
            const date = entry.timestamp.split('T')[0];
            emit([entry.accountId, date], entry.amount);
        };

        const entry: JournalEntry = {
            id: 'je-001',
            timestamp: '2026-01-23T10:00:00Z',
            amount: 100,
            accountId: 'acct-1',
            type: 'credit'
        };

        const results: Array<[ComplexKey, number]> = [];
        mapper(entry)((key, value) => {
            results.push([key, value]);
        });

        expect(results).toHaveLength(1);
        expect(results[0][0]).toEqual(['acct-1', '2026-01-23']);
        expect(results[0][1]).toBe(100);
    });
});
