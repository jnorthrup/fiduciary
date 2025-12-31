
import { v4 as uuidv4 } from 'uuid';
import { Entity, EntityRole, EntityType, Account, AccountType, DCFlag, TaxModule, Contractor, ComplianceFiling, WalletCredential, BSORole, BSOSubmission, IRSAPICredential, Employee, PayrollRun, IRMDocument, SSAStatement, ResolutionRecord, TrustSubType, JournalEntry, CreditDefenseRecord, IntrusionRecord } from '../types';

const GENESIS_HASH = "0000000000000000";

/**
 * GENERATIONAL JIM HIERARCHY
 * Portrait-ready EIN masks implemented as last-4 identifiers.
 */
export const SEED_ENTITIES: Entity[] = [
  // FIDUCIARY ROOT
  {
    id: "ENT-ROOT",
    name: "Private Banker",
    type: EntityType.INDIVIDUAL,
    role: EntityRole.TRUSTEE,
    einLast4: "0055", // 38-00-0055
    parentEntityId: null,
    _version: GENESIS_HASH,
    imfProfile: {
        dsaStatus: 'Sustainable',
        arrearsPolicy: 'None',
        financingAssurances: true,
        programStatus: 'On Track'
    }
  },
  // ECCLESIASTICAL LAYER
  {
    id: "ENT-MIN-SOLE",
    name: "Generic Ministries Corp Sole",
    type: EntityType.TRUST,
    trustSubType: TrustSubType.ECCLESIASTICAL,
    role: EntityRole.HOLDING_TRUST,
    einLast4: "0085", // 33-00-0085
    parentEntityId: "ENT-ROOT",
    _version: GENESIS_HASH,
    imfProfile: {
        dsaStatus: 'Sustainable',
        arrearsPolicy: 'NTP',
        financingAssurances: true,
        programStatus: 'On Track'
    }
  },
  // ESTATE LAYER - With Arrears Scenario for Demo
  {
    id: "ENT-EST-USR",
    name: "Estate of John Doe",
    type: EntityType.ESTATE,
    role: EntityRole.LIVING_ESTATE,
    einLast4: "0075", // 99-00-0075
    parentEntityId: "ENT-ROOT",
    _version: GENESIS_HASH,
    imfProfile: {
        dsaStatus: 'Unsustainable',
        arrearsPolicy: 'LIA',
        financingAssurances: false,
        programStatus: 'Review Pending'
    }
  },
  // TRUST ARMS (Stem from Estate)
  {
    id: "ENT-ALPHA-TRUST",
    name: "Alpha Trust Inv. Express Trust",
    type: EntityType.TRUST,
    trustSubType: TrustSubType.EXPRESS,
    role: EntityRole.HOLDING_TRUST,
    einLast4: "0060", // 33-00-0060
    parentEntityId: "ENT-EST-USR",
    _version: GENESIS_HASH,
    imfProfile: {
        dsaStatus: 'Sustainable (High Prob)',
        arrearsPolicy: 'None',
        financingAssurances: true,
        programStatus: 'On Track'
    }
  },
  {
    id: "ENT-AAA-WTH",
    name: "Alpha Trust Withholding",
    type: EntityType.VENDOR,
    role: EntityRole.OTHER,
    einLast4: "0005", // 93-00-0005
    parentEntityId: "ENT-ALPHA-TRUST",
    _version: GENESIS_HASH
  },
  {
    id: "ENT-BETA-LLC",
    name: "Beta Consulting LLC",
    type: EntityType.LLC,
    role: EntityRole.OPERATING_LLC,
    einLast4: "0073", // 33-00-0073
    parentEntityId: "ENT-ALPHA-TRUST",
    _version: GENESIS_HASH,
    imfProfile: {
        dsaStatus: 'Sustainable',
        arrearsPolicy: 'None',
        financingAssurances: true,
        programStatus: 'On Track'
    }
  },
  {
    id: "ENT-BAO-PVT",
    name: "BAO Entourage Private UNLTD",
    type: EntityType.TRUST,
    role: EntityRole.HOLDING_TRUST,
    einLast4: "0095", // 33-00-0095
    parentEntityId: "ENT-ALPHA-TRUST",
    _version: GENESIS_HASH
  },
  {
    id: "ENT-USR-WTH",
    name: "JR Northrup Withholding",
    type: EntityType.VENDOR,
    role: EntityRole.OTHER,
    einLast4: "0038", // 93-00-0038
    parentEntityId: "ENT-BAO-PVT",
    _version: GENESIS_HASH
  },
  {
    id: "ENT-FARMS-LAND",
    name: "Gamma Land Land Trust",
    type: EntityType.TRUST,
    trustSubType: TrustSubType.ASSET_PROTECTION,
    role: EntityRole.HOLDING_TRUST,
    einLast4: "0008", // 33-00-0008
    parentEntityId: "ENT-EST-USR",
    _version: GENESIS_HASH,
    imfProfile: {
        dsaStatus: 'Exceptional Uncertainty',
        arrearsPolicy: 'LIOA-4',
        financingAssurances: false,
        programStatus: 'Off Track'
    }
  },
  // FOREIGN GRANTOR TRUSTS
  {
    id: "ENT-EPSILON-TRUST",
    name: "Epsilon Trust Trust",
    type: EntityType.TRUST,
    role: EntityRole.HOLDING_TRUST,
    einLast4: "0058", // 98-00-0058 (Rahmayani - Grantor)
    parentEntityId: "ENT-EST-USR",
    _version: GENESIS_HASH
  },
  {
    id: "ENT-NAURA-SCH",
    name: "Naura School Trust",
    type: EntityType.TRUST,
    role: EntityRole.BENEFICIARY, // Rahmayani - Trustee
    parentEntityId: "ENT-EPSILON-TRUST",
    _version: GENESIS_HASH
  },
  {
    id: "ENT-YPSI-90125",
    name: "90125 Ypsilanti USR Trust",
    type: EntityType.TRUST,
    role: EntityRole.HOLDING_TRUST,
    parentEntityId: "ENT-EST-USR", // Embedded in Will
    _version: GENESIS_HASH
  },
  // NEW LIVING TRUST
  {
    id: "ENT-LIVING-TRUST",
    name: "Northrup Living Trust",
    type: EntityType.TRUST,
    trustSubType: TrustSubType.REVOCABLE,
    role: EntityRole.HOLDING_TRUST,
    einLast4: "7721",
    parentEntityId: "ENT-ROOT",
    _version: GENESIS_HASH
  }
];

