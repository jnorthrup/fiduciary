# Spec: Day/Night Capable Skins System

**Track ID:** `nightday_skins_20260124`
**Type:** Feature
**Status:** New
**Created:** 2026-01-24

---

## Overview

Three distinct UI skins, each with full light/dark mode support, user-selectable via profile toggle. Skins include: Mobile, QuickBooks-style, and Advanced Graph Layout.

---

## Requirements

### 1. Theme System (Day/Night for All Skins)

#### 1.1 Automatic Theme Detection
- Detect system preference via `prefers-color-scheme`
- Support manual theme override (light/dark/auto)
- Persist theme choice per user profile
- Smooth CSS transitions for theme changes

#### 1.2 Theme Tokens (Shared Across Skins)
```typescript
interface ThemeTokens {
  // Light mode
  light: {
    background: { primary, secondary, tertiary, elevated, surface };
    text: { primary, secondary, muted, inverse, disabled };
    border: { default, subtle, focus, error };
    accent: { primary, secondary, success, warning, error, info };
    status: { paid, pending, failed, reconciled, disputed };
  };
  // Dark mode
  dark: {
    // Same structure, dark values
  };
}
```

#### 1.3 Theme Provider
- Single theme provider for all skins
- Theme passed to all skin components
- CSS variables for theme values
- Automatic class switching on `<html>` or `<body>`

---

### 2. Skin System Architecture

#### 2.1 Skin Interface
```typescript
type SkinType = 'mobile' | 'quickbooks' | 'advanced-graph';

interface Skin {
  id: SkinType;
  name: string;
  description: string;
  icon: string;
  thumbnail: string;  // Preview image
  supports: {         // Feature support per skin
    responsive: boolean;
    graphs: boolean;
    tables: boolean;
    forms: boolean;
  };
}

interface UserProfile {
  userId: string;
  preferredSkin: SkinType;
  preferredTheme: 'light' | 'dark' | 'auto';
}
```

#### 2.2 Skin Registry
```typescript
const SKINS: Record<SkinType, Skin> = {
  mobile: {
    id: 'mobile',
    name: 'Mobile',
    description: 'Touch-optimized, bottom navigation, card layouts',
    icon: 'smartphone',
    thumbnail: '/skins/mobile-preview.png',
    supports: { responsive: true, graphs: false, tables: true, forms: true }
  },
  quickbooks: {
    id: 'quickbooks',
    name: 'QuickBooks Style',
    description: 'Traditional accounting layout, register views, sidebar nav',
    icon: 'book',
    thumbnail: '/skins/quickbooks-preview.png',
    supports: { responsive: true, graphs: true, tables: true, forms: true }
  },
  'advanced-graph': {
    id: 'advanced-graph',
    name: 'Advanced Graph',
    description: 'Data visualization focus, dashboard widgets, interactive charts',
    icon: 'bar-chart-2',
    thumbnail: '/skins/advanced-graph-preview.png',
    supports: { responsive: true, graphs: true, tables: true, forms: true }
  }
};
```

#### 2.3 Skin Provider
```typescript
interface SkinContextValue {
  skin: SkinType;
  theme: 'light' | 'dark';
  setSkin: (skin: SkinType) => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
}

const SkinProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Manages current skin and theme
  // Persists to user profile
  // Provides context to all components
};
```

---

### 3. Skin Selector UI

#### 3.1 Profile/Settings Integration
```typescript
interface SkinSelectorProps {
  position?: 'header' | 'settings' | 'modal';
  showThumbnails?: boolean;
}

// Skin selector component
<SkinSelector />

// Renders:
// - Option 1: [icon] Mobile     [thumbnail preview]
// - Option 2: [icon] QuickBooks [thumbnail preview]
// - Option 3: [icon] Advanced   [thumbnail preview]
//
// + Theme toggle: [○ Light] [○ Dark] [○ Auto]
```

#### 3.2 Quick Toggle (Header)
```typescript
// In header, next to API Console button
<SkinQuickToggle />
// Shows: [Skin dropdown] [Theme toggle]
```

#### 3.3 Settings Page
```typescript
// Full settings page with:
// - Larger thumbnails
// - Feature comparison table
// - "What each skin is best for" descriptions
// - Apply/Cancel buttons
```

---

## Skin Specifications

### 4. Mobile Skin

#### 4.1 Layout Characteristics
```typescript
interface MobileSkinLayout {
  navigation: 'bottom';           // Bottom tab bar
  header: 'compact';              // Minimal header
  content: 'full-width';          // No sidebars
  modals: 'fullscreen';           // Full-screen modals
  tables: 'card-view';            // Tables as cards on mobile
}
```

