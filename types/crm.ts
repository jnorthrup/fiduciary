/**
 * CRM Domain Types
 * Customer/counterparty relationship management
 */

export interface Interaction {
  id: string;
  date: string;
  type: string;
  notes: string;
  authorId: string;
}

export type RelationshipStatus = 'Active' | 'Prospect' | 'Disputed' | 'Blocked';
export type KYCStatus = 'Passed' | 'Failed' | 'Pending' | 'Not Started';

export interface CRMPerson {
  id: string;
  entityId: string;
  name: string;
  type: 'Organization' | 'Individual';
  status: RelationshipStatus;
  industry?: string;
  email?: string;
  phone?: string;
  address?: string;
  kycStatus: KYCStatus;
  kycDate?: string;
  bankName?: string;
  routingNumber?: string;
  accountNumber?: string;
  interactions: Interaction[];
}
