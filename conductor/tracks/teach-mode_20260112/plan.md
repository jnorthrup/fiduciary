# Implementation Plan: Teach Mode Paragraph Activation

## Phase 1: Data Layer & Taxonomy Structure

### 1.1 Manual Annotation Data Structure
- [~] Task: Write tests for field mapping data structure
  - [x] Sub-task: Write failing tests for manual mapping schema validation
  - [x] Sub-task: Implement manual mapping JSON schema with TypeScript types
  - [ ] Sub-task: Write failing tests for taxonomy path resolution
  - [ ] Sub-task: Implement taxonomy breadcrumb generation
- [x] Task: Write tests for cross-reference resolution
  - [x] Sub-task: Write failing tests for PDF link parsing
  - [x] Sub-task: Implement cross-reference data structure
  - [x] Sub-task: Write failing tests for circular reference detection
  - [x] Sub-task: Implement reference cycle detection

### 1.2 AI Retrieval Integration
- [ ] Task: Write tests for GenAI paragraph retrieval
  - [ ] Sub-task: Write failing tests for PDF content query interface
  - [ ] Sub-task: Implement GenAI semantic matching service
  - [ ] Sub-task: Write failing tests for caching retrieved paragraphs
  - [ ] Sub-task: Implement paragraph cache with TTL
- [ ] Task: Write tests for hybrid fallback strategy
  - [ ] Sub-task: Write failing tests for manual lookup before AI
  - [ ] Sub-task: Implement hybrid resolution with fallback
  - [ ] Sub-task: Write failing tests for AI failure handling
  - [ ] Sub-task: Implement graceful degradation to generic help

### 1.3 Example Data Management
- [ ] Task: Write tests for example validation
  - [ ] Sub-task: Write failing tests for valid/invalid example format
  - [ ] Sub-task: Implement example data schema
  - [ ] Sub-task: Write failing tests for example rendering
  - [ ] Sub-task: Implement example display component logic

- [ ] Task: Conductor - User Manual Verification 'Phase 1: Data Layer & Taxonomy Structure' (Protocol in workflow.md)

## Phase 2: Teach Mode UI Components

### 2.1 Teach Mode Toggle
- [ ] Task: Write tests for Teach Mode toggle component
  - [ ] Sub-task: Write failing tests for toggle state management
  - [ ] Sub-task: Implement toggle switch with persistence
  - [ ] Sub-task: Write failing tests for toggle state across wizard steps
  - [ ] Sub-task: Implement localStorage persistence for toggle state
- [ ] Task: Write tests for visual indicator when Teach Mode active
  - [ ] Sub-task: Write failing tests for indicator rendering
  - [ ] Sub-task: Implement active state badge/icon

### 2.2 Hover Overlay Panel
- [ ] Task: Write tests for overlay positioning logic
  - [ ] Sub-task: Write failing tests for viewport edge detection
  - [ ] Sub-task: Implement smart positioning algorithm
  - [ ] Sub-task: Write failing tests for mobile responsive positioning
  - [ ] Sub-task: Implement mobile-aware position calculation
- [ ] Task: Write tests for overlay content rendering
  - [ ] Sub-task: Write failing tests for paragraph excerpt display
  - [ ] Sub-task: Implement excerpt component with highlighting
  - [ ] Sub-task: Write failing tests for taxonomy breadcrumb display
  - [ ] Sub-task: Implement breadcrumb navigation component
  - [ ] Sub-task: Write failing tests for cross-reference link rendering
  - [ ] Sub-task: Implement cross-reference links
  - [ ] Sub-task: Write failing tests for example data display
  - [ ] Sub-task: Implement example code/data blocks
- [ ] Task: Write tests for overlay interaction
  - [ ] Sub-task: Write failing tests for hover delay timing
  - [ ] Sub-task: Implement configurable hover delay (default 300ms)
  - [ ] Sub-task: Write failing tests for overlay close behavior
  - [ ] Sub-task: Implement close button and click-outside handling
  - [ ] Sub-task: Write failing tests for keyboard navigation
  - [ ] Sub-task: Implement ESC to close, arrow key navigation

### 2.3 Field Integration
- [ ] Task: Write tests for form field hover detection
  - [ ] Sub-task: Write failing tests for field identification
  - [ ] Sub-task: Implement field-to-mapping resolver
  - [ ] Sub-task: Write failing tests for field state tracking
  - [ ] Sub-task: Implement hover state manager
- [ ] Task: Write tests for conditional overlay display
  - [ ] Sub-task: Write failing tests for Teach Mode gate
  - [ ] Sub-task: Implement teach-mode-only overlay logic
  - [ ] Sub-task: Write failing tests for field-without-mapping handling
  - [ ] Sub-task: Implement graceful handling of unmapped fields

- [ ] Task: Conductor - User Manual Verification 'Phase 2: Teach Mode UI Components' (Protocol in workflow.md)

## Phase 3: Validation Rule Integration

### 3.1 Rule Auto-Trigger
- [ ] Task: Write tests for validation rule to overlay binding
  - [ ] Sub-task: Write failing tests for rule-fired event handling
  - [ ] Sub-task: Implement rule event listener integration
  - [ ] Sub-task: Write failing tests for overlay auto-display on error
  - [ ] Sub-task: Implement auto-show logic for validation failures
