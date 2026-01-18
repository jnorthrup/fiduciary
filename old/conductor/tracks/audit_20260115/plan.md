# Implementation Plan: Audit Events Service

## Phase 1: Foundation (Types & Service)
- [x] Task: Define AuditEvent types [init]
  - [x] Sub-task: Create `types/audit.ts` with schemas from `las-trust-erp.yaml` [init]
- [x] Task: Implement Audit Service [init]
  - [x] Sub-task: Create `services/auditService.ts` [init]
  - [x] Sub-task: Implement `listAuditEvents` with in-memory storage [init]
  - [x] Sub-task: Implement `logAuditEvent` helper [init]

## Phase 2: API Integration
- [x] Task: Create Audit Router [init]
  - [x] Sub-task: Create `server/routes/audit.js` [init]
  - [x] Sub-task: Implement GET `/events` with query filters [init]
- [x] Task: Mount Router in Server [init]
  - [x] Sub-task: Modify `server/index.js` to use audit router [init]

## Phase 3: Verification & Documentation
- [x] Task: Automated Testing [init]
  - [x] Sub-task: Write tests for `auditService` [init]
  - [x] Sub-task: Write tests for audit API endpoint [init]
- [x] Task: Update OpenAPI Spec [init]
  - [x] Sub-task: Add Audit definitions to `specs/unified-api-openapi.yaml` [init]

## Completed SHA: [init]
