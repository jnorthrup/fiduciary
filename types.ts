
export enum EntityRole {
  HOLDING_TRUST = "HOLDING_TRUST",
  OPERATING_LLC = "OPERATING_LLC",
  LIVING_ESTATE = "LIVING_ESTATE",
  BENEFICIARY = "BENEFICIARY",
  TRUSTEE = "TRUSTEE",
  LIVESTOCK = "LIVESTOCK", // New: For biological assets
  OTHER = "OTHER"
}

export enum EntityType {
  TRUST = "TRUST",
  LLC = "LLC",
  VENDOR = "VENDOR",
  CONTRACTOR = "CONTRACTOR",
  ESTATE = "ESTATE",
  INDIVIDUAL = "INDIVIDUAL",
  BIOLOGICAL_ASSET = "BIOLOGICAL_ASSET" // New: For animals
}

export enum TrustSubType {
  REVOCABLE = "REVOCABLE",
  IRREVOCABLE = "IRREVOCABLE",
  EXPRESS = "EXPRESS", // Common Law / Living Express
  ECCLESIASTICAL = "ECCLESIASTICAL", // 508c1a
  ASSET_PROTECTION = "ASSET_PROTECTION",
  UNSPECIFIED = "UNSPECIFIED"
}

export enum AccountType {
  ASSET = "Asset",
  LIABILITY = "Liability",
  EQUITY = "Equity",
  INCOME = "Income",
  EXPENSE = "Expense",
  MEMO = "Memo" // Added for non-commercial tracking
}

export enum DCFlag {
  Debit = "D",
  Credit = "C"
}

// --- User & Permissions ---
export type UserRole = 'Owner' | 'Admin' | 'Editor' | 'Viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarInitials: string;
  lastActive: string;
  // Extended Profile Fields
  jobTitle?: string;
  department?: string;
  phoneNumber?: string;
  isPrivate?: boolean; // Private profile flag (hides activity/details from non-admins)
  _version: string;
}

export interface WalletCredential {
  id: string;
  entityId: string;
  network: "Ethereum" | "Bitcoin" | "Solana" | "Multisig" | "Custodial";
  address: string;
  label: string;
  balance?: string;
}

// --- CIR / Digital Wallets ---
export const CIR_CANS = {
    PAYPAL: '010020',
    AMAZON: '010058'
};

export type CIRExtractType = 'Summary Only' | 'Detail Only' | 'Summary and Detail';
export type DigitalWalletFilter = 'All' | 'PayPal' | 'Amazon';

// --- Agency Self-Certification (NTDO) ---
export interface AgencyCertification {
  id: string;
  entityId: string;
  fiscalYear: number;
  status: 'In Progress' | 'Certified' | 'Qualified Assurance' | 'Non-Compliant';
  responses: Record<string, 'Yes' | 'No' | 'N/A'>;
  completedDate?: string;
  certifyingOfficerSignature?: string;
}

// --- TreasuryDirect & Securities ---
export interface TreasurySecurity {
  id: string;
  entityId: string;
  cusip: string;
  type: 'T-Bill' | 'T-Note' | 'T-Bond' | 'Savings Bond';
  faceValue: number;
  maturityDate: string;
  status: 'Active' | 'Redeemed' | 'Maturing';
}

export interface FSForm1010 {
  id: string;
  entityId: string;
  resolutionDate: string;
  authorizedIndividuals: { name: string; title: string; authority: 'Alone' | 'Jointly' }[];
  accountsCovered: 'All' | 'Specific';
  specificAccounts?: string;
  certifyingOfficer: string;
  sealPresent: boolean;
}

// --- Legal & Court Instruments ---
export type LegalInstrumentType = 'Appearance Bond' | 'Writ of Possession' | 'Capias Warrant' | 'Protection Order' | 'Affidavit';

export interface LegalInstrument {
  id: string;
  entityId: string;
  type: LegalInstrumentType;
  caseNumber: string;
  courtName: string;
  filingDate: string;
  parties: { role: string; name: string }[];
  amount?: number; // Bond amount etc.
  status: 'Draft' | 'Filed' | 'Executed' | 'Discharged';
  documentUrl?: string; // Link to PDF
}

// --- Sanctions & Compliance (IEEPA/TWEA) ---
export interface SanctionsScreening {
  id: string;
  entityId: string;
  program: 'OFAC' | 'IEEPA' | 'TWEA';
  checkDate: string;
  status: 'Clear' | 'Flagged' | 'Blocked';
  referenceList: 'SDN' | 'SSI' | 'Sectoral';
}

// --- Credit Gateway Setup ---
export interface CreditGatewayProfile {
  id: string;
  entityId: string;
  agencyLocatorCode: string; // ALC
  cashFlowName: string; // Max 25 chars
  programEnrollment: {
    ach: boolean;
    fedwire: boolean;
    olbp: boolean; // Online Bill Payment
  };
  contacts: {
    primary: { name: string; phone: string; email: string; };
  };
}

