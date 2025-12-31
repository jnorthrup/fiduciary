
export enum EntityRole {
  HOLDING_TRUST = "HOLDING_TRUST",
  OPERATING_LLC = "OPERATING_LLC",
  LIVING_ESTATE = "LIVING_ESTATE",
  BENEFICIARY = "BENEFICIARY",
  BENEFICIAL_OWNER = "BENEFICIAL_OWNER",
  TRUSTEE = "TRUSTEE",
  LIVESTOCK = "LIVESTOCK",
  VESSEL = "VESSEL",
  JOINT_VENTURE = "JOINT_VENTURE",
  SURETY = "SURETY",
  OTHER = "OTHER"
}

export enum EntityType {
  TRUST = "TRUST",
  FOREIGN_BUSINESS_TRUST = "FOREIGN_BUSINESS_TRUST",
  LLC = "LLC",
  VENDOR = "VENDOR",
  CONTRACTOR = "CONTRACTOR",
  ESTATE = "ESTATE",
  INDIVIDUAL = "INDIVIDUAL",
  BIOLOGICAL_ASSET = "BIOLOGICAL_ASSET",
  VESSEL = "VESSEL"
}

export enum TrustSubType {
  REVOCABLE = "REVOCABLE",
  IRREVOCABLE = "IRREVOCABLE",
  EXPRESS = "EXPRESS",
  ECCLESIASTICAL = "ECCLESIASTICAL",
  ASSET_PROTECTION = "ASSET_PROTECTION",
  UNSPECIFIED = "UNSPECIFIED"
}

export type JurisdictionType = 'Article 1 (Statutory)' | 'Article 3 (Private)' | 'Ecclesiastical' | 'Federal (IRS)' | 'Local/State' | 'Admiralty/Maritime' | 'Prize Court (Navy)';

// --- IMF POLICY TYPES ---
export type DebtSustainabilityStatus = 'Sustainable' | 'Sustainable (High Prob)' | 'Unsustainable' | 'Exceptional Uncertainty';
export type ArrearsPolicyType = 'None' | 'NTP' | 'LIOA-1' | 'LIOA-2' | 'LIOA-3' | 'LIOA-4' | 'LIA' | 'De Minimis';

export interface IMFProfile {
  dsaStatus: DebtSustainabilityStatus;
  arrearsPolicy: ArrearsPolicyType;
  financingAssurances: boolean; // Is program fully financed?
  programStatus: 'On Track' | 'Review Pending' | 'Off Track';
}

export interface IntrusionRecord {
  id: string;
  targetEntityId: string;
  name: string;
  type: 'Audit' | 'Lien' | 'Inquiry' | 'Lawsuit';
  jurisdiction: JurisdictionType;
  severity: 'Low' | 'Medium' | 'Critical';
  status: 'Active' | 'Mitigated';
}

export enum AccountType {
  ASSET = "Asset",
  LIABILITY = "Liability",
  EQUITY = "Equity",
  INCOME = "Income",
  EXPENSE = "Expense",
  MEMO = "Memo"
}

export enum DCFlag {
  Debit = "D",
  Credit = "C"
}

export type UserRole = 'Owner' | 'Beneficial Owner' | 'Admin' | 'Editor' | 'Viewer';
export type StorageSource = 'Persistence' | 'Simulation';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarInitials: string;
  lastActive: string;
  jobTitle?: string;
  department?: string;
  phoneNumber?: string;
  isPrivate?: boolean;
  _version: string;
}

export interface CreditDefenseRecord {
  id: string;
  entityId: string;
  targetAgency: 'Equifax' | 'Experian' | 'TransUnion' | 'LexisNexis' | 'Sagestream' | 'Innovis';
  type: 'Dispute' | 'Litigation' | 'Fraud Alert' | 'Security Freeze' | 'CFPB Complaint' | 'CCPA Request';
  referenceNumber: string;
  status: 'Draft' | 'Sent' | 'In Dispute' | 'Resolved' | 'Litigation Active' | 'Complaint Filed';
  dateFiled: string;
  legalBasis: string; 
  outcome?: string;
  documents?: string[];
}

export interface ChanceryFiling {
  id: string;
  entityId: string;
  title: string;
  type: 'Bill in Equity' | 'Petition for Accounting' | 'Declaratory Judgement';
  res: string; 
  status: 'Draft' | 'Sealed' | 'Filed' | 'Served';
  date: string;
  perfectionRef?: string;
}

export interface PerfectionInstruction {
  id: string;
  filingId: string;
  method: '1st Class Mail' | 'Certified Return Receipt' | 'Private Courier';
  recipientName: string;
  address: string;
  trackingNumber?: string;
  isPerfected: boolean;
  perfectionDate?: string;
}

