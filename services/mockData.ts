
import { v4 as uuidv4 } from 'uuid';
import {
    Entity, EntityRole, EntityType, Account, AccountType, DCFlag, TaxModule,
    Contractor, ComplianceFiling, WalletCredential, BSORole, BSOSubmission,
    IRSAPICredential, Employee, PayrollRun, IRMDocument, SSAStatement,
    ResolutionRecord, TrustSubType, JournalEntry, CreditDefenseRecord, IntrusionRecord,
    CreditResolution, CreditInstrument, PurchaseContract, RealEstateAsset, LegalInstrument, CollateralPool, TransmissionLog
} from '../types';

const GENESIS_HASH = "0000000000000000";

// --- 1. JIM PROFILE DATA (REMOVED) ---

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

// New Real Estate & Credit Instrument Seeds
export const SEED_REAL_ESTATE_ASSETS: RealEstateAsset[] = [
    {
        id: "PROP-REQ-001",
        entityId: "ENT-ROOT",
        address: "1234 Heritage Lane",
        parcelId: "APN-998877",
        county: "Davidson",
        state: "TN",
        status: 'Prospect',
        _version: '1'
    }
];

export const SEED_PURCHASE_CONTRACTS: PurchaseContract[] = [
    {
        id: "CON-REQ-001",
        entityId: "ENT-ROOT",
        propertyId: "PROP-REQ-001",
        sellerName: "Heritage Properties LLC",
        purchasePrice: 400000,
        effectiveDate: new Date().toISOString().split('T')[0],
        settlementTerms: "Instrument Exchange",
        status: 'Executed'
    }
];

export const SEED_CREDIT_RESOLUTIONS: CreditResolution[] = [
    {
        id: "RES-REQ-001",
        entityId: "ENT-ROOT",
        title: "RE Purchase Consideration Resolution",
        maxFaceAmount: 400000,
        signers: ["Trustee"],
        scope: "Acquisition of Real Property",
        status: 'Approved',
        approvedDate: new Date().toISOString().split('T')[0]
    }
];

export const SEED_CREDIT_INSTRUMENTS: CreditInstrument[] = [
    {
        id: "INST-REQ-001",
        entityId: "ENT-ROOT",
        resolutionId: "RES-REQ-001",
        contractId: "CON-REQ-001",
        faceAmount: 400000,
        termMonths: 180,
        issueDate: new Date().toISOString().split('T')[0],
        type: "Secured Promissory Note",
        status: 'Accepted',
        dischargeCondition: "Full payment via escrow"
    },
    {
        id: "INST-REQ-002",
        entityId: "ENT-ROOT",
        resolutionId: "RES-REQ-001",
        contractId: "CON-REQ-001",
        faceAmount: 400000,
        termMonths: 180,
        issueDate: new Date().toISOString().split('T')[0],
        type: "Secured Promissory Note",
        status: 'Accepted',
        dischargeCondition: "Full payment via escrow"
    }
];

export const SEED_LEGAL_INSTRUMENTS: LegalInstrument[] = [
    {
        id: "INST-WRIT-001",
        type: "Writ of Possession"
    }
];

export const SEED_COLLATERAL_POOLS: CollateralPool[] = [
    {
        id: "POOL-RE-001",
        entityId: "ENT-ROOT",
        name: "Real Estate Assets",
        description: "Collateral backing for secured promissory notes.",
        valuationPolicy: "LTV 80%, Annual Appraisal",
        status: 'Active',
        totalValue: 400000
    }
];

export const SEED_CLOSING_RECORDS: any[] = [];
