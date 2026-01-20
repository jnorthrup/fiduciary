/**
 * NACHA File Generation Service
 * 
 * Generates NACHA-compliant ACH files in the standard 94-character fixed-width format.
 * Implements Record Types 1, 5, 6, 7, 8, 9 per NACHA Operating Rules.
 * 
 * Reference: NACHA Operating Rules & Guidelines
 */

// ============================================================================
// TYPES
// ============================================================================

export type SECCode = 'CCD' | 'PPD' | 'WEB' | 'TEL' | 'CTX' | 'IAT';
export type TransactionCode = '22' | '23' | '27' | '28' | '32' | '33' | '37' | '38';
export type ServiceClassCode = '200' | '220' | '225';

export interface Originator {
    name: string;
    routingNumber: string;  // 9 digits with check digit
    accountNumber: string;
    companyId: string;      // Usually EIN with prefix, 10 chars
    companyName: string;
}

export interface ACHEntry {
    transactionCode: TransactionCode;  // See transaction code table
    rdfiRoutingNumber: string;         // 9 digits
    rdfiAccountNumber: string;         // Up to 17 chars
    amount: number;                    // In cents
    receiverName: string;              // Up to 22 chars
    receiverId?: string;               // Up to 15 chars (optional)
    discretionaryData?: string;        // Up to 2 chars
    addendaRecord?: AddendaRecord;
}

export interface AddendaRecord {
    typeCode: '05';
    paymentInfo: string;  // Up to 80 chars
}

export interface NachaBatch {
    serviceClassCode: ServiceClassCode;
    secCode: SECCode;
    companyEntryDescription: string;   // Up to 10 chars
    effectiveEntryDate: Date;
    entries: ACHEntry[];
}

export interface NachaFile {
    fileCreationDate: Date;
    immediateDestination: string;      // Fed routing number
    immediateOrigin: string;           // Originator routing number
    originator: Originator;
    batches: NachaBatch[];
}

export interface ValidationResult {
    field: string;
    message: string;
    severity: 'error' | 'warning';
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Right-pad a string with spaces to a fixed length
 */
function padRight(str: string, length: number): string {
    return str.substring(0, length).padEnd(length, ' ');
}

/**
 * Left-pad a number with zeros to a fixed length
 */
function padLeft(num: number | string, length: number): string {
    return String(num).substring(0, length).padStart(length, '0');
}

/**
 * Format date as YYMMDD
 */
function formatDate(date: Date): string {
    const yy = String(date.getFullYear()).slice(-2);
    const mm = padLeft(date.getMonth() + 1, 2);
    const dd = padLeft(date.getDate(), 2);
    return `${yy}${mm}${dd}`;
}

/**
 * Format time as HHMM
 */
function formatTime(date: Date): string {
    const hh = padLeft(date.getHours(), 2);
    const mm = padLeft(date.getMinutes(), 2);
    return `${hh}${mm}`;
}

/**
 * Calculate ABA routing number check digit
 */
export function calculateRoutingCheckDigit(routingNumber: string): number {
    if (routingNumber.length !== 8) {
        throw new Error('Routing number must be 8 digits for check digit calculation');
    }

    const d = routingNumber.split('').map(Number);
    const sum = 3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5]);
    return (10 - (sum % 10)) % 10;
}

/**
 * Validate ABA routing number with check digit
 */
export function validateRoutingNumber(routingNumber: string): boolean {
    if (!/^\d{9}$/.test(routingNumber)) return false;

    const checkDigit = calculateRoutingCheckDigit(routingNumber.slice(0, 8));
    return checkDigit === parseInt(routingNumber[8], 10);
}

/**
 * Calculate Entry Hash for batch/file control records
 * Sum of first 8 digits of routing numbers, mod 10^10
 */
function calculateEntryHash(entries: ACHEntry[]): number {
    const sum = entries.reduce((acc, entry) => {
        const first8 = parseInt(entry.rdfiRoutingNumber.slice(0, 8), 10);
        return acc + first8;
    }, 0);
    return sum % 10000000000;
}

// ============================================================================
// RECORD TYPE GENERATORS
// ============================================================================

/**
 * File Header Record (Record Type 1)
 * 94 characters total
 */