export const SEED_ACCOUNTS: Account[] = [
  // Balances calculated based on 5-year history generation below
  { id: "AC-101", entityId: "ENT-ROOT", code: "101000", name: "Master Treasury Account", type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 1250000.00, _version: GENESIS_HASH },
  { id: "AC-102", entityId: "ENT-ALPHA-TRUST", code: "101000", name: "Operating Cash", type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 500000.00, _version: GENESIS_HASH },
  { id: "AC-103", entityId: "ENT-BETA-LLC", code: "101000", name: "Business Checking", type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 285400.00, _version: GENESIS_HASH },
  { id: "AC-104", entityId: "ENT-FARMS-LAND", code: "101000", name: "Land Trust Reserves", type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 45000.00, _version: GENESIS_HASH },
  // Beta Accounts
  { id: "AC-V-INC", entityId: "ENT-BETA-LLC", code: "400000", name: "Consulting Revenue", type: AccountType.INCOME, normalBalance: DCFlag.Credit, balance: 0, _version: GENESIS_HASH },
  { id: "AC-V-EXP", entityId: "ENT-BETA-LLC", code: "500000", name: "Software Expense", type: AccountType.EXPENSE, normalBalance: DCFlag.Debit, balance: 0, _version: GENESIS_HASH },
  { id: "AC-V-PAY", entityId: "ENT-BETA-LLC", code: "510000", name: "Payroll Expense", type: AccountType.EXPENSE, normalBalance: DCFlag.Debit, balance: 0, _version: GENESIS_HASH },
  { id: "AC-V-EQ", entityId: "ENT-BETA-LLC", code: "300000", name: "Member Capital", type: AccountType.EQUITY, normalBalance: DCFlag.Credit, balance: 0, _version: GENESIS_HASH },
  // Trust Accounts
  { id: "AC-T-INC", entityId: "ENT-ALPHA-TRUST", code: "410000", name: "Distribution Income", type: AccountType.INCOME, normalBalance: DCFlag.Credit, balance: 0, _version: GENESIS_HASH },
  { id: "AC-T-EXP", entityId: "ENT-ALPHA-TRUST", code: "520000", name: "Trustee Fees", type: AccountType.EXPENSE, normalBalance: DCFlag.Debit, balance: 0, _version: GENESIS_HASH },
  // Universal Backfill Account
  { id: "AC-UNCAT", entityId: "ENT-BETA-LLC", code: "599000", name: "Uncategorized Expense", type: AccountType.EXPENSE, normalBalance: DCFlag.Debit, balance: 0, _version: GENESIS_HASH },
];

