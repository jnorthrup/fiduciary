/**
 * WAL Reducer - Redux-style action reducer for GCS WAL persistence
 * 
 * Provides a pure reducer function for replaying Write-Ahead Log entries
 * to rebuild client state from immutable action history.
 */

import * as types from '../types';

// ============================================================================
// Action Types
// ============================================================================

/** Account-related actions */
interface AccountCreateAction {
    type: 'ACCOUNT_CREATE';
    payload: types.Account;
    timestamp: string;
}

interface AccountUpdateAction {
    type: 'ACCOUNT_UPDATE';
    payload: {
        id: string;
        changes: Partial<types.Account>;
    };
    timestamp: string;
}

interface AccountDeleteAction {
    type: 'ACCOUNT_DELETE';
    payload: { id: string };
    timestamp: string;
}

/** Journal entry actions */
interface JournalPostAction {
    type: 'JOURNAL_POST';
    payload: types.JournalEntry;
    timestamp: string;
}

interface JournalVoidAction {
    type: 'JOURNAL_VOID';
    payload: { id: string; reason: string };
    timestamp: string;
}

/** Entity actions */
interface EntityCreateAction {
    type: 'ENTITY_CREATE';
    payload: types.Entity;
    timestamp: string;
}

interface EntityUpdateAction {
    type: 'ENTITY_UPDATE';
    payload: {
        id: string;
        changes: Partial<types.Entity>;
    };
    timestamp: string;
}

interface EntityDeleteAction {
    type: 'ENTITY_DELETE';
    payload: { id: string };
    timestamp: string;
}

/** NACHA submission actions */
interface NachaSubmitAction {
    type: 'NACHA_SUBMIT';
    payload: {
        fileId: string;
        batchCount: number;
        entryCount: number;
        totalDebit: number;
        totalCredit: number;
        hash: string;
        submittedAt: string;
    };
    timestamp: string;
}

interface NachaSettleAction {
    type: 'NACHA_SETTLE';
    payload: {
        fileId: string;
        settlementDate: string;
        status: 'settled' | 'returned' | 'rejected';
        returnCode?: string;
    };
    timestamp: string;
}

/** Settlement actions */
interface SettlementCreateAction {
    type: 'SETTLEMENT_CREATE';
    payload: types.SettlementInstruction;
    timestamp: string;
}

interface SettlementConfirmAction {
    type: 'SETTLEMENT_CONFIRM';
    payload: types.SettlementConfirmation;
    timestamp: string;
}

interface SettlementReturnAction {
    type: 'SETTLEMENT_RETURN';
    payload: {
        settlementId: string;
        returnCode: string;
        reason: string;
    };
    timestamp: string;
}

/** Invoice/Payable actions */
interface InvoiceCreateAction {
    type: 'INVOICE_CREATE';
    payload: types.Invoice;
    timestamp: string;
}

interface InvoiceUpdateAction {
    type: 'INVOICE_UPDATE';
    payload: {
        id: string;
        changes: Partial<types.Invoice>;
    };
    timestamp: string;
}

interface PayableCreateAction {
    type: 'PAYABLE_CREATE';
    payload: types.Payable;
    timestamp: string;
}

interface PayableUpdateAction {
    type: 'PAYABLE_UPDATE';
    payload: {
        id: string;
        changes: Partial<types.Payable>;
    };
    timestamp: string;
}

/** State snapshot action (for compaction) */
interface StateSnapshotAction {
    type: 'STATE_SNAPSHOT';
    payload: LedgerState;
    timestamp: string;
    snapshotVersion: number;
}

/** Union of all action types */
export type LedgerAction =
    | AccountCreateAction
    | AccountUpdateAction
    | AccountDeleteAction
    | JournalPostAction
    | JournalVoidAction
    | EntityCreateAction
    | EntityUpdateAction
    | EntityDeleteAction
    | NachaSubmitAction
    | NachaSettleAction
    | SettlementCreateAction
    | SettlementConfirmAction
    | SettlementReturnAction
    | InvoiceCreateAction
    | InvoiceUpdateAction
    | PayableCreateAction
    | PayableUpdateAction
    | StateSnapshotAction;

