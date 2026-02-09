# Vite Feedback Loop Plugin

## Overview

The Vite Feedback Loop plugin provides **construction and observation** capabilities during development. It watches file changes, categorizes them, runs construction tasks, and provides real-time feedback via console and UI overlay.

## Features

- 🔍 **Observation**: Categorizes and logs file changes (components, services, server, types)
- 🔧 **Construction**: Runs analysis tasks on changed files
- 📊 **Metrics**: Tracks observations, constructions, timing, and category counts
- 🖥️ **UI Overlay**: WebSocket-powered overlay showing real-time feedback
- 🎯 **Custom Tasks**: Define your own construction tasks

## Usage

The plugin is already integrated into `vite.config.ts`. It runs automatically in development mode:

```bash
npm run dev
```

### Accessing the UI Overlay

While the dev server is running, open:
```
http://localhost:3000/feedback-overlay
```

### API Endpoints

- `GET /feedback-api/state` - Get current feedback loop state (JSON)

### WebSocket

Connect to `ws://localhost:3555/feedback-ws` for real-time updates.

## Console Output

```
[4:32:15 PM] 🔄 components  TextAnalysisVisualizer.tsx (762 lines, 26.4KB)
→ ✓ Component Counter: Found 3 components, 12 hooks
→ ✓ Complexity Analysis: Complexity: 45
```

## Construction Tasks

### Built-in Tasks

1. **Component Counter** - Counts React components and hooks
2. **Complexity Analysis** - Measures conditional complexity
3. **Export Validator** - Counts TypeScript exports
4. **Text Analysis Observer** - Analyzes text-analysis files

### Custom Tasks

Add custom tasks in `vite.config.ts`:

```typescript
import { feedbackLoop } from './vite-plugin-feedback-loop';

feedbackLoop({
  constructionTasks: [
    {
      name: 'My Custom Task',
      pattern: /\.tsx$/,
      construct: async (file, code) => {
        // Your analysis logic
        return {
          success: true,
          message: 'Analysis complete',
          metrics: { myMetric: 42 },
        };
      },
    },
  ],
})
```

## Configuration

```typescript
feedbackLoop({
  // Enable/disable (default: true)
  enabled: true,

  // WebSocket port for UI (default: 3555)
  wsPort: 3555,

  // File categorization patterns
  observePatterns: {
    components: /components\/.*\.(tsx|jsx)$/,
    services: /services\/.*\.ts$/,
    server: /server\/.*\.js$/,
    types: /types\/.*\.ts$/,
  },

  // Show UI overlay
  showOverlay: true,
})
```

## Build Summary

When you stop the dev server, a summary is printed:

```
📊 Feedback Loop Summary
────────────────────────────────
  Observations: 47
  Constructions: 156
  Avg Time: 23ms

Categories:
  • components: 12
  • services: 8
  • server: 15
  • types: 10
  • other: 2
```

## Examples

### Observing Text Analysis Files

When editing text-analysis files:
```
[4:32:15 PM] 🔄 server  lda-engine.js (390 lines, 11.0KB)
→ ✓ Text Analysis Observer: 5 functions, 23 arrows, 45 comments
```

### Component Development

When developing React components:
```
[4:33:22 PM] 🆕 components  MyComponent.tsx (124 lines, 3.2KB)
→ ✓ Component Counter: Found 1 components, 5 hooks
→ ✓ Complexity Analysis: Complexity: 12
```

## Type Definitions

```typescript
interface Observation {
  timestamp: number;
  file: string;
  type: 'create' | 'update' | 'delete';
  category: string;
  size: number;
  lines: number;
}

interface ConstructionResult {
  success: boolean;
  message: string;
  data?: any;
  errors?: string[];
  warnings?: string[];
  metrics?: Record<string, number>;
}
```

## Troubleshooting

**Overlay not showing?**
- Ensure dev server is running: `npm run dev`
- Check port 3555 is available
- Try accessing `http://localhost:3000/feedback-overlay` directly

**High memory usage?**
- Reduce observation history in plugin (slice(-100))
- Disable overlay: `showOverlay: false`
- Remove unused construction tasks
