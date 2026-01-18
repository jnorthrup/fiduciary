# BSO Implementation Phase 1

## Overview

Implement full SSA Business Services Online (BSO) integration for W-2 wage reporting, replacing the existing mock implementation with real API connectivity via a proxy server architecture similar to the existing IRIS A2A proxy.

**Track ID:** `bso_phase1_20260114`
**Type:** Feature
**Status:** New

## Background

The codebase currently has three BSO-related components with mock-only functionality:
- `BSOWizard.tsx` - 5-step employer registration wizard
- `BSOEnrollmentWizard.tsx` - 4-step new user enrollment wizard
- `BSOHierarchyViewer.tsx` - 3-phase visualization of BSO workflows

Service layer (`services/irsApiService.ts`) contains `mockBSORegistration` and `mockBSOSubmission` functions that simulate SSA responses with a fuzzer engine. No real SSA connectivity exists.

## Functional Requirements

### 1. BSO Proxy Server

**FR-1.1:** Create a BSO proxy server (`services/bsoProxy.ts`) that:
- Handles SSA BSO authentication and session management
- Routes requests to appropriate SSA BSO endpoints
- Implements request/response transformation similar to IRIS A2A proxy pattern
- Supports mock/real mode switching via environment configuration

**FR-1.2:** Implement BSO endpoints:
- User registration: `POST /bso/v1/users/register`
- Employer linking: `PUT /bso/v1/users/link-employer`
- Service provisioning: `POST /bso/v1/services/provision`
- Account activation: `POST /bso/v1/auth/activate`
- Submission upload: `POST /bso/v1/w2/submit`
- Status checking: `GET /bso/v1/submissions/{batchId}`
- Notice retrieval: `GET /bso/v1/notices`

### 2. EFW2 File Generation Library

**FR-2.1:** Create a custom EFW2 builder library (`lib/efw2/`) that:
- Implements SSA record specifications (RA, RS, RE, RW, RT, RU, RF record types)
- Generates compliant fixed-width text format per SSA Publication 1220
- Validates record count totals and checksums
- Supports both original W-2 (EFW2) and corrections (EFW2C) formats

**FR-2.2:** Provide TypeScript interfaces for:
- Employer records (RA)
- Employee wage records (RE)
- Special tax records (RS)
- Total records (RT)
- etc. per SSA spec

### 3. State Persistence

**FR-3.1:** Extend `types.ts` BSORole interface with:
- `registrationStatus`: 'Active' | 'Pending' | 'Failed'
- `services`: string[] (list of provisioned services)
- `activationCode`: string | null
- `registeredAt`: string
- `lastAuthenticated`: string

**FR-3.2:** Extend `types.ts` BSOSubmission interface with:
- `accuWageStatus`: 'Pass' | 'Errors' | 'Pending' | 'Rejected'
- `errorDetails`: BSOErrorDetail[] | null
- `submittedAt`: string
- `acknowledgedAt`: string | null

**FR-3.3:** Implement BSO store (React Context) that:
- Manages BSO roles and submissions state
- Persists to localStorage
- Integrates with existing entity/ledger state management

### 4. Error Handling

**FR-4.1:** Create BSO error code mapping module (`lib/bso/errors.ts`) that:
- Maps SSA BSO error codes (BSO-900, BSO-403, BSO-101, BSO-500) to user-friendly messages
- Provides suggested resolutions for each error type
- Categorizes errors (authentication, validation, system, etc.)

**FR-4.2:** Implement AI-assisted error interpreter using Google GenAI:
- Analyzes error context and provides contextual guidance
- Returns actionable next steps for users
- Fallback to static mapping when AI unavailable

### 5. UI Integration

**FR-5.1:** Wire up existing wizard components to use real proxy instead of mocks:
- BSOWizard: Connect registration flow to proxy endpoints
- BSOEnrollmentWizard: Connect enrollment flow to proxy endpoints
- BSOHierarchyViewer: Display real submission/notice data

**FR-5.2:** Add submission status polling for AccuWage results:
- Poll GET `/bso/v1/submissions/{batchId}` every 30 seconds
- Update UI when AccuWage status changes
- Display error details when AccuWage fails

### 6. Notice Processing

**FR-6.1:** Implement notice retrieval and parsing:
- Fetch EDC notices from GET `/bso/v1/notices`
- Parse notice content and categorize (Enforcement, Unpostable, Informational)
- Store notices in `IRMDocument` type structure
- Display notices in BSOHierarchyViewer

## Non-Functional Requirements

**NFR-1:** All public functions must have JSDoc documentation

**NFR-2:** TypeScript strict mode - no `any` types

**NFR-3:** Mock/test fixtures based on common filing examples (defer comprehensive testing)

**NFR-4:** Follow existing code style in `code_styleguides/typescript.md`

**NFR-5:** BSO proxy must support concurrent requests without session conflicts

## Acceptance Criteria

**AC-1:** User can complete full BSO registration flow through wizard with real SSA API (or mock mode)

**AC-2:** EFW2 file generated from employee data passes AccuWage validation (in mock or real environment)

**AC-3:** BSO submission status accurately reflects AccuWage results (Pass/Errors)

**AC-4:** SSA error codes are translated to actionable user messages

**AC-5:** BSO roles and submissions persist across page reloads via localStorage

**AC-6:** Existing wizard components function with new proxy layer without UI changes

## Out of Scope

- Full comprehensive test suite (deferred to Phase 2)
- Production SSA certificates/authentication (use mock mode initially)
- W-2c correction filing (original W-2 only for Phase 1)
- Batch submission optimization (single submission per batch)
- Multi-employer submission support

## Dependencies

- Existing IRIS A2A proxy pattern (`services/apiProxy.ts`, `services/openApiDefinitions.ts`)
- Google GenAI for error interpretation
- Existing entity/ledger state management patterns
- SSA EFW2 specifications (Publication 1220)

## OpenAPI Specification

A new OpenAPI spec will be created at `services/bsoOpenApiSpec.ts` defining:
- BSO proxy endpoints
- Request/response schemas
- Authentication requirements
- Error response formats
