# Teach Mode Paragraph Activation

## Overview

A context-aware learning and guidance system for the 1099 filing wizard that provides inline documentation overlays when users interact with form fields or when validation rules trigger. The system maps form fields and validation rules to specific paragraphs in the IRS instruction PDFs, organizing them through a dual taxonomy (process-based and topic-based) to help users understand not just what to fix, but why.

## Problem Statement

Users filing 1099 forms face complex IRS documentation. When validation errors occur or when users need guidance, they must manually search through PDF instruction documents to find relevant sections. This creates friction and increases filing errors.

## Solution

Teach Mode: An interactive overlay system that:
1. Maps form fields to IRS instruction paragraphs via hybrid manual/AI approach
2. Displays hover callouts with paragraph excerpts, taxonomy breadcrumbs, cross-references, and examples
3. Auto-triggers on validation rule firing to show relevant documentation
4. Organizes documentation through dual taxonomy for comprehensive learning

## Functional Requirements

### 1. Teach Mode Toggle
- Enable/disable Teach Mode via toggle switch in 1099 wizard
- Toggle state persists across form steps
- Visual indicator when Teach Mode is active

### 2. Hover Overlay Callouts
When Teach Mode is enabled and user hovers over a form field:
- Display overlay panel positioned near the hovered field
- Show paragraph excerpt from relevant IRS instruction
- Display taxonomy breadcrumb (e.g., "Preparation → TIN Validation → EIN Format → §1.4")
- Include cross-references to related forms/sections
- Show valid/invalid examples for the field
- Overlay appears on hover with configurable delay (default: 300ms)

### 3. Validation Rule Auto-Trigger
When a validation rule fires (in Teach Mode):
- Automatically display overlay for the failing field
- Highlight the specific paragraph explaining the rule
- Show error-specific context from instructions

### 4. Dual Taxonomy Structure

**Process-based Hierarchy:**
- Filing Stage (Preparation/Validation/Submission)
  - Step (e.g., "TIN Validation")
    - Rule (e.g., "EIN Format Check")
      - Documentation (PDF page, paragraph, excerpt)

**Topic-based Hierarchy:**
- Topic (Thresholds/TIN Format/Payee Rules)
  - Subtopic (e.g., "EIN Format")
    - Form Variants (1099-NEC, 1099-MISC, etc.)
      - Documentation

### 5. Field-to-Paragraph Mapping

**Manual Annotations (Critical Fields):**
JSON mapping file for:
- TCC format validation
- EIN/SSN format rules
- Payment thresholds ($600, $10)
- Payee count limits (1000 max)
- Required field validations

**AI Retrieval (Complex Scenarios):**
- Use GenAI to semantically match field labels to PDF content
- Retrieve relevant paragraphs for edge cases
- Cross-reference related sections automatically

### 6. Documentation Content

For each mapped field/rule:
- Paragraph excerpt (exact text from PDF)
- PDF page number reference
- Taxonomy breadcrumb path
- Cross-references (linked sections)
- Valid examples (1-3 per field)
- Invalid examples with explanations

### 7. Overlay UI Components
- Callout panel with header, content, footer
- Close button
- "View Full Page" link to PDF
- Breadcrumb navigation
- Cross-reference links
- Example code/data blocks
- Responsive positioning (avoid viewport edge clipping)

## Non-Functional Requirements

- Overlay render time: <100ms
- PDF paragraph retrieval: <500ms (AI) or <50ms (cached manual)
- Support all 1099 form variants (NEC, MISC, INT, DIV, B, C, OID, etc.)
- Mobile-responsive overlay positioning
- Accessibility: keyboard navigation, screen reader support

## Data Structures

### Manual Mapping File Format
```json
{
  "fieldId": {
    "taxonomy": {
      "process": ["Preparation", "TIN Validation", "EIN Format"],
      "topic": ["TIN Format", "EIN", "1099-NEC"]
    },
    "documentation": {
      "pdf": "i1099gi.pdf",
      "page": 5,
      "paragraph": "1.4",
      "excerpt": "An EIN is a nine-digit number...",
      "crossRefs": ["i1099ac.pdf#p2#§2.1"]
    },
    "examples": {
      "valid": ["12-3456789"],
      "invalid": ["12-345678", "123456789"]
    }
  }
}
```

## Acceptance Criteria

- User can toggle Teach Mode on/off
- Hovering over a field shows relevant instruction paragraph
- Taxonomy breadcrumb displays full path
- Cross-references link to other form instructions
- Valid/invalid examples display correctly
- Validation errors auto-trigger overlay
- Manual mappings work for critical fields (TCC, EIN, thresholds)
- AI retrieval works for complex queries
- Overlay positioning avoids viewport edge clipping

## Out of Scope

- Full PDF viewer integration (use existing PDF display)
- Natural language Q&A with manuals (future enhancement)
- User-contributed annotations
- Multi-language support

## Dependencies

- Existing: 1099 Wizard UI components
- Existing: IRS instruction PDFs in `docs/irs-forms/`
- Existing: Google GenAI integration
- New: Manual annotation file creation
