# Day/Night Capable Skins System

**Track ID:** `nightday_skins_20260124`
**Status:** New
**Created:** 2026-01-24

---

## Quick Summary

Three day-night capable skins (mobile, QuickBooks, advanced graph layout) with UI toggle for profile selection. Skin adjustments are **profile-resident with full CRUD operations**.

---

## Key Deliverables

1. **Theme System** - Light/dark/auto modes with CSS variables
2. **Skin System** - 3 skins with profile-resident CRUD
3. **Skin Selector** - UI toggle for profile selection of skin/theme
4. **Mobile Skin** - Bottom nav, touch-optimized, card views
5. **QuickBooks Skin** - Sidebar nav, register views, green accent
6. **Advanced Graph Skin** - Widget grid, interactive charts
7. **Profile CRUD** - Full CRUD for skin preferences per user
8. **Component Library** - Shared components compatible with all skins
9. **Migration** - Refactor existing Dashboard as QuickBooks skin

---

## Documents

- [Spec](./spec.md) - Full requirements with skin specifications
- [Plan](./plan.md) - 11 implementation phases

---

## Skin System Architecture

```typescript
// Profile-resident skin configuration
interface UserProfileSkinConfig {
  userId: string;
  skinConfig: {
    currentSkin: 'mobile' | 'quickbooks' | 'advanced-graph';
    theme: 'light' | 'dark' | 'auto';
    customizations: {
      mobile?: {
        bottomNavLabels: boolean;
        cardViewEnabled: boolean;
      };
      quickbooks?: {
        sidebarCollapsed: boolean;
        registerViewDensity: 'comfortable' | 'compact' | 'spacious';
      };
      advancedGraph?: {
        dashboardLayout: WidgetConfig[];
        widgetsCollapsible: boolean;
      };
    };
  };
  // CRUD operations on this config
}
```

**CRUD Operations:**
- **CREATE:** Initialize default skin config for new users
- **READ:** Load skin config on login/session
- **UPDATE:** Save skin/theme changes, customizations
- **DELETE:** Reset to defaults, remove customizations

---

## The 3 Skins

| Skin | Layout | Navigation | Best For |
|------|--------|------------|----------|
| **Mobile** | Full-width, stacked | Bottom tab bar | Touch devices, quick access |
| **QuickBooks** | Sidebar + content | Left sidebar tree | Traditional accounting, register views |
| **Advanced Graph** | Widget grid | Hybrid (sidebar + tabs) | Data visualization, dashboards |

All 3 skins support: **Light mode, Dark mode, Auto (system preference)**

---

## Profile-Resident CRUD Requirements

### CREATE (Initialize)
```typescript
// POST /api/users/{userId}/skin-config
// Default for new users
{
  currentSkin: 'mobile',
  theme: 'auto',
  customizations: { /* defaults for each skin */ }
}
```

### READ (Load)
```typescript
// GET /api/users/{userId}/skin-config
// Returns current skin config
// Applied on app load via SkinProvider
```

### UPDATE (Save)
```typescript
// PATCH /api/users/{userId}/skin-config
{
  currentSkin: 'quickbooks',  // Skin change
  theme: 'dark',              // Theme change
  customizations: {
    quickbooks: {
      sidebarCollapsed: true  // Per-skin customization
    }
  }
}
```

### DELETE (Reset)
```typescript
// DELETE /api/users/{userId}/skin-config
// Resets to factory defaults
```

---

## Phases Overview

| Phase | Description | Priority |
|-------|-------------|----------|
| 1 | Theme System Foundation | P0 |
| 2 | Skin System Architecture | P0 |
| 3 | Skin Selector UI | P0 |
| 4 | Mobile Skin | P0 |
| 5 | QuickBooks Skin | P0 |
| 6 | Advanced Graph Skin | P1 |
| 7 | Component Compatibility | P0 |
| 8 | Theme Implementation | P0 |
| 9 | **Profile CRUD Integration** | P0 |
| 10 | Accessibility & Performance | P0 |
| 11 | Migration & Rollout | P1 |

---

## Tech Stack

- React, TypeScript, Tailwind CSS
- Zustand (skin/theme state)
- Persistence layer (profile CRUD)
- Recharts (advanced-graph skin)

---

## Status

**All tasks pending.** Track created 2026-01-24.

---

## Notes

- Profile-resident: All skin/customization data stored in user profile
- CRUD: Full Create/Read/Update/Delete for skin config
- Per-skin customizations stored in profile.customizations[skinId]
- Default skin for new users: `mobile`
- Default theme for new users: `auto` (system preference)
