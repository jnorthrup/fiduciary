/**
 * Teach Mode Toggle Component
 *
 * Toggle switch for enabling/disabling Teach Mode with localStorage persistence.
 */

import React, { useState, useEffect } from 'react';
import { Switch } from './ui/switch';
import { HelpCircle, Sparkles } from 'lucide-react';

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
    <div 
      data-testid={enabled ? 'teach-mode-indicator' : undefined}
      className={`flex items-center gap-3 px-3 py-1.5 rounded-full border transition-all duration-300 ${
      enabled 
        ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
        : 'bg-slate-50 border-slate-200'
    } ${className}`}>
      <div className={`p-1 rounded-full ${enabled ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
        {enabled ? <Sparkles size={14} /> : <HelpCircle size={14} />}
      </div>
      <label htmlFor={label} className={`text-xs font-bold uppercase tracking-wider cursor-pointer ${
        enabled ? 'text-indigo-700' : 'text-slate-600'
      }`}>
        {label}
      </label>
      <Switch
        checked={enabled}
        onCheckedChange={handleToggle}
        role="switch"
        aria-label={label}
        className={enabled ? 'bg-indigo-600' : ''}
      />
    </div>
  );
}