export interface WalletCredential {
  id: string;
  entityId: string;
  network: "Ethereum" | "Bitcoin" | "Solana" | "Multisig" | "Custodial";
  address: string;
  label: string;
  balance?: string;
}

export const CIR_CANS = {
    PAYPAL: '010020',
    AMAZON: '010058'
};

export type CIRExtractType = 'Summary Only' | 'Detail Only' | 'Summary and Detail';
export type DigitalWalletFilter = 'All' | 'PayPal' | 'Amazon';

export interface InstrumentExchangeRecord {
  id: string;
  entityId: string;
  surrenderedInstrumentId: string;
  surrenderDate: string;
  reissueDate: string;
  reason: 'Full Alienation' | 'Partial Assignment' | 'Administrative Exchange';
  status: 'Surrendered' | 'Reissued' | 'Cancelled';
  newInstrumentRef: string;
  alienationProofHash?: string;
}

export interface DTCCPledgeRecord {
  id: string;
  entityId: string;
  cusip: string;
  assetName: string;
  quantity: number;
  marketValue: number;
  haircutPercent: number;
  collateralValue: number;
  pledgeAccountId: string;
  participantId: string;
  controlNumber: string;
  status: 'Active' | 'Liquidated' | 'Released';
  timestamp: string;
  liquidationProceeds?: number;
  _version: string;
}

export interface EscrowAccount {
  id: string;
  entityId: string;
  title: string;
  counterpartyId: string;
  targetAmount: number;
  currentBalance: number;
  status: 'Draft' | 'Funded' | 'Disbursing' | 'Closed' | 'Disputed';
  conditions: { id: string; description: string; met: boolean }[];
  openDate: string;
  closeDate?: string;
}

export interface TicklerRecord {
  id: string;
  entityId: string;
  title: string;
  dueDate: string;
  frequency: 'Once' | 'Monthly' | 'Quarterly' | 'Annually';
  category: 'Accounting' | 'Legal' | 'Asset' | 'Tax';
  status: 'Pending' | 'Completed' | 'Overdue';
  completedDate?: string;
}

export interface FedwireRecord {
  id: string;
  entityId: string;
  imad: string;
  omad?: string;
  senderABA: string;
  receiverABA: string;
  amount: number;
  beneficiaryName: string;
  beneficiaryAccount: string;
  type: 'Wire' | 'FedNow' | 'NSS';
  status: 'Initiated' | 'Sent' | 'Settled' | 'Failed';
  timestamp: string;
  _version: string;
}

export interface CanalRecord {
  id: string;
  entityId: string;
  type: 'Deposit' | 'Draw' | 'Toll';
  amount: number;
  description: string;
  date: string;
  status: 'Pending' | 'Cleared' | 'Contested';
  voucherId?: string;
}

export interface MaradRecord {
  id: string;
  entityId: string;
  vesselName: string;
  type: 'Charter' | 'Requisition';
  status: 'Active' | 'Surrendered' | 'Restored';
  emergencyRef: string;
  valuation: number;
  compensationStatus: 'Accepted' | '75% Paid - Litigating';
  timestamp: string;
  relinquishmentType?: 'Standard MARAD' | 'Navy Prize';
  warRiskCovered?: boolean;
  usppi?: string; // US Principal Party in Interest
  allocations?: {
      state: number;
      dod: number;
      jointVenture: number;
  };
}

export interface AgencyCertification {
  id: string;
  entityId: string;
  fiscalYear: number;
  status: 'In Progress' | 'Certified' | 'Qualified Assurance' | 'Non-Compliant';
  responses: Record<string, 'Yes' | 'No' | 'N/A'>;
  completedDate?: string;
  certifyingOfficerSignature?: string;
}

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

export type LegalInstrumentType = 'Appearance Bond' | 'Writ of Possession' | 'Capias Warrant' | 'Protection Order' | 'Affidavit';

export interface LegalInstrument {
  id: string;
  entityId: string;
  type: LegalInstrumentType;
  caseNumber: string;
  courtName: string;
  filingDate: string;
  parties: { role: string; name: string }[];
  amount?: number;
  status: 'Draft' | 'Filed' | 'Executed' | 'Discharged';
  documentUrl?: string;
}

export interface SanctionsScreening {
  id: string;
  entityId: string;
  program: 'OFAC' | 'IEEPA' | 'TWEA';
  checkDate: string;
  status: 'Clear' | 'Flagged' | 'Blocked';
  referenceList: 'SDN' | 'SSI' | 'Sectoral';
}

export interface CreditGatewayProfile {
  id: string;
  entityId: string;
  agencyLocatorCode: string;
  cashFlowName: string;
  programEnrollment: {
    ach: boolean;
    fedwire: boolean;
    olbp: boolean;
  };
  contacts: {
    primary: { name: string; phone: string; email: string; };
  };
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
  projected: boolean;
}

