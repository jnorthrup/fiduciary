# Track: 1099 IRS CAFR Proficiency

## Overview

Deep proficiency in IRS Information Returns Intake System (IRIS) for 1099 filings and Comprehensive Annual Financial Report (CAFR) research capabilities for municipal securities analysis.

This track delivers production-ready 1099 filing workflows with real IRS API integration and CAFR document retrieval for municipal bond due diligence.

## Background

The Trust Ledger System has basic 1099 and CAFR components but lacks production-ready depth:
- 1099 wizard exists but needs comprehensive error handling, validation, and status polling
- CAFR capabilities are scattered and lack unified research interface
- No end-to-end testing with actual IRS IRIS sandbox
- Missing production deployment configuration

## Functional Requirements

### FR1: 1099 Filing Wizard Enhancement
- **FR1.1**: Complete 7-step wizard with TCC authentication, filer setup, form selection, payee entry, review, submission, and results
- **FR1.2**: Real-time TIN validation with IRS TIN Matching Service
- **FR1.3**: Pre-transmission validation checking before submission
- **FR1.4**: Batch submission supporting up to 1000 payees
- **FR1.5**: Automatic status polling with progress updates
- **FR1.6**: Error handling with clear user guidance for rejection scenarios
- **FR1.7**: Submission history with receipt tracking

### FR2: IRS IRIS API Integration
- **FR2.1**: OpenAPI 3.1 specification compliance
- **FR2.2**: All form types: 1099-NEC, 1099-MISC, 1099-INT, 1099-DIV, 1099-B, 1099-R, 1099-S, W-2, W-2G, 1042-S, 3921, 3922
- **FR2.3**: TCC and Bearer token authentication
- **FR2.4**: TIN validation (single and batch)
- **FR2.5**: Form schema retrieval
- **FR2.6**: Submission status and details endpoints

### FR3: CAFR Research Interface
- **FR3.1**: Search CAFRs by entity name, state, or fiscal year
- **FR3.2**: Retrieve and display CAFR PDF content
- **FR3.3**: Extract key financial data (revenues, expenditures, debt ratios)
- **FR3.4**: Link CAFR data to municipal securities in portfolio
- **FR3.5**: Historical CAFR comparison across years

### FR4: Data Persistence
- **FR4.1**: Store submission history and receipts
- **FR4.2**: Cache TIN validation results
- **FR4.3**: Persist payee data for re-use
- **FR4.4**: Audit trail for all submissions

## Non-Functional Requirements

### NFR1: Performance
- API responses < 500ms (p95)
- Wizard page transitions < 100ms
- Support 1000-record batch submissions

### NFR2: Reliability
- 99.9% API call success rate
- Graceful degradation when IRS services unavailable
- Retry logic with exponential backoff

### NFR3: Security
- Secure TCC storage (encrypted at rest)
- No TIN/Taxpayer data in logs
- TLS 1.3 for all API communications
- CSRF protection

### NFR4: Compliance
- Maintain audit trail for 7 years
- Support IRS record retention requirements
- Data export for legal discovery

## Acceptance Criteria

### AC1: 1099 Submission
- User can complete end-to-end 1099-NEC filing with real IRS sandbox
- Submission receipt generated and stored
- Status polling updates every 5 seconds until completion
- Errors displayed with actionable remediation steps

### AC2: TIN Validation
- Single TIN validation returns match/mismatch result
- Batch validation processes 50 TINs in < 10 seconds
- Results cached for 24 hours

### AC3: CAFR Research
- User can search for "City of Anytown" CAFR
- PDF content displays in embedded viewer
- Financial summary extracted and displayed

### AC4: Data Persistence
- Submission history persists across browser sessions
- Payee data reusable across filings
- Audit log records all API calls

## Out of Scope

- Direct IRS production integration (sandbox only for this track)
- State-level tax filings beyond IRS forms
- Advanced AI document analysis for CAFRs
- Portfolio management for municipal securities
- Multi-entity consolidated reporting

## Dependencies

- IRS IRIS A2A sandbox access
- Google GenAI API key for validation
- Firebase Firestore for persistence
- IRS TCC (Transmission Control Code)

## Success Metrics

- 100% of test 1099 submissions accepted in sandbox
- < 2 minute average time from wizard start to submission receipt
- 0 data loss events in persistence layer
- User can successfully complete CAFR search for top 100 US municipalities