export function generateFileHeader(file: NachaFile): string {
    const now = file.fileCreationDate;

    return [
        '1',                                              // Record Type Code (1)
        '01',                                             // Priority Code (2)
        padLeft(file.immediateDestination, 10),           // Immediate Destination (10)
        padLeft(file.immediateOrigin, 10),                // Immediate Origin (10)
        formatDate(now),                                  // File Creation Date (6)
        formatTime(now),                                  // File Creation Time (4)
        'A',                                              // File ID Modifier (1)
        '094',                                            // Record Size (3)
        '10',                                             // Blocking Factor (2)
        '1',                                              // Format Code (1)
        padRight('FEDERAL RESERVE', 23),                  // Immediate Destination Name (23)
        padRight(file.originator.companyName, 23),        // Immediate Origin Name (23)
        padRight('', 8),                                  // Reference Code (8)
    ].join('');
}

/**
 * Batch Header Record (Record Type 5)
 * 94 characters total
 */
export function generateBatchHeader(
    batch: NachaBatch,
    originator: Originator,
    batchNumber: number
): string {
    return [
        '5',                                              // Record Type (1)
        batch.serviceClassCode,                           // Service Class Code (3)
        padRight(originator.companyName, 16),             // Company Name (16)
        padRight('', 20),                                 // Company Discretionary Data (20)
        padLeft(originator.companyId, 10),                // Company ID (10)
        batch.secCode,                                    // Standard Entry Class (3)
        padRight(batch.companyEntryDescription, 10),      // Company Entry Description (10)
        formatDate(batch.effectiveEntryDate),             // Company Descriptive Date (6)
        formatDate(batch.effectiveEntryDate),             // Effective Entry Date (6)
        padRight('', 3),                                  // Settlement Date (Julian) (3)
        '1',                                              // Originator Status Code (1)
        originator.routingNumber.slice(0, 8),             // ODFI ID (8)
        padLeft(batchNumber, 7),                          // Batch Number (7)
    ].join('');
}

/**
 * Entry Detail Record (Record Type 6)
 * 94 characters total
 */
export function generateEntryDetail(
    entry: ACHEntry,
    originator: Originator,
    entrySequence: number
): string {
    const hasAddenda = entry.addendaRecord ? '1' : '0';

    return [
        '6',                                              // Record Type (1)
        entry.transactionCode,                            // Transaction Code (2)
        entry.rdfiRoutingNumber.slice(0, 8),              // RDFI Routing (8)
        entry.rdfiRoutingNumber[8] || '0',                // Check Digit (1)
        padRight(entry.rdfiAccountNumber, 17),            // DFI Account Number (17)
        padLeft(entry.amount, 10),                        // Amount (10)
        padRight(entry.receiverId || '', 15),             // Individual ID (15)
        padRight(entry.receiverName, 22),                 // Individual Name (22)
        padRight(entry.discretionaryData || '', 2),       // Discretionary Data (2)
        hasAddenda,                                       // Addenda Record Indicator (1)
        originator.routingNumber.slice(0, 8),             // Trace Number - ODFI (8)
        padLeft(entrySequence, 7),                        // Trace Number - Sequence (7)
    ].join('');
}

/**
 * Addenda Record (Record Type 7)
 * 94 characters total
 */
export function generateAddendaRecord(
    addenda: AddendaRecord,
    entrySequence: number
): string {
    return [
        '7',                                              // Record Type (1)
        addenda.typeCode,                                 // Addenda Type Code (2)
        padRight(addenda.paymentInfo, 80),                // Payment Related Info (80)
        padLeft(1, 4),                                    // Addenda Sequence Number (4)
        padLeft(entrySequence, 7),                        // Entry Detail Sequence (7)
    ].join('');
}

/**
 * Batch Control Record (Record Type 8)
 * 94 characters total
 */