export type LayoutAlgorithm = 'TREE_ORTHOGONAL' | 'FORCE_DIRECTED' | 'RADIAL';

export interface EntityModelData {
  vizType: 'D3_SERIES' | 'MERMAID_FLOW' | 'DOT_STRUCT';
  layoutType?: LayoutAlgorithm;
  timeSeries: TimeSeriesPoint[];
  definition?: string;
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
  trustSubType?: TrustSubType;
  role: EntityRole;
  einLast4?: string;
  parentEntityId?: string | null;
  regionCode?: 'OSC' | 'KCSC' | 'FSC';
  modelData?: EntityModelData;
  uiPosition?: EntityPosition;
  imfProfile?: IMFProfile; // New IMF Policy Context
  _version: string;
}

export interface Account {
  id: string;
  entityId: string;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: DCFlag;
  balance: number;
  _version: string;
}

export interface TaxModule {
  id: string;
  entityId: string;
  period: string;
  year: number;
  type: "INCOME" | "INFO_RETURN" | "SALES_USE" | "PAYROLL";
  status: "Open" | "Closed" | "Suspense" | "Resolved";
  dueDate: string;
}

export interface JournalLine {
  id: string;
  accountId: string;
  accountName: string;
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
  isPrivateDomain?: boolean;
  _version: string;
}

export interface Contractor {
  id: string;
  name: string;
  tinLast4: string;
  w9OnFile: boolean;
}

export interface ParcelRecord {
  id: string;
  entityId: string;
  address: string;
  lat: number;
  lon: number;
  apn: string;
  acreage: number;
  zoning: string;
  legalDescription: string;
  assessedValue: number;
  lastUpdated: string;
  _version: string;
}

export interface EdgarResearchRecord {
  id: string;
  entityId: string;
  companyName: string;
  cik: string;
  cusip: string;
  filingType: '8-K' | '10-K' | '10-Q' | '424B2';
  filingDate: string;
  accessionNumber: string;
  extractedDetails: {
    maturityDate?: string;
    couponRate?: string;
    principalAmount?: number;
    trustee?: string;
    description?: string;
  };
  researchTimestamp: string;
  _version: string;
}

export type RelationshipStatus = 'Prospect' | 'Active' | 'Disputed' | 'Blocked';
export type KYCStatus = 'Not Started' | 'Pending' | 'Passed' | 'Failed';

export interface Interaction {
  id: string;
  date: string;
  type: 'Call' | 'Email' | 'Meeting' | 'Note';
  notes: string;
  authorId: string;
}

export interface CRMPerson {
  id: string;
  entityId: string; 
  name: string;
  type: 'Individual' | 'Organization';
  industry?: string;
  email?: string;
  phone?: string;
  address?: string;
  routingNumber?: string;
  accountNumber?: string;
  bankName?: string;
  status: RelationshipStatus;
  kycStatus: KYCStatus;
  kycDate?: string;
  interactions: Interaction[];
  _version: string;
}

export type ACHSECCode = 'PPD' | 'CCD' | 'CTX' | 'IAT';
export type ACHStatus = 'Originated' | 'Settled' | 'Returned' | 'NOC';

export interface ACHRecord {
  id: string;
  entityId: string;
  type: 'Credit' | 'Debit';
  secCode: ACHSECCode;
  amount: number;
  counterparty: {
    name: string;
    routing: string;
    account: string;
  };
  entryDescription: string;
  traceNumber: string;
  status: ACHStatus;
  nachaSummary?: string;
  effectiveDate: string;
  _version: string;
}

export type EmploymentStatus = 'Active' | 'Onboarding' | 'Terminated' | 'Leave';

