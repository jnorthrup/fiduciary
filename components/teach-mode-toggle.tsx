/**
 * Teach Mode Toggle Component
 *
 * Toggle switch for enabling/disabling Teach Mode with localStorage persistence.
 */

import React, { useState, useEffect } from 'react';
import { Switch } from './ui/switch';

export interface TeachModeToggleProps {
  label?: string;
  onChange?: (enabled: boolean) => void;
  className?: string;
}

const STORAGE_KEY = 'teachModeEnabled';

export function TeachModeToggle({
  label = 'Teach Mode',
  onChange,
  className = '',
}: TeachModeToggleProps) {
  const [enabled, setEnabled] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') {
        setEnabled(true);
      }
    } catch {
      // Handle localStorage access errors (e.g., private browsing)
      console.warn('Failed to access localStorage');
    }
  }, []);

  // Persist state to localStorage when changed
  const handleToggle = (checked: boolean) => {
    setEnabled(checked);

    try {
      localStorage.setItem(STORAGE_KEY, String(checked));
    } catch {
      console.warn('Failed to persist Teach Mode state');
    }

    onChange?.(checked);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Switch
        checked={enabled}
        onCheckedChange={handleToggle}
        role="switch"
        aria-label={label}
      />
      <label htmlFor={label} className="text-sm font-medium cursor-pointer">
        {label}
      </label>
      {enabled && (
        <span
          data-testid="teach-mode-indicator"
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
        >
          Active
        </span>
      )}
    </div>
  );
}
