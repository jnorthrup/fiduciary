export enum EntityRole {
  HOLDING_TRUST = "HOLDING_TRUST",
  OPERATING_LLC = "OPERATING_LLC",
  OTHER = "OTHER"
}

export enum EntityType {
  TRUST = "TRUST",
  LLC = "LLC",
  VENDOR = "VENDOR",
  CONTRACTOR = "CONTRACTOR"
}

export enum AccountType {
  ASSET = "Asset",
  LIABILITY = "Liability",
  EQUITY = "Equity",
  INCOME = "Income",
  EXPENSE = "Expense"
}

export enum DCFlag {
  Debit = "D",
  Credit = "C"
}

export interface WalletCredential {
  id: string;
  entityId: string;
  network: "Ethereum" | "Bitcoin" | "Solana" | "Multisig" | "Custodial";
  address: string;
  label: string;
  balance?: string;
}

// --- Modeling Types ---
export interface TimeSeriesPoint {
  date: string;
  value: number;
  projected: boolean;
}

export interface EntityModelData {
  vizType: 'D3_SERIES' | 'MERMAID_FLOW' | 'DOT_STRUCT';
  timeSeries: TimeSeriesPoint[];
  definition?: string; // For Mermaid/DOT content
  lastGenerated?: string;
}

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  role: EntityRole;
  einLast4?: string;
  parentEntityId?: string | null;
  regionCode?: 'OSC' | 'KCSC' | 'FSC';
  modelData?: EntityModelData; // New field for modeling
}

export interface Account {
  id: string;
  entityId: string;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: DCFlag;
  balance: number; // Computed balance
}

export interface TaxModule {
  id: string;
  entityId: string;
  period: string; // Q1, Q2, Q3, Q4, ANNUAL
  year: number;
  type: "INCOME" | "INFO_RETURN" | "SALES_USE" | "PAYROLL";
  status: "Open" | "Closed" | "Suspense"; // Suspense for Unpostables
  dueDate: string;
}

export interface JournalLine {
  id: string;
  accountId: string;
  accountName: string; // Denormalized for display ease
  accountCode: string;
  dc: DCFlag;
  amount: number;
  moduleId?: string;
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
  reference?: string;
}

export interface Contractor {
  id: string;
  name: string;
  tinLast4: string;
  w9OnFile: boolean;
}

// --- HR & Payroll Types ---

export type EmploymentStatus = 'Active' | 'Onboarding' | 'Terminated' | 'Leave';

export interface Employee {
  id: string;
  entityId: string;
  firstName: string;
  lastName: string;
  role: string;
  department: 'Management' | 'Operations' | 'Field' | 'Admin';
  salary: number; // Annual or Hourly rate representation
  payFrequency: 'Bi-Weekly' | 'Monthly';
  status: EmploymentStatus;
  hireDate: string;
}

export interface PayrollRun {
  id: string;
  entityId: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  totalGross: number;
  totalEmployerTax: number;
  totalNetPay: number;
  status: 'Draft' | 'Posted';
  journalId?: string;
}

export type IRSFormType = '56' | '2848' | '8821' | '941' | '940' | '1041' | 'W-2' | '15103' | '9779' | '668-W' | 'CP-2000';

export interface ComplianceFiling {
  id: string;
  entityId: string;
  formType: IRSFormType;
  status: 'Not Started' | 'Drafted' | 'Filed' | 'Accepted' | 'Rejected' | 'Unpostable' | 'Tracing';
  filingDate?: string;
  notes?: string;
  submissionId?: string; // Link to API transmission
}

// --- IRS & BSO Specific Types ---

export type TwoFactorProvider = 'ID.me' | 'Login.gov' | 'IRS Secure Access';

export interface BSORole {
  id: string;
  entityId: string;
  roleType: 'Employer' | 'Submitter' | 'Reporting Agent';
  bsoId: string; // User ID for BSO
  registrationStatus: 'Pending' | 'Active' | 'Suspended';
}

export interface BSOSubmission {
  id: string;
  bsoRoleId: string;
  reportType: 'W-2' | 'W-2c' | 'Verification';
  batchId: string;
  status: 'Uploaded' | 'AccuWage-Errors' | 'AccuWage-Pass' | 'Processed';
  submissionDate: string;
}

export interface IRSAPICredential {
  id: string;
  entityId: string;
  system: 'A2A' | 'IRIS' | 'AIR';
  appId: string;
  status: 'Active' | 'Revoked' | 'Pending 2FA';
  twoFactorProvider: TwoFactorProvider;
  lastAuthenticated: string;
}

// --- IRS API Simulation Types ---

export type ApiChannel = 'MeF' | 'AIR' | 'IRIS' | 'TIN_MATCH';
export type TransmissionStatus = 'Queued' | 'Transmitting' | 'Received' | 'Accepted' | 'Rejected';

export interface TransmissionLog {
  id: string;
  timestamp: string;
  channel: ApiChannel;
  formType: IRSFormType;
  entityId: string;
  status: TransmissionStatus;
  submissionId: string; // MeF Submission ID
  xmlPayload: string; // Mock XML content
  ackPayload?: string; // Mock Acknowledgement XML
  latencyMs: number;
}

export interface SystemStatus {
  channel: ApiChannel;
  status: 'Operational' | 'Degraded' | 'Maintenance';
  latency: string;
  uptime: string;
}

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  source: 'IRM' | 'Pub' | 'Form';
  url: string;
  relevance: number;
}

// --- IRM Taxonomy / Document Management ---

export type IRSResolutionCategory = 'Compliance' | 'Remittance' | 'Unpostable' | 'Transfer' | 'Enforcement' | 'Court';

export interface IRMDocument {
  id: string;
  entityId: string;
  taxYear: number;
  formType: IRSFormType;
  fileName: string;
  generatedDate: string;
  status: 'Generated' | 'Signed' | 'Submitted' | 'Tracer Active' | 'Suspense';
  size: string;
  category: IRSResolutionCategory;
  campusDestination?: string; // e.g. "Ogden, UT"
  relatedJournalIds?: string[];
  relatedAccountIds?: string[];
}