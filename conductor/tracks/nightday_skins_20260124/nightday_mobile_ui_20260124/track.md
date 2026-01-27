# Night/Day Mobile UI with Quicken-Style Features

**Track ID:** `nightday_mobile_ui_20260124`
**Status:** New
**Created:** 2026-01-24

---

## Quick Summary

Mobile-first responsive UI with automatic dark/light mode switching and Quicken-inspired financial management features. Built on reusable UI skeleton components.

---

## Key Deliverables

1. **Theme System** - Light/dark mode with system preference detection
2. **Responsive Layouts** - Mobile-first design (xs to xxl breakpoints)
3. **UI Skeleton Components** - Reusable component library (forms, data display, navigation)
4. **Quicken-Style Register** - Transaction list with swipe actions, running balance
5. **Dashboard Widgets** - Balance cards, spending charts, upcoming bills, budgets
6. **Mobile Transaction Entry** - Optimized input with number pad, smart defaults
7. **Reports & Analytics** - Spending trends, income vs expense, category breakdown
8. **Bill Pay & Reminders** - Bill list, calendar, push notifications
9. **Component Documentation** - Storybook with all components
10. **Accessibility & Performance** - WCAG 2.1 AA, Lighthouse targets

---

## Documents

- [Spec](./spec.md) - Full requirements specification
- [Plan](./plan.md) - Implementation phases with tasks

---

## Phases Overview

| Phase | Description | Priority |
|-------|-------------|----------|
| 1 | Theme System Foundation | P0 |
| 2 | Responsive Layout System | P0 |
| 3 | Common UI Skeleton Components | P0 |
| 4 | Mobile Dashboard | P1 |
| 5 | Quicken-Style Account Register | P0 |
| 6 | Mobile Transaction Entry | P0 |
| 7 | Reports & Analytics | P1 |
| 8 | Bill Pay & Reminders | P2 |
| 9 | Account Management | P1 |
| 10 | Component Documentation | P2 |
| 11 | Accessibility & Performance | P0 |

---

## Technical Stack

- React with TypeScript
- Tailwind CSS with custom theme tokens
- Zustand for state management
- React Router v7
- React Hook Form + Zod
- Recharts for charts
- Lucide React icons
- Vitest + Testing Library

---

## Status

**All tasks pending.** Track created 2026-01-24.

---

## Notes

- Touch targets must be ≥44×44px on mobile
- Bottom navigation for mobile (< 768px), top nav for desktop
- Swipe gestures for transaction actions (edit/delete)
- Theme tokens drive all color/styling decisions
- Components must support light/dark mode from day one
