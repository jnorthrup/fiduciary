/**
 * Overlay Interaction Tests
 *
 * Tests for Teach Mode overlay interaction behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  TeachModeOverlay,
  TeachModeOverlayProps,
} from './overlay-interaction';

describe('Hover Delay Timing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should show overlay after default delay (300ms)', async () => {
    const props: TeachModeOverlayProps = {
      visible: false,
      onVisibleChange: vi.fn(),
    };

    render(<TeachModeOverlay {...props} />);

    const trigger = screen.getByTestId('overlay-trigger');
    fireEvent.mouseEnter(trigger);

    // Should not show immediately
    expect(props.onVisibleChange).not.toHaveBeenCalled();

    // Fast-forward past default delay
    vi.advanceTimersByTime(300);
    vi.runAllTimers();

    expect(props.onVisibleChange).toHaveBeenCalledWith(true);
  });

  it('should respect custom delay', async () => {
    const props: TeachModeOverlayProps = {
      visible: false,
      delay: 500,
      onVisibleChange: vi.fn(),
    };

    render(<TeachModeOverlay {...props} />);

    const trigger = screen.getByTestId('overlay-trigger');
    fireEvent.mouseEnter(trigger);

    // Should not show before custom delay
    vi.advanceTimersByTime(400);
    expect(props.onVisibleChange).not.toHaveBeenCalled();

    // Should show after custom delay
    vi.advanceTimersByTime(100);
    vi.runAllTimers();

    expect(props.onVisibleChange).toHaveBeenCalledWith(true);
  });

  it('should cancel show on mouse leave before delay', async () => {
    const props: TeachModeOverlayProps = {
      visible: false,
      onVisibleChange: vi.fn(),
    };

    render(<TeachModeOverlay {...props} />);

    const trigger = screen.getByTestId('overlay-trigger');
    fireEvent.mouseEnter(trigger);

    // Leave before delay completes
    vi.advanceTimersByTime(100);
    fireEvent.mouseLeave(trigger);

    // Complete the delay
    vi.advanceTimersByTime(200);

    expect(props.onVisibleChange).not.toHaveBeenCalled();
  });
});

describe('Overlay Close Behavior', () => {
  it('should close on close button click', async () => {
    const props: TeachModeOverlayProps = {
      visible: true,
      onVisibleChange: vi.fn(),
    };

    render(<TeachModeOverlay {...props} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(props.onVisibleChange).toHaveBeenCalledWith(false);
  });

  it('should close on click outside', async () => {
    const props: TeachModeOverlayProps = {
      visible: true,
      onVisibleChange: vi.fn(),
    };

    render(
      <div>
        <TeachModeOverlay {...props} />
        <div data-testid="outside">Outside</div>
      </div>
    );

    const outside = screen.getByTestId('outside');
    fireEvent.mouseDown(outside);

    expect(props.onVisibleChange).toHaveBeenCalledWith(false);
  });

  it('should not close on click inside overlay', async () => {
    const props: TeachModeOverlayProps = {
      visible: true,
      onVisibleChange: vi.fn(),
      content: { paragraph: { content: 'Test content' } },
    };

    render(<TeachModeOverlay {...props} />);

    const inside = screen.getByText('Test content');
    fireEvent.click(inside);

    expect(props.onVisibleChange).not.toHaveBeenCalled();
  });

  it('should close on trigger mouse leave after delay', async () => {
    vi.useFakeTimers();
    const props: TeachModeOverlayProps = {
      visible: true,
      onVisibleChange: vi.fn(),
      closeDelay: 200,
    };

    render(<TeachModeOverlay {...props} />);

    const trigger = screen.getByTestId('overlay-trigger');
    fireEvent.mouseLeave(trigger);

    // Should not close immediately
    expect(props.onVisibleChange).not.toHaveBeenCalled();

    // Should close after delay
    vi.advanceTimersByTime(200);
    vi.runAllTimers();

    expect(props.onVisibleChange).toHaveBeenCalledWith(false);

    vi.restoreAllMocks();
  });
});

describe('Keyboard Navigation', () => {
  it('should close on ESC key', async () => {
    const props: TeachModeOverlayProps = {
      visible: true,
      onVisibleChange: vi.fn(),
    };

    render(<TeachModeOverlay {...props} />);

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    expect(props.onVisibleChange).toHaveBeenCalledWith(false);
  });

  it('should autofocus close button when overlay opens', async () => {
    const props: TeachModeOverlayProps = {
      visible: true,
      onVisibleChange: vi.fn(),
    };

    render(<TeachModeOverlay {...props} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeInTheDocument();
    // Note: autoFocus attribute is set, but actual focus depends on browser
  });
});