export const SEED_MODULES: TaxModule[] = [
  { id: "TM-ALPHA-Q1", entityId: "ENT-ALPHA-TRUST", period: "Q1", year: 2025, type: "INCOME", status: "Open", dueDate: "2025-04-15" },
  { id: "TM-BETA-Q1", entityId: "ENT-BETA-LLC", period: "Q1", year: 2025, type: "PAYROLL", status: "Open", dueDate: "2025-04-30" },
  { id: "TM-VERSA-Q2", entityId: "ENT-BETA-LLC", period: "Q2", year: 2025, type: "PAYROLL", status: "Open", dueDate: "2025-07-31" },
];

export const SEED_FILINGS: ComplianceFiling[] = [
  { id: "FIL-56-ROOT", entityId: "ENT-ROOT", formType: "56", status: "Accepted", filingDate: "2024-01-01", notes: "Fiduciary Capacity Established", _version: GENESIS_HASH },
];

// --- 5 YEAR HISTORICAL DATA GENERATOR ---
const generateHistory = (): JournalEntry[] => {
    const journals: JournalEntry[] = [];
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 5);
    
    // Operating Entity: Beta Consulting LLC
    const llcId = "ENT-BETA-LLC";
    const trustId = "ENT-ALPHA-TRUST";

    let currentDate = new Date(startDate);
    const endDate = new Date();

    while (currentDate < endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const month = currentDate.toLocaleString('default', { month: 'short' });
        const year = currentDate.getFullYear();

        // 1. Monthly Revenue (LLC)
        // High variation to look realistic
        const revenue = 15000 + Math.floor(Math.random() * 8000); // $15k - $23k
        journals.push({
            id: uuidv4(),
            entityId: llcId,
            date: dateStr,
            memo: `Client Invoice - ${month} ${year} - Retainer`,
            type: 'REVENUE',
            lines: [
                { id: uuidv4(), accountId: 'AC-103', accountCode: '101000', accountName: 'Business Checking', dc: DCFlag.Debit, amount: revenue },
                { id: uuidv4(), accountId: 'AC-V-INC', accountCode: '400000', accountName: 'Consulting Revenue', dc: DCFlag.Credit, amount: revenue }
            ],
            locked: true,
            _version: GENESIS_HASH
        });

        // 2. Monthly Expense (LLC)
        const expense = 2200 + Math.floor(Math.random() * 500);
        const expenseDate = new Date(currentDate);
        expenseDate.setDate(15);
        journals.push({
            id: uuidv4(),
            entityId: llcId,
            date: expenseDate.toISOString().split('T')[0],
            memo: `SaaS & Utility - ${month} ${year}`,
            type: 'EXPENSE',
            lines: [
                { id: uuidv4(), accountId: 'AC-V-EXP', accountCode: '500000', accountName: 'Software Expense', dc: DCFlag.Debit, amount: expense },
                { id: uuidv4(), accountId: 'AC-103', accountCode: '101000', accountName: 'Business Checking', dc: DCFlag.Credit, amount: expense }
            ],
            locked: true,
            _version: GENESIS_HASH
        });

        // 3. Quarterly Distribution (LLC -> Trust)
        // Approx $25k every quarter
        if ((currentDate.getMonth() + 1) % 3 === 0) {
            const distDate = new Date(currentDate);
            distDate.setDate(28);
            const distAmount = 25000;
            
            // LLC Side (Capital Out)
            journals.push({
                id: uuidv4(),
                entityId: llcId,
                date: distDate.toISOString().split('T')[0],
                memo: `Quarterly Dist. to Member - Q${Math.ceil((currentDate.getMonth()+1)/3)} ${year}`,
                type: 'DISTRIBUTION',
                lines: [
                    { id: uuidv4(), accountId: 'AC-V-EQ', accountCode: '300000', accountName: 'Member Capital', dc: DCFlag.Debit, amount: distAmount },
                    { id: uuidv4(), accountId: 'AC-103', accountCode: '101000', accountName: 'Business Checking', dc: DCFlag.Credit, amount: distAmount }
                ],
                locked: true,
                _version: GENESIS_HASH
            });

            // Trust Side (Income In)
            journals.push({
                id: uuidv4(),
                entityId: trustId,
                date: distDate.toISOString().split('T')[0],
                memo: `Distribution Received - Q${Math.ceil((currentDate.getMonth()+1)/3)} ${year}`,
                type: 'RECEIPT',
                lines: [
                    { id: uuidv4(), accountId: 'AC-102', accountCode: '101000', accountName: 'Operating Cash', dc: DCFlag.Debit, amount: distAmount },
                    { id: uuidv4(), accountId: 'AC-T-INC', accountCode: '410000', accountName: 'Distribution Income', dc: DCFlag.Credit, amount: distAmount }
                ],
                locked: true,
                _version: GENESIS_HASH
            });
        }

        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
        currentDate.setDate(1);
    }

    return journals;
};

