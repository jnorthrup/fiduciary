import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AffidavitEditor } from './AffidavitEditor';

describe('AffidavitEditor', () => {

    it('renders editor and template selector', () => {
        render(<AffidavitEditor />);
        expect(screen.getByText('Draft Affidavit')).toBeInTheDocument();
        expect(screen.getByText('Select Template')).toBeInTheDocument();
        // Check default template input
        expect(screen.getByText('Entity Name')).toBeInTheDocument();
    });

    it('switches template fields on selection', () => {
        render(<AffidavitEditor />);

        const templateSelect = screen.getByRole('combobox', { name: "Select Template" });

        fireEvent.change(templateSelect, { target: { value: 'OriginalIssuer' } });

        expect(screen.getByText('Instrument Date')).toBeInTheDocument();
        expect(screen.getByText('Creditor Name')).toBeInTheDocument();
        expect(screen.queryByText('Entity Name')).not.toBeInTheDocument();
    });

    it('updates text input and renders preview', async () => {
        render(<AffidavitEditor />);

        // Fill all required fields for OC10Capacity to trigger render
        const inputs = screen.getAllByRole('textbox');
        const name = inputs[0];
        const title = inputs[1]; // Title
        const entity = inputs[2]; // Entity Name

        fireEvent.change(name, { target: { value: 'Jane Tester' } });
        fireEvent.change(title, { target: { value: 'Manager' } });
        fireEvent.change(entity, { target: { value: 'Test Corp' } });

        // Preview should update (checking for name in preview pane)
        const previews = await screen.findAllByText('Jane Tester');
        expect(previews.length).toBeGreaterThan(0);
    });

    it('displays validation errors for missing fields', async () => {
        render(<AffidavitEditor />);

        // Initially, fields are empty, so validation should show errors
        expect(await screen.findByText('Validation Issues:')).toBeInTheDocument();
        expect(screen.getByText('Affiant Name is required.')).toBeInTheDocument();

        // Also check for inline error style (red border or text presence)
        const nameInput = screen.getByRole('textbox', { name: "Affiant Name" });
        expect(nameInput.className).toContain('border-red-500');
    });

    it('clears validation error when field is filled', async () => {
        render(<AffidavitEditor />);

        const nameInput = screen.getByRole('textbox', { name: "Affiant Name" });
        fireEvent.change(nameInput, { target: { value: 'Valid Name' } });

        // Wait for validation to re-run and error to disappear from the list
        await waitFor(() => {
            expect(screen.queryByText('Affiant Name is required.')).not.toBeInTheDocument();
        });

        expect(nameInput.className).not.toContain('border-red-500');
    });
});
