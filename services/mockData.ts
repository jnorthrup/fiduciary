
import { Entity, EntityRole, EntityType, Account, AccountType, DCFlag, TaxModule, Contractor, ComplianceFiling, WalletCredential, BSORole, BSOSubmission, IRSAPICredential, Employee, PayrollRun, IRMDocument, SSAStatement } from '../types';

const GENESIS_HASH = "0000000000000000";

export const SEED_ENTITIES: Entity[] = [
  {
    id: "ENT-001",
    name: "L.A.S. Revocable Living Trust",
    type: EntityType.TRUST,
    role: EntityRole.HOLDING_TRUST,
    einLast4: "9982",
    parentEntityId: null,
    regionCode: 'KCSC', // Kansas City Service Center
    _version: GENESIS_HASH
  },
  {
    id: "ENT-002",
    name: "ALL-AROUND-CONSTRUCTION LLC",
    type: EntityType.LLC,
    role: EntityRole.OPERATING_LLC,
    einLast4: "4421",
    parentEntityId: "ENT-001", // Hierarchy established
    regionCode: 'OSC', // Ogden Service Center
    _version: GENESIS_HASH
  }
];

export const SEED_WALLETS: WalletCredential[] = [
  {
    id: "WAL-001",
    entityId: "ENT-001",
    network: "Ethereum",
    address: "0x71C...9A21",
    label: "Trust Cold Storage",
    balance: "45.2 ETH"
  },
  {
    id: "WAL-002",
    entityId: "ENT-002",
    network: "Multisig",
    address: "0xGno...Safe",
    label: "LLC Treasury Ops",
    balance: "12,500 USDC"
  }
];

export const SEED_ACCOUNTS: Account[] = [
  // Trust Accounts
  { id: "AC-101", entityId: "ENT-001", code: "101000", name: "Operating Cash", type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 125000.00, _version: GENESIS_HASH },
  { id: "AC-102", entityId: "ENT-001", code: "102000", name: "Tax Payment Clearing", type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 0, _version: GENESIS_HASH },
  { id: "AC-103", entityId: "ENT-001", code: "103000", name: "Remittance Suspense", type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 0, _version: GENESIS_HASH },
  { id: "AC-140", entityId: "ENT-001", code: "140000", name: "Prepaid Taxes", type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 0, _version: GENESIS_HASH },
  { id: "AC-150", entityId: "ENT-001", code: "150000", name: "Investment – Operating LLC", type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 25000.00, _version: GENESIS_HASH },
  { id: "AC-301", entityId: "ENT-001", code: "301000", name: "Trust Corpus", type: AccountType.EQUITY, normalBalance: DCFlag.Credit, balance: 150000.00, _version: GENESIS_HASH },
  
  // LLC Accounts
  { id: "AC-L101", entityId: "ENT-002", code: "101000", name: "Operating Cash – LLC", type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 42000.50, _version: GENESIS_HASH },
  { id: "AC-L510", entityId: "ENT-002", code: "510100", name: "Contractor Labor Expense", type: AccountType.EXPENSE, normalBalance: DCFlag.Debit, balance: 0, _version: GENESIS_HASH },
  { id: "AC-L210", entityId: "ENT-002", code: "210100", name: "Contractor Payable", type: AccountType.LIABILITY, normalBalance: DCFlag.Credit, balance: 0, _version: GENESIS_HASH },
  { id: "AC-L520", entityId: "ENT-002", code: "520100", name: "Materials Expense", type: AccountType.EXPENSE, normalBalance: DCFlag.Debit, balance: 0, _version: GENESIS_HASH },
  { id: "AC-L521", entityId: "ENT-002", code: "520110", name: "Materials Sales Tax Expense", type: AccountType.EXPENSE, normalBalance: DCFlag.Debit, balance: 0, _version: GENESIS_HASH },
  { id: "AC-L300", entityId: "ENT-002", code: "300000", name: "Member Capital – Trust", type: AccountType.EQUITY, normalBalance: DCFlag.Credit, balance: 25000.00, _version: GENESIS_HASH },
  // Payroll specific accounts
  { id: "AC-L530", entityId: "ENT-002", code: "530000", name: "Salaries & Wages", type: AccountType.EXPENSE, normalBalance: DCFlag.Debit, balance: 0, _version: GENESIS_HASH },
  { id: "AC-L531", entityId: "ENT-002", code: "530100", name: "Payroll Tax Expense", type: AccountType.EXPENSE, normalBalance: DCFlag.Debit, balance: 0, _version: GENESIS_HASH },
  { id: "AC-L220", entityId: "ENT-002", code: "220000", name: "Payroll Liabilities (941/State)", type: AccountType.LIABILITY, normalBalance: DCFlag.Credit, balance: 0, _version: GENESIS_HASH },
  // Enforcement Accounts
  { id: "AC-L290", entityId: "ENT-002", code: "290000", name: "Garnishment Payable (Levy)", type: AccountType.LIABILITY, normalBalance: DCFlag.Credit, balance: 0, _version: GENESIS_HASH },
];