- [ ] Task: Write tests for error-specific context display
  - [ ] Sub-task: Write failing tests for error code to mapping resolution
  - [ ] Sub-task: Implement error-context retrieval
  - [ ] Sub-task: Write failing tests for error highlight in overlay
  - [ ] Sub-task: Implement error-specific paragraph highlighting

### 3.2 Form Wizard Integration
- [ ] Task: Write tests for IRIS1099Wizard Teach Mode integration
  - [ ] Sub-task: Write failing tests for Teach Mode prop passing
  - [ ] Sub-task: Implement Teach Mode context provider
  - [ ] Sub-task: Write failing tests for step-level Teach Mode state
  - [ ] Sub-task: Implement per-step Teach Mode awareness
- [ ] Task: Write tests for existing validation hook integration
  - [ ] Sub-task: Write failing tests for validation + overlay coordination
  - [ ] Sub-task: Implement combined validation-overlay flow
  - [ ] Sub-task: Write failing tests for overlay dismissal on fix
  - [ ] Sub-task: Implement auto-dismiss when field corrected

- [ ] Task: Conductor - User Manual Verification 'Phase 3: Validation Rule Integration' (Protocol in workflow.md)

## Phase 4: Manual Annotation Creation

### 4.1 Critical Field Mappings
- [ ] Task: Create manual annotation file for 1099-NEC
  - [ ] Sub-task: Map TCC format field to instructions
  - [ ] Sub-task: Map EIN format field to instructions
  - [ ] Sub-task: Map payment threshold fields to instructions
  - [ ] Sub-task: Map payee count limit to instructions
  - [ ] Sub-task: Add valid/invalid examples for each field
- [ ] Task: Create manual annotation file for 1099-MISC
  - [ ] Sub-task: Map rent/royalty threshold fields
  - [ ] Sub-task: Map specific box requirements
  - [ ] Sub-task: Add examples for rent/royalty scenarios
- [ ] Task: Create cross-reference mappings between forms
  - [ ] Sub-task: Link 1099-NEC to 1099-MISC related sections
  - [ ] Sub-task: Link to general instructions (i1099gi.pdf)

### 4.2 Process & Topic Taxonomy Population
- [ ] Task: Define process-based taxonomy
  - [ ] Sub-task: Create Preparation stage mappings
  - [ ] Sub-task: Create Validation stage mappings
  - [ ] Sub-task: Create Submission stage mappings
- [ ] Task: Define topic-based taxonomy
  - [ ] Sub-task: Create Thresholds topic mappings
  - [ ] Sub-task: Create TIN Format topic mappings
  - [ ] Sub-task: Create Payee Rules topic mappings
  - [ ] Sub-task: Create Filer Requirements topic mappings

- [ ] Task: Conductor - User Manual Verification 'Phase 4: Manual Annotation Creation' (Protocol in workflow.md)

## Phase 5: Performance & Polish

### 5.1 Performance Optimization
- [ ] Task: Write tests for overlay render performance
  - [ ] Sub-task: Write failing tests for <100ms render requirement
  - [ ] Sub-task: Implement overlay memoization
  - [ ] Sub-task: Write failing tests for paragraph cache hit rates
  - [ ] Sub-task: Implement aggressive caching strategy
- [ ] Task: Write tests for AI retrieval performance
  - [ ] Sub-task: Write failing tests for <500ms retrieval requirement
  - [ ] Sub-task: Implement request debouncing
  - [ ] Sub-task: Write failing tests for concurrent request handling
  - [ ] Sub-task: Implement request queuing

### 5.2 Accessibility & Mobile
- [ ] Task: Write tests for keyboard navigation
  - [ ] Sub-task: Write failing tests for tab-to-overlay behavior
  - [ ] Sub-task: Implement focus trap in overlay
  - [ ] Sub-task: Write failing tests for screen reader announcements
  - [ ] Sub-task: Implement ARIA labels and live regions
- [ ] Task: Write tests for mobile responsive behavior
  - [ ] Sub-task: Write failing tests for mobile overlay positioning
  - [ ] Sub-task: Implement mobile-specific layout adjustments
  - [ ] Sub-task: Write failing tests for touch interaction
  - [ ] Sub-task: Implement touch-friendly overlay behavior

### 5.3 Visual Polish
- [ ] Task: Implement visual design for overlay
  - [ ] Sub-task: Design header, content, footer sections
  - [ ] Sub-task: Apply color coding for info/warning/error
  - [ ] Sub-task: Add smooth transitions/animations
  - [ ] Sub-task: Style breadcrumb navigation
  - [ ] Sub-task: Style example code blocks
- [ ] Task: Implement Teach Mode toggle design
  - [ ] Sub-task: Design toggle switch component
  - [ ] Sub-task: Add active state indicator styling
  - [ ] Sub-task: Ensure visibility in wizard header

- [ ] Task: Conductor - User Manual Verification 'Phase 5: Performance & Polish' (Protocol in workflow.md)
