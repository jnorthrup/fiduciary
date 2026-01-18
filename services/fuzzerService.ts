
import { v4 as uuidv4 } from 'uuid';
import * as types from '../types';
import { DCFlag, AccountType } from '../types';

export interface FuzzerConfig {
    intensity: 'Low' | 'Medium' | 'High';
    includeInvoices: boolean;
    includeJournals: boolean;
    frequencySeconds: number;
}

export const generateFuzzedInvoice = (
    entity: types.Entity,
    vendors: types.Contractor[],
    accounts: types.Account[]
): types.Invoice => {
    const vendor = vendors[Math.floor(Math.random() * vendors.length)];
    const expenseAccounts = accounts.filter(a => a.type === AccountType.EXPENSE);
    const expenseAccount = expenseAccounts[Math.floor(Math.random() * expenseAccounts.length)];

    const amount = Math.floor(Math.random() * 5000) + 50;
    const date = new Date();
    const dueDate = new Date();
    dueDate.setDate(date.getDate() + 30);

    return {
        id: uuidv4(),
        entityId: entity.id,
        vendorId: vendor.id,
        invoiceNumber: `INV-${Math.floor(Math.random() * 90000) + 10000}`,
        issueDate: date.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        amount,
        description: `Synthetic ${expenseAccount?.name || 'Service'} Fee - ${date.toLocaleString('default', { month: 'long' })}`,
        status: 'Approved',
        items: [
            {
                description: expenseAccount?.name || 'General Service',
                amount,
                accountCode: expenseAccount?.code
            }
        ],
        _version: '1'
    };
};

export const generateJournalEntryForInvoice = (
    invoice: types.Invoice,
    accounts: types.Account[]
): { entry: types.JournalEntry; lines: any[] } => {
    const expenseAccount = accounts.find(a => a.code === invoice.items[0].accountCode);
    const apAccount = accounts.find(a => a.type === AccountType.LIABILITY && (a.name.includes('Payable') || a.code.startsWith('2')));

    if (!expenseAccount || !apAccount) {
        throw new Error('Required accounts (Expense/AP) not found for fuzzer');
    }

    const lines = [
        {
            accountId: expenseAccount.id,
            accountCode: expenseAccount.code,
            amount: invoice.amount,
            dc: DCFlag.Debit,
            description: invoice.description,
            accountName: expenseAccount.name
        },
        {
            accountId: apAccount.id,
            accountCode: apAccount.code,
            amount: invoice.amount,
            dc: DCFlag.Credit,
            description: `A/P: ${invoice.vendorId}`,
            accountName: apAccount.name
        }
    ];

    return {
        entry: {
            id: uuidv4(),
            entityId: invoice.entityId,
            date: invoice.issueDate,
            memo: `Accrual for ${invoice.invoiceNumber}`,
            type: 'Accounts Payable',
            lines: [], // Lines will be added by the postJournal logic
            locked: true,
            _version: '1'
        },
        lines
    };
};

export const generateRandomJournal = (
    entity: types.Entity,
    accounts: types.Account[]
): { entry: types.JournalEntry; lines: any[] } => {
    // Pick two accounts, one Asset/Expense (Debit normal) and one Liability/Equity/Income (Credit normal)
    const debitPool = accounts.filter(a => a.type === AccountType.ASSET || a.type === AccountType.EXPENSE);
    const creditPool = accounts.filter(a => a.type === AccountType.LIABILITY || a.type === AccountType.INCOME);

    const dAcc = debitPool[Math.floor(Math.random() * debitPool.length)];
    const cAcc = creditPool[Math.floor(Math.random() * creditPool.length)];

    const amount = Math.floor(Math.random() * 1000) + 10;
    const date = new Date().toISOString().split('T')[0];

    const lines = [
        { accountId: dAcc.id, accountCode: dAcc.code, amount, dc: DCFlag.Debit, description: 'Fuzzed Debit', accountName: dAcc.name },
        { accountId: cAcc.id, accountCode: cAcc.code, amount, dc: DCFlag.Credit, description: 'Fuzzed Credit', accountName: cAcc.name }
    ];

    return {
        entry: {
            id: uuidv4(),
            entityId: entity.id,
            date,
            memo: `Synthetic Fuzz Transaction #${Math.floor(Math.random() * 1000)}`,
            type: 'General Ledger',
            lines: [],
            locked: true,
            _version: '1'
        },
        lines
    };
};
