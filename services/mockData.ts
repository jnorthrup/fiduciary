
import { v4 as uuidv4 } from 'uuid';
import {
    Entity, EntityRole, EntityType, Account, AccountType, AccountClass, DCFlag, TaxModule,
    Contractor, ComplianceFiling, WalletCredential, BSORole, BSOSubmission,
    IRSAPICredential, Employee, PayrollRun, IRMDocument, SSAStatement,
    ResolutionRecord, TrustSubType, JournalEntry, CreditDefenseRecord, IntrusionRecord,
    CreditResolution, CreditInstrument, PurchaseContract, RealEstateAsset, LegalInstrument, CollateralPool, TransmissionLog
} from '../types';

const GENESIS_HASH = "0000000000000000";

// --- 1. JIM PROFILE DATA (JRN,  ) ---

// --- 1. FACTORIES ---

export const createEntity = (props: Partial<Entity>): Entity => ({
    id: uuidv4(),
    name: "Unknown Entity",
    type: EntityType.LLC,
    role: EntityRole.OPERATING_LLC,
    einLast4: "0000",
    parentEntityId: null,
    streetAddress: "123 Sovereign Way",
    city: "Cheyenne",
    state: "WY",
    zipCode: "82001",
    phone: "(307) 555-0100",
    _version: GENESIS_HASH,
    ...props
});

// --- 2. JIM PROFILE DATA (JRN,  ) ---

