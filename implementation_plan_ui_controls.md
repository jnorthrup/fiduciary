# Implementation Plan - Advanced UI Controls (Full Screen Graph & Mobile Mode)

## Objective
Add professional-grade triggers for "Full Screen Graph" (Lattice Visualizer) and "QuickBooks Mobile Mode" to the main application interface. Ensure all "main branch and split tree" fractal use cases are accessible and prioritized in the most advanced version of the software.

## Proposed Changes

### 1. `App.tsx` (Core Shell Coordination)
- Add `fullScreenGraph` boolean state.
- Update `layoutMode` logic to conditionally render `MobileQuickBooksLayout` based on `store.settings.layoutMode`.
- Implement a global overlay/view for the "Full Screen Graph" that uses the `FractalViewer`.

### 2. `Sidebar.tsx` (Primary Navigation)
- Add "Lattice Visualizer" (Graph) button in the "System Resources" section.
- Add "Mobile Interface" toggle in the sidebar or under "Node Settings".
- Add "Main Branch & Split Trees" label or tooltip for the graph button to emphasize the hierarchical focus.

### 3. `Dashboard.tsx` (Entity Dashboard)
- Add "Open Lattice Graph" button in the header for quick access to the entity's position in the global structure.

### 4. `SystemOverview.tsx` (Global Dashboard)
- Enhance the current "Visualizer" button to support a "Full Screen" mode if requested.

### 5. `services/ledgerService.ts`
- Add a method/action to toggle `layoutMode` between 'Desktop' and 'MobileQuickBooks'.

## Advanced Version Features
- Ensure `FractalViewer` is configured for maximum detail when in full-screen mode (`isHighFidelity` threshold).
- Verify that the "split tree" logic (parent-child entity relationships) is correctly reflected in the lattice graph.

## Verification
- Toggle Mobile Mode and verify the QuickBooks-style layout appears.
- Click Full Screen Graph and verify it covers the entire viewport with the D3 lattice simulation.
- Verify that deep hierarchies (main branch + splits) are navigable in the graph.
