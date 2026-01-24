/**
 * Tests for BofaBalanceWidget Component
 *
 * Test file following TDD principles:
 * 1. Fetch balance on mount
 * 2. Display loading state
 * 3. Display balance information
 * 4. Handle errors with retry
 * 5. Refresh on button click
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BofaBalanceWidget } from './BofaBalanceWidget';

// Mock fetch
global.fetch = vi.fn();

describe('BofaBalanceWidget Component', () => {
  const mockBalance = {
    accountNumber: '****1234',
    availableBalance: 50000.00,
    currentBalance: 52500.00,
    currency: 'USD',
    asOfDate: '2026-01-24'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner on mount', () => {
      (global.fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<BofaBalanceWidget />);

      expect(screen.getByText('Loading balance...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument(); // Refresh button
    });

    it('should show RefreshCw icon in loading state', () => {
      (global.fetch as any).mockImplementation(() => new Promise(() => {}));

      render(<BofaBalanceWidget />);

      const loadingIcon = document.querySelector('.animate-spin');
      expect(loadingIcon).toBeInTheDocument();
    });
  });

  describe('Balance Display', () => {
    beforeEach(() => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockBalance
      });
    });

    it('should fetch balance on mount', async () => {
      render(<BofaBalanceWidget />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/settlement/bofa/balance');
      });
    });

    it('should display account number masked', async () => {
      render(<BofaBalanceWidget />);

      await waitFor(() => {
        expect(screen.getByText('****1234')).toBeInTheDocument();
      });
    });

    it('should display available balance formatted as currency', async () => {
      render(<BofaBalanceWidget />);

      await waitFor(() => {
        expect(screen.getByText('$50,000.00')).toBeInTheDocument();
      });
    });

    it('should display current balance formatted as currency', async () => {
      render(<BofaBalanceWidget />);

      await waitFor(() => {
        expect(screen.getByText('$52,500.00')).toBeInTheDocument();
      });
    });

    it('should display Bank of America header', async () => {
      render(<BofaBalanceWidget />);

      await waitFor(() => {
        expect(screen.getByText('Bank of America')).toBeInTheDocument();
        expect(screen.getByText('CashPro Settlement Account')).toBeInTheDocument();
      });
    });

    it('should display as-of date', async () => {
      render(<BofaBalanceWidget />);

      await waitFor(() => {
        expect(screen.getByText(/As of/)).toBeInTheDocument();
      });
    });

    it('should show pending difference when balances differ', async () => {
      render(<BofaBalanceWidget />);

      await waitFor(() => {
        expect(screen.getByText(/Pending Difference/)).toBeInTheDocument();
        expect(screen.getByText('$2,500.00')).toBeInTheDocument(); // Difference
      });
    });

    it('should use custom accountId when provided', async () => {
      render(<BofaBalanceWidget accountId="CUSTOM-ACCT" />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/settlement/bofa/balance?accountId=CUSTOM-ACCT'
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when fetch fails', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      render(<BofaBalanceWidget />);

      await waitFor(() => {
        expect(screen.getByText('Balance Unavailable')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should display error message for non-OK response', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: 'Unauthorized'
      });

      render(<BofaBalanceWidget />);

      await waitFor(() => {
        expect(screen.getByText('Balance Unavailable')).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      (global.fetch as any).mockRejectedValue(new Error('API Error'));

      render(<BofaBalanceWidget />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should retry fetch when retry button clicked', async () => {
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockBalance
        });

      render(<BofaBalanceWidget />);

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      // Should see balance after retry
      await waitFor(() => {
        expect(screen.getByText('$50,000.00')).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Refresh Functionality', () => {
    beforeEach(() => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockBalance
      });
    });

    it('should refresh balance when refresh button clicked', async () => {
      render(<BofaBalanceWidget />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('$50,000.00')).toBeInTheDocument();
      });

      // Clear mock to track refresh call
      vi.clearAllMocks();
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ ...mockBalance, availableBalance: 60000 })
      });

      // Find and click refresh button (top right in header)
      const refreshButtons = screen.getAllByRole('button');
      const headerRefreshButton = refreshButtons.find(btn =>
        btn.querySelector('svg') && btn.getAttribute('title') === 'Refresh balance'
      );

      expect(headerRefreshButton).toBeInTheDocument();
      fireEvent.click(headerRefreshButton!);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/settlement/bofa/balance');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero balance', async () => {
      const zeroBalance = { ...mockBalance, availableBalance: 0, currentBalance: 0 };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => zeroBalance
      });

      render(<BofaBalanceWidget />);

      await waitFor(() => {
        expect(screen.getByText('$0.00')).toBeInTheDocument();
      });
    });

    it('should not show pending difference when balances are equal', async () => {
      const equalBalance = { ...mockBalance, availableBalance: 50000, currentBalance: 50000 };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => equalBalance
      });

      render(<BofaBalanceWidget />);

      await waitFor(() => {
        expect(screen.queryByText(/Pending Difference/)).not.toBeInTheDocument();
      });
    });

    it('should handle invalid date format', async () => {
      const invalidDateBalance = { ...mockBalance, asOfDate: 'invalid-date' };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => invalidDateBalance
      });

      render(<BofaBalanceWidget />);

      await waitFor(() => {
        expect(screen.getByText(/invalid-date/)).toBeInTheDocument();
      });
    });
  });
});
