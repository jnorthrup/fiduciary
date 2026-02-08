import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Set test environment - use 'development' for React 19 JSX runtime compatibility
// Note: GCS persistence tests should mock NODE_ENV locally if they need production behavior
process.env.NODE_ENV = 'development';
process.env.GOOGLE_APPLICATION_CREDENTIALS = '/fake/path.json';
delete process.env.USE_LOCAL_PERSISTENCE;

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

import { webcrypto } from 'node:crypto';

// Polyfill Web Crypto API for jsdom
if (!global.crypto) {
  // @ts-expect-error - webcrypto type mismatch with Crypto
  global.crypto = webcrypto;
}

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock localStorage and sessionStorage
const localStorageMock = (function () {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true, configurable: true });
Object.defineProperty(global, 'sessionStorage', { value: localStorageMock, writable: true, configurable: true });

// Mock scrollIntoView for elements
Element.prototype.scrollIntoView = vi.fn();