export function generateBatchControl(
    batch: NachaBatch,
    originator: Originator,
    batchNumber: number
): string {
    let totalDebit = 0;
    let totalCredit = 0;

    batch.entries.forEach(entry => {
        // Transaction codes: 27, 28, 37, 38 are debits; 22, 23, 32, 33 are credits
        if (['27', '28', '37', '38'].includes(entry.transactionCode)) {
            totalDebit += entry.amount;
        } else {
            totalCredit += entry.amount;
        }
    });

    const entryCount = batch.entries.length;
    const addendaCount = batch.entries.filter(e => e.addendaRecord).length;
    const totalRecords = entryCount + addendaCount;
    const entryHash = calculateEntryHash(batch.entries);

    return [
        '8',                                              // Record Type (1)
        batch.serviceClassCode,                           // Service Class Code (3)
        padLeft(totalRecords, 6),                         // Entry/Addenda Count (6)
        padLeft(entryHash, 10),                           // Entry Hash (10)
        padLeft(totalDebit, 12),                          // Total Debit (12)
        padLeft(totalCredit, 12),                         // Total Credit (12)
        padLeft(originator.companyId, 10),                // Company ID (10)
        padRight('', 19),                                 // Message Auth Code (19)
        padRight('', 6),                                  // Reserved (6)
        originator.routingNumber.slice(0, 8),             // ODFI ID (8)
        padLeft(batchNumber, 7),                          // Batch Number (7)
    ].join('');
}

/**
 * File Control Record (Record Type 9)
 * 94 characters total
 */
export function generateFileControl(batches: NachaBatch[], originator: Originator): string {
    let totalDebit = 0;
    let totalCredit = 0;
    let totalEntries = 0;
    let totalHash = 0;

    batches.forEach(batch => {
        batch.entries.forEach(entry => {
            totalEntries++;
            totalHash += parseInt(entry.rdfiRoutingNumber.slice(0, 8), 10);

            if (['27', '28', '37', '38'].includes(entry.transactionCode)) {
                totalDebit += entry.amount;
            } else {
                totalCredit += entry.amount;
            }
        });
    });

    const batchCount = batches.length;
    // Block count: records divided by 10, rounded up
    const recordCount = 2 + batches.length * 2 + totalEntries; // File header/control + batch header/control + entries
    const blockCount = Math.ceil(recordCount / 10);

    return [
        '9',                                              // Record Type (1)
        padLeft(batchCount, 6),                           // Batch Count (6)
        padLeft(blockCount, 6),                           // Block Count (6)
        padLeft(totalEntries, 8),                         // Entry/Addenda Count (8)
        padLeft(totalHash % 10000000000, 10),             // Entry Hash (10)
        padLeft(totalDebit, 12),                          // Total Debit (12)
        padLeft(totalCredit, 12),                         // Total Credit (12)
        padRight('', 39),                                 // Reserved (39)
    ].join('');
}

/**
 * Generate padding records (Record Type 9 filled with 9s)
 * Used to fill out the last block to a multiple of 10 records
 */
function generatePaddingRecord(): string {
    return '9'.repeat(94);
}

// ============================================================================
// MAIN FILE GENERATION
// ============================================================================

/**
 * Generate a complete NACHA file
 * Returns the file content as a string with CRLF line endings
 */
