# BSO Implementation Phase 1 - Implementation Plan

## Phase 1: Foundation - Type Definitions and Interfaces [checkpoint: 96a8621]

### 1.1 Extend Type Definitions
- [x] Task: Extend `types.ts` BSORole interface with additional fields
  - Add `registrationStatus`: 'Active' | 'Pending' | 'Failed'
  - Add `services`: string[]
  - Add `activationCode`: string | null
  - Add `registeredAt`: string
  - Add `lastAuthenticated`: string

- [x] Task: Extend `types.ts` BSOSubmission interface with additional fields
  - Add `accuWageStatus`: 'Pass' | 'Errors' | 'Pending' | 'Rejected'
  - Add `errorDetails`: BSOErrorDetail[] | null
  - Add `submittedAt`: string
  - Add `acknowledgedAt`: string | null

- [x] Task: Define BSOErrorDetail interface
  - Add `code`: string
  - Add `message`: string
  - Add `resolution`: string
  - Add `category`: 'Authentication' | 'Validation' | 'System' | 'Unknown'

- [x] Task: Conductor - User Manual Verification 'Phase 1: Foundation - Type Definitions and Interfaces' (Protocol in workflow.md)

## Phase 2: EFW2 File Generation Library [checkpoint: 06cde5d]

### 2.1 Create EFW2 Builder Module Structure
- [x] Task: Create `lib/efw2/` directory and module structure
- [x] Task: Define TypeScript interfaces for SSA record types (RA, RS, RE, RW, RT, RU, RF)

### 2.2 Implement Record Builders
- [x] Task: Implement RA (Employer Record) builder
- [x] Task: Implement RE (Employee Wage Record) builder
- [x] Task: Implement RS (Special Tax Record) builder
- [x] Task: Implement RT (Total Record) builder with checksum validation
- [x] Task: Implement remaining record types (RW, RU, RF)

### 2.3 EFW2 File Assembly
- [x] Task: Create EFW2File class that assembles records into compliant fixed-width format
- [x] Task: Implement record count validation and checksum verification
- [x] Task: Add JSDoc documentation to all public methods

### 2.4 Mock Test Fixtures
- [x] Task: Create mock filing examples as test fixtures in `tests/fixtures/efw2/`
- [x] Task: Add sample employer data, employee wage data, and complete filing examples

- [x] Task: Conductor - User Manual Verification 'Phase 2: EFW2 File Generation Library' (Protocol in workflow.md)

## Phase 3: BSO Error Handling [checkpoint: c6c20a3]

### 3.1 Create Error Code Mapping Module
- [x] Task: Create `lib/bso/errors.ts` module
- [x] Task: Map SSA BSO error codes (BSO-900, BSO-403, BSO-101, BSO-500) to user messages
- [x] Task: Define resolution suggestions for each error category
- [x] Task: Add JSDoc documentation for error mapping functions

### 3.2 Implement AI-Assisted Error Interpreter
- [x] Task: Create `lib/bso/aiErrorInterpreter.ts` using Google GenAI
- [x] Task: Implement error context analysis function
- [x] Task: Add fallback to static mapping when AI unavailable
- [x] Task: Add JSDoc documentation

- [x] Task: Conductor - User Manual Verification 'Phase 3: BSO Error Handling' (Protocol in workflow.md)

## Phase 4: BSO Proxy Server

### 4.1 Create BSO Proxy Module
- [x] Task: Create `services/bsoProxy.ts` based on IRIS A2A proxy pattern
- [x] Task: Implement authentication/session management for BSO endpoints

### 4.2 Implement BSO Endpoints
- [x] Task: Implement user registration endpoint proxy
- [x] Task: Implement employer linking endpoint proxy
- [x] Task: Implement service provisioning endpoint proxy
- [x] Task: Implement account activation endpoint proxy
- [x] Task: Implement W-2 submission upload endpoint proxy
- [x] Task: Implement submission status checking endpoint proxy
- [x] Task: Implement notice retrieval endpoint proxy

### 4.3 OpenAPI Specification
- [x] Task: Create `services/bsoOpenApiSpec.ts` with endpoint schemas
- [x] Task: Define request/response schemas for all endpoints
- [x] Task: Define error response formats
- [x] Task: Add JSDoc documentation

- [~] Task: Conductor - User Manual Verification 'Phase 4: BSO Proxy Server' (Protocol in workflow.md)

## Phase 5: State Management and Persistence [checkpoint: PENDING]

### 5.1 Create BSO Store (React Context)
- [x] Task: Create `services/bsoStore.ts` for BSO state management [init]
- [x] Task: Implement BSO roles state management [init]
- [x] Task: Implement BSO submissions state management [init]
- [x] Task: Implement localStorage persistence for BSO data [init]

### 5.2 Integrate with Existing State
- [x] Task: Wire BSO store into existing entity/ledger state management [init]
- [x] Task: Add BSO data to ledger service initialization [init]

- [x] Task: Conductor - User Manual Verification 'Phase 5: State Management and Persistence' (Protocol in workflow.md) [init]

## Phase 6: UI Integration [x]

### 6.1 Wire Up Wizards to Real Proxy
- [x] Integrate `BSOWizard` with `bsoStore`
- [x] Integrate `BSOEnrollmentWizard` with `bsoStore`
- [x] Connect `BSOHierarchyViewer` to `bsoStore`

### 6.2 Implement Status Polling
- [x] Implement AccuWage status polling (30s intervals)
- [x] Display error details for validation failures

### 6.3 Notice Processing Display

- [ ] Task: Conductor - User Manual Verification 'Phase 6: UI Integration' (Protocol in workflow.md)

## Phase 7: Environment Configuration

### 7.1 Mock/Real Mode Switching
- [ ] Task: Add environment variable for BSO mock/real mode
- [ ] Task: Implement mode switching logic in BSO proxy
- [ ] Task: Add mode indicator in UI for debugging

- [ ] Task: Conductor - User Manual Verification 'Phase 7: Environment Configuration' (Protocol in workflow.md)
