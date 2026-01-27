/**
 * ACH File Submission Example
 *
 * Demonstrates integration between nacha-generator.js and bofaCashProService
 * for submitting ACH files to Bank of America CashPro API.
 *
 * Track: bofa_cashpro_20260123
 * Phase: 4.1 NACHA File Submission
 *
 * Usage:
 * ```typescript
 * import { generateNachaFile } from './lib/nacha-generator.js';
 * import { submitACHFile } from '../services/bofaCashProService.js';
 *
 * const nachaContent = generateNachaFile(config, entries);
 * const result = await submitACHFile({
 *   nachaFileContent: nachaContent.toString(),
 *   fileName: `ACH-${dateStr}.txt`,
 *   effectiveDate: '2026-01-23',
 *   customerReference: 'PAYMENT-12345'
 * });
 * ```
 */

import { generateNachaFile } from './nacha-generator.js';
import type { ACHSubmissionResponse } from '../../services/bofaCashProService';

/**
 * Example NACHA file configuration
 */
interface NACHAConfig {
  immediateDestination: string;
  immediateOrigin: string;
  fileDate: string;
  fileTime: string;
  immediateDestinationName: string;
  immediateOriginName: string;
  companyName: string;
  companyId: string;
  secCode: string;
  companyEntryDescription: string;
  effectiveDate: string;
  odfiRouting: string;
}

/**
 * Example NACHA entry detail
 */
interface NACHAEntry {
  transactionCode: string;
  rdfiRouting: string;
  dfiAccount: string;
  amount: number;
  individualId: string;
  individualName: string;
}

/**
 * Submits an ACH payment file to BOFA
 *
 * @param config - NACHA file configuration
 * @param entries - Array of payment entries
 * @param reference - Customer reference for tracking
 * @returns Promise resolving to BOFA submission response
 *
 * @example
 * ```typescript
 * const config = {
 *   immediateDestination: '091000019',
 *   immediateOrigin: '1234567890',
 *   fileDate: '260123',
 *   fileTime: '1200',
 *   immediateDestinationName: 'BANK OF AMERICA',
 *   immediateOriginName: 'MY COMPANY',
 *   companyName: 'MY COMPANY',
 *   companyId: '1234567890',
 *   secCode: 'PPD',
 *   companyEntryDescription: 'PAYROLL',
 *   effectiveDate: '260126',
 *   odfiRouting: '123456789'
 * };
 *
 * const entries = [{
 *   transactionCode: '22',  // Credit to checking
 *   rdfiRouting: '021000021',
 *   dfiAccount: '123456789',
 *   amount: 100000,  // $1000.00 in cents
 *   individualId: 'EMP001',
 *   individualName: 'JOHN DOE'
 * }];
 *
 * const result = await submitACHPayment(config, entries, 'PAYROLL-20260123');
 * console.log(`Submitted as ${result.submissionId}, status: ${result.status}`);
 * ```
 */
export async function submitACHPayment(
  config: NACHAConfig,
  entries: NACHAEntry[],
  reference: string
): Promise<ACHSubmissionResponse> {
  // Dynamic import to avoid build issues
  const { submitACHFile } = await import('../../services/bofaCashProService.js');

  // Generate NACHA file content
  const nachaBuffer = generateNachaFile(config, entries);
  const nachaContent = nachaBuffer.toString('ascii');

  // Generate filename with date
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
  const fileName = `ACH-${dateStr}.txt`;

  // Format effective date for API (YYYY-MM-DD)
  const effectiveDate = `20${config.effectiveDate.substring(0, 2)}-${config.effectiveDate.substring(2, 4)}-${config.effectiveDate.substring(4, 6)}`;

  // Submit to BOFA
  const result = await submitACHFile({
    nachaFileContent: nachaContent,
    fileName,
    effectiveDate,
    customerReference: reference
  });

  return result;
}

/**
 * Example usage: Submit a payroll ACH file
 *
 * This example demonstrates the complete flow:
 * 1. Configure NACHA file parameters
 * 2. Define payment entries
 * 3. Generate NACHA file using nacha-generator
 * 4. Submit to BOFA using submitACHFile
 * 5. Handle submission response
 */
export async function examplePayrollSubmission(): Promise<void> {
  // Step 1: Configure NACHA file
  const config: NACHAConfig = {
    immediateDestination: '091000019',  // Test routing number
    immediateOrigin: '1234567890',       // ODFI routing
    fileDate: '260123',                  // YYMMDD
    fileTime: '1200',                    // HHMM
    immediateDestinationName: 'BANK OF AMERICA',
    immediateOriginName: 'ACME CORPORATION',
    companyName: 'ACME CORPORATION',
    companyId: '1234567890',             // EIN
    secCode: 'PPD',                      // Prearranged Payment and Deposit
    companyEntryDescription: 'PAYROLL',
    effectiveDate: '260126',             // YYMMDD (settlement date)
    odfiRouting: '123456789'
  };

  // Step 2: Define payment entries (employee direct deposits)
  const entries: NACHAEntry[] = [
    {
      transactionCode: '22',  // Credit to checking account
      rdfiRouting: '021000021',
      dfiAccount: '123456789',
      amount: 250000,  // $2500.00 in cents
      individualId: 'EMP-001',
      individualName: 'JOHN DOE'
    },
    {
      transactionCode: '22',  // Credit to checking account
      rdfiRouting: '026009593',
      dfiAccount: '987654321',
      amount: 300000,  // $3000.00 in cents
      individualId: 'EMP-002',
      individualName: 'JANE SMITH'
    }
  ];

  // Step 3 & 4: Generate and submit
  const result = await submitACHPayment(config, entries, 'PAYROLL-20260123');

  // Step 5: Handle response
  console.log(`ACH Submission Result:`);
  console.log(`  Submission ID: ${result.submissionId}`);
  console.log(`  Status: ${result.status}`);
  console.log(`  Received: ${result.receivedTimestamp}`);
  console.log(`  BOFA Reference: ${result.bofaReference}`);

  // Check if submission was accepted
  if (result.status === 'accepted') {
    console.log('Payment submitted successfully!');
  } else if (result.status === 'pending_review') {
    console.log('Payment is pending review by BOFA.');
  } else if (result.status === 'rejected') {
    console.error('Payment was rejected by BOFA.');
  }
}
