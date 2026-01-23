/**
 * NACHA File Generator
 *
 * Generates NACHA-compliant ACH files for payment processing.
 * Ported from scripts/generate-nacha.sh
 *
 * NACHA Specification:
 * - All records must be exactly 94 characters
 * - Block size is 10 records
 * - Line endings must be CRLF (\r\n)
 * - Test routing: 091000019
 */

/**
 * Right-pad string with spaces to fixed length
 * @param {string} str - String to pad
 * @param {number} len - Target length
 * @returns {string}
 */
export function padRight(str, len) {
  const s = String(str);
  return s.substring(0, len).padEnd(len, ' ');
}

/**
 * Left-pad number with zeros to fixed length
 * @param {number|string} num - Number to pad
 * @param {number} len - Target length
 * @returns {string}
 */
export function padLeft(num, len) {
  const s = String(num).replace(/^0+/, '') || '0';
  return s.padStart(len, '0').slice(-len);
}

/**
 * Generate File Header Record (Type 1)
 * @param {Object} config - Configuration
 * @param {string} config.immediateDestination - RDFI routing (9 digits)
 * @param {string} config.immediateOrigin - ODFI routing (10 digits)
 * @param {string} config.fileDate - File creation date (YYMMDD)
 * @param {string} config.fileTime - File creation time (HHMM)
 * @param {string} config.immediateDestinationName - Receiving bank name
 * @param {string} config.immediateOriginName - Originating company name
 * @returns {string} 94-character File Header Record
 */
export function generateFileHeader(config) {
  let record = '';

  record += '1';                                      // Pos 1: Record Type Code
  record += '01';                                     // Pos 2-3: Priority Code
  record += ' ' + padLeft(config.immediateDestination.substring(0, 9), 9);  // Pos 4-13: Immediate Destination
  record += padLeft(config.immediateOrigin.substring(0, 10), 10);           // Pos 14-23: Immediate Origin
  record += config.fileDate;                          // Pos 24-29: File Creation Date (YYMMDD)
  record += config.fileTime;                          // Pos 30-33: File Creation Time (HHMM)
  record += 'A';                                      // Pos 34: File ID Modifier
  record += '094';                                    // Pos 35-37: Record Size
  record += '10';                                     // Pos 38-39: Blocking Factor
  record += '1';                                      // Pos 40: Format Code
  record += padRight(config.immediateDestinationName || '', 23);  // Pos 41-63: Immediate Destination Name
  record += padRight(config.immediateOriginName || '', 23);       // Pos 64-86: Immediate Origin Name
  record += padRight('', 8);                          // Pos 87-94: Reference Code

  return record;
}

/**
 * Generate Batch Header Record (Type 5)
 * @param {Object} config - Configuration
 * @param {string} config.companyName - Originating company name
 * @param {string} config.companyId - Company ID (EIN, 10 digits)
 * @param {string} config.secCode - SEC code (PPD, CCD, etc.)
 * @param {string} config.companyEntryDescription - Entry description
 * @param {string} config.fileDate - File creation date (YYMMDD)
 * @param {string} config.effectiveDate - Effective entry date (YYMMDD)
 * @param {string} config.odfiRouting - ODFI routing number
 * @param {number} batchNum - Batch number (starts at 1)
 * @returns {string} 94-character Batch Header Record
 */
export function generateBatchHeader(config, batchNum) {
  let record = '';

  record += '5';                                      // Pos 1: Record Type Code
  record += '200';                                    // Pos 2-4: Service Class Code (mixed debits/credits)
  record += padRight(config.companyName, 16);         // Pos 5-20: Company Name
  record += padRight('', 20);                         // Pos 21-40: Company Discretionary Data
  record += padRight(config.companyId, 10);           // Pos 41-50: Company Identification
  record += config.secCode;                           // Pos 51-53: SEC Code
  record += padRight(config.companyEntryDescription, 10);      // Pos 54-63: Company Entry Description
  record += padRight(config.fileDate, 6);             // Pos 64-69: Company Descriptive Date
  record += config.effectiveDate;                     // Pos 70-75: Effective Entry Date
  record += '   ';                                    // Pos 76-78: Settlement Date (blank)
  record += '1';                                      // Pos 79: Originator Status Code
  record += config.odfiRouting.substring(0, 8);       // Pos 80-87: Originating DFI ID
  record += padLeft(batchNum, 7);                     // Pos 88-94: Batch Number

  return record;
}

/**
 * Generate Entry Detail Record (Type 6)
 * @param {Object} entry - Entry data
 * @param {string} entry.transactionCode - Transaction code (22=credit checking, 27=debit checking)
 * @param {string} entry.rdfiRouting - RDFI routing number (9 digits)
 * @param {string} entry.dfiAccount - DFI account number
 * @param {number} entry.amount - Amount in cents
 * @param {string} entry.individualId - Individual ID number
 * @param {string} entry.individualName - Individual name
 * @param {number} seqNum - Entry sequence number
 * @param {Object} config - Configuration
 * @param {string} config.odfiRouting - ODFI routing number
 * @returns {string} 94-character Entry Detail Record
 */
