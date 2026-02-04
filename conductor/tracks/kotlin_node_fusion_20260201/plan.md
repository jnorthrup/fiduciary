# Implementation Plan: Kotlin-Node.js Fiduciary Fusion

**Track:** kotlin_node_fusion_20260201
**Total Phases:** 7
**Estimated Tasks:** 45

---

## Phase 1: Type System & Foundation

**Goal:** Establish TypeScript type system matching Kotlin semantics

### Tasks

- [ ] **1.1** Create directory structure: `src/types/ledger/`, `src/types/beneficiary/`, `src/types/expert/`
- [ ] **1.2** Port core ID aliases (TransactionId, EntityId, BeneficiaryId, ExpertId, RoleId, EncryptedId)
- [ ] **1.3** Implement `RecordType` enum with all 13 values from Kotlin
- [ ] **1.4** Implement `ComplianceProofType` enum with all 7 values
- [ ] **1.5** Implement `SensitivityLevel` enum (5 levels)
- [ ] **1.6** Implement `RetentionPolicy` sealed type (TimeBased, EventBased, LegalHold, Indefinite)
- [ ] **1.7** Create `PublicRecord<T>` interface matching Kotlin structure
- [ ] **1.8** Create `EncryptedRecord<T>` interface with ByteArray handling
- [ ] **1.9** Create `ComplianceProof` interface with attestation
- [ ] **1.10** Create `Jurisdiction` interface (country, state, locality, regulatoryZone)
- [ ] **1.11** Create `AuditMetadata` interface (auditTrailId, previousRecordId, recordHash, blockNumber, validators)
- [ ] **1.12** Add Zod schemas for all core types (validation)
- [ ] **1.13** Write unit tests for type validation (Zod parsing)

**Verification:**
- All TypeScript types compile without errors
- Zod schemas validate correctly
- Unit tests pass

---

## Phase 2: Public Ledger Implementation

**Goal:** Implement PublicLedgerManager with IndexedDB persistence

### Tasks

- [ ] **2.1** Create `PublicLedgerManager` class in `src/ledger/public/PublicLedgerManager.ts`
- [ ] **2.2** Implement `addRecord<T>()` with compliance proof generation
- [ ] **2.3** Implement `getRecord<T>(txId)` single record lookup
- [ ] **2.4** Implement `getRecordsForEntity(entityId)` query
- [ ] **2.5** Implement `getRecordsByType(recordType)` query
- [ ] **2.6** Implement `getAuditTrail(txId)` audit event retrieval
- [ ] **2.7** Create IndexedDB schema for public records store
- [ ] **2.8** Implement IndexedDB persistence layer (add, get, query)
- [ ] **2.9** Add audit trail logging to every operation
- [ ] **2.10** Implement `generateComplianceReport()` for entity/jurisdiction/period
- [ ] **2.11** Implement `verifyRecordIntegrity()` with hash/proof checking
- [ ] **2.12** Create mock compliance proof generator (placeholder for real crypto)
- [ ] **2.13** Write integration tests for PublicLedgerManager + IndexedDB
- [ ] **2.14** Benchmark performance (target: <100ms lookup, <500ms query)

**Verification:**
- All public ledger operations persist to IndexedDB
- Audit trail records every operation
- Integrity verification works
- Performance benchmarks meet targets

---

## Phase 3: Private Ledger Implementation

**Goal:** Implement encrypted private ledger with access controls

### Tasks

