/**
 * Tests for CAFR Search Component
 *
 * Test file following TDD principles:
 * 1. Search by entity name
 * 2. Search by state filter
 * 3. Search by fiscal year filter
 * 4. Combined filter search
 * 5. Error handling
 * 6. Loading states
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CAFRSearch } from './CAFRSearch';
import * as cafrApiClient from '../services/cafrApiClient';

// Mock CAFR API client
vi.mock('../services/cafrApiClient', () => ({
  cafrApi: {
    search: vi.fn(),
    getDocument: vi.fn(),
    getPdfUrl: vi.fn(),
    getFinancialSummary: vi.fn(),
    getStates: () => [
      { code: 'CA', name: 'California' },
      { code: 'NY', name: 'New York' },
      { code: 'TX', name: 'Texas' },
    ],
    getFiscalYears: () => [2025, 2024, 2023, 2022, 2021],
  },
}));

describe('CAFRSearch Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render search form with entity name input', () => {
      render(<CAFRSearch />);

      expect(screen.getByText('CAFR Search')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('City of Anytown')).toBeInTheDocument();
    });

    it('should render state dropdown with options', () => {
      render(<CAFRSearch />);

      const stateSelect = screen.getByLabelText(/state/i);
      expect(stateSelect).toBeInTheDocument();

      // Check for state options
      expect(screen.getByText('California')).toBeInTheDocument();
      expect(screen.getByText('New York')).toBeInTheDocument();
    });

    it('should render fiscal year dropdown with options', () => {
      render(<CAFRSearch />);

      const yearSelect = screen.getByLabelText(/fiscal year/i);
      expect(yearSelect).toBeInTheDocument();

      // Check for year options
      expect(screen.getByText('2025')).toBeInTheDocument();
      expect(screen.getByText('2024')).toBeInTheDocument();
    });

    it('should render search button', () => {
      render(<CAFRSearch />);

      expect(screen.getByText('Search CAFRs')).toBeInTheDocument();
    });
  });

  describe('Search by Entity Name', () => {
    it('should call search API with entity name', async () => {
      (cafrApiClient.cafrApi.search as any).mockResolvedValue({
        documents: [],
        totalCount: 0,
        page: 1,
        pageSize: 20
      });

      render(<CAFRSearch />);

      const entityInput = screen.getByPlaceholderText('City of Anytown');
      fireEvent.change(entityInput, { target: { value: 'City of Los Angeles' } });
      fireEvent.click(screen.getByText('Search CAFRs'));

      await waitFor(() => {
        expect(cafrApiClient.cafrApi.search).toHaveBeenCalledWith(
          expect.objectContaining({ entityName: 'City of Los Angeles' })
        );
      });
    });

    it('should display search results for entity name', async () => {
      (cafrApiClient.cafrApi.search as any).mockResolvedValue({
        documents: [
          {
            id: 'cafr-001',
            entityName: 'City of Los Angeles',
            entityType: 'city',
            state: 'CA',
            fiscalYear: 2024,
            filingDate: '2024-06-30',
            pdfUrl: 'https://example.com/cafr.pdf'
          }
        ],
        totalCount: 1,
        page: 1,
        pageSize: 20
      });

      render(<CAFRSearch />);

      const entityInput = screen.getByPlaceholderText('City of Anytown');
      fireEvent.change(entityInput, { target: { value: 'Los Angeles' } });
      fireEvent.click(screen.getByText('Search CAFRs'));

      await waitFor(() => {
        expect(screen.getByText('City of Los Angeles')).toBeInTheDocument();
        expect(screen.getByText('CA')).toBeInTheDocument();
        expect(screen.getByText('FY 2024')).toBeInTheDocument();
      });
    });

    it('should show result count', async () => {
      (cafrApiClient.cafrApi.search as any).mockResolvedValue({
        documents: [
          { id: 'cafr-001', entityName: 'Test City 1', entityType: 'city', state: 'CA', fiscalYear: 2024, filingDate: '2024-06-30', pdfUrl: '' },
          { id: 'cafr-002', entityName: 'Test City 2', entityType: 'city', state: 'NY', fiscalYear: 2024, filingDate: '2024-06-30', pdfUrl: '' }
        ],
        totalCount: 2,
        page: 1,
        pageSize: 20
      });

      render(<CAFRSearch />);

      fireEvent.change(screen.getByPlaceholderText('City of Anytown'), { target: { value: 'Test' } });
      fireEvent.click(screen.getByText('Search CAFRs'));

      await waitFor(() => {
        expect(screen.getByText('Results (2)')).toBeInTheDocument();
      });
    });

    it('should trigger search on Enter key', async () => {
      (cafrApiClient.cafrApi.search as any).mockResolvedValue({
        documents: [],
        totalCount: 0,
        page: 1,
        pageSize: 20
      });

      render(<CAFRSearch />);

      const entityInput = screen.getByPlaceholderText('City of Anytown');
      fireEvent.change(entityInput, { target: { value: 'Search Term' } });
      fireEvent.keyDown(entityInput, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(cafrApiClient.cafrApi.search).toHaveBeenCalled();
      });
    });
  });

  describe('Search by State Filter', () => {
    it('should call search API with state filter', async () => {
      (cafrApiClient.cafrApi.search as any).mockResolvedValue({
        documents: [],
        totalCount: 0,
        page: 1,
        pageSize: 20
      });

      render(<CAFRSearch />);

      // Need to also enter entity name since search requires at least one criteria
      fireEvent.change(screen.getByPlaceholderText('City of Anytown'), { target: { value: 'City' } });

      const stateSelect = screen.getByLabelText(/state/i);
      fireEvent.change(stateSelect, { target: { value: 'CA' } });
      fireEvent.click(screen.getByText('Search CAFRs'));

      await waitFor(() => {
        expect(cafrApiClient.cafrApi.search).toHaveBeenCalledWith(
          expect.objectContaining({ state: 'CA' })
        );
      });
    });

    it('should filter results by state', async () => {
      (cafrApiClient.cafrApi.search as any).mockResolvedValue({
        documents: [
          { id: 'cafr-001', entityName: 'City of Sacramento', entityType: 'city', state: 'CA', fiscalYear: 2024, filingDate: '2024-06-30', pdfUrl: '' },
          { id: 'cafr-002', entityName: 'City of San Diego', entityType: 'city', state: 'CA', fiscalYear: 2024, filingDate: '2024-06-30', pdfUrl: '' }
        ],
        totalCount: 2,
        page: 1,
        pageSize: 20
      });

      render(<CAFRSearch />);

      const stateSelect = screen.getByLabelText(/state/i);
      fireEvent.change(stateSelect, { target: { value: 'CA' } });
      fireEvent.click(screen.getByText('Search CAFRs'));

      await waitFor(() => {
        expect(screen.getByText('City of Sacramento')).toBeInTheDocument();
        expect(screen.getByText('City of San Diego')).toBeInTheDocument();
      });
    });
  });

  describe('Search by Fiscal Year', () => {
    it('should call search API with fiscal year filter', async () => {
      (cafrApiClient.cafrApi.search as any).mockResolvedValue({
        documents: [],
        totalCount: 0,
        page: 1,
        pageSize: 20
      });

      render(<CAFRSearch />);

      // Need to also enter entity name since search requires at least one criteria
      fireEvent.change(screen.getByPlaceholderText('City of Anytown'), { target: { value: 'City' } });

      const yearSelect = screen.getByLabelText(/fiscal year/i);
      fireEvent.change(yearSelect, { target: { value: '2024' } });
      fireEvent.click(screen.getByText('Search CAFRs'));

      await waitFor(() => {
        expect(cafrApiClient.cafrApi.search).toHaveBeenCalledWith(
          expect.objectContaining({ fiscalYear: 2024 })
        );
      });
    });

    it('should filter results by fiscal year', async () => {
      (cafrApiClient.cafrApi.search as any).mockResolvedValue({
        documents: [
          { id: 'cafr-001', entityName: 'Test City', entityType: 'city', state: 'CA', fiscalYear: 2024, filingDate: '2024-06-30', pdfUrl: '' }
        ],
        totalCount: 1,
        page: 1,
        pageSize: 20
      });

      render(<CAFRSearch />);

      const yearSelect = screen.getByLabelText(/fiscal year/i);
      fireEvent.change(yearSelect, { target: { value: '2024' } });
      fireEvent.click(screen.getByText('Search CAFRs'));

      await waitFor(() => {
        expect(screen.getByText('FY 2024')).toBeInTheDocument();
      });
    });
  });

  describe('Combined Filters', () => {
    it('should call search API with multiple filters', async () => {
      (cafrApiClient.cafrApi.search as any).mockResolvedValue({
        documents: [],
        totalCount: 0,
        page: 1,
        pageSize: 20
      });

      render(<CAFRSearch />);

      fireEvent.change(screen.getByPlaceholderText('City of Anytown'), { target: { value: 'Los Angeles' } });

      const stateSelect = screen.getByLabelText(/state/i);
      fireEvent.change(stateSelect, { target: { value: 'CA' } });

      const yearSelect = screen.getByLabelText(/fiscal year/i);
      fireEvent.change(yearSelect, { target: { value: '2024' } });

      fireEvent.click(screen.getByText('Search CAFRs'));

      await waitFor(() => {
        expect(cafrApiClient.cafrApi.search).toHaveBeenCalledWith(
          expect.objectContaining({
            entityName: 'Los Angeles',
            state: 'CA',
            fiscalYear: 2024
          })
        );
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator during search', async () => {
      // Make search hang to see loading state
      (cafrApiClient.cafrApi.search as any).mockImplementation(
        () => new Promise(() => {})
      );

      render(<CAFRSearch />);

      fireEvent.change(screen.getByPlaceholderText('City of Anytown'), { target: { value: 'Test' } });
      fireEvent.click(screen.getByText('Search CAFRs'));

      await waitFor(() => {
        expect(screen.getByText('Searching...')).toBeInTheDocument();
      });
    });

    it('should disable search button during loading', async () => {
      (cafrApiClient.cafrApi.search as any).mockImplementation(
        () => new Promise(() => {})
      );

      render(<CAFRSearch />);

      fireEvent.change(screen.getByPlaceholderText('City of Anytown'), { target: { value: 'Test' } });
      fireEvent.click(screen.getByText('Search CAFRs'));

      await waitFor(() => {
        const searchButton = screen.getByRole('button', { name: /searching/i });
        expect(searchButton).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error when search fails', async () => {
      (cafrApiClient.cafrApi.search as any).mockRejectedValue(
        new Error('Network error: Unable to connect')
      );

      render(<CAFRSearch />);

      fireEvent.change(screen.getByPlaceholderText('City of Anytown'), { target: { value: 'Test' } });
      fireEvent.click(screen.getByText('Search CAFRs'));

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });

    it('should show error when no search criteria entered', async () => {
      render(<CAFRSearch />);

      fireEvent.click(screen.getByText('Search CAFRs'));

      await waitFor(() => {
        expect(screen.getByText(/enter at least one search criteria/i)).toBeInTheDocument();
      });
    });

    it('should clear error when new search is initiated', async () => {
      (cafrApiClient.cafrApi.search as any)
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({ documents: [], totalCount: 0, page: 1, pageSize: 20 });

      render(<CAFRSearch />);

      // First search - error
      fireEvent.change(screen.getByPlaceholderText('City of Anytown'), { target: { value: 'Test' } });
      fireEvent.click(screen.getByText('Search CAFRs'));

      await waitFor(() => {
        expect(screen.getByText(/First error/i)).toBeInTheDocument();
      });

      // Second search - clears error
      fireEvent.click(screen.getByText('Search CAFRs'));

      await waitFor(() => {
        expect(screen.queryByText(/First error/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('No Results', () => {
    it('should display no results message when search returns empty', async () => {
      (cafrApiClient.cafrApi.search as any).mockResolvedValue({
        documents: [],
        totalCount: 0,
        page: 1,
        pageSize: 20
      });

      render(<CAFRSearch />);

      fireEvent.change(screen.getByPlaceholderText('City of Anytown'), { target: { value: 'NonexistentCity' } });
      fireEvent.click(screen.getByText('Search CAFRs'));

      await waitFor(() => {
        expect(screen.getByText(/No CAFRs found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Document Selection', () => {
    it('should call onSelectDocument when clicking a result', async () => {
      const mockOnSelect = vi.fn();
      const mockDocument = {
        id: 'cafr-001',
        entityName: 'City of Test',
        entityType: 'city' as const,
        state: 'CA',
        fiscalYear: 2024,
        filingDate: '2024-06-30',
        pdfUrl: 'https://example.com/cafr.pdf'
      };

      (cafrApiClient.cafrApi.search as any).mockResolvedValue({
        documents: [mockDocument],
        totalCount: 1,
        page: 1,
        pageSize: 20
      });

      render(<CAFRSearch onSelectDocument={mockOnSelect} />);

      fireEvent.change(screen.getByPlaceholderText('City of Anytown'), { target: { value: 'Test' } });
      fireEvent.click(screen.getByText('Search CAFRs'));

      await waitFor(() => {
        expect(screen.getByText('City of Test')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('City of Test'));

      expect(mockOnSelect).toHaveBeenCalledWith(mockDocument);
    });
  });
});