// ============================================================================
// State Shape
// ============================================================================

/** Core ledger state for WAL-backed persistence */
export interface LedgerState {
    entities: types.Entity[];
    accounts: types.Account[];
    journals: types.JournalEntry[];
    settlements: types.SettlementInstruction[];
    settlementConfirmations: types.SettlementConfirmation[];
    invoices: types.Invoice[];
    payables: types.Payable[];
    nachaSubmissions: NachaSubmission[];
    lastActionTimestamp: string | null;
    version: number;
}

/** NACHA submission record */
export interface NachaSubmission {
    fileId: string;
    batchCount: number;
    entryCount: number;
    totalDebit: number;
    totalCredit: number;
    hash: string;
    submittedAt: string;
    status: 'pending' | 'settled' | 'returned' | 'rejected';
    settlementDate?: string;
    returnCode?: string;
}

/** Default empty state */
export const EMPTY_LEDGER_STATE: LedgerState = {
    entities: [],
    accounts: [],
    journals: [],
    settlements: [],
    settlementConfirmations: [],
    invoices: [],
    payables: [],
    nachaSubmissions: [],
    lastActionTimestamp: null,
    version: 0,
};

// ============================================================================
// Reducer Implementation
// ============================================================================

/**
 * Pure reducer function for applying WAL actions to state.
 * 
 * @param state - Current ledger state
 * @param action - Action to apply
 * @returns New state with action applied
 */
