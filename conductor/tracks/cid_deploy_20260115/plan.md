# Implementation Plan: Event-Driven CI/CD & Secure Ledger PWA

## Phase 1: Cloud Infrastructure (Terraform & GKE) [x]
- [x] Task: Infrastructure as Code (Terraform)
  - [x] Initialize Terraform with GCP provider and Cloud Storage backend.
  - [x] Define VPC, private subnets, and Cloud NAT.
  - [x] Provision Artifact Registry for container images.
- [x] Task: Cost-Optimized Compute (GKE Autopilot)
  - [x] Provision GKE Autopilot cluster with scale-to-zero capability.
  - [x] Configure Workload Identity for secure GCP service access.
- [x] Task: Event Bus (Pub/Sub)
  - [x] Create topics: `ledger.events`, `build.status`, `deploy.signal`.
  - [x] Setup dead-letter queues and retry policies.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Cloud Infrastructure' (Protocol in workflow.md)

## Phase 2: Identity & Browser Security [x]
- [x] Task: Identity (OIDC/OAuth)
  - [x] Integrate Firebase Auth or GCP Identity Platform for user authentication.
  - [x] Implement Auth middleware for all API/Function access.
- [x] Task: Encrypted Persistence (IndexedDB)
  - [x] Implement Web Crypto API wrapper for AES-GCM encryption.
  - [x] Secure encryption keys using WebAuthn/Biometrics where available.
- [x] Task: Redux Integration
  - [x] Configure Redux for client-side state only.
  - [x] Implement persistence middleware targeting the encrypted IndexedDB.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Identity & Browser Security' (Protocol in workflow.md)

## Phase 3: Coordination & Persistence Layer
- [~] Task: Coordination (Yjs CRDTs)
  - [x] Integrate Yjs for real-time conflict-free document synchronization.
  - [x] Map Ledger JSON Graph to Yjs types.
- [ ] Task: Persistence (FoundationDB)
  - [ ] Deploy FoundationDB on GKE (Autopilot-compatible setup).
  - [ ] Implement Persistence Proxy to bridge Yjs updates to FoundationDB transactions.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Coordination & Persistence Layer' (Protocol in workflow.md)

## Phase 4: CI/CD Pipeline (Cloud Build)
- [ ] Task: Multi-Stage Build Pipeline
  - [ ] Configure linting, unit tests (Vitest), and PWA audit (Lighthouse).
  - [ ] Implement CRDT consistency tests and encryption integrity checks.
- [ ] Task: Automated Deployment
  - [ ] Trigger GKE deployments via Cloud Build upon successful builds.
  - [ ] Implement scale-to-zero validation.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: CI/CD Pipeline' (Protocol in workflow.md)

## Phase 5: Orchestration & Rollback
- [ ] Task: Cloud Functions Orchestration
  - [ ] Create `onDeploy` function for health checks.
  - [ ] Create `onAuthChange` for user storage provisioning.
- [ ] Task: Automatic Rollback
  - [ ] Implement Cloud Monitoring alerts for deployment failure.
  - [ ] Script automatic GKE rollouts to previous stable versions.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Orchestration & Rollback' (Protocol in workflow.md)

## Phase 6: Verification & End-to-End
- [ ] Task: Offline Sync Validation
  - [ ] Verify state persists and syncs correctly after network disruption.
- [ ] Task: Encryption Audit
  - [ ] Verify data remains unreadable in IndexedDB without valid keys.
- [ ] Task: Performance Benchmarks
  - [ ] Audit GKE cold-start latency and Pub/Sub delivery times.
- [ ] Task: Conductor - User Manual Verification 'Phase 6: Verification & End-to-End' (Protocol in workflow.md)