export function generateEntryDetail(entry, seqNum, config) {
  let record = '';

  record += '6';                                      // Pos 1: Record Type Code
  record += entry.transactionCode;                    // Pos 2-3: Transaction Code
  record += entry.rdfiRouting.substring(0, 8);        // Pos 4-11: Receiving DFI ID
  record += entry.rdfiRouting[8];                     // Pos 12: Check Digit
  record += padRight(entry.dfiAccount, 17);           // Pos 13-29: DFI Account Number
  record += padLeft(entry.amount, 10);                // Pos 30-39: Amount (in cents)
  record += padRight(entry.individualId, 15);         // Pos 40-54: Individual ID Number
  record += padRight(entry.individualName, 22);       // Pos 55-76: Individual Name
  record += '  ';                                     // Pos 77-78: Discretionary Data
  record += '0';                                      // Pos 79: Addenda Record Indicator
  record += config.odfiRouting.substring(0, 8);       // Pos 80-87: Trace Number (ODFI routing)
  record += padLeft(seqNum, 7);                       // Pos 88-94: Trace Number (sequence)

  return record;
}

/**
 * Generate Batch Control Record (Type 8)
 * @param {Object} batch - Batch data
 * @param {number} batch.entryCount - Number of entry/detail records
 * @param {string} batch.entryHash - Entry hash (sum of RDFI routing first 8 digits)
 * @param {number} batch.debitTotal - Total debit amount in cents
 * @param {number} batch.creditTotal - Total credit amount in cents
 * @param {number} batchNum - Batch number
 * @param {Object} config - Configuration
 * @param {string} config.companyId - Company ID
 * @param {string} config.odfiRouting - ODFI routing number
 * @returns {string} 94-character Batch Control Record
 */
export function generateBatchControl(batch, batchNum, config) {
  let record = '';

  record += '8';                                      // Pos 1: Record Type Code
  record += '200';                                    // Pos 2-4: Service Class Code
  record += padLeft(batch.entryCount, 6);             // Pos 5-10: Entry/Addenda Count
  record += padLeft(batch.entryHash, 10);             // Pos 11-20: Entry Hash
  record += padLeft(batch.debitTotal, 12);            // Pos 21-32: Total Debit Amount
  record += padLeft(batch.creditTotal, 12);           // Pos 33-44: Total Credit Amount
  record += padRight(config.companyId, 10);           // Pos 45-54: Company Identification
  record += padRight('', 19);                         // Pos 55-73: Message Authentication Code
  record += padRight('', 6);                          // Pos 74-79: Reserved
  record += config.odfiRouting.substring(0, 8);       // Pos 80-87: Originating DFI ID
  record += padLeft(batchNum, 7);                     // Pos 88-94: Batch Number

  return record;
}

/**
 * Generate File Control Record (Type 9)
 * @param {Object} file - File data
 * @param {number} file.batchCount - Number of batches
 * @param {number} file.blockCount - Number of blocks
 * @param {number} file.entryCount - Total entry count
 * @param {string} file.entryHash - Entry hash
 * @param {number} file.debitTotal - Total debit amount in cents
 * @param {number} file.creditTotal - Total credit amount in cents
 * @returns {string} 94-character File Control Record
 */
export function generateFileControl(file) {
  let record = '';

  record += '9';                                      // Pos 1: Record Type Code
  record += padLeft(file.batchCount, 6);              // Pos 2-7: Batch Count
  record += padLeft(file.blockCount, 6);              // Pos 8-13: Block Count
  record += padLeft(file.entryCount, 8);              // Pos 14-21: Entry/Addenda Count
  record += padLeft(file.entryHash, 10);              // Pos 22-31: Entry Hash
  record += padLeft(file.debitTotal, 12);             // Pos 32-43: Total Debit Amount
  record += padLeft(file.creditTotal, 12);            // Pos 44-55: Total Credit Amount
  record += padRight('', 39);                         // Pos 56-94: Reserved

  return record;
}

/**
 * Generate padding record (fills block to 10 records)
 * @returns {string} 94-character padding record (all 9s)
 */
function generatePadding() {
  return '9'.repeat(94);
}

/**
 * Generate complete NACHA file
 * @param {Object} config - File configuration
 * @param {Array<Object>} entries - Array of entry detail records
 * @returns {Buffer} NACHA file with CRLF line endings
 */
export function generateNachaFile(config, entries) {
  const lines = [];

  // 1. File Header
  lines.push(generateFileHeader(config));

  // 2. Batch Header
  const batchNum = 1;
  lines.push(generateBatchHeader(config, batchNum));

  // 3. Entry Detail Records
  let entryHash = 0;
  let creditTotal = 0;
  let debitTotal = 0;

  entries.forEach((entry, index) => {
    const seqNum = index + 1;
    lines.push(generateEntryDetail(entry, seqNum, config));

    // Accumulate entry hash (first 8 digits of RDFI routing)
    entryHash += parseInt(entry.rdfiRouting.substring(0, 8), 10);

    // Accumulate totals
    if (entry.transactionCode === '22' || entry.transactionCode === '32') {
      // Credit
      creditTotal += entry.amount;
    } else {
      // Debit
      debitTotal += entry.amount;
    }
  });

  // 4. Batch Control
  const batch = {
    entryCount: entries.length,
    entryHash: String(entryHash),
    debitTotal,
    creditTotal
  };
  lines.push(generateBatchControl(batch, batchNum, config));

  // 5. File Control
  const recordCount = 4 + entries.length; // file header + batch header + entries + batch control + file control
  const blockCount = Math.ceil(recordCount / 10);

  const file = {
    batchCount: 1,
    blockCount,
    entryCount: entries.length,
    entryHash: String(entryHash),
    debitTotal,
    creditTotal
  };
  lines.push(generateFileControl(file));

  // 6. Padding to fill block (10 records per block)
  const totalRecordsNeeded = blockCount * 10;
  for (let i = recordCount + 1; i <= totalRecordsNeeded; i++) {
    lines.push(generatePadding());
  }

  // Join with CRLF and return as Buffer
  const content = lines.join('\r\n') + '\r\n';
  return Buffer.from(content, 'ascii');
}
