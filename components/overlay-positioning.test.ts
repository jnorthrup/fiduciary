/**
 * Overlay Positioning Tests
 *
 * Tests for Teach Mode hover overlay positioning with viewport edge detection.
 */

import { describe, it, expect } from 'vitest';
import {
  Position,
  calculateOverlayPosition,
  detectViewportEdge,
  getBestPosition,
} from './overlay-positioning';

describe('Viewport Edge Detection', () => {
  it('should detect when element is near right edge', () => {
    const viewport = { width: 1000, height: 800 };
    const element = { x: 900, y: 100, width: 100, height: 50 };

    const result = detectViewportEdge(element, viewport);

    expect(result.right).toBe(true);
  });

  it('should detect when element is near left edge', () => {
    const viewport = { width: 1000, height: 800 };
    const element = { x: 10, y: 100, width: 100, height: 50 };

    const result = detectViewportEdge(element, viewport);

    expect(result.left).toBe(true);
  });

  it('should detect when element is near bottom edge', () => {
    const viewport = { width: 1000, height: 800 };
    const element = { x: 100, y: 750, width: 100, height: 50 };

    const result = detectViewportEdge(element, viewport);

    expect(result.bottom).toBe(true);
  });

  it('should detect when element is near top edge', () => {
    const viewport = { width: 1000, height: 800 };
    const element = { x: 100, y: 10, width: 100, height: 50 };

    const result = detectViewportEdge(element, viewport);

    expect(result.top).toBe(true);
  });

  it('should return no edges when element is centered', () => {
    const viewport = { width: 1000, height: 800 };
    const element = { x: 400, y: 300, width: 200, height: 200 };

    const result = detectViewportEdge(element, viewport);

    expect(result).toEqual({
      top: false,
      right: false,
      bottom: false,
      left: false,
    });
  });
});

describe('Smart Position Calculation', () => {
  it('should position overlay to right of element by default', () => {
    const trigger = { x: 100, y: 100, width: 50, height: 30 };
    const overlay = { width: 200, height: 150 };
    const viewport = { width: 1000, height: 800 };

    const result = calculateOverlayPosition(trigger, overlay, viewport);

    expect(result.x).toBeGreaterThan(trigger.x + trigger.width);
    expect(result.y).toBeCloseTo(trigger.y, 0);
  });

  it('should position overlay to left when near right edge', () => {
    const trigger = { x: 850, y: 100, width: 50, height: 30 };
    const overlay = { width: 200, height: 150 };
    const viewport = { width: 1000, height: 800 };

    const result = calculateOverlayPosition(trigger, overlay, viewport);

    expect(result.x).toBeLessThan(trigger.x);
  });

  it('should position overlay above when near bottom edge', () => {
    const trigger = { x: 100, y: 700, width: 50, height: 30 };
    const overlay = { width: 200, height: 150 };
    const viewport = { width: 1000, height: 800 };

    const result = calculateOverlayPosition(trigger, overlay, viewport);

    expect(result.y).toBeLessThan(trigger.y);
  });

  it('should position overlay below when near top edge', () => {
    const trigger = { x: 100, y: 20, width: 50, height: 30 };
    const overlay = { width: 200, height: 150 };
    const viewport = { width: 1000, height: 800 };

    const result = calculateOverlayPosition(trigger, overlay, viewport);

    expect(result.y).toBeGreaterThanOrEqual(trigger.y + trigger.height);
  });
});

describe('Mobile Responsive Positioning', () => {
  it('should use full width on mobile viewport', () => {
    const trigger = { x: 10, y: 100, width: 50, height: 30 };
    const overlay = { width: 300, height: 200 };
    const viewport = { width: 375, height: 667 }; // iPhone size

    const result = calculateOverlayPosition(trigger, overlay, viewport);

    expect(result.x).toBe(0);
    expect(result.width).toBe(viewport.width);
  });

  it('should position overlay at bottom on mobile', () => {
    const trigger = { x: 10, y: 100, width: 50, height: 30 };
    const overlay = { width: 300, height: 200 };
    const viewport = { width: 375, height: 667 };

    const result = calculateOverlayPosition(trigger, overlay, viewport);

    expect(result.y).toBeGreaterThan(trigger.y);
  });

  it('should respect safe area insets on mobile', () => {
    const trigger = { x: 10, y: 100, width: 50, height: 30 };
    const overlay = { width: 300, height: 200 };
    const viewport = { width: 375, height: 667 };
    const safeArea = { top: 44, bottom: 34, left: 0, right: 0 };

    const result = calculateOverlayPosition(
      trigger,
      overlay,
      viewport,
      safeArea
    );

    expect(result.y).toBeGreaterThanOrEqual(safeArea.top);
  });
});
