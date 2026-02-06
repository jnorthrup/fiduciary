
export type TwoFactorProvider = 'ID.me' | 'Login.gov' | 'Google Authenticator';

export interface IRSAPICredential {
  id: string;
  entityId: string;
  system: 'A2A' | 'IRIS' | 'AIR';
  appId: string;
  status: 'Active' | 'Revoked' | 'Pending 2FA';
  twoFactorProvider: TwoFactorProvider;
  lastAuthenticated: string;
  apiKey?: string;
  secretKey?: string;
  expirationDate?: string;
}

export enum EntityType {
  INDIVIDUAL = 'INDIVIDUAL',
  TRUST = 'TRUST',
  ESTATE = 'ESTATE',
  LLC = 'LLC',
  CREDIT_UNION = 'CREDIT_UNION',
  VESSEL = 'VESSEL',
  FOREIGN_BUSINESS_TRUST = 'FOREIGN_BUSINESS_TRUST',
  VENDOR = 'VENDOR',
  CONTRACTOR = 'CONTRACTOR',
  BIOLOGICAL_ASSET = 'BIOLOGICAL_ASSET'
}

export enum EntityRole {
  TRUSTEE = 'TRUSTEE',
  HOLDING_TRUST = 'HOLDING_TRUST',
  OPERATING_LLC = 'OPERATING_LLC',
  LIVING_ESTATE = 'LIVING_ESTATE',
  BENEFICIARY = 'BENEFICIARY',
  SURETY = 'SURETY',
  JOINT_VENTURE = 'JOINT_VENTURE',
  VESSEL = 'VESSEL',
  BOARD_MEMBER = 'BOARD_MEMBER'
}

export enum TrustSubType {
  ECCLESIASTICAL = 'ECCLESIASTICAL',
  EXPRESS = 'EXPRESS',
  ASSET_PROTECTION = 'ASSET_PROTECTION',
  REVOCABLE = 'REVOCABLE',
  IRREVOCABLE = 'IRREVOCABLE',
  UNSPECIFIED = 'UNSPECIFIED'
}

export type CreditUnionType = 'Federal' | 'State' | 'Unincorporated';

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  role: EntityRole;
  parentEntityId: string | null;
  einLast4?: string;
  regionCode?: string;
  trustSubType?: TrustSubType;
  creditUnionType?: CreditUnionType;
  uiPosition?: { x: number; y: number };
  _version: string;
  imfProfile?: {
    dsaStatus: string;
    arrearsPolicy: string;
    financingAssurances: boolean;
    programStatus: string;
  };
}

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

export interface Account {
  isActive: any;
  id: string;
  entityId: string;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: DCFlag;
  balance: number;
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

export interface TaxModule {
  id: string;
  entityId: string;
  period: string;
  year: number;
  type: 'INCOME' | 'PAYROLL' | 'INFO_RETURN' | 'SALES_USE';
  status: 'Open' | 'Closed';
  dueDate: string;
}

export interface Contractor {
  id: string;
  name: string;
  tinLast4: string;
  w9OnFile: boolean;
}

export interface ComplianceFiling {
  id: string;
  entityId: string;
  formType: string;
  status: 'Not Started' | 'Drafted' | 'Transmitting' | 'Accepted' | 'Rejected' | 'Filed';
  filingDate?: string;
  submissionId?: string;
  notes?: string;
  _version: string;
}

export interface WalletCredential {
  id: string;
  entityId: string;
  provider: string;
  address: string;
}

export interface BSORole {
  id: string;
  entityId: string;
  registrationStatus: 'Active' | 'Pending';
}

export interface BSOSubmission {
  id: string;
  bsoRoleId: string;
  reportType: string;
  submissionDate: string;
  status: string;
  batchId: string;
}

export interface Employee {
  id: string;
  entityId: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
  salary: number;
  payFrequency: string;
  status: 'Active' | 'Onboarding' | 'Terminated' | 'Leave';
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
  status: 'Posted';
}

export interface IRMDocument {
  id: string;
  entityId: string;
  category: string;
  title: string;
  content?: string;
}

export interface SSAStatement {
  lastUpdated: string;
  eligibilityStatus: 'Qualified' | 'Not Qualified';
  estimatedRetirementBenefit: number;
  currentYear: number;
  taxedSocialSecurityEarnings: number;
  taxedMedicareEarnings: number;
  credits: number;
}

export interface ResolutionRecord {
  id: string;
  entityId: string;
  accountNumber: string;
  expression: string;
  date: string;
  status: string;
  voucherCode?: string;
}

export interface CreditDefenseRecord {
  id: string;
  entityId: string;
  targetAgency: 'Equifax' | 'Experian' | 'TransUnion' | 'LexisNexis' | 'Sagestream' | 'Innovis';
  type: 'Dispute' | 'CCPA Request' | 'Litigation' | 'CFPB Complaint' | 'Security Freeze' | 'Fraud Alert';
  referenceNumber: string;
  status: string;
  dateFiled: string;
  legalBasis: string;
  outcome: string;
  documents?: string[];
}

export interface IntrusionRecord {
  id: string;
  targetEntityId: string;
  name: string;
  type: string;
  severity: 'High' | 'Medium' | 'Low';
}

export type UserRole = 'Owner' | 'Beneficial Owner' | 'Admin' | 'Editor' | 'Viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarInitials: string;
  lastActive: string;
  _version: string;
  jobTitle?: string;
  department?: string;
  phoneNumber?: string;
  isPrivate?: boolean;
  // Skin & Theme Preferences
  skin?: 'current' | 'mobile' | 'quickbooks' | 'advanced-graph';
  themePreference?: 'light' | 'dark' | 'auto';
}