export function ledgerReducer(
    state: LedgerState,
    action: LedgerAction
): LedgerState {
    const nextVersion = state.version + 1;
    const timestamp = action.timestamp;

    switch (action.type) {
        // ========== Account Actions ==========
        case 'ACCOUNT_CREATE':
            return {
                ...state,
                accounts: [...state.accounts, action.payload],
                lastActionTimestamp: timestamp,
                version: nextVersion,
            };

        case 'ACCOUNT_UPDATE':
            return {
                ...state,
                accounts: state.accounts.map((acc) =>
                    acc.id === action.payload.id
                        ? { ...acc, ...action.payload.changes }
                        : acc
                ),
                lastActionTimestamp: timestamp,
                version: nextVersion,
            };

        case 'ACCOUNT_DELETE':
            return {
                ...state,
                accounts: state.accounts.map((acc) =>
                    acc.id === action.payload.id ? { ...acc, isActive: false } : acc
                ),
                lastActionTimestamp: timestamp,
                version: nextVersion,
            };

        // ========== Journal Actions ==========
        case 'JOURNAL_POST':
            return {
                ...state,
                journals: [...state.journals, action.payload],
                lastActionTimestamp: timestamp,
                version: nextVersion,
            };

        case 'JOURNAL_VOID':
            return {
                ...state,
                journals: state.journals.map((j) =>
                    j.id === action.payload.id
                        ? { ...j, locked: false, memo: `[VOIDED: ${action.payload.reason}] ${j.memo}` }
                        : j
                ),
                lastActionTimestamp: timestamp,
                version: nextVersion,
            };

        // ========== Entity Actions ==========
        case 'ENTITY_CREATE':
            return {
                ...state,
                entities: [...state.entities, action.payload],
                lastActionTimestamp: timestamp,
                version: nextVersion,
            };

        case 'ENTITY_UPDATE':
            return {
                ...state,
                entities: state.entities.map((e) =>
                    e.id === action.payload.id
                        ? { ...e, ...action.payload.changes }
                        : e
                ),
                lastActionTimestamp: timestamp,
                version: nextVersion,
            };

        case 'ENTITY_DELETE':
            return {
                ...state,
                entities: state.entities.filter((e) => e.id !== action.payload.id),
                lastActionTimestamp: timestamp,
                version: nextVersion,
            };

        // ========== NACHA Actions ==========
        case 'NACHA_SUBMIT':
            return {
                ...state,
                nachaSubmissions: [
                    ...state.nachaSubmissions,
                    {
                        fileId: action.payload.fileId,
                        batchCount: action.payload.batchCount,
                        entryCount: action.payload.entryCount,
                        totalDebit: action.payload.totalDebit,
                        totalCredit: action.payload.totalCredit,
                        hash: action.payload.hash,
                        submittedAt: action.payload.submittedAt,
                        status: 'pending',
                    },
                ],
                lastActionTimestamp: timestamp,
                version: nextVersion,
            };

        case 'NACHA_SETTLE':
            return {
                ...state,
                nachaSubmissions: state.nachaSubmissions.map((sub) =>
                    sub.fileId === action.payload.fileId
                        ? {
                            ...sub,
                            status: action.payload.status,
                            settlementDate: action.payload.settlementDate,
                            returnCode: action.payload.returnCode,
                        }
                        : sub
                ),
                lastActionTimestamp: timestamp,
                version: nextVersion,
            };

        // ========== Settlement Actions ==========
        case 'SETTLEMENT_CREATE':
            return {
                ...state,
                settlements: [...state.settlements, action.payload],
                lastActionTimestamp: timestamp,
                version: nextVersion,
            };

        case 'SETTLEMENT_CONFIRM':
            return {
                ...state,
                settlementConfirmations: [...state.settlementConfirmations, action.payload],
                lastActionTimestamp: timestamp,
                version: nextVersion,
            };

        case 'SETTLEMENT_RETURN':
            return {
                ...state,
                settlements: state.settlements.map((s) =>
                    s.payment_id === action.payload.settlementId
                        ? { ...s, status: 'Failed' }
                        : s
                ),
                lastActionTimestamp: timestamp,
                version: nextVersion,
            };

        // ========== Invoice/Payable Actions ==========
        case 'INVOICE_CREATE':
            return {
                ...state,
                invoices: [...state.invoices, action.payload],
                lastActionTimestamp: timestamp,
                version: nextVersion,
            };

        case 'INVOICE_UPDATE':
            return {
                ...state,
                invoices: state.invoices.map((inv) =>
                    inv.id === action.payload.id
                        ? { ...inv, ...action.payload.changes }
                        : inv
                ),
                lastActionTimestamp: timestamp,
                version: nextVersion,
            };

        case 'PAYABLE_CREATE':
            return {
                ...state,
                payables: [...state.payables, action.payload],
                lastActionTimestamp: timestamp,
                version: nextVersion,
            };

        case 'PAYABLE_UPDATE':
            return {
                ...state,
                payables: state.payables.map((p) =>
                    p.id === action.payload.id
                        ? { ...p, ...action.payload.changes }
                        : p
                ),
                lastActionTimestamp: timestamp,
                version: nextVersion,
            };

        // ========== Snapshot (Compaction) ==========
        case 'STATE_SNAPSHOT':
            return {
                ...action.payload,
                lastActionTimestamp: timestamp,
                version: action.snapshotVersion,
            };

        default:
            // Exhaustive check - will fail if a new action type is added but not handled
            const _exhaustive: never = action;
            return state;
    }
}

// ============================================================================
// Action Creators
// ============================================================================

/** Generate ISO timestamp */
function now(): string {
    return new Date().toISOString();
}

