/**
 * Legal Domain Types
 * Legal instruments, filings, and fiduciary governance
 */

export type LegalInstrumentType = 'Appearance Bond' | 'Writ of Possession' | 'Capias Warrant' | 'Power of Attorney' | 'Fiduciary Notice';

export interface LegalInstrument {
  id: string;
  type: LegalInstrumentType;
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

export interface Indenture {
  // Placeholder for future implementation
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
