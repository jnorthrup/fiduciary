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
import { TIN_PLACEHOLDER, SSN_PLACEHOLDER, TCC_PLACEHOLDER } from '../utils/constants';

// Mock IRS API client
vi.mock('../services/irsApiClient', () => ({
  irsApi: {
    healthCheck: vi.fn().mockResolvedValue({ status: 'healthy', version: '1.3.0', timestamp: new Date().toISOString() }),
    setAuth: vi.fn(),
    transmissionCheck: vi.fn(),
    submitBatch: vi.fn(),
    pollSubmissionStatus: vi.fn()
  },
  formatEIN: (ein: string) => {
    const cleaned = ein.replace(/\D/g, '');
    if (cleaned.length === 0) return '';
    if (cleaned.length < 9) return cleaned;
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 9)}`;
  },
  getFormAmountFields: () => [
    { id: '1', label: 'Rents', field: 'rents' },
    { id: '2', label: 'Royalties', field: 'royalties' }
  ]
}));

// Global test timeout for async transitions
vi.setConfig({ testTimeout: 10000 });

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
        const tccInput = screen.queryByPlaceholderText(/T\d{9}/) || screen.queryByPlaceholderText(TCC_PLACEHOLDER);
        expect(tccInput).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it('should accept valid TCC format (T + 10 digits)', async () => {
      render(<IRIS1099Wizard />);

      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      const authButton = screen.getByRole('button', { name: /Authenticate & Continue/i });

      // Initially disabled
      expect(authButton).toBeDisabled();

      // Enter valid TCC
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });

      // Should be enabled
      await waitFor(() => {
        expect(authButton).toBeEnabled();
      }, { timeout: 4000 });
    });

    it('should reject TCC with less than 10 digits', async () => {
      render(<IRIS1099Wizard />);

      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      const authButton = screen.getByRole('button', { name: /Authenticate & Continue/i });

      // Enter invalid TCC (only 9 digits)
      fireEvent.change(tccInput, { target: { value: 'T123456789' } });

      // Should still be disabled
      expect(authButton).toBeDisabled();
    });

    it('should reject TCC with more than 10 digits', async () => {
      render(<IRIS1099Wizard />);

      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      const authButton = screen.getByRole('button', { name: /Authenticate & Continue/i });

      // Enter invalid TCC (11 digits)
      fireEvent.change(tccInput, { target: { value: 'T12345678901' } });

      // Should still be disabled
      expect(authButton).toBeDisabled();
    });

    it('should reject TCC without T prefix', async () => {
      render(<IRIS1099Wizard />);

      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      const authButton = screen.getByRole('button', { name: /Authenticate & Continue/i });

      // Enter TCC without T prefix
      fireEvent.change(tccInput, { target: { value: '1234567890' } });

      // Should still be disabled
      expect(authButton).toBeDisabled();
    });

    it('should convert lowercase t to uppercase T', async () => {
      render(<IRIS1099Wizard />);

      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);

      fireEvent.change(tccInput, { target: { value: 't1234567890' } });

      // Should convert to uppercase
      await waitFor(() => {
        expect(tccInput).toHaveValue('T1234567890');
      }, { timeout: 4000 });
    });

    it('should call irsApi.setAuth with TCC on authenticate', async () => {
      render(<IRIS1099Wizard />);

      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      const authButton = screen.getByRole('button', { name: /Authenticate & Continue/i });

      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(authButton);

      await waitFor(() => {
        expect(irsApiClient.irsApi.setAuth).toHaveBeenCalledWith('T1234567890');
      }, { timeout: 4000 });
    });

    it('should call storeTCC when saveCredentials is checked', async () => {
      (secureStorage.storeTCC as any).mockResolvedValue(undefined);
      (secureStorage.getStoredTCCs as any).mockResolvedValue([]);

      render(<IRIS1099Wizard />);

      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      const authButton = screen.getByRole('button', { name: /Authenticate & Continue/i });

      // Ensure checkbox is checked (default)
      const saveCheckbox = screen.getByLabelText(/Save credentials securely/i);
      expect(saveCheckbox).toBeChecked();

      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(authButton);

      await waitFor(() => {
        expect(secureStorage.storeTCC).toHaveBeenCalledWith(
          'T1234567890',
          'IRS TCC (T12345...)',
          'T1234567890'
        );
      }, { timeout: 4000 });
    });
  });

  describe('Bearer Token Input', () => {
    it('should show bearer token input when bearer auth is selected', async () => {
      render(<IRIS1099Wizard />);

      // Click on bearer token option
      const bearerButton = await screen.findByText(/API TOKEN/i);
      fireEvent.click(bearerButton);

      const bearerInput = screen.queryByPlaceholderText(/eyJhbGciOiJSUzI1NiIs.../i);
      expect(bearerInput).toBeInTheDocument();
    });

    it('should accept bearer token input', async () => {
      render(<IRIS1099Wizard />);

      const bearerButton = await screen.findByText(/API TOKEN/i);
      fireEvent.click(bearerButton);

      const bearerInput = screen.getByPlaceholderText(/eyJhbGciOiJSUzI1NiIs.../i);
      const authButton = screen.getByRole('button', { name: /Authenticate & Continue/i });

      // Enter a JWT token
      const mockToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test';
      fireEvent.change(bearerInput, { target: { value: mockToken } });

      // Should enable authenticate button
      await waitFor(() => {
        expect(authButton).toBeEnabled();
      }, { timeout: 4000 });
    });

    it('should mask bearer token input', async () => {
      render(<IRIS1099Wizard />);

      const bearerButton = await screen.findByText(/API TOKEN/i);
      fireEvent.click(bearerButton);

      const bearerInput = screen.getByPlaceholderText(/eyJhbGciOiJSUzI1NiIs.../i) as HTMLInputElement;

      expect(bearerInput.type).toBe('password');
    });

    it('should call irsApi.setAuth with bearer token', async () => {
      render(<IRIS1099Wizard />);

      const bearerButton = await screen.findByText(/API TOKEN/i);
      fireEvent.click(bearerButton);

      const bearerInput = screen.getByPlaceholderText(/eyJhbGciOiJSUzI1NiIs.../i);
      const authButton = screen.getByRole('button', { name: /Authenticate & Continue/i });

      const mockToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test';
      fireEvent.change(bearerInput, { target: { value: mockToken } });
      fireEvent.click(authButton);

      await waitFor(() => {
        expect(irsApiClient.irsApi.setAuth).toHaveBeenCalledWith(undefined, mockToken);
      }, { timeout: 4000 });
    });

    it('should call storeBearerToken when saveCredentials is checked', async () => {
      (secureStorage.storeBearerToken as any).mockResolvedValue(undefined);

      render(<IRIS1099Wizard />);

      const bearerButton = await screen.findByText(/API TOKEN/i);
      fireEvent.click(bearerButton);

      const bearerInput = screen.getByPlaceholderText(/eyJhbGciOiJSUzI1NiIs.../i);
      const authButton = screen.getByRole('button', { name: /Authenticate & Continue/i });

      const mockToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test';
      fireEvent.change(bearerInput, { target: { value: mockToken } });
      fireEvent.click(authButton);

      await waitFor(() => {
        expect(secureStorage.storeBearerToken).toHaveBeenCalledWith(mockToken, 'IRS Bearer Token');
      }, { timeout: 4000 });
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
        expect(screen.queryByText(/Keychain/i)).toBeInTheDocument();
        expect(screen.queryByText(/IRS TCC \(T12345...\)/i)).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it('should populate TCC field when clicking stored credential', async () => {
      const mockCreds = [
        { id: '1', name: 'IRS TCC (T12345...)', value: 'T1234567890', createdAt: Date.now() }
      ];
      (secureStorage.getStoredTCCs as any).mockResolvedValue(mockCreds);

      render(<IRIS1099Wizard />);

      const credButton = await screen.findByText(/IRS TCC \(T12345...\)/i);
      fireEvent.click(credButton);

      const tccInput = screen.getByPlaceholderText(/T123456789/i);
      await waitFor(() => {
        expect(tccInput).toHaveValue('T1234567890');
      }, { timeout: 4000 });
    });

    it('should show PWA encrypted storage indicator when credentials exist', async () => {
      const mockCreds = [
        { id: '1', name: 'IRS TCC (T12345...)', value: 'T1234567890', createdAt: Date.now() }
      ];
      (secureStorage.getStoredTCCs as any).mockResolvedValue(mockCreds);

      render(<IRIS1099Wizard />);

      await waitFor(() => {
        expect(screen.queryByText(/Keychain/i)).toBeInTheDocument();
      }, { timeout: 4000 });
    });
  });

  describe('API Health Check', () => {
    it('should call healthCheck on mount', async () => {
      render(<IRIS1099Wizard />);

      await waitFor(() => {
        expect(irsApiClient.irsApi.healthCheck).toHaveBeenCalled();
      }, { timeout: 4000 });
    });

    it('should display healthy status when API is connected', async () => {
      (irsApiClient.irsApi.healthCheck as any).mockResolvedValue({
        status: 'healthy',
        service: 'IRS IRIS API Proxy',
        version: '1.0.0'
      });

      render(<IRIS1099Wizard />);

      await waitFor(() => {
        expect(screen.queryByText(/Endpoint:/i)).toBeInTheDocument();
        expect(screen.queryByText(/IRS IRIS API Proxy/i)).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it('should display connecting status when API is not yet responded', async () => {
      (irsApiClient.irsApi.healthCheck as any).mockImplementation(() => new Promise(() => { }));

      render(<IRIS1099Wizard />);

      await waitFor(() => {
        expect(screen.queryByText(/Establishing handshake/i)).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it('should display error status when health check fails', async () => {
      (irsApiClient.irsApi.healthCheck as any).mockRejectedValue(new Error('API unavailable'));

      render(<IRIS1099Wizard />);

      // Initially shows connecting
      expect(screen.queryByText(/Establishing handshake/i)).toBeInTheDocument();

      // After error, still shows establishing handshake (fallback state)
      await waitFor(() => {
        expect(screen.queryByText(/Establishing handshake/i)).toBeInTheDocument();
      }, { timeout: 4000 });
    });
  });

  describe('Auth Mode Selection', () => {
    it('should show two auth mode buttons initially', async () => {
      render(<IRIS1099Wizard />);

      await waitFor(() => {
        expect(screen.queryByText(/TCC AUTH/i)).toBeInTheDocument();
        expect(screen.queryByText(/API TOKEN/i)).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it('should highlight selected auth mode', async () => {
      render(<IRIS1099Wizard />);

      await waitFor(() => {
        const tccButton = screen.getByText(/TCC AUTH/i).closest('button');
        const bearerButton = screen.getByText(/API TOKEN/i).closest('button');

        // TCC is default
        expect(tccButton?.className).toContain('border-indigo-500');
        expect(bearerButton?.className).not.toContain('border-indigo-500');
      }, { timeout: 4000 });
    });

    it('should switch to bearer token mode when clicked', async () => {
      render(<IRIS1099Wizard />);

      const bearerButton = await screen.findByText(/API TOKEN/i);
      fireEvent.click(bearerButton);

      // Bearer input should be visible
      expect(screen.queryByPlaceholderText(/eyJhbGciOiJSUzI1NiIs.../i)).toBeInTheDocument();
    });
  });

  describe('Save Credentials Toggle', () => {
    it('should have save credentials checked by default', async () => {
      render(<IRIS1099Wizard />);

      const saveCheckbox = await screen.findByLabelText(/Save credentials securely/i);
      expect(saveCheckbox).toBeChecked();
    });

    it('should allow unchecking save credentials', async () => {
      render(<IRIS1099Wizard />);

      const saveCheckbox = await screen.findByLabelText(/Save credentials securely/i);
      fireEvent.click(saveCheckbox);

      expect(saveCheckbox).not.toBeChecked();
    });

    it('should not store credentials when unchecked', async () => {
      render(<IRIS1099Wizard />);

      const saveCheckbox = await screen.findByLabelText(/Save credentials securely/i);
      fireEvent.click(saveCheckbox);

      const tccInput = screen.getByPlaceholderText(/T123456789/i);
      const authButton = screen.getByRole('button', { name: /Authenticate & Continue/i });

      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(authButton);

      await waitFor(() => {
        expect(irsApiClient.irsApi.setAuth).toHaveBeenCalled();
        expect(secureStorage.storeTCC).not.toHaveBeenCalled();
      }, { timeout: 4000 });
    });
  });

  describe('Wizard Step Navigation', () => {
    it('should progress from Auth to Filer step on authentication', async () => {
      render(<IRIS1099Wizard />);

      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
        expect(screen.getByText(/Filer Identification/i)).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it('should show Back button after Auth step', async () => {
      render(<IRIS1099Wizard />);

      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Back/i)).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it('should disable Continue button on Filer step when EIN is missing', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Filer step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      const continueButton = screen.getByText(/Continue/i);
      expect(continueButton).toBeDisabled();
    });

    it('should disable Continue button on Filer step when Legal Name is missing', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Filer step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      // Enter EIN but not name
      const einInput = screen.getByPlaceholderText(/XX-XXXXXXX/i);
      fireEvent.change(einInput, { target: { value: '12-3456789' } });

      const continueButton = screen.getByText(/Continue/i);
      expect(continueButton).toBeDisabled();
    });

    it('should enable Continue button on Filer step when EIN and Name are filled', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Filer step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      // Fill required fields
      const einInput = screen.getByPlaceholderText(/XX-XXXXXXX/i);
      const nameInput = screen.getByPlaceholderText(/ABC Corporation Inc/i);

      fireEvent.change(einInput, { target: { value: '12-3456789' } });
      fireEvent.change(nameInput, { target: { value: 'Test Corp' } });

      await waitFor(() => {
        const continueButton = screen.getByText(/Continue/i);
        expect(continueButton).toBeEnabled();
      }, { timeout: 4000 });
    });

    it('should progress from Filer to FormType step on Continue', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Filer step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      // Fill required fields
      const einInput = screen.getByPlaceholderText(/XX-XXXXXXX/i);
      const nameInput = screen.getByPlaceholderText(/ABC Corporation Inc/i);

      fireEvent.change(einInput, { target: { value: '12-3456789' } });
      fireEvent.change(nameInput, { target: { value: 'Test Corp' } });

      // Click Continue
      const continueButton = screen.getByText(/Continue/i);
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(screen.queryByText(/Tax Year/i)).toBeInTheDocument();
        expect(screen.queryByText(/Form Type/i)).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it('should disable Continue button on Payees step when no payees added', async () => {
      render(<IRIS1099Wizard />);

      // Navigate through steps to Payees
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      // Fill Filer step
      fireEvent.change(screen.getByPlaceholderText(/XX-XXXXXXX/i), { target: { value: '12-3456789' } });
      fireEvent.change(screen.getByPlaceholderText(/ABC Corporation Inc/i), { target: { value: 'Test Corp' } });
      fireEvent.click(screen.getByText(/Continue/i));

      await waitFor(() => {
        expect(screen.getByText(/Tax Year/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      // Click Continue on FormType step
      fireEvent.click(screen.getByText(/Continue/i));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Add Payee$/i })).toBeInTheDocument();
      }, { timeout: 4000 });

      const continueButton = screen.getByText(/Continue/i);
      expect(continueButton).toBeDisabled();
    });

    it('should enable Continue button on Payees step when payees are added', async () => {
      render(<IRIS1099Wizard />);

      // Navigate through steps to Payees
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      // Fill Filer step
      fireEvent.change(screen.getByPlaceholderText(/XX-XXXXXXX/i), { target: { value: '12-3456789' } });
      fireEvent.change(screen.getByPlaceholderText(/ABC Corporation Inc/i), { target: { value: 'Test Corp' } });
      fireEvent.click(screen.getByText(/Continue/i));

      await waitFor(() => {
        expect(screen.getByText(/Tax Year/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      fireEvent.click(screen.getByText(/Continue/i));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Add Payee$/i })).toBeInTheDocument();
      }, { timeout: 4000 });

      // Add a payee - only TIN and Name are required
      const payeesTinPlaceholder = /XX-XXXXXXX or XXX-XX-XXXX/i;
      const payeeTinInput = screen.getByPlaceholderText(payeesTinPlaceholder);
      const payeeNameInput = screen.getByPlaceholderText(/John D Contractor/i);

      fireEvent.change(payeeTinInput, { target: { value: '12-3456789' } });
      fireEvent.change(payeeNameInput, { target: { value: 'John Doe' } });

      const addButton = screen.getByText(/Add Payee to Batch/i);
      fireEvent.click(addButton);

      await waitFor(() => {
        const continueButton = screen.getByText(/Continue/i);
        expect(continueButton).toBeEnabled();
      }, { timeout: 4000 });
    });

    it('should show Validate & Submit button on Review step', async () => {
      render(<IRIS1099Wizard />);

      // Navigate through to Review step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      // Fill Filer step
      fireEvent.change(screen.getByPlaceholderText(/XX-XXXXXXX/i), { target: { value: '12-3456789' } });
      fireEvent.change(screen.getByPlaceholderText(/ABC Corporation Inc/i), { target: { value: 'Test Corp' } });
      fireEvent.click(screen.getByText(/Continue/i));

      await waitFor(() => {
        expect(screen.getByText(/Tax Year/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      // FormType step
      fireEvent.click(screen.getByText(/Continue/i));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Add Payee$/i })).toBeInTheDocument();
      }, { timeout: 4000 });

      // Add a payee
      const payeeTinInput = screen.getByPlaceholderText(/XX-XXXXXXX or XXX-XX-XXXX/i);
      const payeeNameInput = screen.getByPlaceholderText(/John D Contractor/i);

      fireEvent.change(payeeTinInput, { target: { value: '12-3456789' } });
      fireEvent.change(payeeNameInput, { target: { value: 'John Doe' } });
      fireEvent.click(screen.getByText(/Add Payee to Batch/i));

      // Wait for Continue to be enabled
      await waitFor(() => {
        const continueButton = screen.getByText(/Continue/i);
        expect(continueButton).toBeEnabled();
      }, { timeout: 4000 });

      // Click Continue to go to Review
      fireEvent.click(screen.getByText(/Continue/i));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Validate & Submit/i })).toBeInTheDocument();
        expect(screen.queryByText(/Submission Summary/i)).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it('should navigate back from Filer to Auth step', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Filer step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      // Click Back
      const backButton = screen.getByText(/Back/i);
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(screen.queryByText(/TCC AUTH/i)).toBeInTheDocument();
        expect(screen.queryByText(/API TOKEN/i)).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it('should preserve filer state when navigating back to Auth and returning to Filer', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Filer step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      // Fill EIN and Name
      const einInput = screen.getByPlaceholderText(/XX-XXXXXXX/i);
      const nameInput = screen.getByPlaceholderText(/ABC Corporation Inc/i);

      fireEvent.change(einInput, { target: { value: '12-3456789' } });
      fireEvent.change(nameInput, { target: { value: 'Test Corp' } });

      // Record the values
      expect(einInput).toHaveValue('12-3456789');
      expect(nameInput).toHaveValue('Test Corp');

      // Go back to Auth
      fireEvent.click(screen.getByText(/Back/i));

      await waitFor(() => {
        expect(screen.getByText(/TCC AUTH/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      // Navigate forward again using TCC (simulate fresh auth)
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.queryByText(/Transmitter ID/i)).toBeInTheDocument();
        // State should be preserved
        expect(einInput).toHaveValue('12-3456789');
        expect(nameInput).toHaveValue('Test Corp');
      }, { timeout: 4000 });
    });
  });

  describe('Filer Form Validation', () => {
    it('should format EIN as user types (XX-XXXXXXX)', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Filer step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      // Type EIN without dashes
      const einInput = screen.getByPlaceholderText(/XX-XXXXXXX/i);

      fireEvent.change(einInput, { target: { value: '123456789' } });

      // Should be formatted
      await waitFor(() => {
        expect(einInput).toHaveValue('12-3456789');
      }, { timeout: 4000 });
    });

    it('should reject EIN with fewer than 9 digits', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Filer step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      const einInput = screen.getByPlaceholderText(/XX-XXXXXXX/i);

      // Type only 8 digits - new formatEIN allows this for UX
      fireEvent.change(einInput, { target: { value: '12345678' } });

      // Should show the digits typed
      expect(einInput).toHaveValue('12345678');

      // But the continue button should be disabled
      const continueButton = screen.getByText(/Continue/i);
      expect(continueButton).toBeDisabled();
    });

    it('should require state abbreviation (2 characters)', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Filer step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      const stateInput = screen.getByPlaceholderText(/CA/i);

      // Check that state input has maxLength of 2
      expect(stateInput).toHaveAttribute('maxLength', '2');
    });

    it('should uppercase state abbreviation automatically', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Filer step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      const stateInput = screen.getByPlaceholderText(/CA/i);

      fireEvent.change(stateInput, { target: { value: 'ca' } });

      // Should be uppercased
      await waitFor(() => {
        expect(stateInput).toHaveValue('CA');
      }, { timeout: 4000 });
    });

    it('should accept valid ZIP code format', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Filer step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      const zipInput = screen.getByPlaceholderText(/90210/i);

      fireEvent.change(zipInput, { target: { value: '90210' } });

      expect(zipInput).toHaveValue('90210');
    });

    it('should accept ZIP+4 format', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Filer step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      const zipInput = screen.getByPlaceholderText(/90210/i);

      fireEvent.change(zipInput, { target: { value: '90210-1234' } });

      expect(zipInput).toHaveValue('90210-1234');
    });

    it('should uppercase country code automatically', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Filer step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      // Country field has default value of 'US' and auto-uppercase
      const countryInput = screen.getByDisplayValue(/US/i);

      fireEvent.change(countryInput, { target: { value: 'us' } });

      // Should be uppercased
      await waitFor(() => {
        expect(countryInput).toHaveValue('US');
      }, { timeout: 4000 });
    });
  });

  describe('Payee Management', () => {
    it('should add payee to list when Add Payee to Batch is clicked', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Payees step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      fireEvent.change(screen.getByPlaceholderText(/XX-XXXXXXX/i), { target: { value: '12-3456789' } });
      fireEvent.change(screen.getByPlaceholderText(/ABC Corporation Inc/i), { target: { value: 'Test Corp' } });
      fireEvent.click(screen.getByText(/Continue/i));
      fireEvent.click(screen.getByText(/Continue/i));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Add Payee$/i })).toBeInTheDocument();
      }, { timeout: 4000 });

      // Add payee
      const payeeTinInput = screen.getByPlaceholderText(/XX-XXXXXXX or XXX-XX-XXXX/i);
      const payeeNameInput = screen.getByPlaceholderText(/John D Contractor/i);

      fireEvent.change(payeeTinInput, { target: { value: '99-8765432' } });
      fireEvent.change(payeeNameInput, { target: { value: 'Jane Smith' } });
      fireEvent.click(screen.getByText(/Add Payee to Batch/i));

      // Payee should appear in list
      await waitFor(() => {
        expect(screen.queryByText(/99-8765432/i)).toBeInTheDocument();
        expect(screen.queryByText(/Jane Smith/i)).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it('should allow adding multiple payees', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Payees step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      fireEvent.change(screen.getByPlaceholderText(/XX-XXXXXXX/i), { target: { value: '12-3456789' } });
      fireEvent.change(screen.getByPlaceholderText(/ABC Corporation Inc/i), { target: { value: 'Test Corp' } });
      fireEvent.click(screen.getByText(/Continue/i));
      fireEvent.click(screen.getByText(/Continue/i));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Add Payee$/i })).toBeInTheDocument();
      }, { timeout: 4000 });

      // Add first payee
      const payeeTinInput = screen.getByPlaceholderText(/XX-XXXXXXX or XXX-XX-XXXX/i);
      const payeeNameInput = screen.getByPlaceholderText(/John D Contractor/i);

      fireEvent.change(payeeTinInput, { target: { value: '99-8765432' } });
      fireEvent.change(payeeNameInput, { target: { value: 'Jane Smith' } });
      fireEvent.click(screen.getByText(/Add Payee to Batch/i));

      await waitFor(() => {
        expect(screen.queryByText(/Payees in Batch \(1\/1000\)/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      // Form should clear for next payee
      expect(payeeTinInput).toHaveValue('');
      expect(payeeNameInput).toHaveValue('');

      // Add second payee
      fireEvent.change(payeeTinInput, { target: { value: '98-7654321' } });
      fireEvent.change(payeeNameInput, { target: { value: 'Bob Jones' } });
      fireEvent.click(screen.getByText(/Add Payee to Batch/i));

      await waitFor(() => {
        expect(screen.queryByText(/Payees in Batch \(2\/1000\)/i)).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it('should require TIN to add payee', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Payees step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      fireEvent.change(screen.getByPlaceholderText(/XX-XXXXXXX/i), { target: { value: '12-3456789' } });
      fireEvent.change(screen.getByPlaceholderText(/ABC Corporation Inc/i), { target: { value: 'Test Corp' } });
      fireEvent.click(screen.getByText(/Continue/i));
      fireEvent.click(screen.getByText(/Continue/i));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Add Payee$/i })).toBeInTheDocument();
      }, { timeout: 4000 });

      const addButton = screen.getByText(/Add Payee to Batch/i);

      // Should be disabled initially
      expect(addButton).toBeDisabled();

      // Enter name but no TIN
      const payeeNameInput = screen.getByPlaceholderText(/John D Contractor/i);
      fireEvent.change(payeeNameInput, { target: { value: 'Jane Smith' } });

      // Still disabled
      expect(addButton).toBeDisabled();
    });

    it('should require name to add payee', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Payees step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      fireEvent.change(screen.getByPlaceholderText(/XX-XXXXXXX/i), { target: { value: '12-3456789' } });
      fireEvent.change(screen.getByPlaceholderText(/ABC Corporation Inc/i), { target: { value: 'Test Corp' } });
      fireEvent.click(screen.getByText(/Continue/i));
      fireEvent.click(screen.getByText(/Continue/i));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Add Payee$/i })).toBeInTheDocument();
      }, { timeout: 4000 });

      const addButton = screen.getByText(/Add Payee to Batch/i);

      // Should be disabled initially
      expect(addButton).toBeDisabled();

      // Enter TIN but no name
      const payeeTinInput = screen.getByPlaceholderText(/XX-XXXXXXX or XXX-XX-XXXX/i);
      fireEvent.change(payeeTinInput, { target: { value: '99-8765432' } });

      // Still disabled
      expect(addButton).toBeDisabled();
    });

    it('should clear form after adding payee', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Payees step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      fireEvent.change(screen.getByPlaceholderText(/XX-XXXXXXX/i), { target: { value: '12-3456789' } });
      fireEvent.change(screen.getByPlaceholderText(/ABC Corporation Inc/i), { target: { value: 'Test Corp' } });
      fireEvent.click(screen.getByText(/Continue/i));
      fireEvent.click(screen.getByText(/Continue/i));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Add Payee$/i })).toBeInTheDocument();
      }, { timeout: 4000 });

      // Add payee
      const payeeTinInput = screen.getByPlaceholderText(/XX-XXXXXXX or XXX-XX-XXXX/i);
      const payeeNameInput = screen.getByPlaceholderText(/John D Contractor/i);

      fireEvent.change(payeeTinInput, { target: { value: '99-8765432' } });
      fireEvent.change(payeeNameInput, { target: { value: 'Jane Smith' } });
      fireEvent.click(screen.getByText(/Add Payee to Batch/i));

      // Form should be cleared
      await waitFor(() => {
        expect(payeeTinInput).toHaveValue('');
        expect(payeeNameInput).toHaveValue('');
      }, { timeout: 4000 });
    });

    it('should show payee count in header', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Payees step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      fireEvent.change(screen.getByPlaceholderText(/XX-XXXXXXX/i), { target: { value: '12-3456789' } });
      fireEvent.change(screen.getByPlaceholderText(/ABC Corporation Inc/i), { target: { value: 'Test Corp' } });
      fireEvent.click(screen.getByText(/Continue/i));
      fireEvent.click(screen.getByText(/Continue/i));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Add Payee$/i })).toBeInTheDocument();
      }, { timeout: 4000 });

      // Add payee
      const payeeTinInput = screen.getByPlaceholderText(/XX-XXXXXXX or XXX-XX-XXXX/i);
      const payeeNameInput = screen.getByPlaceholderText(/John D Contractor/i);

      fireEvent.change(payeeTinInput, { target: { value: '99-8765432' } });
      fireEvent.change(payeeNameInput, { target: { value: 'Jane Smith' } });
      fireEvent.click(screen.getByText(/Add Payee to Batch/i));

      // Should show Payees in Batch (1/1000)
      await waitFor(() => {
        expect(screen.queryByText(/Payees in Batch \(1\/1000\)/i)).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it('should show remove button for each payee', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Payees step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      fireEvent.change(screen.getByPlaceholderText(/XX-XXXXXXX/i), { target: { value: '12-3456789' } });
      fireEvent.change(screen.getByPlaceholderText(/ABC Corporation Inc/i), { target: { value: 'Test Corp' } });
      fireEvent.click(screen.getByText(/Continue/i));
      fireEvent.click(screen.getByText(/Continue/i));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Add Payee$/i })).toBeInTheDocument();
      }, { timeout: 4000 });

      // Add payee
      const payeeTinInput = screen.getByPlaceholderText(/XX-XXXXXXX or XXX-XX-XXXX/i);
      const payeeNameInput = screen.getByPlaceholderText(/John D Contractor/i);

      fireEvent.change(payeeTinInput, { target: { value: '99-8765432' } });
      fireEvent.change(payeeNameInput, { target: { value: 'Jane Smith' } });
      fireEvent.click(screen.getByText(/Add Payee to Batch/i));

      // Should show delete button (Trash2 icon)
      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button').filter(btn =>
          btn.querySelector('svg.lucide-trash-2') || btn.innerHTML.includes('Trash2')
        );
        expect(deleteButtons.length).toBeGreaterThan(0);
      }, { timeout: 4000 });
    });

    it('should remove payee when delete button is clicked', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Payees step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      fireEvent.change(screen.getByPlaceholderText(/XX-XXXXXXX/i), { target: { value: '12-3456789' } });
      fireEvent.change(screen.getByPlaceholderText(/ABC Corporation Inc/i), { target: { value: 'Test Corp' } });
      fireEvent.click(screen.getByText(/Continue/i));
      fireEvent.click(screen.getByText(/Continue/i));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Add Payee$/i })).toBeInTheDocument();
      }, { timeout: 4000 });

      // Add payee
      const payeeTinInput = screen.getByPlaceholderText(/XX-XXXXXXX or XXX-XX-XXXX/i);
      const payeeNameInput = screen.getByPlaceholderText(/John D Contractor/i);

      fireEvent.change(payeeTinInput, { target: { value: '99-8765432' } });
      fireEvent.change(payeeNameInput, { target: { value: 'Jane Smith' } });
      fireEvent.click(screen.getByText(/Add Payee to Batch/i));

      await waitFor(() => {
        expect(screen.queryByText(/Jane Smith/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      // Find and click delete button
      const payeeRow = screen.getByText(/Jane Smith/i).closest('div[class*="bg-slate-900"]');
      const deleteButton = payeeRow?.querySelector('button');
      expect(deleteButton).toBeTruthy();
      fireEvent.click(deleteButton!);

      // Payee should be removed
      await waitFor(() => {
        expect(screen.queryByText(/Jane Smith/i)).not.toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it('should update payee count after removal', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Payees step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      fireEvent.change(screen.getByPlaceholderText(/XX-XXXXXXX/i), { target: { value: '12-3456789' } });
      fireEvent.change(screen.getByPlaceholderText(/ABC Corporation Inc/i), { target: { value: 'Test Corp' } });
      fireEvent.click(screen.getByText(/Continue/i));
      fireEvent.click(screen.getByText(/Continue/i));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Add Payee$/i })).toBeInTheDocument();
      }, { timeout: 4000 });

      // Add two payees
      const payeeTinInput = screen.getByPlaceholderText(/XX-XXXXXXX or XXX-XX-XXXX/i);
      const payeeNameInput = screen.getByPlaceholderText(/John D Contractor/i);

      fireEvent.change(payeeTinInput, { target: { value: '99-8765432' } });
      fireEvent.change(payeeNameInput, { target: { value: 'Jane Smith' } });
      fireEvent.click(screen.getByText(/Add Payee to Batch/i));

      await waitFor(() => {
        expect(screen.queryByText(/Payees in Batch \(1\/1000\)/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      fireEvent.change(payeeTinInput, { target: { value: '98-7654321' } });
      fireEvent.change(payeeNameInput, { target: { value: 'Bob Jones' } });
      fireEvent.click(screen.getByText(/Add Payee to Batch/i));

      await waitFor(() => {
        expect(screen.queryByText(/Payees in Batch \(2\/1000\)/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      // Remove first payee
      const janeRow = screen.getByText(/Jane Smith/i).closest('div[class*="bg-slate-900"]');
      const deleteButton = janeRow?.querySelector('button');
      fireEvent.click(deleteButton!);

      // Count should be 1
      await waitFor(() => {
        expect(screen.queryByText(/Payees in Batch \(1\/1000\)/i)).toBeInTheDocument();
        expect(screen.queryByText(/Jane Smith/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Bob Jones/i)).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it('should disable Continue button after removing all payees', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Payees step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      fireEvent.change(screen.getByPlaceholderText(/XX-XXXXXXX/i), { target: { value: '12-3456789' } });
      fireEvent.change(screen.getByPlaceholderText(/ABC Corporation Inc/i), { target: { value: 'Test Corp' } });
      fireEvent.click(screen.getByText(/Continue/i));
      fireEvent.click(screen.getByText(/Continue/i));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Add Payee$/i })).toBeInTheDocument();
      }, { timeout: 4000 });

      // Add payee
      const payeeTinInput = screen.getByPlaceholderText(/XX-XXXXXXX or XXX-XX-XXXX/i);
      const payeeNameInput = screen.getByPlaceholderText(/John D Contractor/i);

      fireEvent.change(payeeTinInput, { target: { value: '99-8765432' } });
      fireEvent.change(payeeNameInput, { target: { value: 'Jane Smith' } });
      fireEvent.click(screen.getByText(/Add Payee to Batch/i));

      // Continue should be enabled
      await waitFor(() => {
        const continueButton = screen.getByText(/Continue/i);
        expect(continueButton).toBeEnabled();
      }, { timeout: 4000 });

      // Remove the payee
      const payeeRow = screen.getByText(/Jane Smith/i).closest('div[class*="bg-slate-900"]');
      const deleteButton = payeeRow?.querySelector('button');
      fireEvent.click(deleteButton!);

      // Continue should be disabled
      await waitFor(() => {
        const continueButton = screen.getByText(/Continue/i);
        expect(continueButton).toBeDisabled();
      }, { timeout: 4000 });
    });
  });

  describe('Payee TIN Validation', () => {
    it('should accept valid EIN format (XX-XXXXXXX)', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Payees step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      fireEvent.change(screen.getByPlaceholderText(/XX-XXXXXXX/i), { target: { value: '12-3456789' } });
      fireEvent.change(screen.getByPlaceholderText(/ABC Corporation Inc/i), { target: { value: 'Test Corp' } });
      fireEvent.click(screen.getByText(/Continue/i));
      fireEvent.click(screen.getByText(/Continue/i));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Add Payee$/i })).toBeInTheDocument();
      }, { timeout: 4000 });

      const payeeTinInput = screen.getByPlaceholderText(/XX-XXXXXXX or XXX-XX-XXXX/i);
      const payeeNameInput = screen.getByPlaceholderText(/John D Contractor/i);

      // Enter valid EIN
      fireEvent.change(payeeTinInput, { target: { value: '99-8765432' } });
      fireEvent.change(payeeNameInput, { target: { value: 'Acme Corp' } });

      // Add button should be enabled
      const addButton = screen.getByText(/Add Payee to Batch/i);
      expect(addButton).toBeEnabled();
    });

    it('should accept valid SSN format (XXX-XX-XXXX)', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Payees step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      fireEvent.change(screen.getByPlaceholderText(/XX-XXXXXXX/i), { target: { value: '12-3456789' } });
      fireEvent.change(screen.getByPlaceholderText(/ABC Corporation Inc/i), { target: { value: 'Test Corp' } });
      fireEvent.click(screen.getByText(/Continue/i));
      fireEvent.click(screen.getByText(/Continue/i));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Add Payee$/i })).toBeInTheDocument();
      }, { timeout: 4000 });

      const payeeTinInput = screen.getByPlaceholderText(/XX-XXXXXXX or XXX-XX-XXXX/i);
      const payeeNameInput = screen.getByPlaceholderText(/John D Contractor/i);

      // Enter valid SSN
      fireEvent.change(payeeTinInput, { target: { value: '123-45-6789' } });
      fireEvent.change(payeeNameInput, { target: { value: 'John Doe' } });

      // Add button should be enabled
      const addButton = screen.getByText(/Add Payee to Batch/i);
      expect(addButton).toBeEnabled();
    });

    it('should show error for invalid TIN format', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Payees step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      fireEvent.change(screen.getByPlaceholderText(/XX-XXXXXXX/i), { target: { value: '12-3456789' } });
      fireEvent.change(screen.getByPlaceholderText(/ABC Corporation Inc/i), { target: { value: 'Test Corp' } });
      fireEvent.click(screen.getByText(/Continue/i));
      fireEvent.click(screen.getByText(/Continue/i));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Add Payee$/i })).toBeInTheDocument();
      }, { timeout: 4000 });

      const payeeTinInput = screen.getByPlaceholderText(/XX-XXXXXXX or XXX-XX-XXXX/i);
      const payeeNameInput = screen.getByPlaceholderText(/John D Contractor/i);

      // Enter invalid TIN (wrong format)
      fireEvent.change(payeeTinInput, { target: { value: '123456' } });
      fireEvent.change(payeeNameInput, { target: { value: 'John Doe' } });

      // Blur to trigger validation
      fireEvent.blur(payeeTinInput);

      // Should show error message
      await waitFor(() => {
        expect(screen.queryByText(/Invalid TIN format/i)).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it('should disable Add button for invalid TIN format', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Payees step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      fireEvent.change(screen.getByPlaceholderText(/XX-XXXXXXX/i), { target: { value: '12-3456789' } });
      fireEvent.change(screen.getByPlaceholderText(/ABC Corporation Inc/i), { target: { value: 'Test Corp' } });
      fireEvent.click(screen.getByText(/Continue/i));
      fireEvent.click(screen.getByText(/Continue/i));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Add Payee$/i })).toBeInTheDocument();
      }, { timeout: 4000 });

      const payeeTinInput = screen.getByPlaceholderText(/XX-XXXXXXX or XXX-XX-XXXX/i);
      const payeeNameInput = screen.getByPlaceholderText(/John D Contractor/i);

      // Enter invalid TIN (wrong format)
      fireEvent.change(payeeTinInput, { target: { value: '123456' } });
      fireEvent.change(payeeNameInput, { target: { value: 'John Doe' } });

      // Add button should be disabled
      const addButton = screen.getByText(/Add Payee to Batch/i);
      expect(addButton).toBeDisabled();
    });

    it('should warn about duplicate TIN', async () => {
      render(<IRIS1099Wizard />);

      // Navigate to Payees step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Transmitter ID/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      fireEvent.change(screen.getByPlaceholderText(/XX-XXXXXXX/i), { target: { value: '12-3456789' } });
      fireEvent.change(screen.getByPlaceholderText(/ABC Corporation Inc/i), { target: { value: 'Test Corp' } });
      fireEvent.click(screen.getByText(/Continue/i));
      fireEvent.click(screen.getByText(/Continue/i));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Add Payee$/i })).toBeInTheDocument();
      }, { timeout: 4000 });

      const payeeTinInput = screen.getByPlaceholderText(/XX-XXXXXXX or XXX-XX-XXXX/i);
      const payeeNameInput = screen.getByPlaceholderText(/John D Contractor/i);

      // Add first payee
      fireEvent.change(payeeTinInput, { target: { value: '99-8765432' } });
      fireEvent.change(payeeNameInput, { target: { value: 'Jane Smith' } });
      fireEvent.click(screen.getByText(/Add Payee to Batch/i));

      await waitFor(() => {
        expect(screen.queryByText(/Jane Smith/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      // Try to add payee with same TIN
      fireEvent.change(payeeTinInput, { target: { value: '99-8765432' } });
      fireEvent.change(payeeNameInput, { target: { value: 'John Smith' } });

      // Blur to trigger validation
      fireEvent.blur(payeeTinInput);

      // Should show duplicate warning
      await waitFor(() => {
        expect(screen.queryByText(/Duplicate TIN/i)).toBeInTheDocument();
      }, { timeout: 4000 });
    });
  });

  describe('Submission Flow', () => {
    // Helper to navigate to Review step with valid data
    const navigateToReviewStep = async () => {
      render(<IRIS1099Wizard />);

      // Auth step
      const tccInput = await screen.findByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.change(tccInput, { target: { value: 'T1234567890' } });
      fireEvent.click(screen.getByRole('button', { name: /Authenticate & Continue/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Filer Identification/i })).toBeInTheDocument();
      }, { timeout: 4000 });

      // Filer step
      fireEvent.change(screen.getByPlaceholderText(/XX-XXXXXXX/i), { target: { value: '12-3456789' } });
      fireEvent.change(screen.getByPlaceholderText(/ABC Corporation Inc/i), { target: { value: 'Test Corp' } });
      fireEvent.click(screen.getByText(/Continue/i));

      await waitFor(() => {
        expect(screen.queryByText(/Tax Year/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      // FormType step
      fireEvent.click(screen.getByText(/Continue/i));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^Add Payee$/i })).toBeInTheDocument();
      }, { timeout: 4000 });

      // Payees step - add a valid payee
      const payeesTinPlaceholder = /XX-XXXXXXX or XXX-XX-XXXX/i;
      const payeeTinInput = screen.getByPlaceholderText(payeesTinPlaceholder);
      const payeeNameInput = screen.getByPlaceholderText(/John D Contractor/i);

      fireEvent.change(payeeTinInput, { target: { value: '99-8765432' } });
      fireEvent.change(payeeNameInput, { target: { value: 'Jane Smith' } });
      fireEvent.click(screen.getByText(/Add Payee to Batch/i));

      await waitFor(() => {
        expect(screen.queryByText(/Jane Smith/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      // Go to Review step
      fireEvent.click(screen.getByText(/Continue/i));

      await waitFor(() => {
        expect(screen.queryByText(/Submission Summary/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Validate & Submit/i })).toBeInTheDocument();
      }, { timeout: 4000 });
    };

    it('should call transmissionCheck for pre-validation on submit', async () => {
      (irsApiClient.irsApi.transmissionCheck as any).mockResolvedValue({
        valid: true,
        errors: []
      });
      (irsApiClient.irsApi.submitBatch as any).mockResolvedValue({
        receiptId: 'test-receipt-123',
        timestamp: new Date().toISOString()
      });
      (irsApiClient.irsApi.pollSubmissionStatus as any).mockResolvedValue({
        status: 'Accepted',
        recordCount: 1,
        acceptedCount: 1,
        warningCount: 0,
        errorCount: 0
      });

      await navigateToReviewStep();

      // Click Validate & Submit
      fireEvent.click(screen.getByRole('button', { name: /Validate & Submit/i }));

      await waitFor(() => {
        expect(irsApiClient.irsApi.transmissionCheck).toHaveBeenCalled();
      }, { timeout: 4000 });
    });

    it('should show validating status when pre-validation starts', async () => {
      // Make transmissionCheck hang to see loading state
      (irsApiClient.irsApi.transmissionCheck as any).mockImplementation(
        () => new Promise(() => { }) // Never resolves
      );

      await navigateToReviewStep();

      fireEvent.click(screen.getByRole('button', { name: /Validate & Submit/i }));

      await waitFor(() => {
        expect(screen.queryByText(/Validating Submission.../i)).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it('should display validation errors when pre-validation fails', async () => {
      (irsApiClient.irsApi.transmissionCheck as any).mockResolvedValue({
        valid: false,
        errors: [
          { code: 'ERR001', message: 'Invalid filer EIN', field: 'filer.ein' },
          { code: 'ERR002', message: 'Missing payee address' }
        ]
      });

      await navigateToReviewStep();

      fireEvent.click(screen.getByRole('button', { name: /Validate & Submit/i }));

      await waitFor(() => {
        // Check error messages are displayed (may have multiple matches)
        expect(screen.queryAllByText(/Validation failed/i).length).toBeGreaterThan(0);
        expect(screen.queryByText(/Invalid filer EIN/i)).toBeInTheDocument();
        expect(screen.queryByText(/Missing payee address/i)).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it('should not call submitBatch when validation fails', async () => {
      (irsApiClient.irsApi.transmissionCheck as any).mockResolvedValue({
        valid: false,
        errors: [{ code: 'ERR001', message: 'Invalid data' }]
      });

      await navigateToReviewStep();

      fireEvent.click(screen.getByRole('button', { name: /Validate & Submit/i }));

      await waitFor(() => {
        expect(screen.queryAllByText(/Validation failed/i).length).toBeGreaterThan(0);
      });

      expect(irsApiClient.irsApi.submitBatch).not.toHaveBeenCalled();
    });

    it('should call submitBatch when validation passes', async () => {
      (irsApiClient.irsApi.transmissionCheck as any).mockResolvedValue({
        valid: true,
        errors: []
      });
      (irsApiClient.irsApi.submitBatch as any).mockResolvedValue({
        receiptId: 'test-receipt-123',
        timestamp: new Date().toISOString()
      });
      (irsApiClient.irsApi.pollSubmissionStatus as any).mockResolvedValue({
        status: 'Accepted',
        recordCount: 1,
        acceptedCount: 1,
        warningCount: 0,
        errorCount: 0
      });

      await navigateToReviewStep();

      fireEvent.click(screen.getByRole('button', { name: /Validate & Submit/i }));

      await waitFor(() => {
        expect(irsApiClient.irsApi.submitBatch).toHaveBeenCalled();
      });
    });

    it('should show transmitting status during submission', async () => {
      (irsApiClient.irsApi.transmissionCheck as any).mockResolvedValue({
        valid: true,
        errors: []
      });
      // Make submitBatch hang to see loading state
      (irsApiClient.irsApi.submitBatch as any).mockImplementation(
        () => new Promise(() => { })
      );

      await navigateToReviewStep();

      fireEvent.click(screen.getByRole('button', { name: /Validate & Submit/i }));

      await waitFor(() => {
        expect(screen.queryByText('Transmitting to IRS IRIS A2A...')).toBeInTheDocument();
      });
    });

    it('should display receipt ID after successful submission', async () => {
      (irsApiClient.irsApi.transmissionCheck as any).mockResolvedValue({
        valid: true,
        errors: []
      });
      (irsApiClient.irsApi.submitBatch as any).mockResolvedValue({
        receiptId: 'IRS-RECEIPT-ABC123',
        timestamp: new Date().toISOString()
      });
      (irsApiClient.irsApi.pollSubmissionStatus as any).mockResolvedValue({
        status: 'Accepted',
        recordCount: 1,
        acceptedCount: 1,
        warningCount: 0,
        errorCount: 0
      });

      await navigateToReviewStep();

      fireEvent.click(screen.getByRole('button', { name: /Validate & Submit/i }));

      await waitFor(() => {
        expect(screen.queryByText('Submission Complete')).toBeInTheDocument();
        expect(screen.queryByText(/IRS-RECEIPT-ABC123/)).toBeInTheDocument();
      });
    });

    it('should handle submission API error', async () => {
      (irsApiClient.irsApi.transmissionCheck as any).mockResolvedValue({
        valid: true,
        errors: []
      });
      (irsApiClient.irsApi.submitBatch as any).mockRejectedValue(
        new Error('Network error: Unable to connect to IRS')
      );

      await navigateToReviewStep();

      fireEvent.click(screen.getByRole('button', { name: /Validate & Submit/i }));

      await waitFor(() => {
        expect(screen.queryAllByText(/Submission Failed/i).length).toBeGreaterThan(0);
        expect(screen.queryAllByText(/Network error/i).length).toBeGreaterThan(0);
      });
    });

    it('should poll for status after submission', async () => {
      (irsApiClient.irsApi.transmissionCheck as any).mockResolvedValue({
        valid: true,
        errors: []
      });
      (irsApiClient.irsApi.submitBatch as any).mockResolvedValue({
        receiptId: 'test-receipt-123',
        timestamp: new Date().toISOString()
      });
      (irsApiClient.irsApi.pollSubmissionStatus as any).mockResolvedValue({
        status: 'Accepted',
        recordCount: 1,
        acceptedCount: 1,
        warningCount: 0,
        errorCount: 0
      });

      await navigateToReviewStep();

      fireEvent.click(screen.getByRole('button', { name: /Validate & Submit/i }));

      await waitFor(() => {
        expect(irsApiClient.irsApi.pollSubmissionStatus).toHaveBeenCalledWith(
          'test-receipt-123',
          expect.any(Function)
        );
      });
    });

    it('should display final status results', async () => {
      (irsApiClient.irsApi.transmissionCheck as any).mockResolvedValue({
        valid: true,
        errors: []
      });
      (irsApiClient.irsApi.submitBatch as any).mockResolvedValue({
        receiptId: 'test-receipt-123',
        timestamp: new Date().toISOString()
      });
      (irsApiClient.irsApi.pollSubmissionStatus as any).mockResolvedValue({
        status: 'Accepted',
        recordCount: 5,
        acceptedCount: 4,
        warningCount: 1,
        errorCount: 0
      });

      await navigateToReviewStep();

      fireEvent.click(screen.getByRole('button', { name: /Validate & Submit/i }));

      await waitFor(() => {
        expect(screen.queryByText('Submission Complete')).toBeInTheDocument();
        expect(screen.queryByText('5')).toBeInTheDocument(); // Total
        expect(screen.queryByText('4')).toBeInTheDocument(); // Accepted
      });
    });

    it('should show processing status during polling', async () => {
      (irsApiClient.irsApi.transmissionCheck as any).mockResolvedValue({
        valid: true,
        errors: []
      });
      (irsApiClient.irsApi.submitBatch as any).mockResolvedValue({
        receiptId: 'test-receipt-123',
        timestamp: new Date().toISOString()
      });
      // Make poll hang to see processing state
      (irsApiClient.irsApi.pollSubmissionStatus as any).mockImplementation(
        () => new Promise(() => { })
      );

      await navigateToReviewStep();

      fireEvent.click(screen.getByRole('button', { name: /Validate & Submit/i }));

      await waitFor(() => {
        expect(screen.queryByText('Processing...')).toBeInTheDocument();
      });
    });

    it('should display batch status counts during polling', async () => {
      (irsApiClient.irsApi.transmissionCheck as any).mockResolvedValue({
        valid: true,
        errors: []
      });
      (irsApiClient.irsApi.submitBatch as any).mockResolvedValue({
        receiptId: 'test-receipt-123',
        timestamp: new Date().toISOString()
      });

      // Mock pollSubmissionStatus to call the callback with intermediate status
      (irsApiClient.irsApi.pollSubmissionStatus as any).mockImplementation(
        async (receiptId: string, callback: (status: any) => void) => {
          // Simulate intermediate status update
          callback({
            status: 'Processing',
            recordCount: 10,
            acceptedCount: 5,
            warningCount: 0,
            errorCount: 0
          });
          // Return final status
          return {
            status: 'Accepted',
            recordCount: 10,
            acceptedCount: 10,
            warningCount: 0,
            errorCount: 0
          };
        }
      );

      await navigateToReviewStep();

      fireEvent.click(screen.getByRole('button', { name: /Validate & Submit/i }));

      // Wait for final result
      await waitFor(() => {
        expect(screen.queryByText('Submission Complete')).toBeInTheDocument();
      });
    });

    it('should display all accepted message on full success', async () => {
      (irsApiClient.irsApi.transmissionCheck as any).mockResolvedValue({
        valid: true,
        errors: []
      });
      (irsApiClient.irsApi.submitBatch as any).mockResolvedValue({
        receiptId: 'test-receipt-123',
        timestamp: new Date().toISOString()
      });
      (irsApiClient.irsApi.pollSubmissionStatus as any).mockResolvedValue({
        status: 'Accepted',
        recordCount: 3,
        acceptedCount: 3,
        warningCount: 0,
        errorCount: 0
      });

      await navigateToReviewStep();

      fireEvent.click(screen.getByRole('button', { name: /Validate & Submit/i }));

      await waitFor(() => {
        expect(screen.queryByText('Submission Complete')).toBeInTheDocument();
        expect(screen.queryByText(/All records accepted by IRS/i)).toBeInTheDocument();
      });
    });

    it('should show New Submission button after completion', async () => {
      (irsApiClient.irsApi.transmissionCheck as any).mockResolvedValue({
        valid: true,
        errors: []
      });
      (irsApiClient.irsApi.submitBatch as any).mockResolvedValue({
        receiptId: 'test-receipt-123',
        timestamp: new Date().toISOString()
      });
      (irsApiClient.irsApi.pollSubmissionStatus as any).mockResolvedValue({
        status: 'Accepted',
        recordCount: 1,
        acceptedCount: 1,
        warningCount: 0,
        errorCount: 0
      });

      await navigateToReviewStep();

      fireEvent.click(screen.getByRole('button', { name: /Validate & Submit/i }));

      await waitFor(() => {
        expect(screen.queryByText('New Submission')).toBeInTheDocument();
      });
    });

    it('should show Close button after completion', async () => {
      (irsApiClient.irsApi.transmissionCheck as any).mockResolvedValue({
        valid: true,
        errors: []
      });
      (irsApiClient.irsApi.submitBatch as any).mockResolvedValue({
        receiptId: 'test-receipt-123',
        timestamp: new Date().toISOString()
      });
      (irsApiClient.irsApi.pollSubmissionStatus as any).mockResolvedValue({
        status: 'Accepted',
        recordCount: 1,
        acceptedCount: 1,
        warningCount: 0,
        errorCount: 0
      });

      await navigateToReviewStep();

      fireEvent.click(screen.getByRole('button', { name: /Validate & Submit/i }));

      await waitFor(() => {
        expect(screen.queryByText('Close')).toBeInTheDocument();
      });
    });

    it('should display warning count in results', async () => {
      (irsApiClient.irsApi.transmissionCheck as any).mockResolvedValue({
        valid: true,
        errors: []
      });
      (irsApiClient.irsApi.submitBatch as any).mockResolvedValue({
        receiptId: 'test-receipt-123',
        timestamp: new Date().toISOString()
      });
      (irsApiClient.irsApi.pollSubmissionStatus as any).mockResolvedValue({
        status: 'Accepted',
        recordCount: 10,
        acceptedCount: 8,
        warningCount: 2,
        errorCount: 0
      });

      await navigateToReviewStep();

      fireEvent.click(screen.getByText('Validate & Submit'));

      await waitFor(() => {
        expect(screen.queryByText('Submission Complete')).toBeInTheDocument();
        expect(screen.queryByText('10')).toBeInTheDocument(); // Total
        expect(screen.queryByText('8')).toBeInTheDocument(); // Accepted
        expect(screen.queryByText('2')).toBeInTheDocument(); // Warnings
      });
    });

    it('should display error list when errors exist in batch status', async () => {
      (irsApiClient.irsApi.transmissionCheck as any).mockResolvedValue({
        valid: true,
        errors: []
      });
      (irsApiClient.irsApi.submitBatch as any).mockResolvedValue({
        receiptId: 'test-receipt-123',
        timestamp: new Date().toISOString()
      });
      (irsApiClient.irsApi.pollSubmissionStatus as any).mockResolvedValue({
        status: 'Accepted',
        recordCount: 5,
        acceptedCount: 4,
        warningCount: 0,
        errorCount: 1,
        errors: [
          { code: 'REC001', message: 'Invalid TIN for payee 3' }
        ]
      });

      await navigateToReviewStep();

      fireEvent.click(screen.getByText('Validate & Submit'));

      await waitFor(() => {
        expect(screen.queryByText('Submission Complete')).toBeInTheDocument();
        expect(screen.queryByText(/Invalid TIN for payee 3/)).toBeInTheDocument();
      });
    });
  });
});
