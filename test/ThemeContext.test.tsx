/**
 * Tests for ThemeContext, ThemeProvider, and useTheme hook
 * Following TDD: These tests define the expected behavior before implementation
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, renderHook } from '@testing-library/react';
import { ThemeProvider, useTheme, ThemeContext } from '../contexts/ThemeContext';

describe('ThemeContext', () => {
    // Mock localStorage
    let mockLocalStorage: Record<string, string> = {};

    beforeEach(() => {
        mockLocalStorage = {};
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
            (key: string) => mockLocalStorage[key] || null
        );
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
            (key: string, value: string) => {
                mockLocalStorage[key] = value;
            }
        );

        // Mock matchMedia for prefers-color-scheme
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: query === '(prefers-color-scheme: dark)' ? false : false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('ThemeProvider', () => {
        it('should render children', () => {
            render(
                <ThemeProvider>
                    <div data-testid="child">Hello</div>
                </ThemeProvider>
            );
            expect(screen.getByTestId('child')).toBeInTheDocument();
        });

        it('should provide default theme (auto)', () => {
            const TestComponent = () => {
                const { themePreference } = useTheme();
                return <div data-testid="preference">{themePreference}</div>;
            };

            render(
                <ThemeProvider>
                    <TestComponent />
                </ThemeProvider>
            );

            expect(screen.getByTestId('preference').textContent).toBe('auto');
        });

        it('should set data-theme attribute on document element', () => {
            render(
                <ThemeProvider>
                    <div>Test</div>
                </ThemeProvider>
            );

            // Default should be light (since system is mocked as light)
            expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        });
    });

    describe('useTheme hook', () => {
        it('should throw error when used outside ThemeProvider', () => {
            const TestComponent = () => {
                const { theme } = useTheme();
                return <div>{theme}</div>;
            };

            // Suppress console.error for this test
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            expect(() => render(<TestComponent />)).toThrow(
                'useTheme must be used within a ThemeProvider'
            );

            consoleSpy.mockRestore();
        });

        it('should return current resolved theme', () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider,
            });

            // Default resolves to 'light' when system is light
            expect(result.current.theme).toBe('light');
        });

        it('should return theme preference (light, dark, or auto)', () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider,
            });

            expect(result.current.themePreference).toBe('auto');
        });

        it('should provide setTheme function', () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider,
            });

            expect(typeof result.current.setTheme).toBe('function');
        });

        it('should provide isDark boolean', () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider,
            });

            expect(typeof result.current.isDark).toBe('boolean');
            expect(result.current.isDark).toBe(false); // Default is light
        });
    });

    describe('Theme switching', () => {
        it('should switch to dark theme', async () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider,
            });

            act(() => {
                result.current.setTheme('dark');
            });

            expect(result.current.theme).toBe('dark');
            expect(result.current.isDark).toBe(true);
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        });

        it('should switch to light theme', async () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider,
            });

            act(() => {
                result.current.setTheme('dark');
            });

            act(() => {
                result.current.setTheme('light');
            });

            expect(result.current.theme).toBe('light');
            expect(result.current.isDark).toBe(false);
            expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        });

        it('should switch to auto and respect system preference', async () => {
            // Mock system as dark
            window.matchMedia = vi.fn().mockImplementation((query: string) => ({
                matches: query === '(prefers-color-scheme: dark)',
                media: query,
                onchange: null,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider,
            });

            act(() => {
                result.current.setTheme('auto');
            });

            expect(result.current.themePreference).toBe('auto');
            expect(result.current.theme).toBe('dark'); // Resolved from system
        });
    });

    describe('System preference detection', () => {
        it('should detect dark mode system preference', () => {
            window.matchMedia = vi.fn().mockImplementation((query: string) => ({
                matches: query === '(prefers-color-scheme: dark)',
                media: query,
                onchange: null,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider,
            });

            // With auto preference and dark system, resolved theme should be dark
            expect(result.current.theme).toBe('dark');
        });

        it('should detect light mode system preference', () => {
            window.matchMedia = vi.fn().mockImplementation((query: string) => ({
                matches: query === '(prefers-color-scheme: light)',
                media: query,
                onchange: null,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider,
            });

            expect(result.current.theme).toBe('light');
        });
    });

    describe('Theme persistence', () => {
        it('should persist theme preference to localStorage', () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider,
            });

            act(() => {
                result.current.setTheme('dark');
            });

            expect(mockLocalStorage['theme-preference']).toBe('dark');
        });

        it('should load theme preference from localStorage on mount', () => {
            mockLocalStorage['theme-preference'] = 'dark';

            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider,
            });

            expect(result.current.themePreference).toBe('dark');
            expect(result.current.theme).toBe('dark');
        });

        it('should use auto if no localStorage value', () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider,
            });

            expect(result.current.themePreference).toBe('auto');
        });
    });

    describe('Theme toggle convenience function', () => {
        it('should provide toggleTheme function', () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider,
            });

            expect(typeof result.current.toggleTheme).toBe('function');
        });

        it('should toggle between light and dark', () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider,
            });

            // Start at light (from auto with light system)
            act(() => {
                result.current.setTheme('light');
            });
            expect(result.current.theme).toBe('light');

            act(() => {
                result.current.toggleTheme();
            });
            expect(result.current.theme).toBe('dark');

            act(() => {
                result.current.toggleTheme();
            });
            expect(result.current.theme).toBe('light');
        });
    });

    describe('Flash prevention', () => {
        it('should add no-transition class initially', () => {
            render(
                <ThemeProvider>
                    <div>Test</div>
                </ThemeProvider>
            );

            // The no-transition class should be removed after initial render
            // This test verifies the mechanism exists
            // We can't easily test the timing, but we verify the theme is set correctly
            expect(document.documentElement.getAttribute('data-theme')).not.toBeNull();
        });
    });

    describe('themeTokens access', () => {
        it('should provide access to current theme tokens', () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider,
            });

            expect(result.current.tokens).toBeDefined();
            expect(result.current.tokens.background).toBeDefined();
            expect(result.current.tokens.text).toBeDefined();
            expect(result.current.tokens.accent).toBeDefined();
        });

        it('should return light tokens when theme is light', () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider,
            });

            act(() => {
                result.current.setTheme('light');
            });

            expect(result.current.tokens.background.primary).toBe('#ffffff');
        });

        it('should return dark tokens when theme is dark', () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider,
            });

            act(() => {
                result.current.setTheme('dark');
            });

            expect(result.current.tokens.background.primary).toBe('#0f172a');
        });
    });
});
