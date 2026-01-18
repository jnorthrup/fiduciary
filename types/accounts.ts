/**
 * Account & Journal Domain Types
 * Double-entry bookkeeping types for the Trust Ledger System
 */

export enum AccountType {
  ASSET = 'Asset',
  LIABILITY = 'Liability',
  EQUITY = 'Equity',
  INCOME = 'Income',
  EXPENSE = 'Expense'
}

export enum DCFlag {
  Debit = 'Debit',
  Credit = 'Credit'
}

export type AccountClass = 'Debit' | 'Credit';

export interface Account {
  id: string;
  entityId: string;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: DCFlag;
  balance: number;
  accountClass?: AccountClass;
  isActive?: boolean;
  description?: string;
  taxLine?: string;
  parentAccountId?: string;
  children?: string[];
  internalAlias?: string; // e.g. TRUST-TREASURY-001
  _version: string;
}

export interface JournalLine {
  id: string;
  accountId?: string;
  accountCode: string;
  accountName: string;
  dc: DCFlag;
  amount: number;
  description?: string;
}

export interface JournalEntry {
  id: string;
  entityId: string;
  date: string;
  memo: string;
  type: string;
  lines: JournalLine[];
  locked: boolean;
  _version: string;
}

export interface WalletCredential {
  id: string;
  entityId: string;
  provider: string;
  address: string;
}

export interface CanalRecord {
  id: string;
  entityId: string;
  type: 'Deposit' | 'Draw' | 'Toll';
  amount: number;
  description: string;
  date: string;
  status: string;
  voucherId?: string;
}
