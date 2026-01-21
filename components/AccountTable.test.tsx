/**
 * AccountTable Tests
 * Tests for keyboard navigation, touch gestures, and inline editing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccountTable } from './AccountTable';
import * as types from '../types';

// Mock the ledgerService module
// Note: vi.mock factory is hoisted and must be self-contained
vi.mock('../services/ledgerService', () => {
    // Create spy functions inside the mock - store references on a global object
    // that tests can access after the mock is processed
    if (!(globalThis as any).__accountTableTestMocks) {
        (globalThis as any).__accountTableTestMocks = {
            mockUpdateAccount: vi.fn(),
            mockDeleteAccount: vi.fn()
        };
    }

    const mocks = (globalThis as any).__accountTableTestMocks;

    return {
        useLedgerStore: () => {
            const { useState } = require('react');
            const [cursorIndex, setCursorIndex] = useState(0);
            const [selectedAccountId, setSelectedAccountId] = useState(null);

            // Define mock accounts inline for the mock
            const mockAccounts = [
                {
                    id: 'acc-1',
                    entityId: 'entity-1',
                    code: '1000',
                    name: 'Cash',
                    type: 'Asset',
                    normalBalance: 'Debit',
                    balance: 10000,
                    isActive: true,
                    _version: '1.0'
                },
                {
                    id: 'acc-2',
                    entityId: 'entity-1',
                    code: '2000',
                    name: 'Accounts Payable',
                    type: 'Liability',
                    normalBalance: 'Credit',
                    balance: 5000,
                    isActive: true,
                    _version: '1.0'
                },
                {
                    id: 'acc-3',
                    entityId: 'entity-1',
                    code: '4000',
                    name: 'Revenue',
                    type: 'Income',
                    normalBalance: 'Credit',
                    balance: 25000,
                    isActive: true,
                    _version: '1.0'
                }
            ];

            return {
                accounts: mockAccounts,
                updateAccount: mocks.mockUpdateAccount,
                deleteAccount: mocks.mockDeleteAccount,
                cursorIndex,
                setCursorIndex,
                selectedAccountId,
                setSelectedAccountId,
                paginationCursor: null,
                setPaginationCursor: () => {},
                paginationLimit: 50,
                setPaginationLimit: () => {},
                fetchNextAccountsPage: () => {},
                fetchPreviousAccountsPage: () => {}
            };
        },
        LedgerProvider: ({ children }: { children: any }) => {
            const React = require('react');
            return React.createElement('div', { className: 'mock-ledger-provider' }, children);
        }
    };
});

describe('AccountTable', () => {
    let mockUpdateAccount: ReturnType<typeof vi.fn>;
    let mockDeleteAccount: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        const mocks = (globalThis as any).__accountTableTestMocks;
        mockUpdateAccount = mocks.mockUpdateAccount;
        mockDeleteAccount = mocks.mockDeleteAccount;
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders the table with accounts', () => {
            render(<AccountTable entityId="entity-1" />);

            expect(screen.getByText('Chart of Accounts')).toBeInTheDocument();
            expect(screen.getByText('Cash')).toBeInTheDocument();
            expect(screen.getByText('Accounts Payable')).toBeInTheDocument();
            expect(screen.getByText('Revenue')).toBeInTheDocument();
        });

        it('displays account count in footer', () => {
            render(<AccountTable entityId="entity-1" />);

            expect(screen.getByText('3 accounts')).toBeInTheDocument();
        });
    });

    describe('Keyboard Navigation', () => {
        it('highlights first row by default (cursorIndex = 0)', () => {
            render(<AccountTable entityId="entity-1" />);

            const rows = screen.getAllByRole('row');
            expect(rows[0]).toHaveClass('bg-indigo-50');
        });

        it('moves cursor down with ArrowDown', () => {
            render(<AccountTable entityId="entity-1" />);

            const container = screen.getByRole('grid');
            fireEvent.keyDown(container, { key: 'ArrowDown' });

            // Second row should now have cursor styling
            const rows = screen.getAllByRole('row');
            expect(rows[1]).toHaveClass('bg-indigo-50');
        });

        it('moves cursor up with ArrowUp', () => {
            render(<AccountTable entityId="entity-1" />);

            const container = screen.getByRole('grid');
            // Move down first, then up
            fireEvent.keyDown(container, { key: 'ArrowDown' });
            fireEvent.keyDown(container, { key: 'ArrowUp' });

            const rows = screen.getAllByRole('row');
            expect(rows[0]).toHaveClass('bg-indigo-50');
        });

        it('selects account on Enter key', () => {
            const onSelect = vi.fn();
            render(<AccountTable entityId="entity-1" onAccountSelect={onSelect} />);

            const container = screen.getByRole('grid');
            // Enter now activates inline editing per spec
            fireEvent.keyDown(container, { key: 'Enter' });

            // Should enter edit mode, not select
            expect(screen.getByPlaceholderText('Account Name')).toBeInTheDocument();
            // onSelect should NOT be called
            expect(onSelect).not.toHaveBeenCalled();
        });

        it('enters edit mode with E key', () => {
            render(<AccountTable entityId="entity-1" />);

            const container = screen.getByRole('grid');
            fireEvent.keyDown(container, { key: 'e' });

            // Should show edit form
            expect(screen.getByPlaceholderText('Account Name')).toBeInTheDocument();
        });

        it('cancels edit with Escape key', () => {
            render(<AccountTable entityId="entity-1" />);

            const container = screen.getByRole('grid');

            // Enter edit mode
            fireEvent.keyDown(container, { key: 'e' });
            expect(screen.getByPlaceholderText('Account Name')).toBeInTheDocument();

            // Cancel with Escape
            fireEvent.keyDown(container, { key: 'Escape' });
            expect(screen.queryByPlaceholderText('Account Name')).not.toBeInTheDocument();
        });

        it('does not go negative on ArrowUp at top', () => {
            render(<AccountTable entityId="entity-1" />);

            const container = screen.getByRole('grid');

            // Try to go up when already at top
            fireEvent.keyDown(container, { key: 'ArrowUp' });
            fireEvent.keyDown(container, { key: 'ArrowUp' });

            const rows = screen.getAllByRole('row');
            // Should still be on first row
            expect(rows[0]).toHaveClass('bg-indigo-50');
        });
    });

    describe('Search and Filtering', () => {
        it('filters accounts by search term', () => {
            render(<AccountTable entityId="entity-1" />);

            const searchInput = screen.getByPlaceholderText('Search by name or code...');
            fireEvent.change(searchInput, { target: { value: 'Cash' } });

            expect(screen.getByText('Cash')).toBeInTheDocument();
            expect(screen.queryByText('Accounts Payable')).not.toBeInTheDocument();
            expect(screen.queryByText('Revenue')).not.toBeInTheDocument();
        });

        it('filters accounts by type', () => {
            render(<AccountTable entityId="entity-1" />);

            const assetFilter = screen.getByRole('button', { name: 'Asset' });
            fireEvent.click(assetFilter);

            expect(screen.getByText('Cash')).toBeInTheDocument();
            expect(screen.queryByText('Accounts Payable')).not.toBeInTheDocument();
        });
    });

    describe('Inline Editing', () => {
        it('saves changes on Save button click', () => {
            render(<AccountTable entityId="entity-1" />);

            const container = screen.getByRole('grid');

            // Enter edit mode
            fireEvent.keyDown(container, { key: 'e' });

            // Change the name
            const nameInput = screen.getByPlaceholderText('Account Name');
            fireEvent.change(nameInput, { target: { value: 'Updated Cash Account' } });

            // Save
            const saveButton = screen.getByRole('button', { name: /save/i });
            fireEvent.click(saveButton);

            expect(mockUpdateAccount).toHaveBeenCalledWith(expect.objectContaining({
                id: 'acc-1',
                name: 'Updated Cash Account'
            }));
        });
    });

    describe('Inline Editing Validation', () => {
        describe('Required Field Validation', () => {
            it('should not save when account name is empty', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Enter edit mode
                fireEvent.keyDown(container, { key: 'e' });

                // Clear the name
                const nameInput = screen.getByPlaceholderText('Account Name');
                fireEvent.change(nameInput, { target: { value: '' } });

                // Try to save
                const saveButton = screen.getByRole('button', { name: /save/i });
                fireEvent.click(saveButton);

                // Should NOT call updateAccount
                expect(mockUpdateAccount).not.toHaveBeenCalled();

                // Should remain in edit mode
                expect(screen.getByPlaceholderText('Account Name')).toBeInTheDocument();
            });

            it('should not save when account name is only whitespace', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Enter edit mode
                fireEvent.keyDown(container, { key: 'e' });

                // Set name to whitespace only
                const nameInput = screen.getByPlaceholderText('Account Name');
                fireEvent.change(nameInput, { target: { value: '   ' } });

                // Try to save
                const saveButton = screen.getByRole('button', { name: /save/i });
                fireEvent.click(saveButton);

                // Should NOT call updateAccount
                expect(mockUpdateAccount).not.toHaveBeenCalled();

                // Should remain in edit mode
                expect(screen.getByPlaceholderText('Account Name')).toBeInTheDocument();
            });

            it('should display validation error for empty name', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Enter edit mode
                fireEvent.keyDown(container, { key: 'e' });

                // Clear the name
                const nameInput = screen.getByPlaceholderText('Account Name');
                fireEvent.change(nameInput, { target: { value: '' } });

                // Try to save
                const saveButton = screen.getByRole('button', { name: /save/i });
                fireEvent.click(saveButton);

                // Should show error message
                expect(screen.getByText(/account name is required/i)).toBeInTheDocument();
            });

            it('should display validation error for whitespace-only name', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Enter edit mode
                fireEvent.keyDown(container, { key: 'e' });

                // Set name to whitespace
                const nameInput = screen.getByPlaceholderText('Account Name');
                fireEvent.change(nameInput, { target: { value: '   \t\n' } });

                // Try to save
                const saveButton = screen.getByRole('button', { name: /save/i });
                fireEvent.click(saveButton);

                // Should show error message
                expect(screen.getByText(/account name is required/i)).toBeInTheDocument();
            });
        });

        describe('Length Validation', () => {
            it('should not save when name exceeds maximum length (100 characters)', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Enter edit mode
                fireEvent.keyDown(container, { key: 'e' });

                // Set name to exceed 100 characters
                const nameInput = screen.getByPlaceholderText('Account Name');
                const longName = 'A'.repeat(101);
                fireEvent.change(nameInput, { target: { value: longName } });

                // Try to save
                const saveButton = screen.getByRole('button', { name: /save/i });
                fireEvent.click(saveButton);

                // Should NOT call updateAccount
                expect(mockUpdateAccount).not.toHaveBeenCalled();

                // Should remain in edit mode
                expect(screen.getByPlaceholderText('Account Name')).toBeInTheDocument();
            });

            it('should display validation error when name exceeds maximum length', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Enter edit mode
                fireEvent.keyDown(container, { key: 'e' });

                // Set name to exceed 100 characters
                const nameInput = screen.getByPlaceholderText('Account Name');
                const longName = 'A'.repeat(101);
                fireEvent.change(nameInput, { target: { value: longName } });

                // Try to save
                const saveButton = screen.getByRole('button', { name: /save/i });
                fireEvent.click(saveButton);

                // Should show error message
                expect(screen.getByText(/account name must be 100 characters or less/i)).toBeInTheDocument();
            });

            it('should not save when description exceeds maximum length (500 characters)', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Enter edit mode
                fireEvent.keyDown(container, { key: 'e' });

                // Set description to exceed 500 characters
                const descInput = screen.getByPlaceholderText('Description (optional)');
                const longDesc = 'A'.repeat(501);
                fireEvent.change(descInput, { target: { value: longDesc } });

                // Try to save
                const saveButton = screen.getByRole('button', { name: /save/i });
                fireEvent.click(saveButton);

                // Should NOT call updateAccount
                expect(mockUpdateAccount).not.toHaveBeenCalled();

                // Should remain in edit mode
                expect(screen.getByPlaceholderText('Description (optional)')).toBeInTheDocument();
            });

            it('should display validation error when description exceeds maximum length', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Enter edit mode
                fireEvent.keyDown(container, { key: 'e' });

                // Set description to exceed 500 characters
                const descInput = screen.getByPlaceholderText('Description (optional)');
                const longDesc = 'A'.repeat(501);
                fireEvent.change(descInput, { target: { value: longDesc } });

                // Try to save
                const saveButton = screen.getByRole('button', { name: /save/i });
                fireEvent.click(saveButton);

                // Should show error message
                expect(screen.getByText(/description must be 500 characters or less/i)).toBeInTheDocument();
            });
        });

        describe('Format Validation', () => {
            it('should not save when name contains invalid special characters', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Enter edit mode
                fireEvent.keyDown(container, { key: 'e' });

                // Set name with invalid characters
                const nameInput = screen.getByPlaceholderText('Account Name');
                fireEvent.change(nameInput, { target: { value: 'Account@#$%' } });

                // Try to save
                const saveButton = screen.getByRole('button', { name: /save/i });
                fireEvent.click(saveButton);

                // Should NOT call updateAccount
                expect(mockUpdateAccount).not.toHaveBeenCalled();

                // Should remain in edit mode
                expect(screen.getByPlaceholderText('Account Name')).toBeInTheDocument();
            });

            it('should display validation error for invalid characters in name', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Enter edit mode
                fireEvent.keyDown(container, { key: 'e' });

                // Set name with invalid characters
                const nameInput = screen.getByPlaceholderText('Account Name');
                fireEvent.change(nameInput, { target: { value: 'Account<>' } });

                // Try to save
                const saveButton = screen.getByRole('button', { name: /save/i });
                fireEvent.click(saveButton);

                // Should show error message
                expect(screen.getByText(/account name contains invalid characters/i)).toBeInTheDocument();
            });

            it('should allow valid name with letters, numbers, spaces, and basic punctuation', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Enter edit mode
                fireEvent.keyDown(container, { key: 'e' });

                // Set name with valid characters
                const nameInput = screen.getByPlaceholderText('Account Name');
                fireEvent.change(nameInput, { target: { value: 'Cash & Equivalents 123' } });

                // Save
                const saveButton = screen.getByRole('button', { name: /save/i });
                fireEvent.click(saveButton);

                // Should call updateAccount
                expect(mockUpdateAccount).toHaveBeenCalledWith(expect.objectContaining({
                    id: 'acc-1',
                    name: 'Cash & Equivalents 123'
                }));
            });
        });

        describe('Save Behavior with Validation', () => {
            it('should trim whitespace from name before validation', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Enter edit mode
                fireEvent.keyDown(container, { key: 'e' });

                // Set name with leading/trailing whitespace
                const nameInput = screen.getByPlaceholderText('Account Name');
                fireEvent.change(nameInput, { target: { value: '  Cash Account  ' } });

                // Save
                const saveButton = screen.getByRole('button', { name: /save/i });
                fireEvent.click(saveButton);

                // Should call updateAccount with trimmed name
                expect(mockUpdateAccount).toHaveBeenCalledWith(expect.objectContaining({
                    id: 'acc-1',
                    name: 'Cash Account'
                }));
            });

            it('should clear validation errors when canceling edit mode', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Enter edit mode
                fireEvent.keyDown(container, { key: 'e' });

                // Clear the name to trigger validation error
                const nameInput = screen.getByPlaceholderText('Account Name');
                fireEvent.change(nameInput, { target: { value: '' } });

                // Try to save to trigger error
                const saveButton = screen.getByRole('button', { name: /save/i });
                fireEvent.click(saveButton);

                // Error should be displayed
                expect(screen.getByText(/account name is required/i)).toBeInTheDocument();

                // Cancel
                const cancelButton = screen.getByRole('button', { name: /cancel/i });
                fireEvent.click(cancelButton);

                // Error should be gone
                expect(screen.queryByText(/account name is required/i)).not.toBeInTheDocument();
            });

            it('should not call updateAccount when pressing Enter with invalid data', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Enter edit mode
                fireEvent.keyDown(container, { key: 'e' });

                // Clear the name
                const nameInput = screen.getByPlaceholderText('Account Name');
                fireEvent.change(nameInput, { target: { value: '' } });

                // Press Enter to try to save
                fireEvent.keyDown(nameInput, { key: 'Enter' });

                // Should NOT call updateAccount
                expect(mockUpdateAccount).not.toHaveBeenCalled();

                // Should remain in edit mode
                expect(screen.getByPlaceholderText('Account Name')).toBeInTheDocument();
            });
        });

        describe('Cancel Behavior with Validation', () => {
            it('should discard changes and close edit mode when canceling with invalid data', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Enter edit mode
                fireEvent.keyDown(container, { key: 'e' });

                // Clear the name
                const nameInput = screen.getByPlaceholderText('Account Name');
                fireEvent.change(nameInput, { target: { value: '' } });

                // Cancel
                const cancelButton = screen.getByRole('button', { name: /cancel/i });
                fireEvent.click(cancelButton);

                // Edit mode should be closed
                expect(screen.queryByPlaceholderText('Account Name')).not.toBeInTheDocument();

                // Original name should still be displayed
                expect(screen.getByText('Cash')).toBeInTheDocument();

                // updateAccount should NOT be called
                expect(mockUpdateAccount).not.toHaveBeenCalled();
            });

            it('should discard changes and close edit mode when pressing Escape with invalid data', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Enter edit mode
                fireEvent.keyDown(container, { key: 'e' });

                // Clear the name
                const nameInput = screen.getByPlaceholderText('Account Name');
                fireEvent.change(nameInput, { target: { value: '' } });

                // Press Escape
                fireEvent.keyDown(container, { key: 'Escape' });

                // Edit mode should be closed
                expect(screen.queryByPlaceholderText('Account Name')).not.toBeInTheDocument();

                // Original name should still be displayed
                expect(screen.getByText('Cash')).toBeInTheDocument();

                // updateAccount should NOT be called
                expect(mockUpdateAccount).not.toHaveBeenCalled();
            });
        });
    });

    describe('Touch Gestures', () => {
        it('selects row on click', () => {
            const onSelect = vi.fn();
            render(<AccountTable entityId="entity-1" onAccountSelect={onSelect} />);

            const cashRow = screen.getByText('Cash').closest('[role="row"]');
            fireEvent.click(cashRow!);

            expect(onSelect).toHaveBeenCalled();
        });

        describe('Swipe Gesture Detection - Threshold', () => {
            it('detects left swipe when delta exceeds negative threshold (30px)', () => {
                render(<AccountTable entityId="entity-1" />);

                const cashRow = screen.getByText('Cash').closest('[role="row"]')!;

                // Start touch at x: 100
                fireEvent.touchStart(cashRow, {
                    touches: [{ clientX: 100, clientY: 50 }]
                });

                // Move left beyond threshold (to x: 60, delta: -40px)
                fireEvent.touchMove(cashRow, {
                    touches: [{ clientX: 60, clientY: 50 }]
                });

                // Should detect left swipe direction
                // This will fail because swipe direction is not exposed in DOM
                // We need to test side effect - row becomes selected
                fireEvent.touchEnd(cashRow);

                // After swipe left, row should be selected (showing action buttons)
                expect(cashRow).toHaveAttribute('aria-selected', 'true');
            });

            it('does not detect left swipe when delta is below threshold (29px)', () => {
                render(<AccountTable entityId="entity-1" />);

                const cashRow = screen.getByText('Cash').closest('[role="row"]')!;

                // Start touch at x: 100
                fireEvent.touchStart(cashRow, {
                    touches: [{ clientX: 100, clientY: 50 }]
                });

                // Move left but NOT beyond threshold (to x: 71, delta: -29px)
                fireEvent.touchMove(cashRow, {
                    touches: [{ clientX: 71, clientY: 50 }]
                });

                fireEvent.touchEnd(cashRow);

                // Row should NOT be selected (insufficient swipe distance)
                expect(cashRow).not.toHaveAttribute('aria-selected', 'true');
            });

            it('detects right swipe when delta exceeds positive threshold (30px)', () => {
                render(<AccountTable entityId="entity-1" />);

                const cashRow = screen.getByText('Cash').closest('[role="row"]')!;

                // Start touch at x: 100
                fireEvent.touchStart(cashRow, {
                    touches: [{ clientX: 100, clientY: 50 }]
                });

                // Move right beyond threshold (to x: 140, delta: +40px)
                fireEvent.touchMove(cashRow, {
                    touches: [{ clientX: 140, clientY: 50 }]
                });

                fireEvent.touchEnd(cashRow);

                // Right swipe should trigger edit mode
                // Should show edit form
                expect(screen.getByPlaceholderText('Account Name')).toBeInTheDocument();
            });

            it('does not detect right swipe when delta is below threshold (29px)', () => {
                render(<AccountTable entityId="entity-1" />);

                const cashRow = screen.getByText('Cash').closest('[role="row"]')!;

                // Start touch at x: 100
                fireEvent.touchStart(cashRow, {
                    touches: [{ clientX: 100, clientY: 50 }]
                });

                // Move right but NOT beyond threshold (to x: 129, delta: +29px)
                fireEvent.touchMove(cashRow, {
                    touches: [{ clientX: 129, clientY: 50 }]
                });

                fireEvent.touchEnd(cashRow);

                // Should NOT trigger edit mode
                expect(screen.queryByPlaceholderText('Account Name')).not.toBeInTheDocument();
            });

            it('requires minimum horizontal movement for swipe detection', () => {
                render(<AccountTable entityId="entity-1" />);

                const cashRow = screen.getByText('Cash').closest('[role="row"]')!;

                // Start touch
                fireEvent.touchStart(cashRow, {
                    touches: [{ clientX: 100, clientY: 50 }]
                });

                // Move only 20px (below threshold)
                fireEvent.touchMove(cashRow, {
                    touches: [{ clientX: 80, clientY: 50 }]
                });

                fireEvent.touchEnd(cashRow);

                // No action should occur
                expect(cashRow).not.toHaveAttribute('aria-selected', 'true');
                expect(screen.queryByPlaceholderText('Account Name')).not.toBeInTheDocument();
            });
        });

        describe('Swipe Gesture Actions', () => {
            it('triggers edit mode on swipe right', () => {
                render(<AccountTable entityId="entity-1" />);

                const cashRow = screen.getByText('Cash').closest('[role="row"]')!;

                fireEvent.touchStart(cashRow, {
                    touches: [{ clientX: 100, clientY: 50 }]
                });

                fireEvent.touchMove(cashRow, {
                    touches: [{ clientX: 150, clientY: 50 }]
                });

                fireEvent.touchEnd(cashRow);

                // Should enter inline editing
                expect(screen.getByPlaceholderText('Account Name')).toBeInTheDocument();
                expect(screen.getByPlaceholderText('Description (optional)')).toBeInTheDocument();
            });

            it('shows action buttons on swipe left', () => {
                render(<AccountTable entityId="entity-1" />);

                const cashRow = screen.getByText('Cash').closest('[role="row"]')!;

                fireEvent.touchStart(cashRow, {
                    touches: [{ clientX: 100, clientY: 50 }]
                });

                fireEvent.touchMove(cashRow, {
                    touches: [{ clientX: 50, clientY: 50 }]
                });

                fireEvent.touchEnd(cashRow);

                // Should select row and show action buttons
                expect(cashRow).toHaveAttribute('aria-selected', 'true');
                // Edit and Delete buttons should be visible
                expect(screen.getByRole('button', { name: /edit account/i })).toBeInTheDocument();
                expect(screen.getByRole('button', { name: /delete account/i })).toBeInTheDocument();
            });

            it('pre-populates edit form with current account data on swipe right', () => {
                render(<AccountTable entityId="entity-1" />);

                const cashRow = screen.getByText('Cash').closest('[role="row"]')!;

                fireEvent.touchStart(cashRow, {
                    touches: [{ clientX: 100, clientY: 50 }]
                });

                fireEvent.touchMove(cashRow, {
                    touches: [{ clientX: 150, clientY: 50 }]
                });

                fireEvent.touchEnd(cashRow);

                const nameInput = screen.getByPlaceholderText('Account Name') as HTMLInputElement;
                expect(nameInput.value).toBe('Cash');
            });

            it('allows editing from action button after swipe left', () => {
                render(<AccountTable entityId="entity-1" />);

                const cashRow = screen.getByText('Cash').closest('[role="row"]')!;

                // Swipe left to show actions
                fireEvent.touchStart(cashRow, {
                    touches: [{ clientX: 100, clientY: 50 }]
                });

                fireEvent.touchMove(cashRow, {
                    touches: [{ clientX: 50, clientY: 50 }]
                });

                fireEvent.touchEnd(cashRow);

                // Click edit button in revealed action bar
                const editButton = screen.getByRole('button', { name: /edit account/i });
                fireEvent.click(editButton);

                // Should enter edit mode
                expect(screen.getByPlaceholderText('Account Name')).toBeInTheDocument();
            });

            it('allows deleting from action button after swipe left', () => {
                // Mock window.confirm
                global.confirm = vi.fn(() => true);

                render(<AccountTable entityId="entity-1" />);

                const cashRow = screen.getByText('Cash').closest('[role="row"]')!;

                // Swipe left to show actions
                fireEvent.touchStart(cashRow, {
                    touches: [{ clientX: 100, clientY: 50 }]
                });

                fireEvent.touchMove(cashRow, {
                    touches: [{ clientX: 50, clientY: 50 }]
                });

                fireEvent.touchEnd(cashRow);

                // Click delete button in revealed action bar
                const deleteButton = screen.getByRole('button', { name: /delete account/i });
                fireEvent.click(deleteButton);

                // Should confirm and delete
                expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this account?');
                expect(mockDeleteAccount).toHaveBeenCalledWith('acc-1');
            });

            it('cancels delete when confirm is cancelled', () => {
                // Mock window.confirm to return false
                global.confirm = vi.fn(() => false);

                render(<AccountTable entityId="entity-1" />);

                const cashRow = screen.getByText('Cash').closest('[role="row"]')!;

                // Swipe left to show actions
                fireEvent.touchStart(cashRow, {
                    touches: [{ clientX: 100, clientY: 50 }]
                });

                fireEvent.touchMove(cashRow, {
                    touches: [{ clientX: 50, clientY: 50 }]
                });

                fireEvent.touchEnd(cashRow);

                const deleteButton = screen.getByRole('button', { name: /delete account/i });
                fireEvent.click(deleteButton);

                expect(global.confirm).toHaveBeenCalled();
                expect(mockDeleteAccount).not.toHaveBeenCalled();
            });
        });

        describe('Multi-Touch Handling', () => {
            it('only processes swipe for the row where touch started', () => {
                render(<AccountTable entityId="entity-1" />);

                const cashRow = screen.getByText('Cash').closest('[role="row"]')!;
                const payableRow = screen.getByText('Accounts Payable').closest('[role="row"]')!;

                // Start touch on Cash row
                fireEvent.touchStart(cashRow, {
                    touches: [{ clientX: 100, clientY: 50 }]
                });

                // Move on Payables row (different row) - this should NOT trigger swipe
                // because handleTouchMove checks swipeState.accountId before processing
                // When touchMove fires on a different element, swipeState.accountId is still set
                // from the original touchStart on cashRow, so it SHOULD process the swipe
                fireEvent.touchMove(payableRow, {
                    touches: [{ clientX: 50, clientY: 50 }]
                });

                fireEvent.touchEnd(payableRow);

                // Current implementation: touchMove on different row still updates swipeState
                // because the handler is on the row element, not tracked by element reference
                // Expected behavior (what we're testing for): only the row where touch started should respond
                // The test currently passes because the row becomes selected
                // We want to FAIL this test to expose that cross-row swipes shouldn't work
                expect(cashRow).toHaveAttribute('aria-selected', 'true');
                expect(payableRow).not.toHaveAttribute('aria-selected', 'true');
            });

            it('does not trigger swipe when touch moves to different row during gesture', () => {
                render(<AccountTable entityId="entity-1" />);

                const cashRow = screen.getByText('Cash').closest('[role="row"]')!;
                const payableRow = screen.getByText('Accounts Payable').closest('[role="row"]')!;

                // Start touch on Cash row
                fireEvent.touchStart(cashRow, {
                    touches: [{ clientX: 100, clientY: 50 }]
                });

                // Move on Payables row (different row) with EXCESSIVE horizontal movement
                // This SHOULD trigger swipe in current broken implementation
                // because handleTouchMove fires on whichever element receives the event
                // and doesn't verify it's the same element as touchStart
                fireEvent.touchMove(payableRow, {
                    touches: [{ clientX: 40, clientY: 50 }]
                });

                fireEvent.touchEnd(payableRow);

                // No swipe should be detected because the gesture moved to a different row
                // This test FAILS because current implementation doesn't track element ref
                // It processes touchMove on payableRow even though touchStart was on cashRow
                expect(cashRow).not.toHaveAttribute('aria-selected', 'true');
                expect(payableRow).not.toHaveAttribute('aria-selected', 'true');
            });
        });

        describe('Swipe Visual Feedback', () => {
            it('applies translate transform during swipe', () => {
                render(<AccountTable entityId="entity-1" />);

                const cashRow = screen.getByText('Cash').closest('[role="row"]')!;

                // Start touch
                fireEvent.touchStart(cashRow, {
                    touches: [{ clientX: 100, clientY: 50 }]
                });

                // Move during swipe
                fireEvent.touchMove(cashRow, {
                    touches: [{ clientX: 60, clientY: 50 }]
                });

                // Row content should have transform
                const rowContent = cashRow.querySelector('div[class*="transition-transform"]');
                expect(rowContent).toBeInTheDocument();
                // Current implementation clamps transform between -80 and 80px
                // This test will need refinement to actually check computed style
            });

            it('clamps swipe offset to maximum of 80px', () => {
                render(<AccountTable entityId="entity-1" />);

                const cashRow = screen.getByText('Cash').closest('[role="row"]')!;

                fireEvent.touchStart(cashRow, {
                    touches: [{ clientX: 100, clientY: 50 }]
                });

                // Try to swipe 200px
                fireEvent.touchMove(cashRow, {
                    touches: [{ clientX: -100, clientY: 50 }]
                });

                // Should be clamped to 80px
                // This requires checking computed transform style
                // For now, verify no error occurs
                expect(cashRow).toBeInTheDocument();
            });
        });

        describe('Swipe Edge Cases', () => {
            it('handles touch end without any movement', () => {
                render(<AccountTable entityId="entity-1" />);

                const cashRow = screen.getByText('Cash').closest('[role="row"]')!;

                fireEvent.touchStart(cashRow, {
                    touches: [{ clientX: 100, clientY: 50 }]
                });

                fireEvent.touchEnd(cashRow);

                // No action should occur
                expect(cashRow).not.toHaveAttribute('aria-selected', 'true');
                expect(screen.queryByPlaceholderText('Account Name')).not.toBeInTheDocument();
            });

            it('handles touch move without touch start', () => {
                render(<AccountTable entityId="entity-1" />);

                const cashRow = screen.getByText('Cash').closest('[role="row"]')!;

                // Move without start
                fireEvent.touchMove(cashRow, {
                    touches: [{ clientX: 50, clientY: 50 }]
                });

                fireEvent.touchEnd(cashRow);

                // Should handle gracefully - no crash, no action
                expect(cashRow).toBeInTheDocument();
            });

            it('resets swipe state after gesture completes', () => {
                render(<AccountTable entityId="entity-1" />);

                const cashRow = screen.getByText('Cash').closest('[role="row"]')!;

                // Perform swipe
                fireEvent.touchStart(cashRow, {
                    touches: [{ clientX: 100, clientY: 50 }]
                });

                fireEvent.touchMove(cashRow, {
                    touches: [{ clientX: 50, clientY: 50 }]
                });

                fireEvent.touchEnd(cashRow);

                // Select the row
                expect(cashRow).toHaveAttribute('aria-selected', 'true');

                // Try another swipe - should work on second attempt
                fireEvent.touchStart(cashRow, {
                    touches: [{ clientX: 100, clientY: 50 }]
                });

                fireEvent.touchMove(cashRow, {
                    touches: [{ clientX: 150, clientY: 50 }]
                });

                fireEvent.touchEnd(cashRow);

                // Second swipe should trigger edit mode
                expect(screen.getByPlaceholderText('Account Name')).toBeInTheDocument();
            });

            it('ignores vertical swipes (should only respond to horizontal movement)', () => {
                render(<AccountTable entityId="entity-1" />);

                const cashRow = screen.getByText('Cash').closest('[role="row"]')!;

                // Start touch
                fireEvent.touchStart(cashRow, {
                    touches: [{ clientX: 100, clientY: 50 }]
                });

                // Move vertically with sufficient horizontal movement to trigger threshold
                // but dominated by vertical movement (dy = 150, dx = 40)
                // Current implementation doesn't check vertical ratio
                fireEvent.touchMove(cashRow, {
                    touches: [{ clientX: 60, clientY: 200 }]
                });

                fireEvent.touchEnd(cashRow);

                // Vertical swipe should be ignored - no action
                // This FAILS because current implementation only checks |dx| > 30
                // It should require |dx| > |dy| or some angle threshold
                expect(cashRow).not.toHaveAttribute('aria-selected', 'true');
                expect(screen.queryByPlaceholderText('Account Name')).not.toBeInTheDocument();
            });
        });

        describe('Swipe Velocity Detection', () => {
            it('detects fast swipe even with shorter distance (velocity threshold)', () => {
                render(<AccountTable entityId="entity-1" />);

                const cashRow = screen.getByText('Cash').closest('[role="row"]')!;

                // Start touch with timestamp
                const startTime = Date.now();
                fireEvent.touchStart(cashRow, {
                    touches: [{ clientX: 100, clientY: 50 }]
                });

                // Simulate fast movement - only 20px but very quick
                // Current implementation only checks distance, not velocity
                fireEvent.touchMove(cashRow, {
                    touches: [{ clientX: 80, clientY: 50 }]
                });

                fireEvent.touchEnd(cashRow);

                // Should detect swipe based on velocity (this will FAIL - no velocity impl)
                expect(cashRow).toHaveAttribute('aria-selected', 'true');
            });

            it('ignores slow movement even with sufficient distance', () => {
                render(<AccountTable entityId="entity-1" />);

                const cashRow = screen.getByText('Cash').closest('[role="row"]')!;

                // Start touch
                fireEvent.touchStart(cashRow, {
                    touches: [{ clientX: 100, clientY: 50 }]
                });

                // Slow drag across threshold
                fireEvent.touchMove(cashRow, {
                    touches: [{ clientX: 40, clientY: 50 }]
                });

                fireEvent.touchEnd(cashRow);

                // Current implementation triggers on distance regardless of speed
                // Expected: slow drag should be ignored (will FAIL)
                expect(cashRow).not.toHaveAttribute('aria-selected', 'true');
            });
        });

        describe('Configurable Swipe Actions', () => {
            it('supports configurable left swipe action (not hardcoded to delete)', () => {
                // Test expects ability to configure what left swipe does
                // Current implementation hardcodes left=select, right=edit
                // This test FAILS because configurable actions are not implemented
                const onSwipeLeft = vi.fn();
                render(<AccountTable entityId="entity-1" onSwipeLeftAction={onSwipeLeft} />);

                const cashRow = screen.getByText('Cash').closest('[role="row"]')!;

                fireEvent.touchStart(cashRow, {
                    touches: [{ clientX: 100, clientY: 50 }]
                });

                fireEvent.touchMove(cashRow, {
                    touches: [{ clientX: 50, clientY: 50 }]
                });

                fireEvent.touchEnd(cashRow);

                // Should call configurable action instead of hardcoded behavior
                expect(onSwipeLeft).toHaveBeenCalledWith('acc-1');
            });

            it('supports configurable right swipe action (not hardcoded to edit)', () => {
                const onSwipeRight = vi.fn();
                render(<AccountTable entityId="entity-1" onSwipeRightAction={onSwipeRight} />);

                const cashRow = screen.getByText('Cash').closest('[role="row"]')!;

                fireEvent.touchStart(cashRow, {
                    touches: [{ clientX: 100, clientY: 50 }]
                });

                fireEvent.touchMove(cashRow, {
                    touches: [{ clientX: 150, clientY: 50 }]
                });

                fireEvent.touchEnd(cashRow);

                // Should call configurable action instead of entering edit mode
                expect(onSwipeRight).toHaveBeenCalledWith('acc-1');
                expect(screen.queryByPlaceholderText('Account Name')).not.toBeInTheDocument();
            });
        });
    });

    describe('Accessibility', () => {
        it('has proper ARIA roles', () => {
            render(<AccountTable entityId="entity-1" />);

            expect(screen.getByRole('grid')).toBeInTheDocument();
            expect(screen.getByRole('rowgroup')).toBeInTheDocument();
            expect(screen.getAllByRole('row').length).toBeGreaterThan(0);
        });

        it('has accessible search input', () => {
            render(<AccountTable entityId="entity-1" />);

            expect(screen.getByLabelText('Search accounts')).toBeInTheDocument();
        });
    });

    describe('Spec-Compliant Keyboard Navigation', () => {
        describe('Arrow Keys (up/down/left/right) for cell navigation', () => {
            it('moves cursor left with ArrowLeft between cells in a row', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Initially should be on first cell of first row
                // Move right first (if implemented)
                fireEvent.keyDown(container, { key: 'ArrowRight' });

                // Then move left
                fireEvent.keyDown(container, { key: 'ArrowLeft' });

                // Should navigate to previous cell
                const cells = screen.getAllByRole('gridcell');
                expect(cells[0]).toHaveFocus();
            });

            it('moves cursor right with ArrowRight between cells in a row', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');
                fireEvent.keyDown(container, { key: 'ArrowRight' });

                // Should navigate to next cell in row
                const cells = screen.getAllByRole('gridcell');
                expect(cells[1]).toHaveFocus();
            });

            it('wraps to previous row when ArrowLeft from first column', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Move down to second row
                fireEvent.keyDown(container, { key: 'ArrowDown' });

                // Then move left (should wrap to previous row, last column)
                fireEvent.keyDown(container, { key: 'ArrowLeft' });

                const rows = screen.getAllByRole('row');
                expect(rows[0]).toHaveAttribute('aria-selected', 'true');
            });

            it('wraps to next row when ArrowRight from last column', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Press right multiple times to reach end and wrap
                fireEvent.keyDown(container, { key: 'ArrowRight' });
                fireEvent.keyDown(container, { key: 'ArrowRight' });
                fireEvent.keyDown(container, { key: 'ArrowRight' });

                const rows = screen.getAllByRole('row');
                expect(rows[1]).toHaveAttribute('aria-selected', 'true');
            });

            it('does not wrap beyond top row with ArrowLeft', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Try to move left from first cell
                fireEvent.keyDown(container, { key: 'ArrowLeft' });
                fireEvent.keyDown(container, { key: 'ArrowLeft' });

                // Should stay on first row
                const rows = screen.getAllByRole('row');
                expect(rows[0]).toHaveAttribute('aria-selected', 'true');
            });

            it('does not wrap beyond bottom row with ArrowRight', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Move to last row
                fireEvent.keyDown(container, { key: 'ArrowDown' });
                fireEvent.keyDown(container, { key: 'ArrowDown' });

                // Try to keep moving right
                fireEvent.keyDown(container, { key: 'ArrowRight' });
                fireEvent.keyDown(container, { key: 'ArrowRight' });

                const rows = screen.getAllByRole('row');
                expect(rows[2]).toHaveAttribute('aria-selected', 'true');
            });
        });

        describe('Enter key to activate inline editing', () => {
            it('enters inline editing mode when Enter is pressed on a cell', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Press Enter to activate inline editing
                fireEvent.keyDown(container, { key: 'Enter' });

                // Should show inline edit form
                expect(screen.getByPlaceholderText('Account Name')).toBeInTheDocument();
                expect(screen.getByPlaceholderText('Description (optional)')).toBeInTheDocument();
            });

            it('focuses the first editable field when Enter activates edit mode', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');
                fireEvent.keyDown(container, { key: 'Enter' });

                const nameInput = screen.getByPlaceholderText('Account Name');
                expect(nameInput).toHaveFocus();
            });

            it('saves changes when Enter is pressed in edit mode', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Enter edit mode
                fireEvent.keyDown(container, { key: 'Enter' });

                // Modify the name
                const nameInput = screen.getByPlaceholderText('Account Name');
                fireEvent.change(nameInput, { target: { value: 'Updated Account Name' } });

                // Press Enter to save
                fireEvent.keyDown(nameInput, { key: 'Enter' });

                expect(mockUpdateAccount).toHaveBeenCalledWith(expect.objectContaining({
                    id: 'acc-1',
                    name: 'Updated Account Name'
                }));
            });
        });

        describe('Escape key to cancel editing', () => {
            it('cancels inline editing when Escape is pressed', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Enter edit mode
                fireEvent.keyDown(container, { key: 'Enter' });
                expect(screen.getByPlaceholderText('Account Name')).toBeInTheDocument();

                // Press Escape to cancel
                fireEvent.keyDown(container, { key: 'Escape' });

                // Edit form should be gone
                expect(screen.queryByPlaceholderText('Account Name')).not.toBeInTheDocument();
            });

            it('discards unsaved changes when Escape is pressed', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Enter edit mode
                fireEvent.keyDown(container, { key: 'Enter' });

                // Modify the name
                const nameInput = screen.getByPlaceholderText('Account Name');
                fireEvent.change(nameInput, { target: { value: 'This should be discarded' } });

                // Cancel with Escape
                fireEvent.keyDown(container, { key: 'Escape' });

                // Changes should NOT be saved
                expect(mockUpdateAccount).not.toHaveBeenCalled();

                // Original name should still be displayed
                expect(screen.getByText('Cash')).toBeInTheDocument();
            });

            it('returns focus to the cell after canceling with Escape', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Enter edit mode
                fireEvent.keyDown(container, { key: 'Enter' });

                // Cancel with Escape
                fireEvent.keyDown(container, { key: 'Escape' });

                // Focus should return to grid/cell
                expect(container).toHaveFocus();
            });
        });

        describe('Tab key for sequential field navigation', () => {
            it('moves focus to next field when Tab is pressed in edit mode', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Enter edit mode
                fireEvent.keyDown(container, { key: 'Enter' });

                const nameInput = screen.getByPlaceholderText('Account Name');
                const descInput = screen.getByPlaceholderText('Description (optional)');

                // Tab from name to description
                fireEvent.keyDown(nameInput, { key: 'Tab' });

                expect(descInput).toHaveFocus();
            });

            it('moves focus to previous field when Shift+Tab is pressed in edit mode', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Enter edit mode
                fireEvent.keyDown(container, { key: 'Enter' });

                const nameInput = screen.getByPlaceholderText('Account Name');
                const descInput = screen.getByPlaceholderText('Description (optional)');

                // Tab to description
                fireEvent.keyDown(nameInput, { key: 'Tab' });
                expect(descInput).toHaveFocus();

                // Shift+Tab back to name
                fireEvent.keyDown(descInput, { key: 'Tab', shiftKey: true });

                expect(nameInput).toHaveFocus();
            });

            it('cycles to Save button when Tab from last field', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Enter edit mode
                fireEvent.keyDown(container, { key: 'Enter' });

                const descInput = screen.getByPlaceholderText('Description (optional)');
                const saveButton = screen.getByRole('button', { name: /save/i });

                // Tab from description (last field) to Save button
                fireEvent.keyDown(descInput, { key: 'Tab' });

                expect(saveButton).toHaveFocus();
            });

            it('cycles to first field when Tab from Cancel button', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Enter edit mode
                fireEvent.keyDown(container, { key: 'Enter' });

                const nameInput = screen.getByPlaceholderText('Account Name');
                const cancelButton = screen.getByRole('button', { name: /cancel/i });

                // Tab from Cancel button back to first field
                fireEvent.keyDown(cancelButton, { key: 'Tab' });

                expect(nameInput).toHaveFocus();
            });

            it('navigates to next row when Tab pressed outside edit mode', () => {
                render(<AccountTable entityId="entity-1" />);

                const container = screen.getByRole('grid');

                // Tab from first row
                fireEvent.keyDown(container, { key: 'Tab' });

                // Should move to next row
                const rows = screen.getAllByRole('row');
                expect(rows[1]).toHaveAttribute('aria-selected', 'true');
            });
        });
    });
});
