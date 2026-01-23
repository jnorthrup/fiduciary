/**
 * Tests for JSONL Serializer
 * Tests JSONL (JSON Lines) serialization/deserialization for all entity types
 */

import { describe, it, expect } from 'vitest';
import {
    serializeToJSONL,
    deserializeJSONL,
    validateJSONLine
} from './jsonlSerializer.js';
import type { Account } from '../../types/accounts.js';
import type { Entity } from '../../types/entities.js';
import type { JournalEntry } from '../../types/accounts.js';
import type { UnifiedTransaction } from '../../types/banking/core.js';

// Test data fixtures
const mockAccount: Account = {
    id: 'acc-123',
    entityId: 'entity-456',
    code: '1000',
    name: 'Cash in Bank',
    type: 'Asset' as any,
    normalBalance: 'Debit' as any,
    balance: 500000,
    accountClass: 'Debit',
    isActive: true,
    description: 'Primary operating account',
    _version: '1.0.0'
};

const mockEntity: Entity = {
    id: 'entity-789',
    name: 'Smith Family Trust',
    type: 'TRUST' as any,
    role: 'HOLDING_TRUST' as any,
    parentEntityId: null,
    einLast4: '6789',
    regionCode: 'CA',
    trustSubType: 'REVOCABLE' as any,
    uiPosition: { x: 100, y: 200 },
    _version: '1.0.0'
};

const mockJournalEntry: JournalEntry = {
    id: 'je-001',
    entityId: 'entity-456',
    date: '2024-01-15',
    memo: 'Initial deposit',
    type: 'general',
    lines: [
        {
            id: 'line-1',
            accountId: 'acc-123',
            accountCode: '1000',
            accountName: 'Cash in Bank',
            dc: 'Debit' as any,
            amount: 500000,
            description: 'Initial funding'
        },
        {
            id: 'line-2',
            accountCode: '3000',
            accountName: 'Equity',
            dc: 'Credit' as any,
            amount: 500000
        }
    ],
    locked: false,
    _version: '1.0.0'
};

const mockTransaction: UnifiedTransaction = {
    id: 'txn-001',
    provider: 'plaid' as any,
    providerTransactionId: 'plaid-txn-123',
    accountId: 'acc-123',
    amount: 15000,
    currency: 'USD',
    description: 'ACH Deposit - Payroll',
    category: 'Income',
    type: 'ach' as any,
    direction: 'credit' as any,
    status: 'booked' as any,
    bookedAt: '2024-01-15T10:30:00Z',
    valueAt: '2024-01-15T10:30:00Z',
    createdAt: '2024-01-15T10:30:00Z'
};

describe('JSONL Serializer - validateJSONLine', () => {
    it('should return true for valid JSON object', () => {
        const line = '{"id":"123","name":"test"}';
        expect(validateJSONLine(line)).toBe(true);
    });

    it('should return true for valid JSON array', () => {
        const line = '[1,2,3]';
        expect(validateJSONLine(line)).toBe(true);
    });

    it('should return true for valid JSON string', () => {
        const line = '"just a string"';
        expect(validateJSONLine(line)).toBe(true);
    });

    it('should return true for valid JSON number', () => {
        const line = '42';
        expect(validateJSONLine(line)).toBe(true);
    });

    it('should return true for valid JSON boolean', () => {
        expect(validateJSONLine('true')).toBe(true);
        expect(validateJSONLine('false')).toBe(true);
    });

    it('should return true for valid JSON null', () => {
        expect(validateJSONLine('null')).toBe(true);
    });

    it('should return false for invalid JSON', () => {
        expect(validateJSONLine('{invalid}')).toBe(false);
        expect(validateJSONLine('{"unclosed": true')).toBe(false);
        expect(validateJSONLine('undefined')).toBe(false);
        expect(validateJSONLine('')).toBe(false);
    });

    it('should return false for trailing comma', () => {
        expect(validateJSONLine('{"a":1,}')).toBe(false);
        expect(validateJSONLine('[1,2,]')).toBe(false);
    });

    it('should return false for unquoted keys', () => {
        expect(validateJSONLine('{a: 1}')).toBe(false);
    });

    it('should return true for empty object', () => {
        expect(validateJSONLine('{}')).toBe(true);
    });

    it('should return true for empty array', () => {
        expect(validateJSONLine('[]')).toBe(true);
    });

    it('should return true for nested objects', () => {
        const line = '{"user":{"name":"test","address":{"city":"NYC"}}}';
        expect(validateJSONLine(line)).toBe(true);
    });

    it('should handle whitespace', () => {
        expect(validateJSONLine('  { "id": "123" }  ')).toBe(true);
    });
});

