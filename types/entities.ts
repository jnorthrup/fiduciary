/**
 * Entity Domain Types
 * Core business entity definitions for the Trust Ledger System
 */

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

export interface Contractor {
  id: string;
  name: string;
  tinLast4: string;
  w9OnFile: boolean;
}