export const SEED_MODULES: TaxModule[] = [
  // Trust Modules (1041 Estimated Payments)
  { id: "TM-T-Q1", entityId: "ENT-001", period: "Q1", year: 2025, type: "INCOME", status: "Closed", dueDate: "2025-04-15" },
  { id: "TM-T-Q2", entityId: "ENT-001", period: "Q2", year: 2025, type: "INCOME", status: "Open", dueDate: "2025-06-15" },
  { id: "TM-T-Q3", entityId: "ENT-001", period: "Q3", year: 2025, type: "INCOME", status: "Open", dueDate: "2025-09-15" },
  { id: "TM-T-Q4", entityId: "ENT-001", period: "Q4", year: 2025, type: "INCOME", status: "Open", dueDate: "2026-01-15" },
  
  // LLC Modules (Information Returns / 1099 tracking)
  { id: "TM-L-Q1", entityId: "ENT-002", period: "Q1", year: 2025, type: "INFO_RETURN", status: "Closed", dueDate: "2025-03-31" },
  { id: "TM-L-Q2", entityId: "ENT-002", period: "Q2", year: 2025, type: "INFO_RETURN", status: "Open", dueDate: "2025-06-30" },
  
  // LLC Payroll Modules (941)
  { id: "TM-P-Q1", entityId: "ENT-002", period: "Q1", year: 2025, type: "PAYROLL", status: "Closed", dueDate: "2025-04-30" },
  { id: "TM-P-Q2", entityId: "ENT-002", period: "Q2", year: 2025, type: "PAYROLL", status: "Open", dueDate: "2025-07-31" },
];

export const SEED_CONTRACTORS: Contractor[] = [
  { id: "CTR-001", name: "John Doe Services", tinLast4: "1122", w9OnFile: true },
  { id: "CTR-002", name: "Apex Electrical", tinLast4: "5588", w9OnFile: true },
];

export const SEED_FILINGS: ComplianceFiling[] = [
  { id: "FIL-001", entityId: "ENT-001", formType: "56", status: "Filed", filingDate: "2024-01-15", notes: "Trustee Appointment", _version: GENESIS_HASH },
  { id: "FIL-002", entityId: "ENT-001", formType: "2848", status: "Drafted", notes: "Auth for CPA", _version: GENESIS_HASH },
  { id: "FIL-003", entityId: "ENT-002", formType: "56", status: "Not Started", notes: "Member Managed", _version: GENESIS_HASH },
  // Unpostable Example
  { id: "FIL-004", entityId: "ENT-001", formType: "1041", status: "Unpostable", filingDate: "2024-04-15", notes: "Entity Name Mismatch - Suspense", _version: GENESIS_HASH },
  // New Payroll Filings
  { id: "FIL-005", entityId: "ENT-002", formType: "941", status: "Not Started", notes: "Q1 2025 Payroll Tax", _version: GENESIS_HASH },
  { id: "FIL-006", entityId: "ENT-002", formType: "940", status: "Not Started", notes: "2025 Annual FUTA", _version: GENESIS_HASH },
  // Trust Indenture Act
  { id: "FIL-007", entityId: "ENT-001", formType: "T-1", status: "Filed", filingDate: "2024-01-20", notes: "Trust Indenture Act of 1939 Eligibility", _version: GENESIS_HASH },
  // SSA-89 Form
  { id: "FIL-008", entityId: "ENT-001", formType: "SSA-89", status: "Not Started", notes: "Authorization to Release SSN Verification", _version: GENESIS_HASH },
  // Trust Description Form
  { id: "FIL-009", entityId: "ENT-001", formType: "Trust-Description", status: "Not Started", notes: "IRM Complex Irrevocable Trust Description", _version: GENESIS_HASH }
];

