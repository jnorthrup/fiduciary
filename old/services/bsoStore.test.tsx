
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { BSOProvider, useBSOStore } from './bsoStore';
import * as types from '../types';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        clear: vi.fn(() => { store = {}; })
    };
})();
vi.stubGlobal('localStorage', localStorageMock);

describe('bsoStore', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        React.createElement(BSOProvider, null, children)
    );

    it('should initialize with empty state', () => {
        const { result } = renderHook(() => useBSOStore(), { wrapper });
        expect(result.current.roles).toEqual([]);
        expect(result.current.submissions).toEqual([]);
    });

    it('should add and update a role', () => {
        const { result } = renderHook(() => useBSOStore(), { wrapper });
        const mockRole: types.BSORole = {
            id: 'role-1',
            entityId: 'ent-1',
            registrationStatus: 'Pending',
            services: [],
            activationCode: null,
            registeredAt: '2026-01-15',
            lastAuthenticated: '2026-01-15'
        };

        act(() => {
            result.current.addRole(mockRole);
        });

        expect(result.current.roles).toHaveLength(1);
        expect(result.current.roles[0].id).toBe('role-1');

        act(() => {
            result.current.updateRole('role-1', { registrationStatus: 'Active' });
        });

        expect(result.current.roles[0].registrationStatus).toBe('Active');
    });

    it('should persist state to localStorage', () => {
        const { result } = renderHook(() => useBSOStore(), { wrapper });
        const mockRole: types.BSORole = {
            id: 'role-1',
            entityId: 'ent-1',
            registrationStatus: 'Active',
            services: [],
            activationCode: null,
            registeredAt: '2026-01-15',
            lastAuthenticated: '2026-01-15'
        };

        act(() => {
            result.current.addRole(mockRole);
        });

        expect(localStorageMock.setItem).toHaveBeenCalled();
        const lastCall = localStorageMock.setItem.mock.calls[localStorageMock.setItem.mock.calls.length - 1];
        const stored = JSON.parse(lastCall[1]);
        expect(stored.roles).toHaveLength(1);
    });

    it('should filter roles by entity', () => {
        const { result } = renderHook(() => useBSOStore(), { wrapper });
        act(() => {
            result.current.addRole({ id: 'r1', entityId: 'ent-A' } as any);
            result.current.addRole({ id: 'r2', entityId: 'ent-B' } as any);
        });

        const entARoles = result.current.getRolesByEntity('ent-A');
        expect(entARoles).toHaveLength(1);
        expect(entARoles[0].id).toBe('r1');
    });
});
