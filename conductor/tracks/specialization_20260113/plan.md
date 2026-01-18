# Implementation Plan - Autofill & Account Graph Views

## Phase 1: Locate & Enhance Autofills
- [ ] **Task 1.1: Identify all "Fill" or "Autofill" logic in Wizards**
  - [ ] Review `IRIS1099Wizard.tsx`, `TenNinetyNineWizard.tsx`, and `BSOWizard.tsx`.
  - [ ] Identify hardcoded mock data used for filling (e.g., `123 Business Rd` in `TenNinetyNineWizard`).
  - [ ] Locate empty fields in taxonomy topics within JSON mappings (`i1099misc.json`).
- [ ] **Task 1.2: Generalize Autofill Logic**
  - [ ] Update `TenNinetyNineWizard` to use entity address data if available instead of hardcoded strings.
  - [ ] Update `BSOWizard` to prioritize `entity.einLast4` more effectively.
  - [ ] Implement a "Sync from Entity" button in `IRIS1099Wizard` filler step.

## Phase 2: Specialize Account-Entity Graph
- [ ] **Task 2.1: Update `FractalViewer.tsx` to include Accounts as nodes**
  - [ ] Modify the `useMemo` block in `FractalViewer.tsx` to generate nodes for `accounts`.
  - [ ] Create links between each `Account` node and its corresponding `Entity` node (using `entityId`).
  - [ ] Assign separate "swimlanes" or visual styles for Accounts to distinguish them from Entities.
- [ ] **Task 2.2: Implement Account Relationship Visualization**
  - [ ] Add account-specific icons and colors (e.g., green for Assets, red for Liabilities).
  - [ ] Ensure account nodes are only shown when "High Fidelity" zoom is active or when their parent Entity is expanded.

## Phase 3: Provide D3 Chart Views
- [ ] **Task 3.1: Add Chart Overlay to Fractal Viewer**
  - [ ] Create a new `EntityChartOverlay` component using D3.
  - [ ] Visualize account balance distribution (e.g., a mini bar chart or pie chart) when an entity is selected.
- [ ] **Task 3.2: System-wide Financial Dashboard View**
  - [ ] Integrate a "Financials" chart view into `SystemOverview.tsx` showing total Assets vs Liabilities over the whole graph.
  - [ ] Use D3 to render responsive, high-fidelity SVG charts.

## Phase 4: Validation & Quality Gate
- [ ] Verify that all new visualization features are performant with >100 accounts.
- [ ] Ensure "Fill Sample Data" functions correctly across all wizards.
- [ ] Confirm no regressions in existing entity graph functionality.
