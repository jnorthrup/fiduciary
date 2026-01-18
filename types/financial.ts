/**
 * Financial Domain Types
 * Payment rails, settlements, and financial instruments
 */

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

export enum ExternalRail {
  ESCROW_PAYOFF = 'ESCROW_PAYOFF',
  SPONSORED_ACH = 'SPONSORED_ACH',
  SPONSORED_WIRE = 'SPONSORED_WIRE',
  CHECK_VENDOR = 'CHECK_VENDOR',
  MANUAL_TENDER = 'MANUAL_TENDER_CERTIFIED_FUNDS',
  ACH = 'ACH'
}

export interface PayeeBankingDetails {
  bankName?: string;
  routingNumber: string;
  accountNumber: string;
  accountType: 'Checking' | 'Savings';
}

export interface SettlementInstruction {
  payment_id: string;
  entityId: string;
  payee: string;
  amount: number;
  method: ExternalRail;
  funding_source: string;
  payee_banking?: PayeeBankingDetails;
  supporting_docs: string[];
  approval: {
    required_signers: string[];
    approved_at?: string;
  };
  status: 'Pending' | 'Authorized' | 'Settled' | 'Failed';
  internal_trace_id: string;
  date_created: string;
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

// --- OBLIGATION LAYER ---

export interface Invoice {
  id: string;
  entityId: string;
  vendorId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  description: string;
  status: 'Draft' | 'Approved' | 'Paid' | 'Void';
  items: { description: string; amount: number; accountCode?: string }[];
  fileUrl?: string;
  _version: string;
}

export interface Payable {
  id: string;
  entityId: string;
  invoiceId: string;
  amountDue: number;
  dueDate: string;
  status: 'Open' | 'Scheduled' | 'Paid';
  priority?: 'High' | 'Normal' | 'Low';
  _version: string;
}

export interface SettlementConfirmation {
  id: string;
  settlementId: string;
  traceNumber: string;
  effectiveEntryDate: string;
  effectiveDate?: string;
  status: 'Processed' | 'Returned';
  returnCode?: string;
  returnReason?: string;
  postedAt: string;
  confirmationTimestamp?: string;
  _version: string;
}
