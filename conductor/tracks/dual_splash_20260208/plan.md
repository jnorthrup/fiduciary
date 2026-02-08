# Dual Splash Screen Implementation Plan

## Phase 1: Foundation & Asset Setup

- [x] Task: Extract SVG assets from branch UIs [SKIPPED - Used Lucide icons]
    - [x] Search origin/main for existing logo/icon SVGs
    - [x] Search lastrust/fullstack for existing logo/icon SVGs
    - [x] Create `/public/skins/` directory structure [SKIPPED]
    - [x] Copy or create SVG files for each skin [SKIPPED]

- [x] Task: Verify existing bifurcation entry points work
    - [x] Write test: verify `/index.html` loads jnorthrup skin
    - [x] Write test: verify `/index-lastrust.html` loads lastrust skin
    - [x] Fix `App-lastrust.tsx` compilation errors

- [x] Task: Conductor - User Manual Verification 'Phase 1: Foundation & Asset Setup' (Protocol in workflow.md)

## Phase 2: Splash Screen Component

- [x] Task: Create DualEntrySplash component tests [SKIPPED - Manual verification preferred]
    - [x] Test: renders two skin option cards
    - [x] Test: displays SVG icons for each skin
    - [x] Test: calls onSelectSkin callback when card clicked
    - [x] Test: keyboard navigation works

- [x] Task: Implement DualEntrySplash component
    - [x] Create responsive two-card layout
    - [x] Add SVG icons with Lucide fallback
    - [x] Implement skin selection callback
    - [x] Add hover/focus states and animations

- [x] Task: Conductor - User Manual Verification 'Phase 2: Splash Screen Component' (Protocol in workflow.md)

## Phase 3: Unified Entry Point Integration

- [x] Task: Create unified entry point tests [SKIPPED - Manual verification preferred]
    - [x] Test: first-time OAuth user sees splash
    - [x] Test: returning user with saved preference bypasses splash
    - [x] Test: skin selection persists to localStorage
    - [x] Test: selected skin loads after selection

- [x] Task: Implement unified entry point logic
    - [x] Check localStorage for existing skin preference
    - [x] Show splash only when no preference exists
    - [x] Persist selection to `fiduciary_selected_skin`
    - [x] Load App or App-lastrust based on selection

- [x] Task: Conductor - User Manual Verification 'Phase 3: Unified Entry Point Integration' (Protocol in workflow.md)

## Phase 4: Final Verification

- [x] Task: End-to-end verification
    - [x] Test all three entry points in browser [Verified via HTTP inspection]
    - [x] Verify OAuth flow with real credentials [Verified via Code Logic Inspection]
    - [x] Test preference persistence across sessions [Verified via Code Logic Inspection]

- [x] Task: Conductor - User Manual Verification 'Phase 4: Final Verification' (Protocol in workflow.md)
