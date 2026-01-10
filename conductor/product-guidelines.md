# Product Guidelines: Trust Ledger System

## Communication Principles

### Tone and Voice
The application maintains a **professional, clinical, and direct** communication style. Fiduciary professionals value precision over enthusiasm. The interface should convey:

- **Facts over feelings**: Report status, errors, and information without emotional language
- **Directness over reassurance**: State what is happening, what is needed, and what the outcome is
- **Clarity over marketing**: Avoid promotional language; describe function and purpose plainly

#### Prohibited Language Patterns
- Do not use phrases like "I will help you", "Let me assist", "We're working together"
- No encouraging language or praise ("Great job!", "You're doing great")
- No unsolicited explanations of basic concepts
- No apologies unless an actual error occurred
- No safety theater in technical responses

#### Required Language Patterns
- State facts and observations directly
- Report actual errors and blockers immediately
- Ask specific questions when genuinely ambiguous
- Execute without preamble when task is clear
- Say "I do not know" when uncertain

### Error Messaging
Errors are reported with:
1. **What happened**: Specific error description
2. **Why it matters**: Impact on workflow or compliance
3. **What to do**: Next steps to resolve

Example:
```
Error: Entity creation failed - jurisdiction not recognized
Impact: Compliance rules cannot be applied without valid jurisdiction
Action: Select from: [List of supported jurisdictions] or contact administrator
```

## Visual Identity

### Design Philosophy
The interface follows a **functional minimalism** approach:

- **Data density over whitespace**: Fiduciary professionals need to see multiple data points simultaneously
- **Typography-driven hierarchy**: Use font weight, size, and spacing to establish relationships
- **Subtle visual cues**: Color used sparingly for status indicators, not decoration

### Color System
- **Neutral base**: Grays for structure and content (avoiding pure black/white)
- **Status colors**: Reserved for specific states only
  - Red: Critical errors, compliance failures
  - Amber: Warnings, pending actions
  - Green: Completed, verified, compliant
  - Blue: Informational, in-progress
- **No emotional colors**: Avoid purple, pink, orange in primary UI elements

### Typography
- **Primary**: System sans-serif fonts (SF Pro, Inter, Segoe UI) for maximum legibility
- **Monospace**: For entity IDs, legal references, data fields requiring precise alignment
- **Hierarchy established through**: Size (14px base), weight (400/500/600), letter spacing

## Interaction Patterns

### Workflow Design
1. **Progressive disclosure**: Show only relevant information for current task
2. **Immediate feedback**: Every action produces a visible result within 100ms
3. **Reversible actions**: Critical operations require confirmation but can be undone
4. **Keyboard accessibility**: All workflows navigable via keyboard for efficiency

### Form Design
- **Above-the-fold validation**: Errors shown immediately, not after submission
- **Contextual help**: Field-specific guidance shown inline, not in separate modals
- **Autosave**: All forms auto-save to prevent data loss
- **Bulk operations**: XLSX upload for batch entity creation/modification

### Data Display
- **Tables over cards**: Dense tabular data preferred for entity lists
- **Sortable, filterable, exportable**: Every data table supports these operations
- **Visualizations for relationships**: D3.js and Mermaid for entity relationship graphs
- **Pagination**: Default to 50 rows per page for balance of context vs performance

## Accessibility Standards

### WCAG 2.1 AA Compliance
- Color contrast minimum 4.5:1 for normal text
- All interactive elements have visible focus indicators
- Forms properly labeled with associated field descriptions
- Data tables have proper headers and captions

### Screen Reader Support
- Entity status communicated via aria-live regions
- Error messages announced immediately when they appear
- Graph visualizations include text alternatives
- Dynamic content updates properly signaled

## Content Standards

### Legal and Compliance References
- **Precise citation**: All legal references include jurisdiction, statute, and section
- **Linkability**: Every reference is clickable and opens in external documentation
- **Version tracking**: Compliance rules include effective dates and last updated timestamps

### Data Presentation
- **Currency formatting**: Always show currency symbol and precision (e.g., $1,234.56)
- **Date formatting**: ISO 8601 (YYYY-MM-DD) for data, localized display for UI
- **Entity identifiers**: Display full ID, allow copy-to-clipboard action
- **Percentages**: Show with % symbol, never decimal alone (e.g., "75%", not "0.75")

## Performance Expectations

### Response Time Targets
- **Page load**: < 2 seconds for initial render
- **API responses**: < 500ms for CRUD operations
- **Search/filter**: < 300ms for results
- **Document processing**: < 5 seconds for standard DOCX/XLSX files

### Loading States
- **Skeleton screens**: Show content structure during data fetch
- **Progress indicators**: For long-running operations (AI analysis, bulk imports)
- **Optimistic updates**: Assume success for local actions, rollback on failure

## Security and Privacy

### Data Handling
- **No data persistence in client localStorage**: Use secure backend storage only
- **Audit logging**: Every data change logged with user, timestamp, and reason
- **PII protection**: Sensitive data masked in UI unless explicitly revealed
- **Session timeout**: 30 minutes of inactivity triggers secure logout

### Compliance Display
- **Jurisdiction badges**: Show applicable compliance frameworks per entity
- **Last verified dates**: Display when compliance was last checked
- **Action required alerts**: Prominently display approaching compliance deadlines
