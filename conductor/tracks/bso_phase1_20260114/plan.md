# BSO Implementation Phase 1 - Implementation Plan

## Phase 1: Foundation - Type Definitions and Interfaces

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

- [~] Task: Conductor - User Manual Verification 'Phase 1: Foundation - Type Definitions and Interfaces' (Protocol in workflow.md)

## Phase 2: EFW2 File Generation Library

### 2.1 Create EFW2 Builder Module Structure
- [ ] Task: Create `lib/efw2/` directory and module structure
- [ ] Task: Define TypeScript interfaces for SSA record types (RA, RS, RE, RW, RT, RU, RF)

### 2.2 Implement Record Builders
- [ ] Task: Implement RA (Employer Record) builder
- [ ] Task: Implement RE (Employee Wage Record) builder
- [ ] Task: Implement RS (Special Tax Record) builder
- [ ] Task: Implement RT (Total Record) builder with checksum validation
- [ ] Task: Implement remaining record types (RW, RU, RF)

### 2.3 EFW2 File Assembly
- [ ] Task: Create EFW2File class that assembles records into compliant fixed-width format
- [ ] Task: Implement record count validation and checksum verification
- [ ] Task: Add JSDoc documentation to all public methods

### 2.4 Mock Test Fixtures
- [ ] Task: Create mock filing examples as test fixtures in `tests/fixtures/efw2/`
- [ ] Task: Add sample employer data, employee wage data, and complete filing examples

- [ ] Task: Conductor - User Manual Verification 'Phase 2: EFW2 File Generation Library' (Protocol in workflow.md)

## Phase 3: BSO Error Handling

### 3.1 Create Error Code Mapping Module
- [ ] Task: Create `lib/bso/errors.ts` module
- [ ] Task: Map SSA BSO error codes (BSO-900, BSO-403, BSO-101, BSO-500) to user messages
- [ ] Task: Define resolution suggestions for each error category
- [ ] Task: Add JSDoc documentation for error mapping functions

### 3.2 Implement AI-Assisted Error Interpreter
- [ ] Task: Create `lib/bso/aiErrorInterpreter.ts` using Google GenAI
- [ ] Task: Implement error context analysis function
- [ ] Task: Add fallback to static mapping when AI unavailable
- [ ] Task: Add JSDoc documentation

- [ ] Task: Conductor - User Manual Verification 'Phase 3: BSO Error Handling' (Protocol in workflow.md)

## Phase 4: BSO Proxy Server

### 4.1 Create BSO Proxy Module
- [ ] Task: Create `services/bsoProxy.ts` based on IRIS A2A proxy pattern
- [ ] Task: Implement authentication/session management for BSO endpoints

### 4.2 Implement BSO Endpoints
- [ ] Task: Implement user registration endpoint proxy
- [ ] Task: Implement employer linking endpoint proxy
- [ ] Task: Implement service provisioning endpoint proxy
- [ ] Task: Implement account activation endpoint proxy
- [ ] Task: Implement W-2 submission upload endpoint proxy
- [ ] Task: Implement submission status checking endpoint proxy
- [ ] Task: Implement notice retrieval endpoint proxy

### 4.3 OpenAPI Specification
- [ ] Task: Create `services/bsoOpenApiSpec.ts` with endpoint schemas
- [ ] Task: Define request/response schemas for all endpoints
- [ ] Task: Define error response formats
- [ ] Task: Add JSDoc documentation

- [ ] Task: Conductor - User Manual Verification 'Phase 4: BSO Proxy Server' (Protocol in workflow.md)

## Phase 5: State Management and Persistence

### 5.1 Create BSO Store (React Context)
- [ ] Task: Create `services/bsoStore.ts` for BSO state management
- [ ] Task: Implement BSO roles state management
- [ ] Task: Implement BSO submissions state management
- [ ] Task: Implement localStorage persistence for BSO data

### 5.2 Integrate with Existing State
- [ ] Task: Wire BSO store into existing entity/ledger state management
- [ ] Task: Add BSO data to ledger service initialization

- [ ] Task: Conductor - User Manual Verification 'Phase 5: State Management and Persistence' (Protocol in workflow.md)

## Phase 6: UI Integration

### 6.1 Wire Up Wizards to Real Proxy
- [ ] Task: Update BSOWizard to use BSO proxy instead of mock functions
- [ ] Task: Update BSOEnrollmentWizard to use BSO proxy
- [ ] Task: Update BSOHierarchyViewer to display real submission/notice data

### 6.2 Implement Status Polling
- [ ] Task: Add AccuWage status polling mechanism (30-second intervals)
- [ ] Task: Update UI when AccuWage status changes
- [ ] Task: Display error details when AccuWage validation fails

### 6.3 Notice Processing Display
- [ ] Task: Integrate notice retrieval with BSOHierarchyViewer
- [ ] Task: Display notices by category (Enforcement, Unpostable, Informational)
- [ ] Task: Store notices in IRMDocument structure

- [ ] Task: Conductor - User Manual Verification 'Phase 6: UI Integration' (Protocol in workflow.md)

## Phase 7: Environment Configuration

### 7.1 Mock/Real Mode Switching
- [ ] Task: Add environment variable for BSO mock/real mode
- [ ] Task: Implement mode switching logic in BSO proxy
- [ ] Task: Add mode indicator in UI for debugging

- [ ] Task: Conductor - User Manual Verification 'Phase 7: Environment Configuration' (Protocol in workflow.md)
