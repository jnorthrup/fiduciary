
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserProfileModal } from './UserProfileModal';
import { User } from '../../types';
import React from 'react';

// Mock user data
const mockUser: User = {
    id: '123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'Admin',
    avatarInitials: 'TU',
    lastActive: 'Now',
    _version: '1'
};

const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value.toString();
        }),
        clear: vi.fn(() => {
            store = {};
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        })
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('UserProfileModal Standalone', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders user profile correctly', () => {
        render(
            <UserProfileModal
                user={mockUser}
                currentUser={mockUser}
                onSave={() => { }}
                onDelete={() => { }}
                onClose={() => { }}
            />
        );
        expect(screen.getByText('Your Profile')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    });

    it('shows the Switch Skin button', () => {
        render(
            <UserProfileModal
                user={mockUser}
                currentUser={mockUser}
                onSave={() => { }}
                onDelete={() => { }}
                onClose={() => { }}
            />
        );
        expect(screen.getByText('Switch Application Skin')).toBeInTheDocument();
    });

    it('toggles skin and reloads page on click', () => {
        // Mock window.location.reload
        const originalLocation = window.location;
        const reloadMock = vi.fn();

        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { ...originalLocation, reload: reloadMock },
        });

        render(
            <UserProfileModal
                user={mockUser}
                currentUser={mockUser}
                onSave={() => { }}
                onDelete={() => { }}
                onClose={() => { }}
            />
        );

        const switchText = screen.getByText('Switch Application Skin');
        const switchButton = switchText.closest('button');

        fireEvent.click(switchButton!);

        expect(localStorageMock.setItem).toHaveBeenCalledWith('fiduciary_skin_v2', expect.any(String));
        expect(reloadMock).toHaveBeenCalled();

        // Restore window.location
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: originalLocation,
        });
    });
});
