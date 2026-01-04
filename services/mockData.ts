
import { v4 as uuidv4 } from 'uuid';
import { Entity, EntityRole, EntityType, Account, AccountType, DCFlag, TaxModule, Contractor, ComplianceFiling, WalletCredential, BSORole, BSOSubmission, IRSAPICredential, Employee, PayrollRun, IRMDocument, SSAStatement, ResolutionRecord, TrustSubType, JournalEntry, CreditDefenseRecord, IntrusionRecord } from '../types';

const GENESIS_HASH = "0000000000000000";

// --- 1. JIM PROFILE DATA (JRN,  ) ---

export const JIM_ENTITIES: Entity[] = [
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
    name: "JRN Ministries Corp Sole",
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
  // ESTATE LAYER
  {
    id: "ENT-EST-JRN",
    name: "Estate of James R. Northrup Jr.",
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
  // TRUST ARMS
  {
    id: "ENT-AAA-TRUST",
    name: "AAA Angel Inv. Express Trust",
    type: EntityType.TRUST,
    trustSubType: TrustSubType.EXPRESS,
    role: EntityRole.HOLDING_TRUST,
    einLast4: "0060", // 33-00-0060
    parentEntityId: "ENT-EST-JRN",
    _version: GENESIS_HASH,
    imfProfile: {
        dsaStatus: 'Sustainable (High Prob)',
        arrearsPolicy: 'None',
        financingAssurances: true,
        programStatus: 'On Track'
    }
  },
  {
    id: "ENT-VERSA-LLC",
    name: "Versatile Consulting LLC",
    type: EntityType.LLC,
    role: EntityRole.OPERATING_LLC,
    einLast4: "0073", // 33-00-0073
    parentEntityId: "ENT-AAA-TRUST",
    _version: GENESIS_HASH,
    imfProfile: {
        dsaStatus: 'Sustainable',
        arrearsPolicy: 'None',
        financingAssurances: true,
        programStatus: 'On Track'
    }
  },
  {
    id: "ENT-FARMS-LAND",
    name: "Macaroon Farms Land Trust",
    type: EntityType.TRUST,
    trustSubType: TrustSubType.ASSET_PROTECTION,
    role: EntityRole.HOLDING_TRUST,
    einLast4: "0008", // 33-00-0008
    parentEntityId: "ENT-EST-JRN",
    _version: GENESIS_HASH
  },
  {
    id: "ENT-GINGER-TRUST",
    name: "Ginger Waffle Trust",
    type: EntityType.TRUST,
    role: EntityRole.HOLDING_TRUST,
    einLast4: "0058",
    parentEntityId: "ENT-EST-JRN",
    _version: GENESIS_HASH
  },
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

export const JIM_ACCOUNTS: Account[] = [
  { id: "AC-101", entityId: "ENT-ROOT", code: "101000", name: "Master Treasury Account", type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 1250000.00, _version: GENESIS_HASH },
  { id: "AC-102", entityId: "ENT-AAA-TRUST", code: "101000", name: "Operating Cash", type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 500000.00, _version: GENESIS_HASH },
  { id: "AC-103", entityId: "ENT-VERSA-LLC", code: "101000", name: "Business Checking", type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 285400.00, _version: GENESIS_HASH },
  { id: "AC-104", entityId: "ENT-FARMS-LAND", code: "101000", name: "Land Trust Reserves", type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 45000.00, _version: GENESIS_HASH },
  // Versatile Accounts
  { id: "AC-V-INC", entityId: "ENT-VERSA-LLC", code: "400000", name: "Consulting Revenue", type: AccountType.INCOME, normalBalance: DCFlag.Credit, balance: 0, _version: GENESIS_HASH },
  { id: "AC-V-EXP", entityId: "ENT-VERSA-LLC", code: "500000", name: "Software Expense", type: AccountType.EXPENSE, normalBalance: DCFlag.Debit, balance: 0, _version: GENESIS_HASH },
  { id: "AC-V-PAY", entityId: "ENT-VERSA-LLC", code: "510000", name: "Payroll Expense", type: AccountType.EXPENSE, normalBalance: DCFlag.Debit, balance: 0, _version: GENESIS_HASH },
  { id: "AC-V-EQ", entityId: "ENT-VERSA-LLC", code: "300000", name: "Member Capital", type: AccountType.EQUITY, normalBalance: DCFlag.Credit, balance: 0, _version: GENESIS_HASH },
  // Trust Accounts
  { id: "AC-T-INC", entityId: "ENT-AAA-TRUST", code: "410000", name: "Distribution Income", type: AccountType.INCOME, normalBalance: DCFlag.Credit, balance: 0, _version: GENESIS_HASH },
  { id: "AC-T-EXP", entityId: "ENT-AAA-TRUST", code: "520000", name: "Trustee Fees", type: AccountType.EXPENSE, normalBalance: DCFlag.Debit, balance: 0, _version: GENESIS_HASH },
  { id: "AC-UNCAT", entityId: "ENT-VERSA-LLC", code: "599000", name: "Uncategorized Expense", type: AccountType.EXPENSE, normalBalance: DCFlag.Debit, balance: 0, _version: GENESIS_HASH },
 ];

const generateHistory = (): JournalEntry[] => {
    const journals: JournalEntry[] = [];
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 5);
    const llcId = "ENT-VERSA-LLC";
    const trustId = "ENT-AAA-TRUST";
    let currentDate = new Date(startDate);
    const endDate = new Date();

    while (currentDate < endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const month = currentDate.toLocaleString('default', { month: 'short' });
        const year = currentDate.getFullYear();
        const revenue = 15000 + Math.floor(Math.random() * 8000); 
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
        currentDate.setMonth(currentDate.getMonth() + 1);
        currentDate.setDate(1);
    }
    return journals;
};

export const JIM_JOURNALS: JournalEntry[] = generateHistory();

export const JIM_MODULES: TaxModule[] = [
  { id: "TM-AAA-Q1", entityId: "ENT-AAA-TRUST", period: "Q1", year: 2025, type: "INCOME", status: "Open", dueDate: "2025-04-15" },
  { id: "TM-VERSA-Q1", entityId: "ENT-VERSA-LLC", period: "Q1", year: 2025, type: "PAYROLL", status: "Open", dueDate: "2025-04-30" },
  { id: "TM-LAS-Q1", entityId: "ENT-LAS-TRUST", period: "Annual", year: 2025, type: "INFO_RETURN", status: "Open", dueDate: "2025-04-15" },
];

export const JIM_FILINGS: ComplianceFiling[] = [
  { id: "FIL-56-ROOT", entityId: "ENT-ROOT", formType: "56", status: "Accepted", filingDate: "2024-01-01", notes: "Fiduciary Capacity Established", _version: GENESIS_HASH },
];

// --- 2. FUZZ / SYNTHETIC DATA (Disjoint) ---

export const FUZZ_ENTITIES: Entity[] = [
    { id: "FZ-ROOT", name: "Synthetic Operator", type: EntityType.INDIVIDUAL, role: EntityRole.TRUSTEE, parentEntityId: null, _version: GENESIS_HASH },
    { id: "FZ-CORP", name: "Chaos Corp LLC", type: EntityType.LLC, role: EntityRole.OPERATING_LLC, parentEntityId: "FZ-ROOT", _version: GENESIS_HASH },
    { id: "FZ-TRUST", name: "Entropy Trust", type: EntityType.TRUST, role: EntityRole.HOLDING_TRUST, parentEntityId: "FZ-ROOT", _version: GENESIS_HASH },
    { id: "FZ-VESSEL", name: "SS Random Seed", type: EntityType.VESSEL, role: EntityRole.VESSEL, parentEntityId: "FZ-TRUST", _version: GENESIS_HASH }
];

export const FUZZ_ACCOUNTS: Account[] = [
    { id: "FA-01", entityId: "FZ-CORP", code: "101000", name: "Fuzz Cash", type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 99999, _version: GENESIS_HASH },
    { id: "FA-02", entityId: "FZ-CORP", code: "400000", name: "Noise Revenue", type: AccountType.INCOME, normalBalance: DCFlag.Credit, balance: 0, _version: GENESIS_HASH },
    { id: "FA-03", entityId: "FZ-TRUST", code: "300000", name: "Static Corpus", type: AccountType.EQUITY, normalBalance: DCFlag.Credit, balance: 5000, _version: GENESIS_HASH }
];

export const FUZZ_JOURNALS: JournalEntry[] = [
    {
        id: "FJ-01",
        entityId: "FZ-CORP",
        date: new Date().toISOString().split('T')[0],
        memo: "Initial Fuzz Injection",
        type: "INIT",
        lines: [
            { id: "FL-01", accountId: "FA-01", accountCode: "101000", accountName: "Fuzz Cash", dc: DCFlag.Debit, amount: 99999 },
            { id: "FL-02", accountId: "FA-02", accountCode: "400000", accountName: "Noise Revenue", dc: DCFlag.Credit, amount: 99999 }
        ],
        locked: true,
        _version: "1"
    }
];

// --- SHARED SEED DATA (Can be used by both or cleared) ---
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
export const SEED_REAL_ESTATE_ASSETS: any[] = [];
export const SEED_PURCHASE_CONTRACTS: any[] = [];
export const SEED_CREDIT_RESOLUTIONS: any[] = [];
export const SEED_CREDIT_INSTRUMENTS: any[] = [];
export const SEED_CLOSING_RECORDS: any[] = [];