export const actions = {
    createAccount: (account: types.Account): AccountCreateAction => ({
        type: 'ACCOUNT_CREATE',
        payload: account,
        timestamp: now(),
    }),

    updateAccount: (
        id: string,
        changes: Partial<types.Account>
    ): AccountUpdateAction => ({
        type: 'ACCOUNT_UPDATE',
        payload: { id, changes },
        timestamp: now(),
    }),

    deleteAccount: (id: string): AccountDeleteAction => ({
        type: 'ACCOUNT_DELETE',
        payload: { id },
        timestamp: now(),
    }),

    postJournal: (entry: types.JournalEntry): JournalPostAction => ({
        type: 'JOURNAL_POST',
        payload: entry,
        timestamp: now(),
    }),

    voidJournal: (id: string, reason: string): JournalVoidAction => ({
        type: 'JOURNAL_VOID',
        payload: { id, reason },
        timestamp: now(),
    }),

    createEntity: (entity: types.Entity): EntityCreateAction => ({
        type: 'ENTITY_CREATE',
        payload: entity,
        timestamp: now(),
    }),

    updateEntity: (
        id: string,
        changes: Partial<types.Entity>
    ): EntityUpdateAction => ({
        type: 'ENTITY_UPDATE',
        payload: { id, changes },
        timestamp: now(),
    }),

    deleteEntity: (id: string): EntityDeleteAction => ({
        type: 'ENTITY_DELETE',
        payload: { id },
        timestamp: now(),
    }),

    submitNacha: (
        fileId: string,
        batchCount: number,
        entryCount: number,
        totalDebit: number,
        totalCredit: number,
        hash: string
    ): NachaSubmitAction => ({
        type: 'NACHA_SUBMIT',
        payload: {
            fileId,
            batchCount,
            entryCount,
            totalDebit,
            totalCredit,
            hash,
            submittedAt: now(),
        },
        timestamp: now(),
    }),

    settleNacha: (
        fileId: string,
        settlementDate: string,
        status: 'settled' | 'returned' | 'rejected',
        returnCode?: string
    ): NachaSettleAction => ({
        type: 'NACHA_SETTLE',
        payload: { fileId, settlementDate, status, returnCode },
        timestamp: now(),
    }),

    createSettlement: (
        settlement: types.SettlementInstruction
    ): SettlementCreateAction => ({
        type: 'SETTLEMENT_CREATE',
        payload: settlement,
        timestamp: now(),
    }),

    confirmSettlement: (
        confirmation: types.SettlementConfirmation
    ): SettlementConfirmAction => ({
        type: 'SETTLEMENT_CONFIRM',
        payload: confirmation,
        timestamp: now(),
    }),

    returnSettlement: (
        settlementId: string,
        returnCode: string,
        reason: string
    ): SettlementReturnAction => ({
        type: 'SETTLEMENT_RETURN',
        payload: { settlementId, returnCode, reason },
        timestamp: now(),
    }),

    createInvoice: (invoice: types.Invoice): InvoiceCreateAction => ({
        type: 'INVOICE_CREATE',
        payload: invoice,
        timestamp: now(),
    }),

    updateInvoice: (
        id: string,
        changes: Partial<types.Invoice>
    ): InvoiceUpdateAction => ({
        type: 'INVOICE_UPDATE',
        payload: { id, changes },
        timestamp: now(),
    }),

    createPayable: (payable: types.Payable): PayableCreateAction => ({
        type: 'PAYABLE_CREATE',
        payload: payable,
        timestamp: now(),
    }),

    updatePayable: (
        id: string,
        changes: Partial<types.Payable>
    ): PayableUpdateAction => ({
        type: 'PAYABLE_UPDATE',
        payload: { id, changes },
        timestamp: now(),
    }),

    snapshot: (state: LedgerState, version: number): StateSnapshotAction => ({
        type: 'STATE_SNAPSHOT',
        payload: state,
        timestamp: now(),
        snapshotVersion: version,
    }),
};

// ============================================================================
// WAL Replay Utility
// ============================================================================

/**
 * Replay a sequence of actions to rebuild state.
 * 
 * @param actions - Array of actions from WAL
 * @param initialState - Starting state (default: empty)
 * @returns Final state after all actions applied
 */
export function replayActions(
    actionList: LedgerAction[],
    initialState: LedgerState = EMPTY_LEDGER_STATE
): LedgerState {
    return actionList.reduce(ledgerReducer, initialState);
}

/**
 * Parse a JSONL WAL file into actions.
 * 
 * @param jsonlContent - Newline-delimited JSON content
 * @returns Array of parsed actions
 */
export function parseWalContent(jsonlContent: string): LedgerAction[] {
    return jsonlContent
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as LedgerAction);
}

/**
 * Serialize an action to a JSONL line.
 * 
 * @param action - Action to serialize
 * @returns JSON string with trailing newline
 */
export function serializeAction(action: LedgerAction): string {
    return JSON.stringify(action) + '\n';
}