- [ ] **3.1** Create `PrivateLedgerManager` class in `src/ledger/private/PrivateLedgerManager.ts`
- [ ] **3.2** Implement `EncryptedRecord<T>` storage wrapper
- [ ] **3.3** Create mock encryption utilities (encrypt/decrypt placeholders)
- [ ] **3.4** Implement `LedgerAccessControl` type (owner, roles, entities, policies)
- [ ] **3.5** Implement `DecryptionRule` sealed type (MultiSignature, TimeDelay, RoleRequired, ComplianceRequired)
- [ ] **3.6** Implement access control check before every decrypt operation
- [ ] **3.7** Create IndexedDB schema for encrypted records store
- [ ] **3.8** Implement encrypted record persistence (encrypted at rest)
- [ ] **3.9** Implement `addEncryptedRecord<T>()` with encryption wrapper
- [ ] **3.10** Implement `getEncryptedRecord<T>(id, accessContext)` with access check
- [ ] **3.11** Implement `getEncryptedRecordsForEntity()` with access filtering
- [ ] **3.12** Add expiration policy enforcement (TimeBasedExpiry, EventBasedExpiry, NeverExpires)
- [ ] **3.13** Write integration tests for PrivateLedgerManager + encryption
- [ ] **3.14** Add tests for access control enforcement (unauthorized = denied)

**Verification:**
- All private records encrypted before storage
- Access control enforced on every read
- Expiration policies work correctly
- Unauthorized access returns errors

---

## Phase 4: Ledger Bridge (Cryptographic)

**Goal:** Implement cryptographic proof system linking private → public

### Tasks

- [ ] **4.1** Create `CryptographicProof` type in `src/ledger/bridge/types.ts`
- [ ] **4.2** Implement `LedgerCrossReference` type (publicId, privateId, linkProof, linkType)
- [ ] **4.3** Implement `CrossReferenceLinkType` enum (5 link types)
- [ ] **4.4** Create `LedgerBridge` class in `src/ledger/bridge/LedgerBridge.ts`
- [ ] **4.5** Implement `generateProof(privateRecord, publicRecord)` one-way proof
- [ ] **4.6** Implement `verifyProof(proof, publicRecord, privateRecord?)` verification
- [ ] **4.7** Create mock proof generation (hash-based placeholder)
- [ ] **4.8** Implement cross-reference storage (IndexedDB)
- [ ] **4.9** Add `linkRecords(publicId, privateId, linkType)` method
- [ ] **4.10** Add `getPrivateReferences(publicId)` method (find private records for public)
- [ ] **4.11** Add `getPublicReferences(privateId)` method (find public records for private)
- [ ] **4.12** Write integration tests for bridge operations
- [ ] **4.13** Add tests for proof verification (invalid proofs rejected)

**Verification:**
- Proofs generated from private → public (not reversible)
- Proof verification rejects invalid proofs
- Cross-references queryable in both directions
- All link types supported

---

## Phase 5: Beneficiary & Expert Systems

**Goal:** Port beneficiary and expert panel management from Kotlin

### Tasks

- [ ] **5.1** Create `Beneficiary` type in `src/beneficiary/types.ts`
- [ ] **5.2** Implement `BeneficiaryType` enum (6 types)
- [ ] **5.3** Implement `Interest` type (interestType, percentage, conditions, priority)
- [ ] **5.4** Implement `InterestType` enum (7 types: EQUITY, INCOME, etc.)
- [ ] **5.5** Create `BeneficiaryPublicInfo` type
- [ ] **5.6** Create `BeneficiaryMap` using Indexed pattern
- [ ] **5.7** Implement `BeneficiaryManager` class in `src/beneficiary/BeneficiaryManager.ts`
- [ ] **5.8** Add CRUD operations for beneficiaries
- [ ] **5.9** Link beneficiary private data to encrypted records
- [ ] **5.10** Create `PanelMember` type in `src/expert/types.ts`
- [ ] **5.11** Implement `FiduciaryDomain` enum (14 domains)
- [ ] **5.12** Create `ReputationScore` type
- [ ] **5.13** Implement `AvailabilityStatus` enum
- [ ] **5.14** Create `ExpertPanel` using Indexed pattern
- [ ] **5.15** Implement `ExpertPanelManager` class in `src/expert/ExpertPanelManager.ts`
- [ ] **5.16** Add CRUD operations for panel members
- [ ] **5.17** Link expert contribution history to encrypted records
- [ ] **5.18** Write integration tests for both systems

**Verification:**
- Beneficiary CRUD operations persist correctly
- Expert panel CRUD operations persist correctly
- Private data linked to encrypted records
- All enums match Kotlin semantics