#### 4.2 Components
- **BottomNav:** Fixed bottom navigation (Home, Accounts, Entities, Settings)
- **MobileHeader:** Compact header with title, skin toggle, profile menu
- **CardView:** Tables rendered as swipeable cards on mobile
- **TouchActions:** Swipe gestures for edit/delete
- **MobileForm:** Stacked form fields, large touch targets (44px)

#### 4.3 Responsive Breakpoints
- Primary: < 768px (mobile)
- Adapts to: 768px+ (shows sidebars if available)

#### 4.4 Features
- Touch-optimized interactions
- Pull-to-refresh on data views
- Haptic feedback on actions
- Slide-over panels for secondary content
- Floating action buttons for primary actions

---

### 5. QuickBooks Skin

#### 5.1 Layout Characteristics
```typescript
interface QuickBooksSkinLayout {
  navigation: 'sidebar';          // Left sidebar navigation
  header: 'full';                 // Full header with toolbar
  content: 'split';               // Main + detail split view
  tables: 'register';             // Traditional register view
  forms: 'modal';                 // Forms in modal panels
}
```

#### 5.2 Components
- **SidebarNav:** Left sidebar with expandable sections
  - Dashboard
  - Banking
  - Expenses
  - Sales
  - Reports
  - Taxes
  - Settings
- **QBToolbar:** Top toolbar with actions (New, Refresh, Print, Export)
- **RegisterView:** Transaction register with running balance
- **SplitView:** Master-detail view for lists and details
- **QBForm:** Traditional form layout with left-aligned labels

