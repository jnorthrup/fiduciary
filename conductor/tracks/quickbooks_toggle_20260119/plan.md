# Implementation Plan: QuickBooks Sidebar Toggle

## Overview
Add a dedicated, explicitly labeled "QuickBooks Mode" toggle in the sidebar (hamburger menu) to allow users to switch between the default "Institutional" view and the "Mobile QuickBooks" view.

## Proposed Changes

### [Frontend Components]

#### [Sidebar.tsx](file:///Users/jim/work/fiduciary/components/Sidebar.tsx)
- Insert a new `NavItem` under "System Resources".
- Rename existing "Mobile Interface" to "QuickBooks Mode".
- Use `LayoutDashboard` icon with a distinct color (e.g., emerald or indigo).

### [State Management]

#### [ledgerService.ts](file:///Users/jim/work/fiduciary/services/ledgerService.ts)
- Already has `toggleLayoutMode` which alternates between `Standard` and `MobileQuickBooks`.
- Verify `Standard` is the correct default mode.

## Verification Plan

### Manual Verification
- Open the hamburger menu.
- Locate the "QuickBooks Mode" toggle.
- Toggle it and verify the UI switches to the QuickBooks layout.
- Toggle it back and verify the UI returns to the Institutional layout.
- Verify persistence (refresh page if persistent storage is used).
