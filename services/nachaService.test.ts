/**
 * NACHA Service Tests
 * Tests for NACHA file generation, validation, and parsing
 */

import { describe, it, expect } from 'vitest';
import {
    generateFileHeader,
    generateBatchHeader,
    generateEntryDetail,
    generateBatchControl,
    generateFileControl,
    generateNachaFile,
    validateNachaFile,
    validateACHEntry,
    validateRoutingNumber,
    validateSECCode,
    calculateRoutingCheckDigit,
    parseNachaFile,
    type NachaFile,
    type NachaBatch,
    type ACHEntry,
    type Originator
} from './nachaService';

// Test fixtures
const testOriginator: Originator = {
    name: 'Acme Corporation',
    routingNumber: '021000021', // Valid Fed routing
    accountNumber: '123456789',
    companyId: '1234567890',
    companyName: 'ACME CORP'
};

const testEntry: ACHEntry = {
    transactionCode: '22', // Credit to checking
    rdfiRoutingNumber: '121042882', // Valid routing
    rdfiAccountNumber: '987654321',
    amount: 100000, // $1,000.00 in cents
    receiverName: 'John Doe',
    receiverId: 'EMP001'
};

const testBatch: NachaBatch = {
    serviceClassCode: '200', // Mixed debits and credits
    secCode: 'CCD',
    companyEntryDescription: 'PAYROLL',
    effectiveEntryDate: new Date('2026-01-20'),
    entries: [testEntry]
};

const testFile: NachaFile = {
    fileCreationDate: new Date('2026-01-20T10:00:00'),
    immediateDestination: '021000021',
    immediateOrigin: '021000021',
    originator: testOriginator,
    batches: [testBatch]
};

