# Implementation Plan: 1099 IRS CAFR Proficiency

## Phase 1: Backend Infrastructure & API Enhancement

### 1.1 Setup Testing Infrastructure
- [x] Task: Write tests for IRS API client utilities [30713ee]
  - [x] Sub-task: Write failing tests for formatEIN, formatSSN, validateTINFormat
  - [x] Sub-task: Implement IRS API client utility functions
  - [x] Sub-task: Write failing tests for TIN matching request/response types
  - [x] Sub-task: Implement TIN matching type validation
- [x] Task: Write tests for backend server middleware [fc56dcd]
  - [x] Sub-task: Write failing tests for CORS headers
  - [x] Sub-task: Implement CORS middleware
  - [x] Sub-task: Write failing tests for request logging
  - [x] Sub-task: Implement request logging middleware
- [ ] Task: Conductor - User Manual Verification 'Phase 1.1 Setup Testing Infrastructure' (Protocol in workflow.md)

### 1.2 IRS IRIS API Enhancement
- [ ] Task: Write tests for enhanced submission validation
  - [ ] Sub-task: Write failing tests for submission schema validation
  - [ ] Sub-task: Implement submission schema validation with detailed error messages
  - [ ] Sub-task: Write failing tests for payee record limits (1000 max)
  - [ ] Sub-task: Implement payee record limit validation
- [ ] Task: Write tests for status polling mechanism
  - [ ] Sub-task: Write failing tests for pollSubmissionStatus with timeout
  - [ ] Sub-task: Implement exponential backoff for status polling
  - [ ] Sub-task: Write failing tests for terminal state detection
  - [ ] Sub-task: Implement terminal state detection logic
- [ ] Task: Conductor - User Manual Verification 'Phase 1.2 IRS IRIS API Enhancement' (Protocol in workflow.md)

### 1.3 Data Persistence Layer
- [ ] Task: Write tests for submission storage
  - [ ] Sub-task: Write failing tests for submission record creation
  - [ ] Sub-task: Implement submission storage with metadata
  - [ ] Sub-task: Write failing tests for submission retrieval by receipt ID
  - [ ] Sub-task: Implement submission lookup functionality
- [ ] Task: Write tests for TIN validation cache
  - [ ] Sub-task: Write failing tests for cache set/get operations
  - [ ] Sub-task: Implement in-memory TIN cache with TTL
  - [ ] Sub-task: Write failing tests for cache expiration
  - [ ] Sub-task: Implement cache expiration logic
- [ ] Task: Conductor - User Manual Verification 'Phase 1.3 Data Persistence Layer' (Protocol in workflow.md)

## Phase 2: Frontend 1099 Wizard Enhancement

### 2.1 Wizard Component Testing
- [ ] Task: Write tests for IRIS1099Wizard authentication step
  - [ ] Sub-task: Write failing tests for TCC input validation
  - [ ] Sub-task: Implement TCC format validation (TXXXXXXXXX)
  - [ ] Sub-task: Write failing tests for bearer token input
  - [ ] Sub-task: Implement bearer token handling
- [ ] Task: Write tests for wizard step navigation
  - [ ] Sub-task: Write failing tests for step progression logic
  - [ ] Sub-task: Implement step navigation with validation
  - [ ] Sub-task: Write failing tests for step backward navigation
  - [ ] Sub-task: Implement backward navigation with state preservation
- [ ] Task: Conductor - User Manual Verification 'Phase 2.1 Wizard Component Testing' (Protocol in workflow.md)

### 2.2 Form & Payee Management
- [ ] Task: Write tests for filer information form
  - [ ] Sub-task: Write failing tests for EIN format validation
  - [ ] Sub-task: Implement EIN format validation with user feedback
  - [ ] Sub-task: Write failing tests for address validation
  - [ ] Sub-task: Implement address field validation (state, ZIP)
- [ ] Task: Write tests for payee management
  - [ ] Sub-task: Write failing tests for payee add/remove operations
  - [ ] Sub-task: Implement payee list management
  - [ ] Sub-task: Write failing tests for payee data validation
  - [ ] Sub-task: Implement payee field validation with error display
- [ ] Task: Conductor - User Manual Verification 'Phase 2.2 Form & Payee Management' (Protocol in workflow.md)