export interface Employee {
  id: string;
  entityId: string;
  firstName: string;
  lastName: string;
  role: string;
  department: 'Management' | 'Operations' | 'Field' | 'Admin';
  salary: number;
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

export type IRSFormType = '56' | '2848' | '8821' | '941' | '940' | '1041' | 'W-2' | '15103' | '9779' | '668-W' | 'CP-2000' | 'T-1' | 'Affidavit' | 'SSA-89' | 'Trust-Description' | 'FOIA-Request' | 'W-8BEN' | '8828' | '8822-B' | 'NTDO-Cert' | 'FS-1010' | '709';

export interface ComplianceFiling {
  id: string;
  entityId: string;
  formType: IRSFormType;
  status: 'Not Started' | 'Drafted' | 'Filed' | 'Accepted' | 'Rejected' | 'Unpostable' | 'Tracing' | 'Resolved';
  filingDate?: string;
  notes?: string;
  submissionId?: string;
  _version: string;
}

export type TwoFactorProvider = 'ID.me' | 'Login.gov' | 'IRS Secure Access';

export interface BSORole {
  id: string;
  entityId: string;
  roleType: 'Employer' | 'Submitter' | 'Reporting Agent';
  bsoId: string;
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

export interface SSAStatement {
  id: string;
  employeeId: string;
  currentYear: number;
  taxedSocialSecurityEarnings: number;
  taxedMedicareEarnings: number;
  estimatedRetirementBenefit: number;
  eligibilityStatus: 'Not Qualified' | 'Qualified' | 'Pending';
  credits: number;
  lastUpdated: string;
}

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

export type QualitasType = 'Contract Estimate' | 'Invoice Receipt';

export interface PrivateAdminRecord {
  id: string;
  entityId: string;
  type: QualitasType;
  date: string;
  description: string;
  reliefValue: number;
  isPrivateDomain: true;
  isNonCommercial: true;
  isReliefPerformance: true;
  journalId?: string;
}

export interface ResolutionRecord {
  id: string;
  entityId: string;
  accountNumber: string;
  expression: string;
  date: string;
  status: 'Draft' | 'Executed';
  journalId?: string;
  voucherCode?: string;
}

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
    upiaAllocation: { income: number; principal: number };
    votes: FiduciaryVote[];
    status: 'Proposed' | 'Ratified' | 'Rejected' | 'Executed';
    dateCreated: string;
    dateExecuted?: string;
}

export interface FiduciaryReview {
  id: string;
  entityId: string;
  reviewDate: string;
  type: 'Reg-9.6a-Acceptance' | 'Reg-9.6b-Annual' | 'Reg-9.6c-Closing';
  conductedBy: string;
  status: 'Pass' | 'Fail' | 'Pending';
  notes: string;
  _version: string;
}

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

export interface ForensicSearchRecord {
  id: string;
  targetCaseNumber: string;
  county: string;
  cusipMatch?: string;
  payingAgent?: string;
  status: 'Searching' | 'Match Found' | 'No Record';
  timestamp: string;
}

export type ApiChannel = 'MeF' | 'AIR' | 'IRIS' | 'TIN_MATCH' | 'FEDWIRE' | 'FEDNOW';
export type TransmissionStatus = 'Queued' | 'Transmitting' | 'Received' | 'Accepted' | 'Rejected';

export interface TransmissionLog {
  id: string;
  timestamp: string;
  channel: ApiChannel;
  formType: IRSFormType | 'FED_WIRE' | 'FED_NOW';
  entityId: string;
  status: TransmissionStatus;
  submissionId: string;
  xmlPayload: string;
  ackPayload?: string;
  latencyMs: number;
}

export interface SystemStatus {
  channel: ApiChannel;
  status: 'Operational' | 'Degraded' | 'Maintenance';
  latency: string;
  uptime: string;
}

export interface FuzzConfig {
  enabled: boolean;
  intensity: 'Low' | 'Medium' | 'High';
  latencyMode: 'Fast' | 'Realistic' | 'Laggy';
}

export interface ApiSecrets {
  irsEtin: string;
  irsAppId: string;
  bsoUserId: string;
  hmacKey: string;
}

export interface SystemSettings {
  fuzzing: FuzzConfig;
  network: 'Local' | 'Testnet' | 'Mainnet';
}

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  source: 'IRM' | 'Pub' | 'Form';
  url: string;
  relevance: number;
}

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
  campusDestination?: string;
  relatedJournalIds?: string[];
  relatedAccountIds?: string[];
  relatedFilingId?: string;
}

export type PatchOpType = 'add' | 'replace' | 'remove';

export interface PatchOperation {
  op: PatchOpType;
  path: string;
  value?: any;
  prevValue?: any;
}

export interface ChangeSet {
  hash: string;
  parentHash: string;
  timestamp: number;
  author: string;
  description: string;
  operations: PatchOperation[];
}

// Compliance / Metarules
export interface ComplianceViolation {
  ruleId: string;
  title: string;
  citation: string;
  severity: 'Block' | 'Warning';
  details: string;
}

export interface MetaRule {
  id: string;
  name: string;
  citation: string; // e.g. "Circular 230 § 10.28"
  description: string;
  evaluate: (context: any) => ComplianceViolation | null;
}

// --- GRAPH REDUX STRUCTURES ---
export interface EntityGraph {
  nodeMap: Record<string, Entity>; // O(1) Lookup
  adjacencyList: Record<string, string[]>; // Parent -> Children[]
  roots: string[]; // Top-level nodes
}

// --- LSM TIME-SERIES STRUCTURES ---
export interface LSMStore {
  memTable: JournalEntry[]; // Unsorted / Recent
  l0: JournalEntry[]; // Sorted by Date (Recent History)
  l1: JournalEntry[]; // Archived / Compressed (Deep History)
}