// --- Modeling Types ---
export interface TimeSeriesPoint {
  date: string;
  value: number;
  projected: boolean;
}

export type LayoutAlgorithm = 'TREE_ORTHOGONAL' | 'FORCE_DIRECTED' | 'RADIAL';

export interface EntityModelData {
  vizType: 'D3_SERIES' | 'MERMAID_FLOW' | 'DOT_STRUCT';
  layoutType?: LayoutAlgorithm; // New field for y-files style layout selection
  timeSeries: TimeSeriesPoint[];
  definition?: string; // For Mermaid/DOT content
  lastGenerated?: string;
}

export interface EntityPosition {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  trustSubType?: TrustSubType; // New field for specific indenture type
  role: EntityRole;
  einLast4?: string;
  parentEntityId?: string | null;
  regionCode?: 'OSC' | 'KCSC' | 'FSC';
  modelData?: EntityModelData; // New field for modeling
  uiPosition?: EntityPosition; // New field for Visual Builder
  _version: string; // Pijul/CRDT Hash Version
}

export interface Account {
  id: string;
  entityId: string;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: DCFlag;
  balance: number; // Computed balance
  _version: string;
}

export interface TaxModule {
  id: string;
  entityId: string;
  period: string; // Q1, Q2, Q3, Q4, ANNUAL
  year: number;
  type: "INCOME" | "INFO_RETURN" | "SALES_USE" | "PAYROLL";
  status: "Open" | "Closed" | "Suspense" | "Resolved"; // Suspense for Unpostables, Resolved for Private
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
  isPrivateDomain?: boolean; // New flag for private admin
  _version: string;
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

export type IRSFormType = '56' | '2848' | '8821' | '941' | '940' | '1041' | 'W-2' | '15103' | '9779' | '668-W' | 'CP-2000' | 'T-1' | 'Affidavit' | 'SSA-89' | 'Trust-Description' | 'FOIA-Request' | 'W-8BEN' | '8828' | '8822-B' | 'NTDO-Cert' | 'FS-1010';

export interface ComplianceFiling {
  id: string;
  entityId: string;
  formType: IRSFormType;
  status: 'Not Started' | 'Drafted' | 'Filed' | 'Accepted' | 'Rejected' | 'Unpostable' | 'Tracing' | 'Resolved';
  filingDate?: string;
  notes?: string;
  submissionId?: string; // Link to API transmission
  _version: string;
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

// --- SSA TYPES ---
export interface SSAStatement {
  id: string;
  employeeId: string;
  currentYear: number;
  taxedSocialSecurityEarnings: number;
  taxedMedicareEarnings: number;
  estimatedRetirementBenefit: number;
  eligibilityStatus: 'Not Qualified' | 'Qualified' | 'Pending';
  credits: number; // 40 needed
  lastUpdated: string;
}

// --- ACCORD & SATISFACTION TYPES ---

export type IndustryVertical = 'Real Estate' | 'FinTech' | 'Energy' | 'Healthcare' | 'Construction';
export type Web8KCode = 'Item 1.01' | 'Item 1.02' | 'Item 2.01' | 'Item 3.02' | 'Item 8.01';

export interface OC10Anchor {
  anchorId: string;
  hash: string;
  timestamp: string;
  shardNode: string;
  verificationStatus: 'Anchored' | 'Pending';
}

export interface AccordRecord {
  id: string;
  entityId: string;
  counterparty: string;
  originalObligationAmount: number;
  settlementAmount: number;
  industry: IndustryVertical;
  codexItem: Web8KCode;
  restrictiveEndorsementText: string;
  oc10Anchor: OC10Anchor;
  journalId?: string;
  status: 'Draft' | 'Tendered' | 'Satisfied';
}

// --- PRIVATE ADMIN / QUALITAS TYPES ---

export type QualitasType = 'Contract Estimate' | 'Invoice Receipt';

export interface PrivateAdminRecord {
  id: string;
  entityId: string;
  type: QualitasType;
  date: string;
  description: string;
  reliefValue: number; // Not "Commercial Value"
  isPrivateDomain: true;
  isNonCommercial: true;
  isReliefPerformance: true;
  journalId?: string;
}

export interface ResolutionRecord {
  id: string;
  entityId: string;
  accountNumber: string;
  expression: string; // The "not wishing" text
  date: string;
  status: 'Draft' | 'Executed';
  journalId?: string;
  voucherCode?: string; // NEW: The For-Payor Account Voucher code
}

// --- FIDUCIARY GOVERNANCE TYPES (CO-TRUSTEE) ---
export type VoteType = 'For' | 'Against' | 'Abstain';
export type FiduciaryActionType = 'Distribution' | 'Liquidation' | 'Investment' | 'Amendment' | 'Appointment';

export interface FiduciaryVote {
    trusteeId: string;
    trusteeName: string;
    vote: VoteType;
    timestamp: string;
}

export interface FiduciaryAction {
    id: string;
    entityId: string;
    type: FiduciaryActionType;
    description: string;
    amount?: number;
    upiaAllocation: { income: number; principal: number }; // Uniform Principal and Income Act
    votes: FiduciaryVote[];
    status: 'Proposed' | 'Ratified' | 'Rejected' | 'Executed';
    dateCreated: string;
    dateExecuted?: string;
}

// --- BOI / FINCEN TYPES ---
export interface BOIReport {
    id: string;
    entityId: string;
    filingType: 'Initial' | 'Update' | 'Correction';
    status: 'Draft' | 'Submitted' | 'Accepted' | 'Rejected';
    submissionDate?: string;
    finCENId?: string;
    beneficialOwners: {
        legalName: string;
        dob: string;
        address: string;
        idType: 'Passport' | 'Driver License';
        idNumber: string;
        isExempt: boolean;
    }[];
}

// --- RE-SITUS TYPES ---
export interface ReSitusRecord {
  id: string;
  entityId: string;
  type: 'Statutory Domestication' | 'Equitable Conversion';
  originJurisdiction: string;
  targetJurisdiction: string;
  effectiveDate: string;
  documentType: 'Articles of Continuance' | 'Declaration of Re-situs' | 'Bill in Equity';
  status: 'Draft' | 'Filed' | 'Recorded';
}

// --- INDENTURE & CERTIFICATES ---
export interface TrustCertificate {
  id: string;
  entityId: string;
  holderName: string;
  units: number;
  type: 'Capital' | 'Income' | 'Combined';
  issueDate: string;
  certNumber: string;
  status: 'Active' | 'Redeemed' | 'Void';
}

export interface Indenture {
  id: string;
  entityId: string;
  name: string;
  dateCreated: string;
  articles: {
    id: string;
    title: string;
    content: string;
  }[];
  status: 'Draft' | 'Executed';
}

// --- FORENSIC BOND TYPES ---
export interface ForensicSearchRecord {
  id: string;
  targetCaseNumber: string;
  county: string;
  cusipMatch?: string;
  payingAgent?: string;
  status: 'Searching' | 'Match Found' | 'No Record';
  timestamp: string;
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

// --- NEW: API SECURITY & FUZZING ---

export interface ApiSecrets {
  irsEtin: string; // Electronic Transmitter Identification Number
  irsAppId: string; // A2A Application ID
  bsoUserId: string; // SSA User ID
  hmacKey: string; // Shared Secret
}

export interface FuzzConfig {
  enabled: boolean;
  intensity: 'Low' | 'Medium' | 'High'; // Probability of error: 10%, 30%, 60%
  latencyMode: 'Fast' | 'Realistic' | 'Laggy';
}

export interface SystemSettings {
  fuzzing: FuzzConfig;
  network: 'Local' | 'Testnet' | 'Mainnet';
}

// --- IRM Taxonomy / Document Management ---

export type IRSResolutionCategory = 'Compliance' | 'Remittance' | 'Unpostable' | 'Transfer' | 'Enforcement' | 'Court' | 'Status Correction';

export interface IRMDocument {
  id: string;
  entityId: string;
  taxYear: number;
  formType: IRSFormType | 'Administerial' | 'Legal' | 'Treasury';
  fileName: string;
  generatedDate: string;
  status: 'Generated' | 'Signed' | 'Submitted' | 'Tracer Active' | 'Suspense' | 'Private Record';
  size: string;
  category: IRSResolutionCategory | 'Private Admin' | 'Legal' | 'Treasury';
  campusDestination?: string; // e.g. "Ogden, UT"
  relatedJournalIds?: string[];
  relatedAccountIds?: string[];
  relatedFilingId?: string; // New field for linking to ComplianceFiling
}

// --- GWT / CRDT / PIJUL ARCHITECTURE TYPES ---

export type PatchOpType = 'add' | 'replace' | 'remove';

export interface PatchOperation {
  op: PatchOpType;
  path: string; // JSON Pointer style e.g. "/entities/1/name"
  value?: any;
  prevValue?: any; // For conflict detection/reversibility
}

export interface ChangeSet {
  hash: string;
  parentHash: string; // Pijul/Git style DAG parent
  timestamp: number;
  author: string; // User ID
  description: string;
  operations: PatchOperation[];
}

// The RequestFactory Interface
export interface RequestContext {
  // Returns a mutable proxy that tracks changes
  edit<T extends { id: string, _version: string }>(entity: T): T;
  // Commits the changes to the store
  fire(): Promise<void>;
  // Discards changes
  cancel(): void;
}