### 2.3 Submission & Status Display
- [ ] Task: Write tests for submission flow
  - [ ] Sub-task: Write failing tests for pre-submission validation call
  - [ ] Sub-task: Implement pre-validation with error display
  - [ ] Sub-task: Write failing tests for submission API call
  - [ ] Sub-task: Implement submission with loading states
- [ ] Task: Write tests for status polling UI
  - [ ] Sub-task: Write failing tests for status update display
  - [ ] Sub-task: Implement real-time status updates
  - [ ] Sub-task: Write failing tests for completion notification
  - [ ] Sub-task: Implement completion state with results display
- [ ] Task: Conductor - User Manual Verification 'Phase 2.3 Submission & Status Display' (Protocol in workflow.md)

## Phase 3: CAFR Research Interface

### 3.1 CAFR Search & Retrieval
- [ ] Task: Write tests for CAFR search functionality
  - [ ] Sub-task: Write failing tests for search by entity name
  - [ ] Sub-task: Implement CAFR search API integration
  - [ ] Sub-task: Write failing tests for search by state
  - [ ] Sub-task: Implement state filter functionality
  - [ ] Sub-task: Write failing tests for search by fiscal year
  - [ ] Sub-task: Implement fiscal year filter
- [ ] Task: Write tests for CAFR PDF display
  - [ ] Sub-task: Write failing tests for PDF URL retrieval
  - [ ] Sub-task: Implement PDF viewer integration
  - [ ] Sub-task: Write failing tests for PDF loading states
  - [ ] Sub-task: Implement loading and error states
- [ ] Task: Conductor - User Manual Verification 'Phase 3.1 CAFR Search & Retrieval' (Protocol in workflow.md)

### 3.2 Financial Data Extraction
- [ ] Task: Write tests for CAFR data extraction
  - [ ] Sub-task: Write failing tests for revenue extraction
  - [ ] Sub-task: Implement revenue table parsing
  - [ ] Sub-task: Write failing tests for expenditure extraction
  - [ ] Sub-task: Implement expenditure table parsing
  - [ ] Sub-task: Write failing tests for debt ratio calculation
  - [ ] Sub-task: Implement debt ratio calculation logic
- [ ] Task: Write tests for historical comparison
  - [ ] Sub-task: Write failing tests for year-over-year comparison
  - [ ] Sub-task: Implement comparison visualization
- [ ] Task: Conductor - User Manual Verification 'Phase 3.2 Financial Data Extraction' (Protocol in workflow.md)

## Phase 4: Integration & Testing

### 4.1 End-to-End Testing
- [ ] Task: Write E2E tests for 1099 submission flow
  - [ ] Sub-task: Write failing E2E test for complete 1099 filing
  - [ ] Sub-task: Implement E2E test with sandbox API
  - [ ] Sub-task: Write failing E2E test for error handling
  - [ ] Sub-task: Implement error scenario E2E tests
- [ ] Task: Write E2E tests for CAFR research
  - [ ] Sub-task: Write failing E2E test for CAFR search to display
  - [ ] Sub-task: Implement CAFR E2E test flow
- [ ] Task: Conductor - User Manual Verification 'Phase 4.1 End-to-End Testing' (Protocol in workflow.md)

### 4.2 Performance & Security
- [ ] Task: Write tests for API response times
  - [ ] Sub-task: Write failing tests for <500ms response requirement
  - [ ] Sub-task: Implement performance monitoring
  - [ ] Sub-task: Write failing tests for batch processing performance
  - [ ] Sub-task: Optimize batch submission handling
- [ ] Task: Write security tests
  - [ ] Sub-task: Write failing tests for TCC encryption
  - [ ] Sub-task: Implement secure TCC storage
  - [ ] Sub-task: Write failing tests for log sanitization
  - [ ] Sub-task: Implement sensitive data filtering in logs
- [ ] Task: Conductor - User Manual Verification 'Phase 4.2 Performance & Security' (Protocol in workflow.md)

### 4.3 Documentation & Deployment
- [ ] Task: Write API documentation
  - [ ] Sub-task: Document all IRS API endpoints
  - [ ] Sub-task: Create code examples for common operations
- [ ] Task: Write user documentation
  - [ ] Sub-task: Create 1099 filing user guide
  - [ ] Sub-task: Create CAFR research user guide
- [ ] Task: Conductor - User Manual Verification 'Phase 4.3 Documentation & Deployment' (Protocol in workflow.md)
