/**
 * Real Estate Domain Types
 * Property, collateral, and land records
 */

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

export interface ClosingRecord {
  id: string;
  contractId: string;
  instrumentId: string;
  recordingRef: string;
  closingDate: string;
  status: 'Recorded';
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

export interface CollateralPool {
  id: string;
  entityId: string;
  name: string;
  description: string;
  valuationPolicy: string;
  status: 'Active' | 'Closed';
  totalValue: number;
}

export interface CollateralItem {
  id: string;
  poolId: string;
  assetReferenceId?: string;
  description: string;
  assessedValue: number;
  valuationDate: string;
  status: 'Pledged' | 'Released';
}
