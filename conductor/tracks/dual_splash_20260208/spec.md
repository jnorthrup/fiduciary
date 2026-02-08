# Dual Splash Screen Specification

## Overview
Create a unified entry point with a dual-skin splash screen that appears after first-time Google OAuth authentication. Users select between the "jnorthrup" (Trust Ledger Classic) and "lastrust" (Personal Finance) UI skins. The choice is persisted and subsequent logins proceed directly to the selected skin.

## Functional Requirements

### FR-1: OAuth-Triggered Splash
- Splash screen displays only on first successful Google OAuth login
- If skin preference exists in localStorage, bypass splash and load saved skin
- Persist user's skin selection to `localStorage` key `fiduciary_selected_skin`

### FR-2: Skin Selection UI
- Display two selectable cards side-by-side (responsive stacking on mobile)
- Each card includes:
  - SVG logo/icon (extract from branch assets or Lucide fallback)
  - Skin name ("Trust Ledger Classic" vs "Personal Finance")
- Cards have hover/focus states with visual feedback
- Selection immediately loads the chosen skin

### FR-3: Preserve Existing Entry Points
- `/index.html` → Loads jnorthrup skin directly (bypass splash)
- `/index-lastrust.html` → Loads lastrust skin directly (bypass splash)
- `/index-unified.html` → OAuth → Splash → Selected skin
- All three entry points configured in `vite.config.ts`

### FR-4: Asset Management
- Extract existing SVG assets from each branch if present
- Use Lucide React icons (`Building2`, `Sparkles`) as fallback if SVGs unavailable
- Store skin-specific assets in `/public/skins/` directory

## Non-Functional Requirements
- Splash must load in <500ms after OAuth completes
- Mobile-responsive layout (cards stack vertically on small screens)
- Accessible: keyboard navigation, proper ARIA labels

## Acceptance Criteria
- [ ] First-time OAuth user sees splash with two skin options
- [ ] Selecting a skin persists choice and loads that skin
- [ ] Returning user (with saved preference) bypasses splash
- [ ] Direct URLs to `/index.html` and `/index-lastrust.html` work
- [ ] Both skins load without errors from unified entry

## Out of Scope
- Settings page to change skin preference (future track)
- Additional skins beyond jnorthrup/lastrust
- OAuth provider choice (Google-only for now)
