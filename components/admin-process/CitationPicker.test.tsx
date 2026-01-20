import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CitationPicker } from './CitationPicker';
import * as CitationDatabase from '../../types/citation-database';

// Mock the citation database search
vi.mock('../../types/citation-database', async (importOriginal) => {
    const actual = await importOriginal<typeof CitationDatabase>();
    return {
        ...actual,
        searchCitations: vi.fn(),
    };
});

describe('CitationPicker', () => {
    const mockOnSelect = vi.fn();
    const mockOnCancel = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders search input', () => {
        render(<CitationPicker onSelect={mockOnSelect} onCancel={mockOnCancel} />);
        expect(screen.getByPlaceholderText(/Search statutes, cases/i)).toBeInTheDocument();
        expect(screen.getByText('Add Citation')).toBeInTheDocument();
    });

    it('debounces search and displays results', async () => {
        const mockResults: any[] = [
            { type: 'statute', title: 'Test Statute', section: '1.0', url: 'http://example.com' }
        ];
        (CitationDatabase.searchCitations as any).mockReturnValue(mockResults);

        render(<CitationPicker onSelect={mockOnSelect} onCancel={mockOnCancel} />);

        const input = screen.getByPlaceholderText(/Search statutes, cases/i);
        fireEvent.change(input, { target: { value: 'Test' } });

        // Should not search immediately
        expect(CitationDatabase.searchCitations).not.toHaveBeenCalled();

        // Wait for debounce
        await waitFor(() => {
            expect(CitationDatabase.searchCitations).toHaveBeenCalledWith('Test');
        }, { timeout: 400 });

        expect(screen.getByText('Test Statute')).toBeInTheDocument();
    });

    it('calls onSelect when a citation is clicked', async () => {
        const mockResult: any =
            { type: 'statute', title: 'Selectable Statute', section: '2.0', url: 'http://example.com' };

        (CitationDatabase.searchCitations as any).mockReturnValue([mockResult]);

        render(<CitationPicker onSelect={mockOnSelect} onCancel={mockOnCancel} />);

        const input = screen.getByPlaceholderText(/Search statutes, cases/i);
        fireEvent.change(input, { target: { value: 'Selectable' } });

        await waitFor(() => screen.findByText('Selectable Statute'));

        fireEvent.click(screen.getByText('Selectable Statute'));
        expect(mockOnSelect).toHaveBeenCalledWith(mockResult);
    });

    it('calls onCancel when close button is clicked', () => {
        render(<CitationPicker onSelect={mockOnSelect} onCancel={mockOnCancel} />);

        fireEvent.click(screen.getByRole('button', { name: /×/ })); // or find by text using &times; representation if needed, usually text content is sufficient
        expect(mockOnCancel).toHaveBeenCalled();
    });
});
