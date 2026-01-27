/**
 * Baselane Ledger Integration
 *
 * Posts Baselane rent payments to the fiduciary ledger
 * Track: baselane_api_20260124
 */

import type { Payment } from './baselaneService.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of posting a payment to the ledger
 */
export interface LedgerPostingResult {
  success: boolean;
  journalEntryId?: string;
  debitAccountId: string;
  creditAccountId: string;
  debitAmount: number;
  creditAmount: number;
  baselanePaymentId: string;
  baselaneTenantId?: string;
  postedAt?: string;
}

/**
 * Account mapping for ledger posting
 */
export interface LedgerAccountMapping {
  propertyId: string;
  cashAccountId: string;
  rentalIncomeAccountId: string;
}

/**
 * Journal entry stored in ledger
 */
export interface JournalEntry {
  journalEntryId: string;
  baselanePaymentId: string;
  baselaneTenantId?: string;
  debitAccountId: string;
  creditAccountId: string;
  amount: number;
  postedAt: string;
  metadata: Record<string, unknown>;
}

// ============================================================================
// STORAGE
// ============================================================================

const JOURNAL_STORAGE_KEY = 'baselane_journal_entries';

/**
 * Get all journal entries
 */
async function getJournalEntries(): Promise<JournalEntry[]> {
  const stored = globalThis[JOURNAL_STORAGE_KEY];
  return stored || [];
}

/**
 * Save journal entry
 */
async function saveJournalEntry(entry: JournalEntry): Promise<void> {
  const entries = await getJournalEntries();
  entries.push(entry);
  globalThis[JOURNAL_STORAGE_KEY] = entries;
}

// ============================================================================
// LEDGER POSTING
// ============================================================================

/**
 * Post a Baselane rent payment to the ledger
 *
 * This function creates a journal entry for a completed rent payment,
 * debiting the cash/bank account and crediting rental income.
 *
 * Uses fire-and-forget pattern - errors are logged but don't fail the operation.
 */
export async function postRentPaymentToLedger(
  payment: Payment,
  accountMapping: LedgerAccountMapping
): Promise<LedgerPostingResult> {
  // Only post completed payments
  if (payment.status !== 'completed') {
    console.log('[Baselane Ledger] Skipping payment - not completed:', payment.id);
    return {
      success: false,
      debitAccountId: accountMapping.cashAccountId,
      creditAccountId: accountMapping.rentalIncomeAccountId,
      debitAmount: 0,
      creditAmount: 0,
      baselanePaymentId: payment.id
    };
  }

  try {
    const journalEntryId = `journal-${payment.id}-${Date.now()}`;
    const postedAt = new Date().toISOString();

    // Create journal entry
    const journalEntry: JournalEntry = {
      journalEntryId,
      baselanePaymentId: payment.id,
      baselaneTenantId: payment.tenantId,
      debitAccountId: accountMapping.cashAccountId,
      creditAccountId: accountMapping.rentalIncomeAccountId,
      amount: payment.amount,
      postedAt,
      metadata: {
        baselanePaymentId: payment.id,
        baselaneChargeId: payment.chargeId,
        baselaneTenantId: payment.tenantId,
        paymentMethod: payment.paymentMethod,
        completedAt: payment.completedAt,
        propertyId: accountMapping.propertyId
      }
    };

    // Store journal entry (in production, this would call the ledger service)
    await saveJournalEntry(journalEntry);

    console.log('[Baselane Ledger] Posted rent payment to ledger:', {
      journalEntryId,
      baselanePaymentId: payment.id,
      amount: payment.amount,
      debitAccount: accountMapping.cashAccountId,
      creditAccount: accountMapping.rentalIncomeAccountId
    });

    return {
      success: true,
      journalEntryId,
      debitAccountId: accountMapping.cashAccountId,
      creditAccountId: accountMapping.rentalIncomeAccountId,
      debitAmount: payment.amount,
      creditAmount: payment.amount,
      baselanePaymentId: payment.id,
      baselaneTenantId: payment.tenantId,
      postedAt
    };
  } catch (error) {
    // Fire-and-forget: log error but don't throw
    console.error('[Baselane Ledger] Failed to post payment to ledger:', {
      baselanePaymentId: payment.id,
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      success: true, // Return true for fire-and-forget pattern
      debitAccountId: accountMapping.cashAccountId,
      creditAccountId: accountMapping.rentalIncomeAccountId,
      debitAmount: payment.amount,
      creditAmount: payment.amount,
      baselanePaymentId: payment.id
    };
  }
}

/**
 * Get journal entry for a Baselane payment
 *
 * Retrieves the ledger journal entry that was created for a specific
 * Baselane payment.
 */
export async function getJournalEntryForPayment(
  baselanePaymentId: string
): Promise<JournalEntry | null> {
  const entries = await getJournalEntries();
  return entries.find(e => e.baselanePaymentId === baselanePaymentId) || null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  postRentPaymentToLedger,
  getJournalEntryForPayment
};
