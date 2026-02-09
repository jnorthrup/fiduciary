/**
 * Integration Test: Create Account -> NACHA Submission Flow
 *
 * Tests the end-to-end flow from account creation via accountService
 * through NACHA file generation via nachaService, verifying:
 * - Account creation produces valid accounts usable for ACH origination
 * - NACHA file generation outputs compliant 94-character fixed-width records
 * - All record types (1, 5, 6, 7, 8, 9) are present and correctly structured
 * - Batch totals and file control reconcile with entry amounts
 * - Validation catches invalid account data before NACHA generation
 * - Round-trip: generated files can be parsed back to summaries
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAccount,
  getAccountClass,
  type CreateAccountInput,
} from '../../services/accountService';
import {
  generateNachaFile,
  generateFileHeader,
  generateBatchHeader,
  generateEntryDetail,
  generateBatchControl,
  generateFileControl,
  generateAddendaRecord,
  validateNachaFile,
  validateACHEntry,
  validateRoutingNumber,
  parseNachaFile,
  type NachaFile,
  type NachaBatch,
  type ACHEntry,
  type Originator,
  type AddendaRecord,
} from '../../services/nachaService';
import { Account, AccountType, DCFlag } from '../../types';

// ============================================================================
// TEST CONSTANTS
// ============================================================================

const TEST_ENTITY_ID = 'entity-nacha-integration-001';

// Valid ABA routing numbers (pass check digit validation)
const VALID_ORIGINATOR_ROUTING = '021000021'; // Federal Reserve Bank of New York
const VALID_RDFI_ROUTING = '121042882';       // Wells Fargo

/**
 * Builds an Originator from a created account, simulating how the app
 * would use account data to populate NACHA originator fields.
 */
function buildOriginatorFromAccount(account: Account): Originator {
  return {
    name: account.name,
    routingNumber: VALID_ORIGINATOR_ROUTING,
    accountNumber: account.id.slice(0, 17), // Use account ID as account number (up to 17 chars)
    companyId: '1234567890',
    companyName: account.name.toUpperCase().slice(0, 23),
  };
}

/**
 * Builds an ACH entry targeting an account, simulating a payment
 * to the given receiver account.
 */
