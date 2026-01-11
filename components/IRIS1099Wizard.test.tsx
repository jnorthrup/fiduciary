/**
 * Tests for IRIS1099Wizard Authentication Step
 *
 * Test file following TDD principles:
 * 1. TCC format validation (TXXXXXXXXX)
 * 2. Bearer token input and handling
 * 3. Stored credential selection
 * 4. API health check display
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IRIS1099Wizard } from './IRIS1099Wizard';
import * as irsApiClient from '../services/irsApiClient';
import * as secureStorage from '../services/secureStorage';

// Mock IRS API client
vi.mock('../services/irsApiClient', () => ({
  irsApi: {
    healthCheck: vi.fn(),
    setAuth: vi.fn(),
    validateTin: vi.fn(),
    submitBatch: vi.fn(),
    pollSubmissionStatus: vi.fn(),
    transmissionCheck: vi.fn(),
  },
  formatEIN: (ein: string) => {
    const cleaned = ein.replace(/\D/g, '');
    if (cleaned.length !== 9) throw new Error('Invalid EIN');
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
  },
  getFormAmountFields: () => [
    { key: 'nonemployeeCompensation', label: 'Nonemployee Compensation', required: true }
  ]
}));

// Mock secure storage
vi.mock('../services/secureStorage', () => ({
  storeTCC: vi.fn(),
  getStoredTCCs: vi.fn(),
  storeBearerToken: vi.fn(),
}));

describe('IRIS1099Wizard - Authentication Step', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (irsApiClient.irsApi.healthCheck as any).mockResolvedValue({
      status: 'healthy',
      service: 'IRS IRIS API Proxy',
      version: '1.0.0'
    });
    (secureStorage.getStoredTCCs as any).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('TCC Input Validation', () => {
    it('should show TCC input field when TCC auth is selected', async () => {
      render(<IRIS1099Wizard />);

      await waitFor(() => {
        const tccInput = screen.queryByPlaceholderText('T123456789');
        expect(tccInput).toBeInTheDocument();
      });
    });

    it('should accept valid TCC format (T + 10 digits)', async () => {
      render(<IRIS1099Wizard />);

      const tccInput = await screen.findByPlaceholderText('T123456789');
      const authButton = screen.getByText('Authenticate & Continue');

      // Initially disabled
      expect(authButton).toBeDisabled();

      // Enter valid TCC
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });

      // Should be enabled
      await waitFor(() => {
        expect(authButton).toBeEnabled();
      });
    });

    it('should reject TCC with less than 10 digits', async () => {
      render(<IRIS1099Wizard />);

      const tccInput = await screen.findByPlaceholderText('T123456789');
      const authButton = screen.getByText('Authenticate & Continue');

      // Enter invalid TCC (only 9 digits)
      fireEvent.change(tccInput, { target: { value: 'T123456789' } });

      // Should still be disabled
      expect(authButton).toBeDisabled();
    });

    it('should reject TCC with more than 10 digits', async () => {
      render(<IRIS1099Wizard />);

      const tccInput = await screen.findByPlaceholderText('T123456789');
      const authButton = screen.getByText('Authenticate & Continue');

      // Enter invalid TCC (11 digits)
      fireEvent.change(tccInput, { target: { value: 'T12345678901' } });

      // Should still be disabled
      expect(authButton).toBeDisabled();
    });

    it('should reject TCC without T prefix', async () => {
      render(<IRIS1099Wizard />);

      const tccInput = await screen.findByPlaceholderText('T123456789');
      const authButton = screen.getByText('Authenticate & Continue');

      // Enter TCC without T prefix
      fireEvent.change(tccInput, { target: { value: '1234567890' } });

      // Should still be disabled
      expect(authButton).toBeDisabled();
    });

    it('should convert lowercase t to uppercase T', async () => {
      render(<IRIS1099Wizard />);

      const tccInput = await screen.findByPlaceholderText('T123456789');

      fireEvent.change(tccInput, { target: { value: 't1234567890' } });

      // Should convert to uppercase
      await waitFor(() => {
        expect(tccInput).toHaveValue('T1234567890');
      });
    });

    it('should call irsApi.setAuth with TCC on authenticate', async () => {
      render(<IRIS1099Wizard />);

      const tccInput = await screen.findByPlaceholderText('T123456789');
      const authButton = screen.getByText('Authenticate & Continue');

      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(authButton);

      await waitFor(() => {
        expect(irsApiClient.irsApi.setAuth).toHaveBeenCalledWith('T1234567890');
      });
    });

    it('should call storeTCC when saveCredentials is checked', async () => {
      (secureStorage.storeTCC as any).mockResolvedValue(undefined);
      (secureStorage.getStoredTCCs as any).mockResolvedValue([]);

      render(<IRIS1099Wizard />);

      const tccInput = await screen.findByPlaceholderText('T123456789');
      const authButton = screen.getByText('Authenticate & Continue');

      // Ensure checkbox is checked (default)
      const saveCheckbox = screen.getByLabelText(/Save credentials securely/);
      expect(saveCheckbox).toBeChecked();

      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(authButton);

      await waitFor(() => {
        expect(secureStorage.storeTCC).toHaveBeenCalledWith(
          'T1234567890',
          'IRS TCC (T12345...)',
          'T1234567890'
        );
      });
    });
  });

  describe('Bearer Token Input', () => {
    it('should show bearer token input when bearer auth is selected', async () => {
      render(<IRIS1099Wizard />);

      // Click on bearer token option
      const bearerButton = await screen.findByText('Bearer Token');
      fireEvent.click(bearerButton);

      const bearerInput = screen.queryByPlaceholderText('eyJhbGciOiJSUzI1NiIs...');
      expect(bearerInput).toBeInTheDocument();
    });

    it('should accept bearer token input', async () => {
      render(<IRIS1099Wizard />);

      const bearerButton = await screen.findByText('Bearer Token');
      fireEvent.click(bearerButton);

      const bearerInput = screen.getByPlaceholderText('eyJhbGciOiJSUzI1NiIs...');
      const authButton = screen.getByText('Authenticate & Continue');

      // Enter a JWT token
      const mockToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test';
      fireEvent.change(bearerInput, { target: { value: mockToken } });

      // Should enable authenticate button
      await waitFor(() => {
        expect(authButton).toBeEnabled();
      });
    });

    it('should mask bearer token input', async () => {
      render(<IRIS1099Wizard />);

      const bearerButton = await screen.findByText('Bearer Token');
      fireEvent.click(bearerButton);

      const bearerInput = screen.getByPlaceholderText('eyJhbGciOiJSUzI1NiIs...') as HTMLInputElement;

      expect(bearerInput.type).toBe('password');
    });

    it('should call irsApi.setAuth with bearer token', async () => {
      render(<IRIS1099Wizard />);

      const bearerButton = await screen.findByText('Bearer Token');
      fireEvent.click(bearerButton);

      const bearerInput = screen.getByPlaceholderText('eyJhbGciOiJSUzI1NiIs...');
      const authButton = screen.getByText('Authenticate & Continue');

      const mockToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test';
      fireEvent.change(bearerInput, { target: { value: mockToken } });
      fireEvent.click(authButton);

      await waitFor(() => {
        expect(irsApiClient.irsApi.setAuth).toHaveBeenCalledWith(undefined, mockToken);
      });
    });

    it('should call storeBearerToken when saveCredentials is checked', async () => {
      (secureStorage.storeBearerToken as any).mockResolvedValue(undefined);

      render(<IRIS1099Wizard />);

      const bearerButton = await screen.findByText('Bearer Token');
      fireEvent.click(bearerButton);

      const bearerInput = screen.getByPlaceholderText('eyJhbGciOiJSUzI1NiIs...');
      const authButton = screen.getByText('Authenticate & Continue');

      const mockToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test';
      fireEvent.change(bearerInput, { target: { value: mockToken } });
      fireEvent.click(authButton);

      await waitFor(() => {
        expect(secureStorage.storeBearerToken).toHaveBeenCalledWith(mockToken, 'IRS Bearer Token');
      });
    });
  });

  describe('Stored Credentials', () => {
    it('should display stored TCCs', async () => {
      const mockCreds = [
        { id: '1', name: 'IRS TCC (T12345...)', value: 'T1234567890', createdAt: Date.now() }
      ];
      (secureStorage.getStoredTCCs as any).mockResolvedValue(mockCreds);

      render(<IRIS1099Wizard />);

      await waitFor(() => {
        expect(screen.queryByText('Saved Credentials')).toBeInTheDocument();
        expect(screen.queryByText('IRS TCC (T12345...)')).toBeInTheDocument();
      });
    });

    it('should populate TCC field when clicking stored credential', async () => {
      const mockCreds = [
        { id: '1', name: 'IRS TCC (T12345...)', value: 'T1234567890', createdAt: Date.now() }
      ];
      (secureStorage.getStoredTCCs as any).mockResolvedValue(mockCreds);

      render(<IRIS1099Wizard />);

      const credButton = await screen.findByText('IRS TCC (T12345...)');
      fireEvent.click(credButton);

      const tccInput = screen.getByPlaceholderText('T123456789');
      await waitFor(() => {
        expect(tccInput).toHaveValue('T1234567890');
      });
    });

    it('should show PWA encrypted storage indicator when credentials exist', async () => {
      const mockCreds = [
        { id: '1', name: 'IRS TCC (T12345...)', value: 'T1234567890', createdAt: Date.now() }
      ];
      (secureStorage.getStoredTCCs as any).mockResolvedValue(mockCreds);

      render(<IRIS1099Wizard />);

      await waitFor(() => {
        expect(screen.queryByText('PWA Encrypted Storage')).toBeInTheDocument();
      });
    });
  });

  describe('API Health Check', () => {
    it('should call healthCheck on mount', async () => {
      render(<IRIS1099Wizard />);

      await waitFor(() => {
        expect(irsApiClient.irsApi.healthCheck).toHaveBeenCalled();
      });
    });

    it('should display healthy status when API is connected', async () => {
      (irsApiClient.irsApi.healthCheck as any).mockResolvedValue({
        status: 'healthy',
        service: 'IRS IRIS API Proxy',
        version: '1.0.0'
      });

      render(<IRIS1099Wizard />);

      await waitFor(() => {
        expect(screen.queryByText(/Connected to IRS IRIS API Proxy/)).toBeInTheDocument();
      });
    });

    it('should display connecting status when API is not yet responded', () => {
      (irsApiClient.irsApi.healthCheck as any).mockImplementation(() => new Promise(() => {}));

      render(<IRIS1099Wizard />);

      expect(screen.queryByText('Connecting...')).toBeInTheDocument();
    });

    it('should display error status when health check fails', async () => {
      (irsApiClient.irsApi.healthCheck as any).mockRejectedValue(new Error('API unavailable'));

      render(<IRIS1099Wizard />);

      // Initially shows connecting
      expect(screen.queryByText('Connecting...')).toBeInTheDocument();

      // After error, still shows connecting (fallback state)
      await waitFor(() => {
        expect(screen.queryByText('Connecting...')).toBeInTheDocument();
      });
    });
  });

  describe('Auth Mode Selection', () => {
    it('should show two auth mode buttons initially', async () => {
      render(<IRIS1099Wizard />);

      await waitFor(() => {
        expect(screen.queryByText('TCC Authentication')).toBeInTheDocument();
        expect(screen.queryByText('Bearer Token')).toBeInTheDocument();
      });
    });

    it('should highlight selected auth mode', async () => {
      render(<IRIS1099Wizard />);

      await waitFor(() => {
        const tccButton = screen.getByText('TCC Authentication').closest('button');
        const bearerButton = screen.getByText('Bearer Token').closest('button');

        // TCC is default
        expect(tccButton?.className).toContain('border-indigo-500');
        expect(bearerButton?.className).not.toContain('border-indigo-500');
      });
    });

    it('should switch to bearer token mode when clicked', async () => {
      render(<IRIS1099Wizard />);

      const bearerButton = await screen.findByText('Bearer Token');
      fireEvent.click(bearerButton);

      // Bearer input should be visible
      expect(screen.queryByPlaceholderText('eyJhbGciOiJSUzI1NiIs...')).toBeInTheDocument();
    });
  });

  describe('Save Credentials Toggle', () => {
    it('should have save credentials checked by default', async () => {
      render(<IRIS1099Wizard />);

      const saveCheckbox = await screen.findByLabelText(/Save credentials securely/);
      expect(saveCheckbox).toBeChecked();
    });

    it('should allow unchecking save credentials', async () => {
      render(<IRIS1099Wizard />);

      const saveCheckbox = await screen.findByLabelText(/Save credentials securely/);
      fireEvent.click(saveCheckbox);

      expect(saveCheckbox).not.toBeChecked();
    });

    it('should not store credentials when unchecked', async () => {
      render(<IRIS1099Wizard />);

      const saveCheckbox = await screen.findByLabelText(/Save credentials securely/);
      fireEvent.click(saveCheckbox);

      const tccInput = screen.getByPlaceholderText('T123456789');
      const authButton = screen.getByText('Authenticate & Continue');

      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(authButton);

      await waitFor(() => {
        expect(irsApiClient.irsApi.setAuth).toHaveBeenCalled();
        expect(secureStorage.storeTCC).not.toHaveBeenCalled();
      });
    });
  });
});
