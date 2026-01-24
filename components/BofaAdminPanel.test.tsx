/**
 * Tests for BofaAdminPanel Component
 *
 * Test file for BOFA Admin Panel with confirmation modals
 * Phase: Manual BOFA CRUD Operations
 * Track: bofa_cashpro_20260123
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BofaAdminPanel } from './BofaAdminPanel';

// Mock fetch
global.fetch = vi.fn();

describe('BofaAdminPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetch).mockClear();
  });

  describe('Tab Navigation', () => {
    it('should render all operation tabs', () => {
      render(<BofaAdminPanel />);

      expect(screen.getByText('Balance Inquiry')).toBeInTheDocument();
      expect(screen.getByText('Account Validation')).toBeInTheDocument();
      expect(screen.getByText('ACH Submission')).toBeInTheDocument();
      expect(screen.getByText('Payment Status')).toBeInTheDocument();
    });

    it('should switch tabs on click', async () => {
      render(<BofaAdminPanel />);

      expect(screen.getByText('Account ID'))?.toBeInTheDocument();

      fireEvent.click(screen.getByText('Account Validation'));

      await waitFor(() => {
        expect(screen.getByText('Routing Number')).toBeInTheDocument();
      });
    });
  });

  describe('Balance Inquiry', () => {
    it('should show confirmation modal before checking balance', async () => {
      render(<BofaAdminPanel />);

      const accountIdInput = screen.getByPlaceholderText('Enter BOFA account ID');
      await userEvent.type(accountIdInput, 'TEST-ACCT-123');

      const checkButton = screen.getByText('Check Balance');
      fireEvent.click(checkButton);

      expect(screen.getByText('Confirm Balance Inquiry')).toBeInTheDocument();
      expect(screen.getByText(/Check balance for account: TEST-ACCT-123/)).toBeInTheDocument();
    });

    it('should cancel balance check on cancel click', async () => {
      render(<BofaAdminPanel />);

      const accountIdInput = screen.getByPlaceholderText('Enter BOFA account ID');
      await userEvent.type(accountIdInput, 'TEST-ACCT-123');

      fireEvent.click(screen.getByText('Check Balance'));
      fireEvent.click(screen.getByText('Cancel'));

      expect(screen.queryByText('Confirm Balance Inquiry')).not.toBeInTheDocument();
    });

    it('should fetch and display balance after confirmation', async () => {
      const mockBalance = {
        accountNumber: '****1234',
        availableBalance: 50000.00,
        currentBalance: 52500.00,
        currency: 'USD',
        asOfDate: '2026-01-24'
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalance
      });

      render(<BofaAdminPanel />);

      const accountIdInput = screen.getByPlaceholderText('Enter BOFA account ID');
      await userEvent.type(accountIdInput, 'TEST-ACCT-123');

      fireEvent.click(screen.getByText('Check Balance'));
      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(screen.getByText('Balance Retrieved')).toBeInTheDocument();
        expect(screen.getByText(/\$50,000\.00/)).toBeInTheDocument(); // available balance
      });
    });

    it('should display error message on balance check failure', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      render(<BofaAdminPanel />);

      const accountIdInput = screen.getByPlaceholderText('Enter BOFA account ID');
      await userEvent.type(accountIdInput, 'TEST-ACCT-123');

      fireEvent.click(screen.getByText('Check Balance'));
      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(screen.getByText('Operation Failed')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Account Validation', () => {
    it('should show confirmation modal before validation', async () => {
      render(<BofaAdminPanel />);

      fireEvent.click(screen.getByText('Account Validation'));

      const routingInput = screen.getByPlaceholderText('021000021');
      await userEvent.type(routingInput, '021000021');

      const accountInput = screen.getByPlaceholderText('Enter account number');
      await userEvent.type(accountInput, '123456789');

      fireEvent.click(screen.getByText('Validate Account'));

      expect(screen.getByText('Confirm Account Validation')).toBeInTheDocument();
      expect(screen.getByText(/Validate routing: 021000021/)).toBeInTheDocument();
    });

    it('should validate account successfully', async () => {
      const mockValidation = {
        valid: true,
        routingNumberValid: true,
        accountNumberValid: true,
        accountStatus: 'active',
        bankName: 'Bank of America'
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockValidation
      });

      render(<BofaAdminPanel />);

      fireEvent.click(screen.getByText('Account Validation'));

      const routingInput = screen.getByPlaceholderText('021000021');
      await userEvent.type(routingInput, '021000021');

      const accountInput = screen.getByPlaceholderText('Enter account number');
      await userEvent.type(accountInput, '123456789');

      fireEvent.click(screen.getByText('Validate Account'));
      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(screen.getByText('Account Valid')).toBeInTheDocument();
        expect(screen.getByText('Bank of America')).toBeInTheDocument();
      });
    });

    it('should display invalid account result', async () => {
      const mockValidation = {
        valid: false,
        routingNumberValid: false,
        accountNumberValid: false,
        accountStatus: 'invalid',
        bankName: 'Unknown'
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockValidation
      });

      render(<BofaAdminPanel />);

      fireEvent.click(screen.getByText('Account Validation'));

      const routingInput = screen.getByPlaceholderText('021000021');
      await userEvent.type(routingInput, '000000000');

      const accountInput = screen.getByPlaceholderText('Enter account number');
      await userEvent.type(accountInput, '9999999999');

      fireEvent.click(screen.getByText('Validate Account'));
      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(screen.getByText('Account Invalid')).toBeInTheDocument();
      });
    });
  });

  describe('ACH Submission', () => {
    it('should show warning about irreversible action', async () => {
      render(<BofaAdminPanel />);

      fireEvent.click(screen.getByText('ACH Submission'));

      const nachaTextarea = screen.getByPlaceholderText('Paste NACHA file content here');
      await userEvent.type(nachaTextarea, '101 021000021...');

      expect(screen.getByText(/Warning: Irreversible Action/)).toBeInTheDocument();
    });

    it('should show confirmation modal before ACH submission', async () => {
      render(<BofaAdminPanel />);

      fireEvent.click(screen.getByText('ACH Submission'));

      const nachaTextarea = screen.getByPlaceholderText('Paste NACHA file content here');
      await userEvent.type(nachaTextarea, '101 021000021...');

      fireEvent.click(screen.getByText('Submit to BOFA'));

      expect(screen.getByText('Confirm ACH Submission')).toBeInTheDocument();
      expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
    });

    it('should submit ACH file after confirmation', async () => {
      const mockSubmission = {
        submissionId: 'bofa-sub-test-123',
        status: 'accepted',
        receivedTimestamp: new Date().toISOString(),
        bofaReference: 'BOFA-REF-TEST'
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubmission
      });

      render(<BofaAdminPanel />);

      fireEvent.click(screen.getByText('ACH Submission'));

      const nachaTextarea = screen.getByPlaceholderText('Paste NACHA file content here');
      await userEvent.type(nachaTextarea, '101 021000021...');

      fireEvent.click(screen.getByText('Submit to BOFA'));
      fireEvent.click(screen.getByText('Submit ACH File'));

      await waitFor(() => {
        expect(screen.getByText('Submission Accepted')).toBeInTheDocument();
        expect(screen.getByText('bofa-sub-test-123')).toBeInTheDocument();
      });
    });
  });

  describe('Payment Status', () => {
    it('should show confirmation modal before status check', async () => {
      render(<BofaAdminPanel />);

      fireEvent.click(screen.getByText('Payment Status'));

      const submissionInput = screen.getByPlaceholderText(/BOFA submission ID/);
      await userEvent.type(submissionInput, 'bofa-sub-test-456');

      fireEvent.click(screen.getByText('Check Status'));

      expect(screen.getByText('Confirm Status Check')).toBeInTheDocument();
      expect(screen.getByText(/Check status for submission: bofa-sub-test-456/)).toBeInTheDocument();
    });

    it('should display settled status', async () => {
      const mockStatus = {
        submissionId: 'bofa-sub-test-789',
        status: 'settled',
        settledDate: new Date().toISOString()
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus
      });

      render(<BofaAdminPanel />);

      fireEvent.click(screen.getByText('Payment Status'));

      const submissionInput = screen.getByPlaceholderText(/BOFA submission ID/);
      await userEvent.type(submissionInput, 'bofa-sub-test-789');

      fireEvent.click(screen.getByText('Check Status'));
      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(screen.getByText('SETTLED')).toBeInTheDocument();
        expect(screen.getByText(/bofa-sub-test-789/)).toBeInTheDocument();
      });
    });

    it('should display returned payment status', async () => {
      const mockStatus = {
        submissionId: 'bofa-sub-test-return',
        status: 'returned',
        returnCode: 'R01',
        returnReason: 'Insufficient Funds'
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus
      });

      render(<BofaAdminPanel />);

      fireEvent.click(screen.getByText('Payment Status'));

      const submissionInput = screen.getByPlaceholderText(/BOFA submission ID/);
      await userEvent.type(submissionInput, 'bofa-sub-test-return');

      fireEvent.click(screen.getByText('Check Status'));
      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(screen.getByText('RETURNED')).toBeInTheDocument();
        expect(screen.getByText('R01')).toBeInTheDocument();
        expect(screen.getByText('Insufficient Funds')).toBeInTheDocument();
      });
    });
  });

  describe('Reset Functionality', () => {
    it('should reset form state on New Inquiry button', async () => {
      const mockBalance = {
        accountNumber: '****1234',
        availableBalance: 1000,
        currentBalance: 1000,
        currency: 'USD',
        asOfDate: '2026-01-24'
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalance
      });

      render(<BofaAdminPanel />);

      // Complete a balance inquiry
      const accountIdInput = screen.getByPlaceholderText('Enter BOFA account ID');
      await userEvent.type(accountIdInput, 'TEST-ACCT');

      fireEvent.click(screen.getByText('Check Balance'));
      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(screen.getByText('Balance Retrieved')).toBeInTheDocument();
      });

      // Click new inquiry
      fireEvent.click(screen.getByText('New Inquiry'));

      expect(screen.getByText('Balance Retrieved')).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter BOFA account ID')).toBeInTheDocument();
    });
  });
});