export const SEED_JOURNALS: JournalEntry[] = generateHistory();

export const SEED_CREDIT_DEFENSE: CreditDefenseRecord[] = [
    {
        id: "DEF-EXP-001",
        entityId: "ENT-ROOT",
        targetAgency: "Experian",
        type: "CCPA Request",
        referenceNumber: "CCPA-2025-9982",
        status: "Sent",
        dateFiled: new Date().toISOString().split('T')[0],
        legalBasis: "CCPA/CPRA § 1798.105",
        outcome: "Pending Deletion",
        documents: ["Request to Delete Personal Information"]
    }
];

// --- EVIL NODES / INTRUSIONS ---
export const SEED_INTRUSIONS: IntrusionRecord[] = [
    {
        id: "INT-IRS-001",
        targetEntityId: "ENT-BETA-LLC",
        name: "IRS SB/SE Division",
        type: "Audit",
        jurisdiction: "Federal (IRS)",
        severity: "Critical",
        status: "Active"
    },
    {
        id: "INT-STATE-001",
        targetEntityId: "ENT-BETA-LLC",
        name: "State Franchise Board",
        type: "Inquiry",
        jurisdiction: "Local/State",
        severity: "Medium",
        status: "Active"
    },
    {
        id: "INT-CREDITOR-001",
        targetEntityId: "ENT-EST-USR",
        name: "Collections Bureau",
        type: "Lawsuit",
        jurisdiction: "Article 1 (Statutory)",
        severity: "Low",
        status: "Active"
    }
];

export const SEED_CONTRACTORS: Contractor[] = [];
export const SEED_WALLETS: WalletCredential[] = [];
export const SEED_BSO_ROLES: BSORole[] = [];
export const SEED_BSO_SUBMISSIONS: BSOSubmission[] = [];
export const SEED_IRS_CREDS: IRSAPICredential[] = [];
export const SEED_EMPLOYEES: Employee[] = [];
export const SEED_PAYROLL_RUNS: PayrollRun[] = [];
export const SEED_SSA_STATEMENTS: SSAStatement[] = [];
export const SEED_DOCUMENTS: IRMDocument[] = [];
export const SEED_RESOLUTIONS: ResolutionRecord[] = [];