export const JIM_ENTITIES: Entity[] = [
    // FIDUCIARY ROOT
    createEntity({
        id: "ENT-ROOT",
        name: "Private Banker",
        type: EntityType.INDIVIDUAL,
        role: EntityRole.TRUSTEE,
        einLast4: "0055",
        imfProfile: {
            dsaStatus: 'Sustainable',
            arrearsPolicy: 'None',
            financingAssurances: true,
            programStatus: 'On Track'
        },
        streetAddress: "123 Sovereign Way",
        city: "Cheyenne",
        state: "WY",
        zipCode: "82001",
        phone: "(307) 555-0055"
    }),
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

export const createAccount = (props: Partial<Account> & { type?: AccountType }): Account => {
    const type = props.type ?? AccountType.ASSET;
    const accountClass: AccountClass = (type === AccountType.LIABILITY || type === AccountType.EQUITY || type === AccountType.INCOME) ? 'Credit' : 'Debit';

    return {
        id: uuidv4(),
        entityId: "ENT-ROOT",
        code: "000000",
        name: "Unknown Account",
        type,
        normalBalance: DCFlag.Debit,
        balance: 0,
        accountClass,
        isActive: true,
        children: [],
        _version: GENESIS_HASH,
        ...props
    };
};

export const JIM_ACCOUNTS: Account[] = [
    createAccount({ id: "AC-101", entityId: "ENT-ROOT", code: "101000", name: "Master Treasury Account", type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 1250000.00 }),
    createAccount({ id: "AC-RE-001", entityId: "ENT-ROOT", code: "150000", name: "Real Estate Assets", type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 400000.00 }),
    createAccount({ id: "AC-LIAB-001", entityId: "ENT-ROOT", code: "250000", name: "Credit Instruments Payable", type: AccountType.LIABILITY, normalBalance: DCFlag.Credit, balance: 400000.00 }),

    createAccount({ id: "AC-102", entityId: "ENT-AAA-TRUST", code: "101000", name: "Operating Cash", type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 485000.00 }),
    createAccount({ id: "AC-AAA-TAX-LIAB", entityId: "ENT-AAA-TRUST", code: "210000", name: "Federal Tax Liability", type: AccountType.LIABILITY, normalBalance: DCFlag.Credit, balance: 0 }),

    createAccount({ id: "AC-103", entityId: "ENT-VERSA-LLC", code: "101000", name: "Business Checking", type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 285400.00 }),
    createAccount({ id: "AC-104", entityId: "ENT-FARMS-LAND", code: "101000", name: "Land Trust Reserves", type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 45000.00 }),

    createAccount({ id: "AC-V-INC", entityId: "ENT-VERSA-LLC", code: "400000", name: "Consulting Revenue", type: AccountType.INCOME, normalBalance: DCFlag.Credit, balance: 0 }),
    createAccount({ id: "AC-V-EXP", entityId: "ENT-VERSA-LLC", code: "500000", name: "Software Expense", type: AccountType.EXPENSE, normalBalance: DCFlag.Debit, balance: 0 }),
    createAccount({ id: "AC-V-PAY", entityId: "ENT-VERSA-LLC", code: "510000", name: "Payroll Expense", type: AccountType.EXPENSE, normalBalance: DCFlag.Debit, balance: 0 }),
    createAccount({ id: "AC-V-EQ", entityId: "ENT-VERSA-LLC", code: "300000", name: "Member Capital", type: AccountType.EQUITY, normalBalance: DCFlag.Credit, balance: 0 }),

    createAccount({ id: "AC-T-INC", entityId: "ENT-AAA-TRUST", code: "410000", name: "Distribution Income", type: AccountType.INCOME, normalBalance: DCFlag.Credit, balance: 0 }),
    createAccount({ id: "AC-T-EXP", entityId: "ENT-AAA-TRUST", code: "520000", name: "Trustee Fees", type: AccountType.EXPENSE, normalBalance: DCFlag.Debit, balance: 0 }),
    createAccount({ id: "AC-UNCAT", entityId: "ENT-VERSA-LLC", code: "599000", name: "Uncategorized Expense", type: AccountType.EXPENSE, normalBalance: DCFlag.Debit, balance: 0 }),
];

const generateHistory = (): JournalEntry[] => {
    const journals: JournalEntry[] = [];
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 5);
    const llcId = "ENT-VERSA-LLC";
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

// Inject specific Journal for the new Credit Instrument
JIM_JOURNALS.push({
    id: "JNL-INST-002",
    entityId: "ENT-ROOT",
    date: new Date().toISOString().split('T')[0],
    memo: "Credit Instrument Acceptance: Secured Promissory Note",
    type: "ASSET_ACQ_CREDIT",
    lines: [
        { id: "L1", accountId: "AC-RE-001", accountCode: "150000", accountName: "Real Estate Assets", dc: DCFlag.Debit, amount: 400000 },
        { id: "L2", accountId: "AC-LIAB-001", accountCode: "250000", accountName: "Credit Instruments Payable", dc: DCFlag.Credit, amount: 400000 }
    ],
    locked: true,
    _version: GENESIS_HASH
});

// Inject EFTPS Payment
JIM_JOURNALS.push({
    id: "JNL-TAX-PAY-001",
    entityId: "ENT-AAA-TRUST",
    date: "2025-04-15",
    memo: "EFTPS Tax Payment - Q1 2025",
    type: "TAX_PAYMENT",
    lines: [
        { id: uuidv4(), accountId: "AC-AAA-TAX-LIAB", accountCode: "210000", accountName: "Federal Tax Liability", dc: DCFlag.Debit, amount: 15000.00 },
        { id: uuidv4(), accountId: "AC-102", accountCode: "101000", accountName: "Operating Cash", dc: DCFlag.Credit, amount: 15000.00 }
    ],
    locked: true,
    _version: GENESIS_HASH
});

export const JIM_MODULES: TaxModule[] = [
    { id: "TM-AAA-Q1", entityId: "ENT-AAA-TRUST", period: "Q1", year: 2025, type: "INCOME", status: "Open", dueDate: "2025-04-15" },
    { id: "TM-VERSA-Q1", entityId: "ENT-VERSA-LLC", period: "Q1", year: 2025, type: "PAYROLL", status: "Open", dueDate: "2025-04-30" },
    { id: "TM-LAS-Q1", entityId: "ENT-LAS-TRUST", period: "Annual", year: 2025, type: "INFO_RETURN", status: "Open", dueDate: "2025-04-15" },
];

export const JIM_FILINGS: ComplianceFiling[] = [
    { id: "FIL-56-ROOT", entityId: "ENT-ROOT", formType: "56", status: "Accepted", filingDate: "2024-01-01", notes: "Fiduciary Capacity Established", _version: GENESIS_HASH },
    { id: "FIL-56-MIN", entityId: "ENT-MIN-SOLE", formType: "56", status: "Accepted", filingDate: new Date().toISOString().split('T')[0], submissionId: "TRX1234567890", _version: GENESIS_HASH },
];

export const JIM_TRANSMISSIONS: TransmissionLog[] = [
    {
        id: "TRX-LOG-001",
        timestamp: new Date().toISOString(),
        channel: 'MeF',
        formType: '56',
        entityId: 'ENT-MIN-SOLE',
        status: 'Accepted',
        submissionId: 'TRX1234567890',
        xmlPayload: '<Form56><Fiduciary>JRN Ministries</Fiduciary></Form56>',
        ackPayload: '<Ack><Status>Accepted</Status><SubmissionId>TRX1234567890</SubmissionId></Ack>',
        latencyMs: 145
    }
];

export const JIM_BSO_ROLES: BSORole[] = [
    {
        id: "BSO-ROLE-001",
        entityId: "ENT-ROOT",
        registrationStatus: 'Active',
        services: ['AccuWage', 'W-2 Online'],
        activationCode: null,
        registeredAt: "2024-01-10T09:00:00Z",
        lastAuthenticated: new Date().toISOString()
    },
    {
        id: "BSO-ROLE-002",
        entityId: "ENT-AAA-TRUST",
        registrationStatus: 'Active',
        services: ['AccuWage'],
        activationCode: null,
        registeredAt: "2024-11-15T14:30:00Z",
        lastAuthenticated: new Date().toISOString()
    }
];

export const JIM_BSO_SUBMISSIONS: BSOSubmission[] = [
    {
        id: "BSO-SUB-101",
        bsoRoleId: "BSO-ROLE-001",
        reportType: "W-2",
        submissionDate: "2025-01-14",
        status: "Accepted",
        batchId: "B-20250114-01",
        accuWageStatus: 'Pass',
        errorDetails: null,
        submittedAt: "2025-01-14T10:00:00Z",
        acknowledgedAt: "2025-01-14T10:15:00Z"
    }
];

// --- 2. FUZZ / SYNTHETIC DATA (Disjoint) ---

export const FUZZ_ENTITIES: Entity[] = [
    { id: "FZ-ROOT", name: "Synthetic Operator", type: EntityType.INDIVIDUAL, role: EntityRole.TRUSTEE, parentEntityId: null, streetAddress: "000 Binary Blvd", city: "Cloud City", state: "WY", zipCode: "82001", phone: "(555) 000-0000", _version: GENESIS_HASH },
    { id: "FZ-CORP", name: "Chaos Corp LLC", type: EntityType.LLC, role: EntityRole.OPERATING_LLC, parentEntityId: "FZ-ROOT", streetAddress: "1337 Haxor Lane", city: "Sandbox", state: "WY", zipCode: "82001", phone: "(555) 133-7777", _version: GENESIS_HASH },
    { id: "FZ-TRUST", name: "Entropy Trust", type: EntityType.TRUST, role: EntityRole.HOLDING_TRUST, parentEntityId: "FZ-ROOT", streetAddress: "Void Street", city: "Nowhere", state: "WY", zipCode: "82001", _version: GENESIS_HASH },
    { id: "FZ-VESSEL", name: "SS Random Seed", type: EntityType.VESSEL, role: EntityRole.VESSEL, parentEntityId: "FZ-TRUST", _version: GENESIS_HASH }
];

export const FUZZ_ACCOUNTS: Account[] = [
    { id: "FA-01", entityId: "FZ-CORP", code: "101000", name: "Fuzz Cash", type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 99999, accountClass: 'Debit', isActive: true, _version: GENESIS_HASH },
    { id: "FA-02", entityId: "FZ-CORP", code: "400000", name: "Noise Revenue", type: AccountType.INCOME, normalBalance: DCFlag.Credit, balance: 0, accountClass: 'Credit', isActive: true, _version: GENESIS_HASH },
    { id: "FA-03", entityId: "FZ-TRUST", code: "300000", name: "Static Corpus", type: AccountType.EQUITY, normalBalance: DCFlag.Credit, balance: 5000, accountClass: 'Credit', isActive: true, _version: GENESIS_HASH },
    { id: "FA-04", entityId: "FZ-CORP", code: "201000", name: "Synthetic Accounts Payable", type: AccountType.LIABILITY, normalBalance: DCFlag.Credit, balance: 0, accountClass: 'Credit', isActive: true, _version: GENESIS_HASH },
    { id: "FA-05", entityId: "FZ-CORP", code: "501000", name: "Synthetic Operations", type: AccountType.EXPENSE, normalBalance: DCFlag.Debit, balance: 0, accountClass: 'Debit', isActive: true, _version: GENESIS_HASH },
    { id: "FA-06", entityId: "FZ-CORP", code: "102000", name: "Operating Checking", type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 45000, accountClass: 'Debit', isActive: true, _version: GENESIS_HASH },
    { id: "FA-07", entityId: "FZ-TRUST", code: "101000", name: "Trust Treasury", type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 125000, accountClass: 'Debit', isActive: true, _version: GENESIS_HASH },
    { id: "FA-08", entityId: "FZ-CORP", code: "502000", name: "Professional Services", type: AccountType.EXPENSE, normalBalance: DCFlag.Debit, balance: 0, accountClass: 'Debit', isActive: true, _version: GENESIS_HASH }
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

export const SEED_CONTRACTORS: Contractor[] = [
    { id: 'VEND-001', name: 'Global Cloud Systems', taxType: 'Business', tinLast4: '8812', email: 'billing@gcs.io', streetAddress: '404 Server Rd', city: 'Palo Alto', state: 'CA', zipCode: '94301', phone: '(650) 555-0100', w9OnFile: true, _version: '1' },
    { id: 'VEND-002', name: 'Sovereign Legal Counsel', taxType: 'Business', tinLast4: '2291', email: 'retainer@sov-legal.com', streetAddress: '777 Justice Ln', city: 'Cheyenne', state: 'WY', zipCode: '82001', phone: '(307) 555-0199', w9OnFile: true, _version: '1' },
    { id: 'VEND-003', name: 'Cheyenne Electric & Gas', taxType: 'Business', tinLast4: '4450', email: 'utilities@ceg.local', streetAddress: '10 Utility Way', city: 'Cheyenne', state: 'WY', zipCode: '82001', phone: '(307) 555-0011', w9OnFile: true, _version: '1' }
];
export const SEED_WALLETS: WalletCredential[] = [];
export const SEED_BSO_ROLES: BSORole[] = JIM_BSO_ROLES;
export const SEED_BSO_SUBMISSIONS: BSOSubmission[] = JIM_BSO_SUBMISSIONS;
export const SEED_IRS_CREDS: IRSAPICredential[] = [];
export const SEED_EMPLOYEES: Employee[] = [];
export const SEED_PAYROLL_RUNS: PayrollRun[] = [];
export const SEED_SSA_STATEMENTS: SSAStatement[] = [];
export const SEED_DOCUMENTS: IRMDocument[] = [
    {
        id: "DOC-BSO-001",
        entityId: "ENT-AAA-OPERATING",
        title: "SSA-941-Notice: Non-receipt of Quarterly Wage Report",
        category: 'Enforcement'
    },
    {
        id: "DOC-BSO-002",
        entityId: "ENT-AAA-OPERATING",
        title: "AccuWage-Unpostable: Invalid Name/SSN Combination",
        category: 'Unpostable'
    }
];
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

export const SEED_INVOICES: any[] = [];
export const SEED_PAYABLES: any[] = [];
export const SEED_SETTLEMENT_CONFIRMATIONS: any[] = [];
