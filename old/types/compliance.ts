/**
 * Compliance & Tax Domain Types
 * IRS, BSO, and regulatory compliance types
 */

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

export type IRSFormType = '56' | '2848' | 'SSA-89' | 'Trust-Description' | '1041' | '941' | '940' | 'W-2' | 'W-8BEN' | 'T-1' | '9779' | 'Credit-Elect' | '15103' | 'Unpostable' | '668-W' | 'CP-2000' | 'Probate' | '8822-B';

export interface TaxModule {
  id: string;
  entityId: string;
  period: string;
  year: number;
  type: 'INCOME' | 'PAYROLL' | 'INFO_RETURN' | 'SALES_USE';
  status: 'Open' | 'Closed';
  dueDate: string;
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

export type TransmissionStatus = 'Accepted' | 'Rejected' | 'Pending';

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

export interface IRMDocument {
  id: string;
  entityId: string;
  category: string;
  title: string;
  content?: string;
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

export type CIRExtractType = 'Summary Only' | 'Detail Only' | 'Summary and Detail';
export type DigitalWalletFilter = 'All' | 'PayPal' | 'Amazon';

export enum CIR_CANS {
  PAYPAL = 'PAYPAL_CAN',
  AMAZON = 'AMAZON_CAN'
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
