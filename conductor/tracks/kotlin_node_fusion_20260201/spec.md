# Track: Kotlin-Node.js Fiduciary Fusion

**Track ID:** kotlin_node_fusion_20260201
**Type:** Feature
**Created:** 2026-02-01
**Status:** Pending

---

## Overview

Fuse the sophisticated Kotlin dual-ledger framework (v2superbikeshed/moneyfan) with the Node.js trust ledger system (~/work/fiduciary) to create a hybrid fiduciary management system.

**The Opportunity:**
- Kotlin framework: Dual-ledger architecture with cryptographic bridges
- Node.js app: Production payment processing and bank integrations
- Fusion: Enterprise-grade fiduciary management with real-world banking

**Why This Matters:**
The Kotlin code defines a comprehensive fiduciary system but appears to be deleted/archived. The Node.js app has production banking but lacks sophisticated fiduciary features. Combining them creates something powerful.

---

## Functional Requirements

### 1. Type System Port from Kotlin

**Source:** `moneyfan/src/commonMain/kotlin/moneyfan/fiduciary/LedgerTypes.kt`

Port the following types to TypeScript:

#### Core Types
```typescript
typealias TransactionId = string
typealias EntityId = string
typealias BeneficiaryId = string
typealias ExpertId = string
typealias RoleId = string
typealias EncryptedId = string
```

#### Public Ledger
```typescript
interface PublicRecord<T> {
  id: TransactionId
  timestamp: Instant
  entityId: EntityId
  recordType: RecordType
  publicData: T
  complianceProof: ComplianceProof
  jurisdiction: Jurisdiction
  auditMetadata: AuditMetadata
}
```

#### Private Ledger
```typescript
interface EncryptedRecord<T> {
  id: EncryptedId
  timestamp: Instant
  entityId: EntityId
  encryptedData: ByteArray
  accessControl: LedgerAccessControl
  blackBoxRef?: string
  metadata: PrivateMetadata
}
```

#### Enumerations
- `RecordType` (13 values: ENTITY_FORMATION, CAPITAL_CONTRIBUTION, DISTRIBUTION, etc.)
- `ComplianceProofType` (7 values: REGULATORY_COMPLIANCE, TAX_COMPLIANCE, etc.)
- `SensitivityLevel` (5 values: PUBLIC through TRADE_SECRET)
- `BeneficiaryType` (6 values: INDIVIDUAL, ENTITY, TRUST, etc.)
- `FiduciaryDomain` (14 values: TAX_PLANNING, ESTATE_PLANNING, etc.)

### 2. Public Ledger Manager

**Source:** `moneyfan/src/commonMain/kotlin/moneyfan/fiduciary/public/PublicLedger.kt`

Implement `PublicLedgerManager` class with:

- `addRecord<T>()` - Add public records with compliance checking
- `getRecord<T>()` - Retrieve by transaction ID
- `getRecordsForEntity()` - Query all records for an entity
- `getRecordsByType()` - Query by record type
- `getAuditTrail()` - Get audit events for a record
- `generateComplianceReport()` - Create regulatory reports
- `verifyRecordIntegrity()` - Verify hashes and proofs

**Storage:** Use existing IndexedDB/Yjs infrastructure

### 3. Private Ledger System

Implement encrypted ledger with:

- `EncryptedRecord<T>` storage with encryption wrapper
- `LedgerAccessControl` with roles and entity permissions
- `DecryptionRule` types:
  - `MultiSignature` (M-of-N signers)
  - `TimeDelay` (time-lock)
  - `RoleRequired` (role-based)
  - `ComplianceRequired` (compliance-gated)
- `ExpirationPolicy` (time-based, event-based, legal hold, indefinite)

**Encryption:** Start with mock, plan for Web Crypto API

### 4. Ledger Bridge (Cryptographic)

Implement bridge between public and private ledgers:

- `CryptographicProof` type (attestation + metadata)
- `LedgerCrossReference` linking public ↔ private records
- `CrossReferenceLinkType` enum:
  - `COMPLIANCE_PROOF` - Private proves public compliance
  - `AGGREGATION_SOURCE` - Private aggregated into public
  - `DETAIL_EXPANSION` - Private details of public
  - `STRATEGY_EXECUTION` - Private strategy executed publicly
  - `AUDIT_SUPPORT` - Private supports public audit