export function generateNachaFile(file: NachaFile): string {
    const lines: string[] = [];

    // File Header
    lines.push(generateFileHeader(file));

    // Batches
    file.batches.forEach((batch, batchIndex) => {
        const batchNumber = batchIndex + 1;

        // Batch Header
        lines.push(generateBatchHeader(batch, file.originator, batchNumber));

        // Entry Details
        batch.entries.forEach((entry, entryIndex) => {
            const entrySequence = entryIndex + 1;
            lines.push(generateEntryDetail(entry, file.originator, entrySequence));

            // Addenda if present
            if (entry.addendaRecord) {
                lines.push(generateAddendaRecord(entry.addendaRecord, entrySequence));
            }
        });

        // Batch Control
        lines.push(generateBatchControl(batch, file.originator, batchNumber));
    });

    // File Control
    lines.push(generateFileControl(file.batches, file.originator));

    // Padding to fill last block
    const recordCount = lines.length;
    const paddingNeeded = (10 - (recordCount % 10)) % 10;
    for (let i = 0; i < paddingNeeded; i++) {
        lines.push(generatePaddingRecord());
    }

    // NACHA uses CRLF line endings
    return lines.join('\r\n') + '\r\n';
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate a NACHA file structure before generation
 */
export function validateNachaFile(file: NachaFile): ValidationResult[] {
    const errors: ValidationResult[] = [];

    // Originator validation
    if (!validateRoutingNumber(file.originator.routingNumber)) {
        errors.push({
            field: 'originator.routingNumber',
            message: 'Invalid ABA routing number checksum',
            severity: 'error'
        });
    }

    if (file.originator.companyId.length > 10) {
        errors.push({
            field: 'originator.companyId',
            message: 'Company ID must be 10 characters or less',
            severity: 'error'
        });
    }

    // Batch validation
    file.batches.forEach((batch, batchIndex) => {
        if (batch.entries.length === 0) {
            errors.push({
                field: `batches[${batchIndex}].entries`,
                message: 'Batch must contain at least one entry',
                severity: 'error'
            });
        }

        // Entry validation
        batch.entries.forEach((entry, entryIndex) => {
            if (!validateRoutingNumber(entry.rdfiRoutingNumber)) {
                errors.push({
                    field: `batches[${batchIndex}].entries[${entryIndex}].rdfiRoutingNumber`,
                    message: 'Invalid RDFI routing number checksum',
                    severity: 'error'
                });
            }

            if (entry.amount < 0) {
                errors.push({
                    field: `batches[${batchIndex}].entries[${entryIndex}].amount`,
                    message: 'Amount cannot be negative',
                    severity: 'error'
                });
            }

            if (entry.amount > 9999999999) {
                errors.push({
                    field: `batches[${batchIndex}].entries[${entryIndex}].amount`,
                    message: 'Amount exceeds maximum (99,999,999.99)',
                    severity: 'error'
                });
            }

            if (entry.receiverName.length > 22) {
                errors.push({
                    field: `batches[${batchIndex}].entries[${entryIndex}].receiverName`,
                    message: 'Receiver name must be 22 characters or less',
                    severity: 'warning'
                });
            }
        });
    });

    return errors;
}

/**
 * Validate a single ACH entry
 */
export function validateACHEntry(entry: ACHEntry): ValidationResult[] {
    const errors: ValidationResult[] = [];

    if (!validateRoutingNumber(entry.rdfiRoutingNumber)) {
        errors.push({
            field: 'rdfiRoutingNumber',
            message: 'Invalid ABA routing number',
            severity: 'error'
        });
    }

    if (entry.amount <= 0) {
        errors.push({
            field: 'amount',
            message: 'Amount must be positive',
            severity: 'error'
        });
    }

    if (!entry.receiverName || entry.receiverName.trim() === '') {
        errors.push({
            field: 'receiverName',
            message: 'Receiver name is required',
            severity: 'error'
        });
    }

    return errors;
}

// ============================================================================
// PARSING (for Import)
// ============================================================================

/**
 * Parse a NACHA file string into structured data
 * (Simplified parser for common formats)
 */
export function parseNachaFile(content: string): {
    success: boolean;
    file?: NachaFile;
    error?: string;
    summary?: {
        batchCount: number;
        entryCount: number;
        totalDebit: number;
        totalCredit: number;
    };
} {
    const lines = content.split(/\r?\n/).filter(l => l.length === 94);

    if (lines.length === 0) {
        return { success: false, error: 'No valid NACHA records found (each line must be 94 characters)' };
    }

    const fileHeader = lines.find(l => l[0] === '1');
    const fileControl = lines.find(l => l[0] === '9' && l[1] !== '9');
    const batchHeaders = lines.filter(l => l[0] === '5');
    const entries = lines.filter(l => l[0] === '6');

    if (!fileHeader) {
        return { success: false, error: 'Missing file header record (Type 1)' };
    }

    // Extract summary from file control
    let totalDebit = 0;
    let totalCredit = 0;
    if (fileControl) {
        totalDebit = parseInt(fileControl.slice(31, 43), 10);
        totalCredit = parseInt(fileControl.slice(43, 55), 10);
    }

    return {
        success: true,
        summary: {
            batchCount: batchHeaders.length,
            entryCount: entries.length,
            totalDebit: totalDebit / 100,
            totalCredit: totalCredit / 100
        }
    };
}

export default {
    generateNachaFile,
    validateNachaFile,
    validateACHEntry,
    validateRoutingNumber,
    calculateRoutingCheckDigit,
    parseNachaFile
};