describe('JSONL Serializer - serializeToJSONL', () => {
    it('should serialize Account to JSONL format with newline', () => {
        const result = serializeToJSONL(mockAccount);
        expect(result).toContain('\n');
        expect(result.trim().length).toBeLessThan(result.length);
    });

    it('should serialize Account to valid JSON', () => {
        const result = serializeToJSONL(mockAccount);
        const trimmed = result.trim();
        const parsed = JSON.parse(trimmed);
        expect(parsed).toEqual(mockAccount);
    });

    it('should serialize Entity to valid JSONL', () => {
        const result = serializeToJSONL(mockEntity);
        const trimmed = result.trim();
        const parsed = JSON.parse(trimmed);
        expect(parsed).toEqual(mockEntity);
    });

    it('should serialize JournalEntry to valid JSONL', () => {
        const result = serializeToJSONL(mockJournalEntry);
        const trimmed = result.trim();
        const parsed = JSON.parse(trimmed);
        expect(parsed).toEqual(mockJournalEntry);
    });

    it('should serialize Transaction to valid JSONL', () => {
        const result = serializeToJSONL(mockTransaction);
        const trimmed = result.trim();
        const parsed = JSON.parse(trimmed);
        expect(parsed).toEqual(mockTransaction);
    });

    it('should serialize primitive types', () => {
        expect(serializeToJSONL('string')).toMatchInlineSnapshot(`""string"\n"`);
        expect(serializeToJSONL(42)).toMatchInlineSnapshot(`"42\n"`);
        expect(serializeToJSONL(true)).toMatchInlineSnapshot(`"true\n"`);
        expect(serializeToJSONL(null)).toMatchInlineSnapshot(`"null\n"`);
    });

    it('should serialize arrays', () => {
        const arr = [1, 2, 3];
        const result = serializeToJSONL(arr);
        const trimmed = result.trim();
        expect(JSON.parse(trimmed)).toEqual(arr);
    });

    it('should serialize nested objects', () => {
        const nested = { outer: { inner: { value: 42 } } };
        const result = serializeToJSONL(nested);
        const trimmed = result.trim();
        expect(JSON.parse(trimmed)).toEqual(nested);
    });

    it('should handle special characters in strings', () => {
        const special = { text: 'Line 1\nLine 2\tTabbed' };
        const result = serializeToJSONL(special);
        const trimmed = result.trim();
        expect(JSON.parse(trimmed)).toEqual(special);
    });

    it('should handle unicode characters', () => {
        const unicode = { emoji: '', text: 'Hello 世界' };
        const result = serializeToJSONL(unicode);
        const trimmed = result.trim();
        expect(JSON.parse(trimmed)).toEqual(unicode);
    });
});

describe('JSONL Serializer - deserializeJSONL', () => {
    it('should deserialize Account JSONL line', () => {
        const line = serializeToJSONL(mockAccount).trim();
        const result = deserializeJSONL<Account>(line);
        expect(result).toEqual(mockAccount);
    });

    it('should deserialize Entity JSONL line', () => {
        const line = serializeToJSONL(mockEntity).trim();
        const result = deserializeJSONL<Entity>(line);
        expect(result).toEqual(mockEntity);
    });

    it('should deserialize JournalEntry JSONL line', () => {
        const line = serializeToJSONL(mockJournalEntry).trim();
        const result = deserializeJSONL<JournalEntry>(line);
        expect(result).toEqual(mockJournalEntry);
    });

    it('should deserialize Transaction JSONL line', () => {
        const line = serializeToJSONL(mockTransaction).trim();
        const result = deserializeJSONL<UnifiedTransaction>(line);
        expect(result).toEqual(mockTransaction);
    });

    it('should deserialize primitive types', () => {
        expect(deserializeJSONL<string>(serializeToJSONL('hello').trim())).toBe('hello');
        expect(deserializeJSONL<number>(serializeToJSONL(42).trim())).toBe(42);
        expect(deserializeJSONL<boolean>(serializeToJSONL(true).trim())).toBe(true);
        expect(deserializeJSONL<null>(serializeToJSONL(null).trim())).toBeNull();
    });

    it('should deserialize arrays', () => {
        const arr = [1, 2, 3];
        const line = serializeToJSONL(arr).trim();
        expect(deserializeJSONL<number[]>(line)).toEqual(arr);
    });

    it('should handle numeric strings as strings', () => {
        const line = serializeToJSONL('12345').trim();
        expect(deserializeJSONL<string>(line)).toBe('12345');
        expect(typeof deserializeJSONL<string>(line)).toBe('string');
    });

    it('should handle empty object', () => {
        const line = serializeToJSONL({}).trim();
        expect(deserializeJSONL<Record<string, never>>(line)).toEqual({});
    });

    it('should handle empty array', () => {
        const line = serializeToJSONL([]).trim();
        expect(deserializeJSONL<unknown[]>(line)).toEqual([]);
    });
});

describe('JSONL Serializer - round-trip', () => {
    it('should round-trip Account', () => {
        const serialized = serializeToJSONL(mockAccount);
        const deserialized = deserializeJSONL<Account>(serialized.trim());
        expect(deserialized).toEqual(mockAccount);
    });

    it('should round-trip Entity', () => {
        const serialized = serializeToJSONL(mockEntity);
        const deserialized = deserializeJSONL<Entity>(serialized.trim());
        expect(deserialized).toEqual(mockEntity);
    });

    it('should round-trip JournalEntry', () => {
        const serialized = serializeToJSONL(mockJournalEntry);
        const deserialized = deserializeJSONL<JournalEntry>(serialized.trim());
        expect(deserialized).toEqual(mockJournalEntry);
    });

    it('should round-trip Transaction', () => {
        const serialized = serializeToJSONL(mockTransaction);
        const deserialized = deserializeJSONL<UnifiedTransaction>(serialized.trim());
        expect(deserialized).toEqual(mockTransaction);
    });
});

describe('JSONL Serializer - error handling', () => {
    it('should throw on invalid JSON in deserialize', () => {
        expect(() => deserializeJSONL<any>('{invalid}')).toThrow();
    });

    it('should throw on undefined input to serialize', () => {
        expect(() => serializeToJSONL(undefined as any)).toThrow();
    });

    it('should throw on function input to serialize', () => {
        const fn = () => {};
        expect(() => serializeToJSONL(fn as any)).toThrow();
    });

    it('should handle circular references', () => {
        const circular: any = { name: 'test' };
        circular.self = circular;
        expect(() => serializeToJSONL(circular)).toThrow();
    });
});