---

## Phase 6: Integration with Existing Systems

**Goal:** Connect dual-ledger to NACHA, ACH, and bank integrations

### Tasks

- [ ] **6.1** Map NACHA file transactions to `RecordType.CAPITAL_CONTRIBUTION` / `DISTRIBUTION`
- [ ] **6.2** Map ACH settlement transactions to `RecordType.EXPENSE` / `REVENUE`
- [ ] **6.3** Create adapter: NACHA posting → public ledger record creation
- [ ] **6.4** Create adapter: ACH settlement → public ledger record creation
- [ ] **6.5** Connect BOFA CashPro API data to compliance proofs
- [ ] **6.6** Connect Baselane API data to compliance proofs
- [ ] **6.7** Map existing account ledger entities to dual-ledger EntityId
- [ ] **6.8** Create migration script: existing data → public ledger
- [ ] **6.9** Add feature flag for dual-ledger system (parallel operation)
- [ ] **6.10** Create React UI component: PublicLedgerView
- [ ] **6.11** Create React UI component: PrivateLedgerView
- [ ] **6.12** Create React UI component: LedgerBridgeView
- [ ] **6.13** Add UI toggle: Single/Dual ledger mode
- [ ] **6.14** Write E2E tests: NACHA → public ledger flow
- [ ] **6.15** Write E2E tests: ACH → public ledger flow

**Verification:**
- NACHA transactions create public ledger records
- ACH settlements create public ledger records
- Bank API data enriches compliance proofs
- UI displays both public and private views
- Feature flag allows safe parallel operation
- E2E tests pass for both flows

---

## Phase 7: Testing & Documentation

**Goal:** Comprehensive test coverage and documentation

### Tasks

- [ ] **7.1** Write unit tests for all core types (20+ tests)
- [ ] **7.2** Write unit tests for PublicLedgerManager (15+ tests)
- [ ] **7.3** Write unit tests for PrivateLedgerManager (15+ tests)
- [ ] **7.4** Write unit tests for LedgerBridge (10+ tests)
- [ ] **7.5** Write unit tests for BeneficiaryManager (10+ tests)
- [ ] **7.6** Write unit tests for ExpertPanelManager (10+ tests)
- [ ] **7.7** Write integration tests: NACHA → dual-ledger (5+ tests)
- [ ] **7.8** Write integration tests: ACH → dual-ledger (5+ tests)
- [ ] **7.9** Write E2E tests: full workflow (3+ tests)
- [ ] **7.10** Measure code coverage (target: >90%)
- [ ] **7.11** Update README.md with dual-ledger architecture diagram
- [ ] **7.12** Create ARCHITECTURE.md explaining Kotlin → TypeScript port
- [ ] **7.13** Create MIGRATION.md for existing data migration
- [ ] **7.14** Add usage examples: Creating public/private records
- [ ] **7.15** Add usage examples: Generating bridge proofs
- [ ] **7.16** Add performance benchmark results to docs

**Verification:**
- All tests pass (100+ total tests)
- Code coverage >90%
- README updated with architecture diagram
- Migration guide complete
- Usage examples tested and working

---

## Task Summary

| Phase | Tasks | Status |
|-------|-------|--------|
| 1. Type System & Foundation | 13 | `[ ]` |
| 2. Public Ledger | 14 | `[ ]` |
| 3. Private Ledger | 14 | `[ ]` |
| 4. Ledger Bridge | 13 | `[ ]` |
| 5. Beneficiary & Expert | 18 | `[ ]` |
| 6. Integration | 15 | `[ ]` |
| 7. Testing & Docs | 16 | `[ ] |
| **Total** | **103** | **[ ]** |

---

## Progress Tracking

**Current Phase:** Phase 1 - Type System & Foundation
**Current Task:** [ ] 1.1 - Create directory structure
**Overall Progress:** 0/103 tasks (0%)

**Next Milestone:** Phase 1 complete (13/13 tasks) → Begin Phase 2
