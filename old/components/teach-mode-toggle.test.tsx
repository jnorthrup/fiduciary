/**
 * Teach Mode Toggle Component Tests
 *
 * Tests for Teach Mode toggle switch with state persistence.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TeachModeToggle } from './teach-mode-toggle';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

describe('Teach Mode Toggle', () => {
  const localStorageKey = 'teachModeEnabled';

  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('should render toggle switch component', () => {
    render(<TeachModeToggle />);

    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('should be disabled by default', () => {
    render(<TeachModeToggle />);

    const toggle = screen.getByRole('switch');
    expect(toggle).not.toBeChecked();
  });

  it('should toggle state on click', async () => {
    render(<TeachModeToggle />);

    const toggle = screen.getByRole('switch');

    expect(toggle).not.toBeChecked();

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(toggle).toBeChecked();
    });
  });

  it('should persist state to localStorage', async () => {
    render(<TeachModeToggle />);

    const toggle = screen.getByRole('switch');

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(localStorage.getItem(localStorageKey)).toBe('true');
    });
  });

  it('should restore state from localStorage on mount', () => {
    localStorage.setItem(localStorageKey, 'true');

    render(<TeachModeToggle />);

    const toggle = screen.getByRole('switch');
    expect(toggle).toBeChecked();
  });

  it('should call onChange callback when toggled', async () => {
    const onChange = vi.fn();

    render(<TeachModeToggle onChange={onChange} />);

    const toggle = screen.getByRole('switch');

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(true);
    });
  });

  it('should display label text', () => {
    render(<TeachModeToggle label="Teach Mode" />);

    expect(screen.getByText('Teach Mode')).toBeInTheDocument();
  });

  it('should show visual indicator when active', () => {
    localStorage.setItem(localStorageKey, 'true');

    render(<TeachModeToggle />);

    const indicator = screen.queryByTestId('teach-mode-indicator');
    expect(indicator).toBeInTheDocument();
  });

  it('should hide visual indicator when inactive', () => {
    render(<TeachModeToggle />);

    const indicator = screen.queryByTestId('teach-mode-indicator');
    expect(indicator).not.toBeInTheDocument();
  });
});

describe('Teach Mode Toggle State Management', () => {
  const localStorageKey = 'teachModeEnabled';

  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should maintain state across component re-mounts', async () => {
    const { rerender } = render(<TeachModeToggle />);

    const toggle = screen.getByRole('switch');

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(toggle).toBeChecked();
    });

    // Unmount and remount
    rerender(null);
    render(<TeachModeToggle />);

    const toggle2 = screen.getByRole('switch');
    expect(toggle2).toBeChecked();
  });

  it('should handle invalid localStorage values gracefully', () => {
    localStorageMock.setItem(localStorageKey, 'invalid');

    render(<TeachModeToggle />);

    const toggle = screen.getByRole('switch');
    expect(toggle).not.toBeChecked();
  });
});