describe('nachaService', () => {
    describe('Routing Number Validation', () => {
        it('validates correct routing numbers', () => {
            expect(validateRoutingNumber('021000021')).toBe(true);
            expect(validateRoutingNumber('121042882')).toBe(true);
            expect(validateRoutingNumber('091000019')).toBe(true);
        });

        it('rejects invalid routing numbers', () => {
            expect(validateRoutingNumber('123456789')).toBe(false); // Bad checksum
            expect(validateRoutingNumber('12345678')).toBe(false);  // Too short
            expect(validateRoutingNumber('1234567890')).toBe(false); // Too long
            expect(validateRoutingNumber('abcdefghi')).toBe(false);  // Non-numeric
        });

        it('calculates correct check digit', () => {
            // 021000021: check digit should be 1
            expect(calculateRoutingCheckDigit('02100002')).toBe(1);
            // 121042882: check digit should be 2
            expect(calculateRoutingCheckDigit('12104288')).toBe(2);
        });
    });

    describe('SEC Code Validation', () => {
        it('accepts valid SEC codes', () => {
            expect(validateSECCode('PPD')).toBe(true);  // Prearranged Payment and Deposit
            expect(validateSECCode('CCD')).toBe(true);  // Cash Concentration and Disbursement
            expect(validateSECCode('WEB')).toBe(true);  // Internet-initiated entries
            expect(validateSECCode('TEL')).toBe(true);  // Telephone-initiated entries
            expect(validateSECCode('CTX')).toBe(true);  // Corporate Trade Exchange
            expect(validateSECCode('IAT')).toBe(true);  // International ACH Transaction
        });

        it('rejects invalid SEC codes', () => {
            expect(validateSECCode('XXX')).toBe(false);  // Not a valid SEC code
            expect(validateSECCode('ABC')).toBe(false);  // Not a valid SEC code
            expect(validateSECCode('')).toBe(false);     // Empty string
            expect(validateSECCode('ppd')).toBe(false);  // Wrong case (case-sensitive)
        });
    });

    describe('Record Generation - Format', () => {
        it('generates file header with 94 characters', () => {
            const header = generateFileHeader(testFile);
            expect(header.length).toBe(94);
            expect(header[0]).toBe('1'); // Record Type
        });

        it('generates batch header with 94 characters', () => {
            const header = generateBatchHeader(testBatch, testOriginator, 1);
            expect(header.length).toBe(94);
            expect(header[0]).toBe('5'); // Record Type
        });

        it('generates entry detail with 94 characters', () => {
            const entry = generateEntryDetail(testEntry, testOriginator, 1);
            expect(entry.length).toBe(94);
            expect(entry[0]).toBe('6'); // Record Type
        });

        it('generates batch control with 94 characters', () => {
            const control = generateBatchControl(testBatch, testOriginator, 1);
            expect(control.length).toBe(94);
            expect(control[0]).toBe('8'); // Record Type
        });

        it('generates file control with 94 characters', () => {
            const control = generateFileControl([testBatch], testOriginator);
            expect(control.length).toBe(94);
            expect(control[0]).toBe('9'); // Record Type
        });
    });

    describe('Record Content', () => {
        it('includes correct service class code in batch header', () => {
            const header = generateBatchHeader(testBatch, testOriginator, 1);
            expect(header.slice(1, 4)).toBe('200');
        });

        it('includes transaction code in entry detail', () => {
            const entry = generateEntryDetail(testEntry, testOriginator, 1);
            expect(entry.slice(1, 3)).toBe('22');
        });

        it('formats amount with leading zeros', () => {
            const entry = generateEntryDetail(testEntry, testOriginator, 1);
            // Amount field is positions 29-38 (10 digits)
            const amountField = entry.slice(29, 39);
            expect(amountField).toBe('0000100000'); // $1,000.00 = 100000 cents
        });

        it('calculates entry hash correctly', () => {
            const control = generateBatchControl(testBatch, testOriginator, 1);
            // Entry hash is positions 10-19 (after: 1 record type + 3 service class + 6 count)
            const hashField = control.slice(10, 20);
            // First 8 digits of 121042882 = 12104288
            expect(hashField).toBe('0012104288');
        });
    });

    describe('Full File Generation', () => {
        it('generates complete file with CRLF endings', () => {
            const file = generateNachaFile(testFile);
            expect(file.includes('\r\n')).toBe(true);
        });

        it('pads to block of 10 records', () => {
            const file = generateNachaFile(testFile);
            const lines = file.split('\r\n').filter(l => l.length > 0);
            expect(lines.length % 10).toBe(0);
        });

        it('starts with file header and ends with file control/padding', () => {
            const file = generateNachaFile(testFile);
            const lines = file.split('\r\n').filter(l => l.length > 0);
            expect(lines[0][0]).toBe('1'); // File header
            // Last real record (before padding) should be file control
            const lastNonPadding = lines.find(l => l[0] === '9' && l[1] !== '9');
            expect(lastNonPadding).toBeDefined();
        });

        it('generates multiple batches correctly', () => {
            const multiFile: NachaFile = {
                ...testFile,
                batches: [testBatch, testBatch]
            };
            const file = generateNachaFile(multiFile);
            const lines = file.split('\r\n').filter(l => l.length > 0);

            // Count batch headers (type 5)
            const batchHeaders = lines.filter(l => l[0] === '5');
            expect(batchHeaders.length).toBe(2);
        });
    });

    describe('Validation', () => {
        it('validates correct file without errors', () => {
            const errors = validateNachaFile(testFile);
            const errorItems = errors.filter(e => e.severity === 'error');
            expect(errorItems.length).toBe(0);
        });

        it('detects invalid originator routing number', () => {
            const badFile: NachaFile = {
                ...testFile,
                originator: { ...testOriginator, routingNumber: '123456789' }
            };
            const errors = validateNachaFile(badFile);
            expect(errors.some(e => e.field === 'originator.routingNumber')).toBe(true);
        });

        it('detects empty batches', () => {
            const badFile: NachaFile = {
                ...testFile,
                batches: [{ ...testBatch, entries: [] }]
            };
            const errors = validateNachaFile(badFile);
            expect(errors.some(e => e.field.includes('entries'))).toBe(true);
        });

        it('detects negative amounts', () => {
            const badEntry: ACHEntry = { ...testEntry, amount: -100 };
            const errors = validateACHEntry(badEntry);
            expect(errors.some(e => e.field === 'amount')).toBe(true);
        });
    });

    describe('Parsing', () => {
        it('parses generated file back to summary', () => {
            const file = generateNachaFile(testFile);
            const result = parseNachaFile(file);

            expect(result.success).toBe(true);
            expect(result.summary?.batchCount).toBe(1);
            expect(result.summary?.entryCount).toBe(1);
        });

        it('rejects invalid content', () => {
            const result = parseNachaFile('not a nacha file');
            expect(result.success).toBe(false);
        });

        it('extracts totals from file control', () => {
            const file = generateNachaFile(testFile);
            const result = parseNachaFile(file);

            expect(result.success).toBe(true);
            // Entry is a credit (code 22), so credit total should be $1,000
            expect(result.summary?.totalCredit).toBe(1000);
        });
    });

    describe('Transaction Codes', () => {
        it('properly calculates debit totals', () => {
            const debitEntry: ACHEntry = {
                ...testEntry,
                transactionCode: '27', // Debit from checking
            };
            const debitBatch: NachaBatch = {
                ...testBatch,
                entries: [debitEntry]
            };
            const control = generateBatchControl(debitBatch, testOriginator, 1);

            // Debit total is positions 20-31 (after: 1 record type + 3 service class + 6 count + 10 hash)
            const debitField = control.slice(20, 32);
            expect(debitField).toBe('000000100000'); // $1,000.00 = 100000 cents
        });
    });
});