function buildACHEntryForAccount(
  receiverAccount: Account,
  amount: number,
  transactionCode: ACHEntry['transactionCode'] = '22'
): ACHEntry {
  return {
    transactionCode,
    rdfiRoutingNumber: VALID_RDFI_ROUTING,
    rdfiAccountNumber: receiverAccount.id.slice(0, 17),
    amount,
    receiverName: receiverAccount.name.slice(0, 22),
    receiverId: receiverAccount.code,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('Integration: Create Account -> NACHA Submission Flow', () => {
  let existingAccounts: Account[];

  beforeEach(() => {
    existingAccounts = [];
  });

  // --------------------------------------------------------------------------
  // End-to-end: Account Creation -> NACHA File Generation
  // --------------------------------------------------------------------------
  describe('Account creation feeds into NACHA file generation', () => {
    it('creates an operating account and generates a valid NACHA file for a single payment', () => {
      // Step 1: Create originator (sender) account
      const originatorInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Operating Account',
        type: AccountType.ASSET,
        beginningBalance: 100000, // $1,000.00
      };
      const originatorResult = createAccount(originatorInput, existingAccounts);
      expect(originatorResult.errors).toHaveLength(0);
      const originatorAccount = originatorResult.account;
      existingAccounts.push(originatorAccount);

      // Step 2: Create receiver (payee) account
      const receiverInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '2000',
        name: 'Vendor Payable',
        type: AccountType.LIABILITY,
      };
      const receiverResult = createAccount(receiverInput, existingAccounts);
      expect(receiverResult.errors).toHaveLength(0);
      const receiverAccount = receiverResult.account;
      existingAccounts.push(receiverAccount);

      // Step 3: Build NACHA structures from accounts
      const originator = buildOriginatorFromAccount(originatorAccount);
      const entry = buildACHEntryForAccount(receiverAccount, 50000); // $500.00

      const batch: NachaBatch = {
        serviceClassCode: '200',
        secCode: 'CCD',
        companyEntryDescription: 'VENDOR PMT',
        effectiveEntryDate: new Date('2026-02-10'),
        entries: [entry],
      };

      const nachaFile: NachaFile = {
        fileCreationDate: new Date('2026-02-09T14:00:00'),
        immediateDestination: VALID_ORIGINATOR_ROUTING,
        immediateOrigin: VALID_ORIGINATOR_ROUTING,
        originator,
        batches: [batch],
      };

      // Step 4: Validate before generation
      const validationErrors = validateNachaFile(nachaFile);
      const criticalErrors = validationErrors.filter(e => e.severity === 'error');
      expect(criticalErrors).toHaveLength(0);

      // Step 5: Generate NACHA file
      const fileContent = generateNachaFile(nachaFile);
      expect(fileContent).toBeTruthy();
      expect(fileContent.length).toBeGreaterThan(0);

      // Step 6: Verify 94-character record format
      const lines = fileContent.split('\r\n').filter(l => l.length > 0);
      lines.forEach((line, index) => {
        expect(line.length).toBe(94);
      });

      // Step 7: Verify record type sequence
      expect(lines[0][0]).toBe('1'); // File Header
      expect(lines[1][0]).toBe('5'); // Batch Header
      expect(lines[2][0]).toBe('6'); // Entry Detail
      expect(lines[3][0]).toBe('8'); // Batch Control

      // File Control (type 9, but not all-9s padding)
      const fileControlLine = lines.find(l => l[0] === '9' && l !== '9'.repeat(94));
      expect(fileControlLine).toBeDefined();
      expect(fileControlLine![0]).toBe('9');

      // Step 8: Verify block padding to multiple of 10
      expect(lines.length % 10).toBe(0);
    });

    it('creates multiple accounts and generates a multi-entry NACHA batch', () => {
      // Create originator
      const originatorInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Payroll Account',
        type: AccountType.ASSET,
        beginningBalance: 500000,
      };
      const originatorResult = createAccount(originatorInput, existingAccounts);
      expect(originatorResult.errors).toHaveLength(0);
      existingAccounts.push(originatorResult.account);

      // Create 3 employee expense accounts
      const employeeNames = ['Alice Johnson', 'Bob Smith', 'Carol Williams'];
      const payAmounts = [250000, 180000, 320000]; // In cents
      const employeeAccounts: Account[] = [];

      employeeNames.forEach((name, i) => {
        const input: CreateAccountInput = {
          entityId: TEST_ENTITY_ID,
          code: `5${100 + i}`,
          name: `Payroll - ${name}`,
          type: AccountType.EXPENSE,
        };
        const result = createAccount(input, existingAccounts);
        expect(result.errors).toHaveLength(0);
        existingAccounts.push(result.account);
        employeeAccounts.push(result.account);
      });

      // Build NACHA entries from employee accounts
      const entries: ACHEntry[] = employeeAccounts.map((account, i) =>
        buildACHEntryForAccount(account, payAmounts[i], '22')
      );

      const originator = buildOriginatorFromAccount(originatorResult.account);

      const batch: NachaBatch = {
        serviceClassCode: '220', // Credits only
        secCode: 'PPD',
        companyEntryDescription: 'PAYROLL',
        effectiveEntryDate: new Date('2026-02-14'),
        entries,
      };

      const nachaFile: NachaFile = {
        fileCreationDate: new Date('2026-02-09T10:00:00'),
        immediateDestination: VALID_ORIGINATOR_ROUTING,
        immediateOrigin: VALID_ORIGINATOR_ROUTING,
        originator,
        batches: [batch],
      };

      // Validate and generate
      const errors = validateNachaFile(nachaFile);
      expect(errors.filter(e => e.severity === 'error')).toHaveLength(0);

      const fileContent = generateNachaFile(nachaFile);
      const lines = fileContent.split('\r\n').filter(l => l.length > 0);

      // All records must be 94 characters
      lines.forEach(line => {
        expect(line.length).toBe(94);
      });

      // Count entry detail records (type 6)
      const entryRecords = lines.filter(l => l[0] === '6');
      expect(entryRecords.length).toBe(3);

      // Verify total credit in batch control matches sum of entries
      const batchControl = lines.find(l => l[0] === '8');
      expect(batchControl).toBeDefined();
      const totalCredit = parseInt(batchControl!.slice(32, 44), 10);
      const expectedTotal = payAmounts.reduce((sum, amt) => sum + amt, 0);
      expect(totalCredit).toBe(expectedTotal);
    });

    it('creates accounts for a multi-batch NACHA file (payroll + vendor payments)', () => {
      // Create originator account
      const originatorInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Main Operating',
        type: AccountType.ASSET,
        beginningBalance: 1000000,
      };
      const originatorResult = createAccount(originatorInput, existingAccounts);
      expect(originatorResult.errors).toHaveLength(0);
      existingAccounts.push(originatorResult.account);

      // Create payroll expense account
      const payrollInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '5000',
        name: 'Payroll Expense',
        type: AccountType.EXPENSE,
      };
      const payrollResult = createAccount(payrollInput, existingAccounts);
      expect(payrollResult.errors).toHaveLength(0);
      existingAccounts.push(payrollResult.account);

      // Create vendor payable account
      const vendorInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '2100',
        name: 'Trade Payables',
        type: AccountType.LIABILITY,
      };
      const vendorResult = createAccount(vendorInput, existingAccounts);
      expect(vendorResult.errors).toHaveLength(0);
      existingAccounts.push(vendorResult.account);

      const originator = buildOriginatorFromAccount(originatorResult.account);

      // Batch 1: Payroll (credits to employees)
      const payrollBatch: NachaBatch = {
        serviceClassCode: '220',
        secCode: 'PPD',
        companyEntryDescription: 'PAYROLL',
        effectiveEntryDate: new Date('2026-02-14'),
        entries: [
          buildACHEntryForAccount(payrollResult.account, 300000, '22'),
        ],
      };

      // Batch 2: Vendor payments (credits to vendors)
      const vendorBatch: NachaBatch = {
        serviceClassCode: '220',
        secCode: 'CCD',
        companyEntryDescription: 'VENDOR PMT',
        effectiveEntryDate: new Date('2026-02-14'),
        entries: [
          buildACHEntryForAccount(vendorResult.account, 150000, '22'),
        ],
      };

      const nachaFile: NachaFile = {
        fileCreationDate: new Date('2026-02-09T12:00:00'),
        immediateDestination: VALID_ORIGINATOR_ROUTING,
        immediateOrigin: VALID_ORIGINATOR_ROUTING,
        originator,
        batches: [payrollBatch, vendorBatch],
      };

      const fileContent = generateNachaFile(nachaFile);
      const lines = fileContent.split('\r\n').filter(l => l.length > 0);

      // All records must be 94 characters
      lines.forEach(line => {
        expect(line.length).toBe(94);
      });

      // Should have 2 batch headers and 2 batch controls
      const batchHeaders = lines.filter(l => l[0] === '5');
      const batchControls = lines.filter(l => l[0] === '8');
      expect(batchHeaders.length).toBe(2);
      expect(batchControls.length).toBe(2);

      // File control should show batch count = 2
      const fileControl = lines.find(l => l[0] === '9' && l !== '9'.repeat(94));
      expect(fileControl).toBeDefined();
      const batchCount = parseInt(fileControl!.slice(1, 7), 10);
      expect(batchCount).toBe(2);

      // Verify padded to block of 10
      expect(lines.length % 10).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // NACHA 94-character record format validation
  // --------------------------------------------------------------------------
  describe('NACHA 94-character record format compliance', () => {
    let originator: Originator;
    let receiverAccount: Account;

    beforeEach(() => {
      // Create accounts for NACHA generation
      const originatorInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Cash',
        type: AccountType.ASSET,
      };
      const result = createAccount(originatorInput, existingAccounts);
      existingAccounts.push(result.account);
      originator = buildOriginatorFromAccount(result.account);

      const receiverInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '2000',
        name: 'Accounts Payable',
        type: AccountType.LIABILITY,
      };
      const recResult = createAccount(receiverInput, existingAccounts);
      existingAccounts.push(recResult.account);
      receiverAccount = recResult.account;
    });

    it('File Header (Type 1) is exactly 94 characters and starts with "1"', () => {
      const nachaFile: NachaFile = {
        fileCreationDate: new Date('2026-02-09T10:00:00'),
        immediateDestination: VALID_ORIGINATOR_ROUTING,
        immediateOrigin: VALID_ORIGINATOR_ROUTING,
        originator,
        batches: [],
      };

      const header = generateFileHeader(nachaFile);
      expect(header.length).toBe(94);
      expect(header[0]).toBe('1');
      expect(header.slice(1, 3)).toBe('01'); // Priority code
      expect(header.slice(34, 37)).toBe('094'); // Record size
      expect(header.slice(37, 39)).toBe('10');  // Blocking factor
      expect(header[39]).toBe('1');             // Format code
    });

    it('Batch Header (Type 5) is exactly 94 characters', () => {
      const entry = buildACHEntryForAccount(receiverAccount, 10000);
      const batch: NachaBatch = {
        serviceClassCode: '200',
        secCode: 'CCD',
        companyEntryDescription: 'PAYMENT',
        effectiveEntryDate: new Date('2026-02-10'),
        entries: [entry],
      };

      const header = generateBatchHeader(batch, originator, 1);
      expect(header.length).toBe(94);
      expect(header[0]).toBe('5');
      expect(header.slice(1, 4)).toBe('200'); // Service class code
      expect(header.slice(50, 53)).toBe('CCD'); // SEC code
    });

    it('Entry Detail (Type 6) is exactly 94 characters with correct field positions', () => {
      const entry = buildACHEntryForAccount(receiverAccount, 100000);
      const detail = generateEntryDetail(entry, originator, 1);

      expect(detail.length).toBe(94);
      expect(detail[0]).toBe('6');
      expect(detail.slice(1, 3)).toBe('22'); // Transaction code

      // RDFI routing (first 8 digits)
      expect(detail.slice(3, 11)).toBe(VALID_RDFI_ROUTING.slice(0, 8));

      // Amount field: positions 29-38 (10 digits, zero-padded)
      const amountField = detail.slice(29, 39);
      expect(amountField).toBe('0000100000'); // $1,000.00
    });

    it('Addenda Record (Type 7) is exactly 94 characters', () => {
      const addenda: AddendaRecord = {
        typeCode: '05',
        paymentInfo: 'Invoice 12345 - February 2026 services',
      };

      const record = generateAddendaRecord(addenda, 1);
      expect(record.length).toBe(94);
      expect(record[0]).toBe('7');
      expect(record.slice(1, 3)).toBe('05'); // Addenda type code
    });

    it('Batch Control (Type 8) is exactly 94 characters', () => {
      const entry = buildACHEntryForAccount(receiverAccount, 100000);
      const batch: NachaBatch = {
        serviceClassCode: '200',
        secCode: 'CCD',
        companyEntryDescription: 'PAYMENT',
        effectiveEntryDate: new Date('2026-02-10'),
        entries: [entry],
      };

      const control = generateBatchControl(batch, originator, 1);
      expect(control.length).toBe(94);
      expect(control[0]).toBe('8');
      expect(control.slice(1, 4)).toBe('200'); // Service class code
    });

    it('File Control (Type 9) is exactly 94 characters', () => {
      const entry = buildACHEntryForAccount(receiverAccount, 100000);
      const batch: NachaBatch = {
        serviceClassCode: '200',
        secCode: 'CCD',
        companyEntryDescription: 'PAYMENT',
        effectiveEntryDate: new Date('2026-02-10'),
        entries: [entry],
      };

      const control = generateFileControl([batch], originator);
      expect(control.length).toBe(94);
      expect(control[0]).toBe('9');
    });

    it('padding records are exactly 94 nines', () => {
      const entry = buildACHEntryForAccount(receiverAccount, 100000);
      const batch: NachaBatch = {
        serviceClassCode: '200',
        secCode: 'CCD',
        companyEntryDescription: 'PAYMENT',
        effectiveEntryDate: new Date('2026-02-10'),
        entries: [entry],
      };

      const nachaFile: NachaFile = {
        fileCreationDate: new Date('2026-02-09T10:00:00'),
        immediateDestination: VALID_ORIGINATOR_ROUTING,
        immediateOrigin: VALID_ORIGINATOR_ROUTING,
        originator,
        batches: [batch],
      };

      const fileContent = generateNachaFile(nachaFile);
      const lines = fileContent.split('\r\n').filter(l => l.length > 0);

      // Padding lines should be all 9s
      const paddingLines = lines.filter(l => l === '9'.repeat(94));
      expect(paddingLines.length).toBeGreaterThan(0);
      paddingLines.forEach(pad => {
        expect(pad.length).toBe(94);
        expect(pad).toBe('9'.repeat(94));
      });
    });
  });

  // --------------------------------------------------------------------------
  // Batch totals and file control reconciliation
  // --------------------------------------------------------------------------
  describe('Batch totals and file control reconciliation', () => {
    it('batch control debit/credit totals match entry amounts', () => {
      // Create accounts
      const originatorInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Operating',
        type: AccountType.ASSET,
      };
      const origResult = createAccount(originatorInput, existingAccounts);
      existingAccounts.push(origResult.account);

      const receiverInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '2000',
        name: 'Vendor AP',
        type: AccountType.LIABILITY,
      };
      const recResult = createAccount(receiverInput, existingAccounts);
      existingAccounts.push(recResult.account);

      const originator = buildOriginatorFromAccount(origResult.account);

      // Mix of credits and debits
      const entries: ACHEntry[] = [
        buildACHEntryForAccount(recResult.account, 100000, '22'), // Credit $1,000
        buildACHEntryForAccount(recResult.account, 50000, '22'),  // Credit $500
        buildACHEntryForAccount(recResult.account, 75000, '27'),  // Debit $750
      ];

      const batch: NachaBatch = {
        serviceClassCode: '200', // Mixed
        secCode: 'CCD',
        companyEntryDescription: 'MIXED PMT',
        effectiveEntryDate: new Date('2026-02-10'),
        entries,
      };

      const control = generateBatchControl(batch, originator, 1);

      // Debit total: positions 20-31 (12 digits)
      const debitTotal = parseInt(control.slice(20, 32), 10);
      expect(debitTotal).toBe(75000); // Only the debit entry

      // Credit total: positions 32-43 (12 digits)
      const creditTotal = parseInt(control.slice(32, 44), 10);
      expect(creditTotal).toBe(150000); // Sum of credit entries
    });

    it('file control entry count matches total entries across batches', () => {
      const originatorInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Main Account',
        type: AccountType.ASSET,
      };
      const origResult = createAccount(originatorInput, existingAccounts);
      existingAccounts.push(origResult.account);

      const receiverInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '2000',
        name: 'Payee',
        type: AccountType.LIABILITY,
      };
      const recResult = createAccount(receiverInput, existingAccounts);
      existingAccounts.push(recResult.account);

      const originator = buildOriginatorFromAccount(origResult.account);

      const batch1: NachaBatch = {
        serviceClassCode: '200',
        secCode: 'CCD',
        companyEntryDescription: 'BATCH1',
        effectiveEntryDate: new Date('2026-02-10'),
        entries: [
          buildACHEntryForAccount(recResult.account, 10000, '22'),
          buildACHEntryForAccount(recResult.account, 20000, '22'),
        ],
      };

      const batch2: NachaBatch = {
        serviceClassCode: '200',
        secCode: 'PPD',
        companyEntryDescription: 'BATCH2',
        effectiveEntryDate: new Date('2026-02-10'),
        entries: [
          buildACHEntryForAccount(recResult.account, 30000, '22'),
        ],
      };

      const fileControl = generateFileControl([batch1, batch2], originator);

      // Entry/Addenda count: positions 13-20 (8 digits)
      const entryCount = parseInt(fileControl.slice(13, 21), 10);
      expect(entryCount).toBe(3); // 2 + 1 entries total
    });

    it('round-trip: generated file parses back to correct summary', () => {
      const originatorInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Operating Cash',
        type: AccountType.ASSET,
      };
      const origResult = createAccount(originatorInput, existingAccounts);
      existingAccounts.push(origResult.account);

      const receiverInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '2000',
        name: 'Vendor AP',
        type: AccountType.LIABILITY,
      };
      const recResult = createAccount(receiverInput, existingAccounts);
      existingAccounts.push(recResult.account);

      const originator = buildOriginatorFromAccount(origResult.account);

      const entries: ACHEntry[] = [
        buildACHEntryForAccount(recResult.account, 100000, '22'),
        buildACHEntryForAccount(recResult.account, 200000, '22'),
      ];

      const batch: NachaBatch = {
        serviceClassCode: '220',
        secCode: 'CCD',
        companyEntryDescription: 'PAYMENT',
        effectiveEntryDate: new Date('2026-02-10'),
        entries,
      };

      const nachaFile: NachaFile = {
        fileCreationDate: new Date('2026-02-09T10:00:00'),
        immediateDestination: VALID_ORIGINATOR_ROUTING,
        immediateOrigin: VALID_ORIGINATOR_ROUTING,
        originator,
        batches: [batch],
      };

      // Generate and parse back
      const fileContent = generateNachaFile(nachaFile);
      const parsed = parseNachaFile(fileContent);

      expect(parsed.success).toBe(true);
      expect(parsed.summary).toBeDefined();
      expect(parsed.summary!.batchCount).toBe(1);
      expect(parsed.summary!.entryCount).toBe(2);
      expect(parsed.summary!.totalCredit).toBe(3000); // (100000 + 200000) / 100
    });
  });

  // --------------------------------------------------------------------------
  // NACHA entry with addenda records
  // --------------------------------------------------------------------------
  describe('Entries with addenda records', () => {
    it('generates entry with addenda and validates 94-char format for both', () => {
      const originatorInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Treasury',
        type: AccountType.ASSET,
      };
      const origResult = createAccount(originatorInput, existingAccounts);
      existingAccounts.push(origResult.account);

      const receiverInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '2000',
        name: 'Contractor Payable',
        type: AccountType.LIABILITY,
      };
      const recResult = createAccount(receiverInput, existingAccounts);
      existingAccounts.push(recResult.account);

      const originator = buildOriginatorFromAccount(origResult.account);

      const entry: ACHEntry = {
        ...buildACHEntryForAccount(recResult.account, 500000, '22'),
        addendaRecord: {
          typeCode: '05',
          paymentInfo: 'INV-2026-0209 Consulting Feb 2026',
        },
      };

      const batch: NachaBatch = {
        serviceClassCode: '220',
        secCode: 'CCD',
        companyEntryDescription: 'CONTRACTOR',
        effectiveEntryDate: new Date('2026-02-14'),
        entries: [entry],
      };

      const nachaFile: NachaFile = {
        fileCreationDate: new Date('2026-02-09T15:00:00'),
        immediateDestination: VALID_ORIGINATOR_ROUTING,
        immediateOrigin: VALID_ORIGINATOR_ROUTING,
        originator,
        batches: [batch],
      };

      const fileContent = generateNachaFile(nachaFile);
      const lines = fileContent.split('\r\n').filter(l => l.length > 0);

      // All lines must be 94 chars
      lines.forEach(line => {
        expect(line.length).toBe(94);
      });

      // Should contain type 7 addenda record
      const addendaLines = lines.filter(l => l[0] === '7');
      expect(addendaLines.length).toBe(1);
      expect(addendaLines[0].slice(1, 3)).toBe('05');

      // Entry detail should have addenda indicator = '1'
      const entryLine = lines.find(l => l[0] === '6');
      expect(entryLine).toBeDefined();
      // Addenda indicator is at position 78
      expect(entryLine![78]).toBe('1');
    });
  });

  // --------------------------------------------------------------------------
  // Error cases: invalid account data for NACHA
  // --------------------------------------------------------------------------
  describe('Error cases: invalid account data for NACHA generation', () => {
    it('validateNachaFile catches invalid originator routing number', () => {
      const originatorInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Bad Routing Account',
        type: AccountType.ASSET,
      };
      const origResult = createAccount(originatorInput, existingAccounts);
      existingAccounts.push(origResult.account);

      // Build originator with bad routing number
      const originator: Originator = {
        ...buildOriginatorFromAccount(origResult.account),
        routingNumber: '999999999', // Invalid check digit
      };

      const entry: ACHEntry = {
        transactionCode: '22',
        rdfiRoutingNumber: VALID_RDFI_ROUTING,
        rdfiAccountNumber: '123456789',
        amount: 10000,
        receiverName: 'Test Receiver',
      };

      const batch: NachaBatch = {
        serviceClassCode: '200',
        secCode: 'CCD',
        companyEntryDescription: 'TEST',
        effectiveEntryDate: new Date('2026-02-10'),
        entries: [entry],
      };

      const nachaFile: NachaFile = {
        fileCreationDate: new Date('2026-02-09T10:00:00'),
        immediateDestination: VALID_ORIGINATOR_ROUTING,
        immediateOrigin: VALID_ORIGINATOR_ROUTING,
        originator,
        batches: [batch],
      };

      const errors = validateNachaFile(nachaFile);
      expect(errors.some(e => e.field === 'originator.routingNumber')).toBe(true);
      expect(errors.some(e => e.severity === 'error')).toBe(true);
    });

    it('validateNachaFile catches invalid RDFI routing in entry', () => {
      const originatorInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Valid Originator',
        type: AccountType.ASSET,
      };
      const origResult = createAccount(originatorInput, existingAccounts);
      existingAccounts.push(origResult.account);

      const originator = buildOriginatorFromAccount(origResult.account);

      const entry: ACHEntry = {
        transactionCode: '22',
        rdfiRoutingNumber: '123456789', // Invalid check digit
        rdfiAccountNumber: '987654321',
        amount: 10000,
        receiverName: 'Bad Routing Receiver',
      };

      const batch: NachaBatch = {
        serviceClassCode: '200',
        secCode: 'CCD',
        companyEntryDescription: 'TEST',
        effectiveEntryDate: new Date('2026-02-10'),
        entries: [entry],
      };

      const nachaFile: NachaFile = {
        fileCreationDate: new Date('2026-02-09T10:00:00'),
        immediateDestination: VALID_ORIGINATOR_ROUTING,
        immediateOrigin: VALID_ORIGINATOR_ROUTING,
        originator,
        batches: [batch],
      };

      const errors = validateNachaFile(nachaFile);
      const rdfiErrors = errors.filter(e => e.field.includes('rdfiRoutingNumber'));
      expect(rdfiErrors.length).toBeGreaterThan(0);
    });

    it('validateACHEntry catches negative amount', () => {
      const receiverInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '2000',
        name: 'Negative Test',
        type: AccountType.LIABILITY,
      };
      const recResult = createAccount(receiverInput, existingAccounts);
      existingAccounts.push(recResult.account);

      const entry: ACHEntry = {
        transactionCode: '22',
        rdfiRoutingNumber: VALID_RDFI_ROUTING,
        rdfiAccountNumber: recResult.account.id.slice(0, 17),
        amount: -5000, // Negative!
        receiverName: recResult.account.name,
      };

      const errors = validateACHEntry(entry);
      expect(errors.some(e => e.field === 'amount')).toBe(true);
    });

    it('validateACHEntry catches empty receiver name', () => {
      const entry: ACHEntry = {
        transactionCode: '22',
        rdfiRoutingNumber: VALID_RDFI_ROUTING,
        rdfiAccountNumber: '123456789',
        amount: 10000,
        receiverName: '', // Empty!
      };

      const errors = validateACHEntry(entry);
      expect(errors.some(e => e.field === 'receiverName')).toBe(true);
    });

    it('validateNachaFile catches empty batch (no entries)', () => {
      const originatorInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Empty Batch Originator',
        type: AccountType.ASSET,
      };
      const origResult = createAccount(originatorInput, existingAccounts);
      existingAccounts.push(origResult.account);

      const originator = buildOriginatorFromAccount(origResult.account);

      const nachaFile: NachaFile = {
        fileCreationDate: new Date('2026-02-09T10:00:00'),
        immediateDestination: VALID_ORIGINATOR_ROUTING,
        immediateOrigin: VALID_ORIGINATOR_ROUTING,
        originator,
        batches: [{
          serviceClassCode: '200',
          secCode: 'CCD',
          companyEntryDescription: 'EMPTY',
          effectiveEntryDate: new Date('2026-02-10'),
          entries: [], // No entries!
        }],
      };

      const errors = validateNachaFile(nachaFile);
      expect(errors.some(e => e.field.includes('entries') && e.severity === 'error')).toBe(true);
    });

    it('parseNachaFile rejects non-NACHA content', () => {
      const result = parseNachaFile('This is not a NACHA file at all');
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('account creation validation prevents using invalid accounts for NACHA', () => {
      // Attempt to create account with missing fields
      const badInput: CreateAccountInput = {
        entityId: '',
        code: '',
        name: '',
        type: AccountType.ASSET,
      };

      const result = createAccount(badInput, existingAccounts);
      expect(result.errors.length).toBeGreaterThan(0);

      // Cannot build a valid NACHA originator from a failed account creation
      // This ensures the flow guards against bad data at account creation time
      expect(result.account).toBeFalsy();
    });
  });

  // --------------------------------------------------------------------------
  // Transaction code coverage (debit and credit flows)
  // --------------------------------------------------------------------------
  describe('Transaction code coverage', () => {
    it('handles debit transactions (code 27) with correct batch totals', () => {
      const originatorInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Collection Account',
        type: AccountType.ASSET,
      };
      const origResult = createAccount(originatorInput, existingAccounts);
      existingAccounts.push(origResult.account);

      const receiverInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '1100',
        name: 'Receivable',
        type: AccountType.ASSET,
      };
      const recResult = createAccount(receiverInput, existingAccounts);
      existingAccounts.push(recResult.account);

      const originator = buildOriginatorFromAccount(origResult.account);

      // Debit entry (collecting payment)
      const entry = buildACHEntryForAccount(recResult.account, 250000, '27');

      const batch: NachaBatch = {
        serviceClassCode: '225', // Debits only
        secCode: 'WEB',
        companyEntryDescription: 'COLLECTION',
        effectiveEntryDate: new Date('2026-02-10'),
        entries: [entry],
      };

      const nachaFile: NachaFile = {
        fileCreationDate: new Date('2026-02-09T10:00:00'),
        immediateDestination: VALID_ORIGINATOR_ROUTING,
        immediateOrigin: VALID_ORIGINATOR_ROUTING,
        originator,
        batches: [batch],
      };

      const fileContent = generateNachaFile(nachaFile);
      const lines = fileContent.split('\r\n').filter(l => l.length > 0);

      // All 94-char
      lines.forEach(line => expect(line.length).toBe(94));

      // Verify entry has transaction code 27
      const entryLine = lines.find(l => l[0] === '6');
      expect(entryLine!.slice(1, 3)).toBe('27');

      // Batch control debit total should be 250000
      const batchControl = lines.find(l => l[0] === '8');
      const debitTotal = parseInt(batchControl!.slice(20, 32), 10);
      expect(debitTotal).toBe(250000);

      // Credit total should be 0
      const creditTotal = parseInt(batchControl!.slice(32, 44), 10);
      expect(creditTotal).toBe(0);
    });

    it('handles savings account transactions (codes 32, 37)', () => {
      const originatorInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Savings Transfer Account',
        type: AccountType.ASSET,
      };
      const origResult = createAccount(originatorInput, existingAccounts);
      existingAccounts.push(origResult.account);

      const receiverInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '1200',
        name: 'Savings Destination',
        type: AccountType.ASSET,
      };
      const recResult = createAccount(receiverInput, existingAccounts);
      existingAccounts.push(recResult.account);

      const originator = buildOriginatorFromAccount(origResult.account);

      const entries: ACHEntry[] = [
        buildACHEntryForAccount(recResult.account, 100000, '32'), // Credit to savings
        buildACHEntryForAccount(recResult.account, 50000, '37'),  // Debit from savings
      ];

      const batch: NachaBatch = {
        serviceClassCode: '200',
        secCode: 'PPD',
        companyEntryDescription: 'SAVINGS',
        effectiveEntryDate: new Date('2026-02-10'),
        entries,
      };

      const control = generateBatchControl(batch, originator, 1);
      expect(control.length).toBe(94);

      // Debit total (code 37)
      const debitTotal = parseInt(control.slice(20, 32), 10);
      expect(debitTotal).toBe(50000);

      // Credit total (code 32)
      const creditTotal = parseInt(control.slice(32, 44), 10);
      expect(creditTotal).toBe(100000);
    });
  });

  // --------------------------------------------------------------------------
  // CRLF line endings verification
  // --------------------------------------------------------------------------
  describe('NACHA file format requirements', () => {
    it('uses CRLF line endings per NACHA specification', () => {
      const originatorInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'CRLF Test Account',
        type: AccountType.ASSET,
      };
      const origResult = createAccount(originatorInput, existingAccounts);
      existingAccounts.push(origResult.account);

      const receiverInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '2000',
        name: 'CRLF Receiver',
        type: AccountType.LIABILITY,
      };
      const recResult = createAccount(receiverInput, existingAccounts);
      existingAccounts.push(recResult.account);

      const originator = buildOriginatorFromAccount(origResult.account);
      const entry = buildACHEntryForAccount(recResult.account, 10000, '22');

      const batch: NachaBatch = {
        serviceClassCode: '220',
        secCode: 'CCD',
        companyEntryDescription: 'TEST',
        effectiveEntryDate: new Date('2026-02-10'),
        entries: [entry],
      };

      const nachaFile: NachaFile = {
        fileCreationDate: new Date('2026-02-09T10:00:00'),
        immediateDestination: VALID_ORIGINATOR_ROUTING,
        immediateOrigin: VALID_ORIGINATOR_ROUTING,
        originator,
        batches: [batch],
      };

      const fileContent = generateNachaFile(nachaFile);

      // Must contain CRLF
      expect(fileContent.includes('\r\n')).toBe(true);

      // Should not contain bare LF without CR
      const withoutCRLF = fileContent.replace(/\r\n/g, '');
      expect(withoutCRLF.includes('\n')).toBe(false);
    });

    it('file ends with CRLF', () => {
      const originatorInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'End Test',
        type: AccountType.ASSET,
      };
      const origResult = createAccount(originatorInput, existingAccounts);
      existingAccounts.push(origResult.account);

      const receiverInput: CreateAccountInput = {
        entityId: TEST_ENTITY_ID,
        code: '2000',
        name: 'End Receiver',
        type: AccountType.LIABILITY,
      };
      const recResult = createAccount(receiverInput, existingAccounts);
      existingAccounts.push(recResult.account);

      const originator = buildOriginatorFromAccount(origResult.account);
      const entry = buildACHEntryForAccount(recResult.account, 10000, '22');

      const batch: NachaBatch = {
        serviceClassCode: '220',
        secCode: 'CCD',
        companyEntryDescription: 'TEST',
        effectiveEntryDate: new Date('2026-02-10'),
        entries: [entry],
      };

      const nachaFile: NachaFile = {
        fileCreationDate: new Date('2026-02-09T10:00:00'),
        immediateDestination: VALID_ORIGINATOR_ROUTING,
        immediateOrigin: VALID_ORIGINATOR_ROUTING,
        originator,
        batches: [batch],
      };

      const fileContent = generateNachaFile(nachaFile);
      expect(fileContent.endsWith('\r\n')).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Routing number validation integration
  // --------------------------------------------------------------------------
  describe('Routing number validation in NACHA context', () => {
    it('accepts known valid routing numbers used in account flow', () => {
      expect(validateRoutingNumber(VALID_ORIGINATOR_ROUTING)).toBe(true);
      expect(validateRoutingNumber(VALID_RDFI_ROUTING)).toBe(true);
    });

    it('rejects routing numbers that would cause NACHA validation failures', () => {
      expect(validateRoutingNumber('123456789')).toBe(false); // Bad check digit
      expect(validateRoutingNumber('999999999')).toBe(false); // Bad check digit
      expect(validateRoutingNumber('abcdefghi')).toBe(false); // Non-numeric
      expect(validateRoutingNumber('12345')).toBe(false);     // Too short
    });
  });
});