#### 5.3 Visual Style
- Green accent color (#00A698) - QuickBooks brand
- Data tables with alternating row colors
- Traditional tab-based content switching
- Action buttons in top-right toolbar
- "New" button always visible and prominent

#### 5.4 Features
- Account register view (like Quicken/QuickBooks)
- Invoice-style forms
- Traditional navigation tree
- Print/PDF export prominent
- Keyboard shortcuts (Ctrl+N for new, etc.)

---

### 6. Advanced Graph Skin

#### 6.1 Layout Characteristics
```typescript
interface AdvancedGraphSkinLayout {
  navigation: 'hybrid';           // Sidebar + top tabs
  header: 'minimal';              // Minimal header, more data space
  content: 'grid';                // Grid-based widget layout
  tables: 'embedded';             // Tables in expandable widgets
  forms: 'overlay';               // Slide-over forms
}
```

#### 6.2 Components
- **DashboardGrid:** Masonry-style grid of widgets
- **ChartWidget:** Interactive charts with zoom, pan, drill-down
- **DataWidget:** Collapsible data panels
- **HybridNav:** Sidebar for main nav, tabs for sub-navigation
- **OverlayPanel:** Slide-over for details/forms

#### 6.3 Widget Types
```typescript
interface WidgetType {
  type: 'line-chart' | 'bar-chart' | 'pie-chart' | 'data-table' |
        'kpi-card' | 'heatmap' | 'scatter' | 'gauge' | 'treemap' |
        'funnel' | 'sankey' | 'timeline' | 'metric-comparison';
  title: string;
  size: 'small' | 'medium' | 'large' | 'wide';
  interactive: boolean;
  dataSource: string;
}
```

#### 6.4 Features
- Draggable/resizable widgets (optional)
- Interactive charts (hover, click, zoom)
- Real-time data updates
- Color-coded metrics
- Dark mode optimized for charts (better contrast)
- Export individual charts as PNG/PDF

---

### 7. Theme Implementation

#### 7.1 Color Systems
```typescript
// Light mode
const lightTheme = {
  background: {
    primary: '#ffffff',      // Main background
    secondary: '#f8fafc',    // Panel background
    tertiary: '#f1f5f9',     // Hover background
    elevated: '#ffffff',     // Raised surface (cards, modals)
    surface: '#e2e8f0'       // Input background
  },
  text: {
    primary: '#0f172a',      // Main text
    secondary: '#475569',    // Secondary text
    muted: '#94a3b8',        // Muted text
    inverse: '#ffffff',      // On dark backgrounds
    disabled: '#cbd5e1'      // Disabled text
  },
  // ... etc
};

// Dark mode
const darkTheme = {
  background: {
    primary: '#0f172a',      // Main background (slate-900)
    secondary: '#1e293b',    // Panel background (slate-800)
    tertiary: '#334155',     // Hover background (slate-700)
    elevated: '#1e293b',     // Raised surface
    surface: '#0f172a'       // Input background
  },
  text: {
    primary: '#f8fafc',      // Main text
    secondary: '#cbd5e1',    // Secondary text
    muted: '#64748b',        // Muted text
    inverse: '#0f172a',      // On light backgrounds
    disabled: '#475569'      // Disabled text
  },
  // ... etc
};
```

#### 7.2 CSS Variables
```css
:root {
  /* Applied to root for light mode */
  --bg-primary: #ffffff;
  --text-primary: #0f172a;
  /* ... all theme tokens */
}

[data-theme="dark"] {
  /* Override for dark mode */
  --bg-primary: #0f172a;
  --text-primary: #f8fafc;
  /* ... all theme tokens */
}
```

#### 7.3 Per-Skin Theme Overrides
```typescript
// Each skin can adjust theme values
const mobileSkinTheme = {
  ...baseTheme,
  // Mobile-specific adjustments
  colors: {
    ...baseTheme.colors,
    // Larger touch targets = more spacing
    spacing: { /* increased values */ }
  }
};

const quickbooksSkinTheme = {
  ...baseTheme,
  // QuickBooks green accent
  colors: {
    ...baseTheme.colors,
    accent: { ...baseTheme.colors.accent, primary: '#00A698' }
  }
};
```

---

### 8. Profile & Persistence

#### 8.1 User Profile Storage
```typescript
interface UserProfile {
  userId: string;
  preferences: {
    skin: SkinType;
    theme: 'light' | 'dark' | 'auto';
    customizations: {
      [skinId: string]: {
        // Skin-specific customizations
        dashboardLayout?: WidgetType[];  // For advanced-graph skin
        sidebarCollapsed?: boolean;       // For QuickBooks skin
        bottomNavLabels?: boolean;        // For mobile skin
      };
    };
  };
}
```

#### 8.2 Persistence Layer
- Store in user profile document
- Sync across devices (if using cloud profile)
- Default skin: `mobile` for new users
- Default theme: `auto` (system preference)

---

### 9. Component Compatibility

#### 9.1 Skin-Aware Components
All components must be skin-aware:
```typescript
interface ComponentProps {
  // Components accept className for skin-specific styling
  className?: string;
  // Components accept data-skin for conditional rendering
  'data-skin'?: SkinType;
}

// Example: Button component
<Button
  className={skin === 'mobile' ? 'btn-full-width' : 'btn-auto'}
  variant="primary"
>
  {label}
</Button>
```

#### 9.2 Responsive Components
- Components must work in all skins
- Components must respect skin layout constraints
- Components adapt to skin-specific navigation patterns

---

### 10. Migration Path

#### 10.1 Existing Dashboard
- Current Dashboard.tsx becomes default skin (QuickBooks-style)
- Add skin provider wrapper
- Add theme support
- Extract common components

#### 10.2 New Skins
- Mobile skin: Create new mobile-optimized layout
- Advanced-graph skin: Create widget-based layout
- Share components where possible

---

## Technical Constraints

- **Framework:** React with TypeScript
- **Styling:** Tailwind CSS with custom theme tokens
- **State:** Zustand for global state (skin, theme preferences)
- **Storage:** Persistence layer for user preferences
- **Icons:** Lucide React
- **Charts:** Recharts (for advanced-graph skin)

---

## Deliverables

1. Theme system with light/dark/auto modes
2. Skin provider and context
3. Skin selector component (settings + quick toggle)
4. Mobile skin with bottom navigation
5. QuickBooks skin with sidebar navigation
6. Advanced-graph skin with widget grid
7. Theme tokens for all skins
8. User profile persistence for skin/theme preferences
9. Component library compatible with all skins
10. Migration of existing Dashboard to skin system

---

## Dependencies

- Existing: `components/Dashboard.tsx` (refactor for skin system)
- Existing: `services/ledgerService.ts` (data source)
- Existing: `types/index.ts` (extend with skin types)
- New: `contexts/SkinContext.tsx` (skin provider)
- New: `contexts/ThemeContext.tsx` (theme provider)
- New: `components/skins/mobile/*` (mobile skin)
- New: `components/skins/quickbooks/*` (QuickBooks skin)
- New: `components/skins/advanced-graph/*` (advanced-graph skin)
- New: `components/ui/skin-selector/*` (skin selector)
- New: `hooks/useTheme.ts` (theme hook)
- New: `hooks/useSkin.ts` (skin hook)

---

## Success Criteria

- [ ] Theme switching works seamlessly (light/dark/auto)
- [ ] All 3 skins render correctly in both light and dark modes
- [ ] Skin selector allows switching between skins
- [ ] Skin preference persists across sessions
- [ ] Each skin has distinct layout and navigation
- [ ] All existing functionality works in all skins
- [ ] Mobile skin is touch-optimized
- [ ] QuickBooks skin matches traditional accounting layout
- [ ] Advanced-graph skin emphasizes data visualization
- [ ] WCAG 2.1 AA accessibility in all skins/themes
