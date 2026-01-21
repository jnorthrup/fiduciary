/**
 * Overlay Positioning Logic
 *
 * Smart positioning algorithm for Teach Mode hover overlay with viewport edge detection.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Viewport extends Rect {}

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface EdgeDetection {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

export interface Position {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

const MOBILE_BREAKPOINT = 768;
const EDGE_THRESHOLD = 20;

/**
 * Detect which viewport edges the element is near.
 */
export function detectViewportEdge(
  element: Rect,
  viewport: Viewport
): EdgeDetection {
  return {
    top: element.y <= EDGE_THRESHOLD,
    right: element.x + element.width >= viewport.width - EDGE_THRESHOLD,
    bottom: element.y + element.height >= viewport.height - EDGE_THRESHOLD,
    left: element.x <= EDGE_THRESHOLD,
  };
}

/**
 * Calculate overlay position based on trigger element and viewport.
 */
export function calculateOverlayPosition(
  trigger: Rect,
  overlay: Rect,
  viewport: Viewport,
  safeArea?: SafeAreaInsets
): Position {
  // Mobile: full width, positioned below trigger
  if (viewport.width < MOBILE_BREAKPOINT) {
    return calculateMobilePosition(trigger, viewport, safeArea);
  }

  // Desktop: smart positioning based on available space
  return calculateDesktopPosition(trigger, overlay, viewport);
}

/**
 * Calculate position for desktop viewports.
 */
function calculateDesktopPosition(
  trigger: Rect,
  overlay: Rect,
  viewport: Viewport
): Position {
  const edges = detectViewportEdge(trigger, viewport);
  const gap = 8;

  let x = trigger.x + trigger.width + gap;
  let y = trigger.y;

  // Flip to left if near right edge
  if (edges.right) {
    x = trigger.x - overlay.width - gap;
  }

  // Adjust vertical position
  if (edges.top) {
    y = trigger.y + trigger.height; // Position below
  } else if (edges.bottom) {
    y = trigger.y - overlay.height; // Position above
  }

  // Keep within viewport bounds
  x = Math.max(gap, Math.min(x, viewport.width - overlay.width - gap));
  y = Math.max(gap, Math.min(y, viewport.height - overlay.height - gap));

  return { x, y };
}

/**
 * Calculate position for mobile viewports.
 */
function calculateMobilePosition(
  trigger: Rect,
  viewport: Viewport,
  safeArea?: SafeAreaInsets
): Position {
  const topPadding = safeArea?.top || 16;
  const bottomPadding = safeArea?.bottom || 16;

  // Full width with safe area insets
  const width = viewport.width - (safeArea?.left || 0) - (safeArea?.right || 0);
  const x = safeArea?.left || 0;

  // Position below trigger, but account for viewport height
  let y = trigger.y + trigger.height + 8;

  // If not enough space below, position above
  if (y + 200 > viewport.height - bottomPadding) {
    y = trigger.y - 208;
  }

  // Respect safe areas
  y = Math.max(topPadding, Math.min(y, viewport.height - 200 - bottomPadding));

  return { x, y, width };
}

/**
 * Get best position from list of candidates.
 */
export function getBestPosition(
  candidates: Position[],
  viewport: Viewport,
  overlaySize: Rect
): Position | null {
  for (const pos of candidates) {
    const fits =
      pos.x >= 0 &&
      pos.y >= 0 &&
      pos.x + overlaySize.width <= viewport.width &&
      pos.y + overlaySize.height <= viewport.height;

    if (fits) return pos;
  }

  // Return first candidate if none fit perfectly
  return candidates[0] || null;
}