export const SEED_BSO_ROLES: BSORole[] = [
  { id: "BSO-001", entityId: "ENT-002", roleType: "Employer", bsoId: "USER_LLC_EMP", registrationStatus: "Active" },
  { id: "BSO-002", entityId: "ENT-001", roleType: "Submitter", bsoId: "USER_TRUST_SUB", registrationStatus: "Active" }
];

export const SEED_BSO_SUBMISSIONS: BSOSubmission[] = [
  { id: "SUB-001", bsoRoleId: "BSO-001", reportType: "W-2", batchId: "BATCH_2024_001", status: "AccuWage-Pass", submissionDate: "2025-01-20" },
  { id: "SUB-002", bsoRoleId: "BSO-001", reportType: "W-2", batchId: "BATCH_2024_002", status: "Processed", submissionDate: "2025-01-25" }
];

export const SEED_IRS_CREDS: IRSAPICredential[] = [
  { id: "IRS-001", entityId: "ENT-001", system: "A2A", appId: "APP_998877", status: "Active", twoFactorProvider: "ID.me", lastAuthenticated: "2025-02-10T09:00:00Z" }
];

// --- HR DATA ---

export const SEED_EMPLOYEES: Employee[] = [
  { id: "EMP-001", entityId: "ENT-002", firstName: "Mike", lastName: "Foreman", role: "Site Supervisor", department: "Field", salary: 85000, payFrequency: "Bi-Weekly", status: "Active", hireDate: "2023-05-15" },
  { id: "EMP-002", entityId: "ENT-002", firstName: "Sarah", lastName: "Admin", role: "Office Manager", department: "Admin", salary: 62000, payFrequency: "Bi-Weekly", status: "Active", hireDate: "2024-01-10" },
  { id: "EMP-003", entityId: "ENT-002", firstName: "Dave", lastName: "Junior", role: "Apprentice", department: "Field", salary: 45000, payFrequency: "Bi-Weekly", status: "Onboarding", hireDate: "2025-02-01" },
];

export const SEED_PAYROLL_RUNS: PayrollRun[] = [
  { id: "PR-2025-01", entityId: "ENT-002", periodStart: "2025-01-01", periodEnd: "2025-01-15", payDate: "2025-01-20", totalGross: 5653.84, totalEmployerTax: 432.52, totalNetPay: 4500.00, status: "Posted" }
];

export const SEED_SSA_STATEMENTS: SSAStatement[] = [
  {
      id: "SSA-001",
      employeeId: "SELF",
      currentYear: 2025,
      taxedSocialSecurityEarnings: 0,
      taxedMedicareEarnings: 0,
      estimatedRetirementBenefit: 0,
      eligibilityStatus: "Not Qualified",
      credits: 0,
      lastUpdated: "2025-01-01T00:00:00Z"
  }
];

// --- DOCUMENT SEEDS ---
export const SEED_DOCUMENTS: IRMDocument[] = [
  { id: "DOC-001", entityId: "ENT-001", taxYear: 2024, formType: "56", fileName: "Form56_TrusteeAppt_2024.pdf", generatedDate: "2024-01-15", status: "Submitted", size: "145 KB", category: "Compliance", campusDestination: "Kansas City, MO" },
  { id: "DOC-002", entityId: "ENT-002", taxYear: 2024, formType: "941", fileName: "Form941_Q4_2024.pdf", generatedDate: "2025-01-31", status: "Submitted", size: "210 KB", category: "Compliance", campusDestination: "Ogden, UT" },
  // Resolution & Enforcement Docs
  { id: "DOC-003", entityId: "ENT-001", taxYear: 2024, formType: "15103", fileName: "Form15103_PmtTrace_EFTPS.pdf", generatedDate: "2025-02-15", status: "Tracer Active", size: "88 KB", category: "Remittance", campusDestination: "Ogden, UT" },
  { id: "DOC-004", entityId: "ENT-002", taxYear: 2025, formType: "668-W", fileName: "Form668W_Levy_Notice.pdf", generatedDate: "2025-02-20", status: "Suspense", size: "405 KB", category: "Enforcement", campusDestination: "Fresno, CA" },
];