export type IRSFormType = '56' | '2848' | 'SSA-89' | 'Trust-Description' | '1041' | '941' | '940' | 'W-2' | 'W-8BEN' | 'T-1' | '9779' | 'Credit-Elect' | '15103' | 'Unpostable' | '668-W' | 'CP-2000' | 'Probate' | '8822-B';

export type ApiChannel = 'MeF' | 'IRIS' | 'AIR' | 'FEDWIRE' | 'FEDNOW' | 'TIN_MATCH';

export interface TransmissionLog {
  id: string;
  timestamp: string;
  channel: ApiChannel;
  formType: string;
  entityId: string;
  status: 'Accepted' | 'Rejected' | 'Pending';
  submissionId: string;
  xmlPayload: string;
  ackPayload: string;
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
  source: 'IRM' | 'Pub';
  url: string;
  relevance: number;
}

export interface ApiSecrets {
  irsEtin: string;
  irsAppId: string;
  bsoUserId: string;
  hmacKey: string;
}

export interface FuzzConfig {
  enabled: boolean;
  intensity: 'Low' | 'Medium' | 'High';
  latencyMode: 'Fast' | 'Realistic' | 'Laggy';
}

export interface SystemSettings {
  layoutMode: string;
  fuzzing: FuzzConfig;
  network: string;
  firebaseConfig?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
}

export type TransmissionStatus = 'Accepted' | 'Rejected' | 'Pending';

export type CIRExtractType = 'Summary Only' | 'Detail Only' | 'Summary and Detail';
export type DigitalWalletFilter = 'All' | 'PayPal' | 'Amazon';

export enum CIR_CANS {
  PAYPAL = 'PAYPAL_CAN',
  AMAZON = 'AMAZON_CAN'
}

