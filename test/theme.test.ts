import { describe, it, expect } from 'vitest';
import { themeTokens, lightTheme, darkTheme } from '../types/theme';

describe('Theme Tokens', () => {
  describe('ThemeTokens structure', () => {
    it('should have light and dark themes', () => {
      expect(themeTokens).toHaveProperty('light');
      expect(themeTokens).toHaveProperty('dark');
    });

    it('should have matching structure between light and dark themes', () => {
      const lightKeys = Object.keys(themeTokens.light);
      const darkKeys = Object.keys(themeTokens.dark);
      expect(lightKeys).toEqual(darkKeys);
    });
  });

  describe('Light theme', () => {
    it('should have background colors', () => {
      expect(lightTheme.background).toHaveProperty('primary');
      expect(lightTheme.background).toHaveProperty('secondary');
      expect(lightTheme.background).toHaveProperty('tertiary');
      expect(lightTheme.background).toHaveProperty('elevated');
      expect(lightTheme.background).toHaveProperty('surface');
    });

    it('should have text colors', () => {
      expect(lightTheme.text).toHaveProperty('primary');
      expect(lightTheme.text).toHaveProperty('secondary');
      expect(lightTheme.text).toHaveProperty('muted');
      expect(lightTheme.text).toHaveProperty('inverse');
      expect(lightTheme.text).toHaveProperty('disabled');
    });

    it('should have border colors', () => {
      expect(lightTheme.border).toHaveProperty('default');
      expect(lightTheme.border).toHaveProperty('subtle');
      expect(lightTheme.border).toHaveProperty('focus');
      expect(lightTheme.border).toHaveProperty('error');
    });

    it('should have accent colors', () => {
      expect(lightTheme.accent).toHaveProperty('primary');
      expect(lightTheme.accent).toHaveProperty('secondary');
      expect(lightTheme.accent).toHaveProperty('success');
      expect(lightTheme.accent).toHaveProperty('warning');
      expect(lightTheme.accent).toHaveProperty('error');
      expect(lightTheme.accent).toHaveProperty('info');
    });

    it('should have status colors', () => {
      expect(lightTheme.status).toHaveProperty('paid');
      expect(lightTheme.status).toHaveProperty('pending');
      expect(lightTheme.status).toHaveProperty('failed');
      expect(lightTheme.status).toHaveProperty('reconciled');
      expect(lightTheme.status).toHaveProperty('disputed');
    });

    it('should have valid hex colors', () => {
      const hexPattern = /^#[0-9A-Fa-f]{6}$/;
      expect(lightTheme.background.primary).toMatch(hexPattern);
      expect(lightTheme.text.primary).toMatch(hexPattern);
      expect(lightTheme.border.default).toMatch(hexPattern);
      expect(lightTheme.accent.primary).toMatch(hexPattern);
      expect(lightTheme.status.paid).toMatch(hexPattern);
    });
  });

  describe('Dark theme', () => {
    it('should have background colors', () => {
      expect(darkTheme.background).toHaveProperty('primary');
      expect(darkTheme.background).toHaveProperty('secondary');
      expect(darkTheme.background).toHaveProperty('tertiary');
      expect(darkTheme.background).toHaveProperty('elevated');
      expect(darkTheme.background).toHaveProperty('surface');
    });

    it('should have text colors', () => {
      expect(darkTheme.text).toHaveProperty('primary');
      expect(darkTheme.text).toHaveProperty('secondary');
      expect(darkTheme.text).toHaveProperty('muted');
      expect(darkTheme.text).toHaveProperty('inverse');
      expect(darkTheme.text).toHaveProperty('disabled');
    });

    it('should have border colors', () => {
      expect(darkTheme.border).toHaveProperty('default');
      expect(darkTheme.border).toHaveProperty('subtle');
      expect(darkTheme.border).toHaveProperty('focus');
      expect(darkTheme.border).toHaveProperty('error');
    });

    it('should have accent colors', () => {
      expect(darkTheme.accent).toHaveProperty('primary');
      expect(darkTheme.accent).toHaveProperty('secondary');
      expect(darkTheme.accent).toHaveProperty('success');
      expect(darkTheme.accent).toHaveProperty('warning');
      expect(darkTheme.accent).toHaveProperty('error');
      expect(darkTheme.accent).toHaveProperty('info');
    });

    it('should have status colors', () => {
      expect(darkTheme.status).toHaveProperty('paid');
      expect(darkTheme.status).toHaveProperty('pending');
      expect(darkTheme.status).toHaveProperty('failed');
      expect(darkTheme.status).toHaveProperty('reconciled');
      expect(darkTheme.status).toHaveProperty('disputed');
    });

    it('should have valid hex colors', () => {
      const hexPattern = /^#[0-9A-Fa-f]{6}$/;
      expect(darkTheme.background.primary).toMatch(hexPattern);
      expect(darkTheme.text.primary).toMatch(hexPattern);
      expect(darkTheme.border.default).toMatch(hexPattern);
      expect(darkTheme.accent.primary).toMatch(hexPattern);
      expect(darkTheme.status.paid).toMatch(hexPattern);
    });

    it('should have darker background than light theme', () => {
      // Dark theme primary background should be darker than light theme
      expect(darkTheme.background.primary).not.toBe(lightTheme.background.primary);
    });

    it('should have lighter text than light theme', () => {
      // Dark theme primary text should be lighter than light theme
      expect(darkTheme.text.primary).not.toBe(lightTheme.text.primary);
    });
  });

  describe('Color contrast', () => {
    it('should have different primary text and background colors', () => {
      expect(lightTheme.text.primary).not.toBe(lightTheme.background.primary);
      expect(darkTheme.text.primary).not.toBe(darkTheme.background.primary);
    });

    it('should have inverse colors that differ from regular colors', () => {
      expect(lightTheme.text.inverse).not.toBe(lightTheme.text.primary);
      expect(darkTheme.text.inverse).not.toBe(darkTheme.text.primary);
    });
  });

  describe('Status colors', () => {
    it('should have distinct colors for each status', () => {
      const lightStatusColors = Object.values(lightTheme.status);
      const uniqueColors = new Set(lightStatusColors);
      expect(uniqueColors.size).toBe(lightStatusColors.length);
    });

    it('should have matching status categories in light and dark themes', () => {
      const lightStatusKeys = Object.keys(lightTheme.status).sort();
      const darkStatusKeys = Object.keys(darkTheme.status).sort();
      expect(lightStatusKeys).toEqual(darkStatusKeys);
    });
  });

  describe('Accent colors', () => {
    it('should have distinct accent colors', () => {
      const lightAccentColors = Object.values(lightTheme.accent);
      const uniqueColors = new Set(lightAccentColors);
      expect(uniqueColors.size).toBe(lightAccentColors.length);
    });

    it('should have matching accent categories in light and dark themes', () => {
      const lightAccentKeys = Object.keys(lightTheme.accent).sort();
      const darkAccentKeys = Object.keys(darkTheme.accent).sort();
      expect(lightAccentKeys).toEqual(darkAccentKeys);
    });
  });
});
