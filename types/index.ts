/**
 * Types Index
 * Re-exports all domain types for backward compatibility
 * 
 * Migration: Individual domains can be imported directly:
 *   import { Entity, EntityType } from './types/entities';
 * 
 * Or use the barrel export for full compatibility:
 *   import * as types from './types';
 */

// Entity Domain
export {
  EntityType,
  EntityRole,
  TrustSubType,
  type CreditUnionType,
  type Entity,
  type Contractor,
} from './entities';

// Account & Journal Domain
export {
  AccountType,
  DCFlag,
  type AccountClass,
  type VendorType,
  type Account,
  type JournalLine,
  type JournalEntry,
  type WalletCredential,
  type CanalRecord,
} from './accounts';

// Compliance & Tax Domain
export {
  CIR_CANS,
  type TwoFactorProvider,
  type IRSAPICredential,
  type IRSFormType,
  type TaxModule,
  type ComplianceFiling,
  type ApiChannel,
  type TransmissionLog,
  type TransmissionStatus,
  type BSORole,
  type BSOSubmission,
  type IRMDocument,
  type ResolutionRecord,
  type MetaRule,
  type ComplianceViolation,
  type JurisdictionType,
  type CIRExtractType,
  type DigitalWalletFilter,
  type AgencyCertification,
  type FSForm1010,
} from './compliance';

// User Domain
export {
  type UserRole,
  type User,
} from './users';

// Financial Domain
export {
  ExternalRail,
  type EscrowAccount,
  type FedwireRecord,
  type ACHSECCode,
  type ACHRecord,
  type PayeeBankingDetails,
  type SettlementInstruction,
  type SettlementConfirmation,
  type Invoice,
  type Payable,
  type CreditResolution,
  type CreditInstrument,
  type InstrumentExchangeRecord,
  type DTCCPledgeRecord,
  type GiftTaxRecord,
  type TrustCertificate,
  type IndustryVertical,
  type Web8KCode,
  type AccordRecord,
} from './financial';

// CRM Domain
export {
  type Interaction,
  type RelationshipStatus,
  type KYCStatus,
  type CRMPerson,
} from './crm';

// Real Estate Domain
export {
  type RealEstateAsset,
  type PurchaseContract,
  type ClosingRecord,
  type ParcelRecord,
  type CollateralPool,
  type CollateralItem,
} from './real-estate';

// Legal Domain
export {
  type LegalInstrumentType,
  type LegalInstrument,
  type ChanceryFiling,
  type PerfectionInstruction,
  type ReSitusRecord,
  type FiduciaryVote,
  type FiduciaryAction,
  type VoteType,
  type FiduciaryReview,
  type Indenture,
  type CreditDefenseRecord,
  type IntrusionRecord,
  type MaradRecord,
  type QualitasType,
  type PrivateAdminRecord,
  type EdgarResearchRecord,
} from './legal';

// Payroll Domain
export {
  type Employee,
  type PayrollRun,
  type SSAStatement,
} from './payroll';

// Theme Domain
export {
  type ThemeMode,
  type ThemeTokens,
} from './theme';

// System Domain
export {
  type SystemStatus,
  type SearchResult,
  type ApiSecrets,
  type FuzzConfig,
  type FirebaseConfig,
  type SystemSettings,
  type ChangeSet,
  type Priority,
  type TicklerRecord,
  type ReconciliationTaskStatus,
  type ReconciliationTask,
} from './system';