export interface ChangeSet {
  hash: string;
  timestamp: string;
  description: string;
  author: string;
  operations: { op: 'add' | 'remove' | 'update', path: string }[];
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

export interface EscrowAccount {
  id: string;
  entityId: string;
  title: string;
  counterpartyId: string;
  targetAmount: number;
  currentBalance: number;
  status: 'Draft' | 'Funded' | 'Closed';
  conditions: { id: string; description: string; met: boolean }[];
  openDate: string;
  closeDate?: string;
}

export type Priority = 'High' | 'Medium' | 'Low';

export interface TicklerRecord {
  id: string;
  entityId: string;
  title: string;
  dueDate: string;
  category: 'Accounting' | 'Legal' | 'Asset' | 'Tax';
  frequency: 'Once' | 'Monthly' | 'Quarterly' | 'Annually';
  priority?: Priority;
  status: 'Pending' | 'Completed' | 'Overdue';
  completedDate?: string;
}

export interface FedwireRecord {
  id: string;
  entityId: string;
  imad: string;
  senderABA: string;
  receiverABA: string;
  amount: number;
  beneficiaryName: string;
  beneficiaryAccount: string;
  type: 'Wire' | 'FedNow';
  status: 'Settled';
  timestamp: string;
  _version: string;
}

export interface CRMPerson {
  id: string;
  entityId: string;
  name: string;
  type: 'Organization' | 'Individual';
  status: 'Active' | 'Prospect' | 'Disputed' | 'Blocked';
  industry?: string;
  email?: string;
  phone?: string;
  address?: string;
  kycStatus: 'Passed' | 'Failed' | 'Pending' | 'Not Started';
  kycDate?: string;
  bankName?: string;
  routingNumber?: string;
  accountNumber?: string;
  interactions: Interaction[];
}

export interface Interaction {
  id: string;
  date: string;
  type: string;
  notes: string;
  authorId: string;
}

export type RelationshipStatus = 'Active' | 'Prospect' | 'Disputed' | 'Blocked';
export type KYCStatus = 'Passed' | 'Failed' | 'Pending' | 'Not Started';

export interface MaradRecord {
  id: string;
  entityId: string;
  vesselName: string;
  type: 'Charter' | 'Requisition';
  status: 'Active' | 'Surrendered';
  emergencyRef?: string;
  valuation: number;
  compensationStatus: string;
  timestamp: string;
  relinquishmentType: 'Standard MARAD' | 'Navy Prize';
  warRiskCovered: boolean;
  usppi: string;
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
  status: 'Certified';
  responses: Record<string, string>;
  completedDate: string;
}

export interface FSForm1010 {
  id: string;
  entityId: string;
  resolutionDate: string;
  authorizedIndividuals: { name: string; title: string; authority: string }[];
  accountsCovered: string;
  certifyingOfficer: string;
  sealPresent: boolean;
}

export interface ReSitusRecord {
  id: string;
  entityId: string;
  type: 'Statutory Domestication' | 'Equitable Conversion';
  originJurisdiction: string;
  targetJurisdiction: string;
  effectiveDate: string;
  documentType: string;
  status: 'Recorded';
}

export interface TrustCertificate {
  id: string;
  entityId: string;
  holderName: string;
  units: number;
  type: 'Capital' | 'Income' | 'Combined';
  issueDate: string;
  certNumber: string;
  status: 'Active';
}

export interface Indenture {
  // Placeholder for future implementation
}

export interface FiduciaryVote {
  trusteeId: string;
  trusteeName: string;
  vote: 'For' | 'Against';
  timestamp: string;
}

export interface FiduciaryAction {
  id: string;
  entityId: string;
  type: 'Distribution' | 'Liquidation' | 'Investment' | 'Amendment' | 'Appointment';
  description: string;
  amount?: number;
  upiaAllocation: { income: number; principal: number };
  votes: FiduciaryVote[];
  status: 'Proposed' | 'Executed';
  dateCreated: string;
}

export type VoteType = 'For' | 'Against';

export interface FiduciaryReview {
  id: string;
  entityId: string;
  reviewDate: string;
  type: 'Reg-9.6a-Acceptance' | 'Reg-9.6b-Annual' | 'Reg-9.6c-Closing';
  conductedBy: string;
  status: 'Pass';
  notes: string;
  _version: string;
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
  status: 'Active' | 'Liquidated';
  timestamp: string;
  liquidationProceeds?: number;
  _version: string;
}

export interface InstrumentExchangeRecord {
  id: string;
  entityId: string;
  surrenderedInstrumentId: string;
  surrenderDate: string;
  reissueDate: string;
  reason: 'Full Alienation' | 'Partial Assignment' | 'Administrative Exchange';
  status: 'Reissued';
  newInstrumentRef: string;
  alienationProofHash: string;
}

export interface EdgarResearchRecord {
  id: string;
  entityId: string;
  companyName: string;
  cik: string;
  cusip: string;
  filingType: string;
  filingDate: string;
  accessionNumber: string;
  extractedDetails: { description: string };
  researchTimestamp: string;
  _version: string;
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

export interface GiftTaxRecord {
  id: string;
  entityId: string;
  doneeId: string;
  amount: number;
  description: string;
  isSplit: boolean;
  date: string;
  status: string;
}

export interface PerfectionInstruction {
  id: string;
  filingId: string;
  method: '1st Class Mail' | 'Certified Return Receipt' | 'Private Courier';
  recipientName: string;
  address: string;
  isPerfected: boolean;
  perfectionDate: string;
  trackingNumber: string;
}

export interface ChanceryFiling {
  id: string;
  entityId: string;
  title: string;
  type: 'Bill in Equity' | 'Petition for Accounting' | 'Declaratory Judgement';
  res: string;
  status: 'Sealed';
  date: string;
}

export type QualitasType = 'Contract Estimate' | 'Invoice Receipt';

export interface PrivateAdminRecord {
  id: string;
  entityId: string;
  type: QualitasType;
  date: string;
  description: string;
  reliefValue: number;
  isPrivateDomain: boolean;
  isNonCommercial: boolean;
  isReliefPerformance: boolean;
}

export type IndustryVertical = 'Real Estate' | 'FinTech' | 'Energy' | 'Healthcare' | 'Construction';
export type Web8KCode = 'Item 1.01' | 'Item 1.02' | 'Item 2.01' | 'Item 3.02' | 'Item 8.01';

export interface AccordRecord {
  id: string;
  entityId: string;
  counterparty: string;
  originalObligationAmount: number;
  settlementAmount: number;
  industry: IndustryVertical;
  codexItem: Web8KCode;
  restrictiveEndorsementText: string;
  oc10Anchor: {
    anchorId: string;
    hash: string;
    timestamp: string;
    shardNode: string;
    verificationStatus: string;
  };
  status: string;
}

export interface PurchaseContract {
  id: string;
  entityId: string;
  propertyId: string;
  sellerName: string;
  purchasePrice: number;
  effectiveDate: string;
  settlementTerms: string;
  status: 'Executed';
}

export interface RealEstateAsset {
  id: string;
  entityId: string;
  address: string;
  parcelId: string;
  county: string;
  state: string;
  status: 'Prospect' | 'Owned';
  _version: string;
  purchaseContractId?: string;
}

export interface CreditResolution {
  id: string;
  entityId: string;
  title: string;
  maxFaceAmount: number;
  signers: string[];
  scope: string;
  status: 'Approved';
  approvedDate: string;
}

export interface CreditInstrument {
  id: string;
  entityId: string;
  resolutionId: string;
  contractId: string;
  faceAmount: number;
  termMonths: number;
  issueDate: string;
  type: string;
  status: 'Accepted' | 'Discharged';
  dischargeCondition: string;
}

export interface ClosingRecord {
  id: string;
  contractId: string;
  instrumentId: string;
  recordingRef: string;
  closingDate: string;
  status: 'Recorded';
}

export type LegalInstrumentType = 'Appearance Bond' | 'Writ of Possession' | 'Capias Warrant' | 'Power of Attorney' | 'Fiduciary Notice';

export interface LegalInstrument {
  id: string;
  type: LegalInstrumentType;
}

export interface MetaRule {
  id: string;
  name: string;
  citation: string;
  description: string;
  evaluate: (ctx: any) => ComplianceViolation | null;
}

export interface ComplianceViolation {
  ruleId: string;
  title: string;
  citation: string;
  severity: 'Block' | 'Warning';
  details: string;
}

export type JurisdictionType = 'Federal (IRS)' | 'Article 1 (Statutory)' | 'Local/State' | 'Article 3 (Private)' | 'Ecclesiastical' | 'Admiralty/Maritime';

export type ACHSECCode = 'CCD' | 'PPD' | 'CTX' | 'WEB' | 'TEL';

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
  status: string;
  nachaSummary: string;
  effectiveDate: string;
  _version: string;
}

// Reconciliation / Administrative Requests
export type ReconciliationTaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Blocked';

export interface ReconciliationTask {
  id: string;
  name: string;
  track: 'Standard' | 'FOIA' | 'Escalation';
  startDay: number; // Relative start (0 = Project Start)
  duration: number; // Days
  status: ReconciliationTaskStatus;
  dependencies?: string[];
  actionLabel?: string; // e.g. "Generate Letter"
}

export interface CollateralPool {
  id: string;
  entityId: string;
  name: string;
  description: string;
  valuationPolicy: string; // e.g., "LTV 80%, Annual Appraisal"
  status: 'Active' | 'Closed';
  totalValue: number;
}

export interface CollateralItem {
  id: string;
  poolId: string;
  assetReferenceId?: string; // Link to RealEstateAsset or other
  description: string;
  assessedValue: number;
  valuationDate: string;
  status: 'Pledged' | 'Released';
}

// --- SETTLEMENT ARCHITECTURE ---

export enum ExternalRail {
  ESCROW_PAYOFF = 'ESCROW_PAYOFF',
  SPONSORED_ACH = 'SPONSORED_ACH',
  SPONSORED_WIRE = 'SPONSORED_WIRE',
  CHECK_VENDOR = 'CHECK_VENDOR',
  MANUAL_TENDER = 'MANUAL_TENDER_CERTIFIED_FUNDS'
}

export interface SettlementInstruction {
  payment_id: string;
  entityId: string; // The Trust doing the settlement
  payee: string;
  amount: number;
  method: ExternalRail;
  funding_source: string; // Ledger Account ID (Layer 1)
  supporting_docs: string[];
  approval: {
    required_signers: string[];
    approved_at?: string;
  };
  status: 'Pending' | 'Authorized' | 'Settled' | 'Failed';
  internal_trace_id: string; // e.g. TRUST-TREASURY-001
  date_created: string;
}