- One-way proof generation: Private → Public (not reversible)

### 5. Beneficiary System

**Source:** Kotlin `Beneficiary` and `BeneficiaryMap` types

Implement:

- `Beneficiary` record with:
  - `BeneficiaryType` (individual, entity, trust, estate, charity, government)
  - `Interest[]` (equity, income, capital gains, distributions, voting rights)
  - `BeneficiaryPublicInfo` (disclosure, identifier, jurisdiction, tax status)
  - `privateInfo: EncryptedId` (link to encrypted details)
- `BeneficiaryMap` using Indexed pattern (entity → beneficiaries)

### 6. Expert Panel System

**Source:** Kotlin `ExpertPanel` and `PanelMember` types

Implement:

- `PanelMember` with:
  - `FiduciaryDomain[]` expertise areas
  - `publicKey` for cryptographic signing
  - `ReputationScore` (score, contributions, outcomes, endorsements)
  - `AvailabilityStatus` (available, busy, unavailable, emergency)
  - `contributionHistory: EncryptedId` (private performance data)
- `ExpertPanel` using Indexed pattern (domain → experts)

### 7. Integration with Existing Systems

#### Map Existing Features to New Types
- NACHA transactions → `RecordType.CAPITAL_CONTRIBUTION` / `DISTRIBUTION`
- ACH settlements → `RecordType.EXPENSE` / `REVENUE`
- Account ledger operations → Entity management
- Bank API calls → Compliance proof data sources

#### Dual-Ledger UI
- Public view: Regulator/auditor transparency
- Private view: Strategic/proprietary information
- Bridge view: Proofs connecting public ↔ private

---

## Non-Functional Requirements

### Performance
- IndexedDB single record lookup: <100ms
- Query by entity/type/date: <500ms for 1000 records
- Bridge proof generation: <200ms

### Security
- All private records encrypted at rest
- Access control enforced on every read
- Audit trail immutable (append-only)
- Public records cannot be deleted (only appended)

### Compliance
- Support US (IRS, SEC) and EU (GDPR) jurisdictions
- Generate regulatory reports on demand
- Maintain 7-year audit trail (IRS requirement)

### Scalability
- Target: 10,000+ concurrent records
- Support pagination for large queries
- Lazy-load encrypted data

---

## Acceptance Criteria

1. ✅ TypeScript types match Kotlin semantics (verified by inspection)
2. ✅ Can create public records with compliance proofs
3. ✅ Can create encrypted private records with access controls
4. ✅ Can generate cryptographic bridge proofs
5. ✅ Can audit all public ledger operations (full trail)
6. ✅ Can query records by entity, type, date range
7. ✅ Integration tests pass with existing NACHA/ACH systems
8. ✅ UI components display both public and private views

---

## Out of Scope

- ❌ Blockchain implementation (use IndexedDB + Yjs for now)
- ❌ Production cryptographic libraries (start with mocks)
- ❌ Real regulatory body integration (mock compliance initially)
- ❌ Multi-user authentication (use existing Google OAuth)
- ❌ Real-time multi-device sync (Yjs handles this already)

---

## Dependencies

### Internal
- Existing NACHA posting client
- ACH settlement logic
- BOFA CashPro API integration
- Baselane API integration
- IndexedDB/Yjs persistence layer

### External
- `kotlinx.datetime` → Use `date-fns` or `temporal` polyfill
- `kotlinx.serialization` → Use Zod for validation
- `borg.trikeshed.lib.Indexed` → Use Map + custom utilities

---

## Risk Mitigation

### Risk 1: Type System Mismatch
**Mitigation:** Create comprehensive unit tests comparing Kotlin output vs TypeScript output

### Risk 2: Encryption Complexity
**Mitigation:** Start with mock encryption, phase in Web Crypto API incrementally

### Risk 3: Performance Degradation
**Mitigation:** Benchmark each phase, optimize hot paths, use IndexedDB indexes

### Risk 4: Breaking Existing Features
**Mitigation:** Feature flags for dual-ledger system, run parallel during migration

---

## Success Metrics

- All 14 `FiduciaryDomain` areas representable in TypeScript
- 100% of Kotlin `RecordType` enums mapped to Node.js operations
- <5% performance regression on existing NACHA/ACH operations
- 90%+ code coverage on new dual-ledger code
- Zero data loss during migration from single to dual ledger
