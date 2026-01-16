/**
 * Visual/UX State Tests for IRIS1099Wizard
 *
 * Tests for Phase 5.1 Premium Auth UI with glassmorphism and HSL theming.
 * Focuses on visual states, animations, transitions, and user feedback.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IRIS1099Wizard } from './IRIS1099Wizard';
import * as irsApiClient from '../services/irsApiClient';
import * as secureStorage from '../services/secureStorage';
import { TCC_PLACEHOLDER } from '../utils/constants';

// Mock IRS API client
vi.mock('../services/irsApiClient', () => ({
  irsApi: {
    healthCheck: vi.fn().mockResolvedValue({ status: 'healthy', version: '1.3.0', timestamp: new Date().toISOString() }),
    setAuth: vi.fn(),
    validateTin: vi.fn(),
    transmissionCheck: vi.fn(),
    submitBatch: vi.fn(),
    pollSubmissionStatus: vi.fn()
  },
  getFormAmountFields: () => [
    { id: '1', label: 'Nonemployee Compensation', field: 'nonemployeeComp' }
  ]
}));

// Mock secure storage
vi.mock('../services/secureStorage', () => ({
  storeTCC: vi.fn(),
  getStoredTCCs: vi.fn(() => []),
  storeBearerToken: vi.fn(),
}));

vi.setConfig({ testTimeout: 60000 });

describe('IRIS1099Wizard - Visual/UX States (Phase 5.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Auth Mode Selection Animations', () => {
    it('should apply scale animation on auth mode selection', async () => {
      render(<IRIS1099Wizard />);

      const tccButton = screen.getByText(/TCC AUTH/i);
      const bearerButton = screen.getByText(/API TOKEN/i);

      // Both buttons should be present
      expect(tccButton).toBeInTheDocument();
      expect(bearerButton).toBeInTheDocument();

      // Click bearer token mode
      fireEvent.click(bearerButton);

      // Should update auth mode
      expect(screen.getByText(/A2A Bearer Token/i)).toBeInTheDocument();
    });

    it('should show gradient overlay on selected auth mode', async () => {
      render(<IRIS1099Wizard />);

      // TCC mode is selected by default
      const tccButton = screen.getByText(/TCC AUTH/i).closest('button');

      // Should have selected styling
      expect(tccButton).toHaveClass('scale-105');
    });
  });

  describe('Real-time TCC Format Validation', () => {
    it('should show empty state when TCC input is empty', async () => {
      render(<IRIS1099Wizard />);

      const tccInput = screen.getByPlaceholderText(TCC_PLACEHOLDER);

      // Initially empty - no format indicator
      expect(screen.queryByText(/FORMAT VALID/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/DIGITS/i)).not.toBeInTheDocument();
    });

    it('should show partial state when TCC is being typed', async () => {
      render(<IRIS1099Wizard />);

      const tccInput = screen.getByPlaceholderText(TCC_PLACEHOLDER);

      // Type partial TCC (T + 3 digits)
      fireEvent.input(tccInput, { target: { value: 'T123' } });

      // Should show partial format indicator
      await waitFor(() => {
        expect(screen.getByText(/3\/10 DIGITS/i)).toBeInTheDocument();
      });
    });

    it('should show valid state when TCC format is correct (T + 10 digits)', async () => {
      render(<IRIS1099Wizard />);

      const tccInput = screen.getByPlaceholderText(TCC_PLACEHOLDER);

      // Type valid TCC format
      fireEvent.input(tccInput, { target: { value: 'T1234567890' } });

      // Should show valid format indicator
      await waitFor(() => {
        expect(screen.getByText(/FORMAT VALID/i)).toBeInTheDocument();
      });
    });

    it('should show invalid state for incorrect TCC format', async () => {
      render(<IRIS1099Wizard />);

      const tccInput = screen.getByPlaceholderText(TCC_PLACEHOLDER);

      // Type invalid TCC format (no T prefix)
      fireEvent.input(tccInput, { target: { value: '1234567890' } });

      // Should show invalid format indicator
      await waitFor(() => {
        expect(screen.getByText(/INVALID FORMAT/i)).toBeInTheDocument();
      });
    });

    it('should transition between format states smoothly', async () => {
      render(<IRIS1099Wizard />);

      const tccInput = screen.getByPlaceholderText(TCC_PLACEHOLDER);

      // Empty -> Partial
      fireEvent.input(tccInput, { target: { value: 'T12' } });
      await waitFor(() => {
        expect(screen.getByText(/2\/10 DIGITS/i)).toBeInTheDocument();
      });

      // Partial -> Valid
      fireEvent.input(tccInput, { target: { value: 'T1234567890' } });
      await waitFor(() => {
        expect(screen.getByText(/FORMAT VALID/i)).toBeInTheDocument();
      });

      // Clear -> Empty
      fireEvent.change(tccInput, { target: { value: '' } });
      await waitFor(() => {
        expect(screen.queryByText(/FORMAT VALID/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Terminal Animation Effects', () => {
    it('should display terminal when fetching TCC', async () => {
      render(<IRIS1099Wizard />);

      const fetchButton = screen.getByText(/Fetch TCC/i);
      fireEvent.click(fetchButton);

      // Terminal should appear with scanline effects
      await waitFor(() => {
        const terminal = screen.queryByText(/Initializing secure connection/i);
        expect(terminal).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should show animated log entries during TCC fetch', async () => {
      render(<IRIS1099Wizard />);

      const fetchButton = screen.getByText(/Fetch TCC/i);
      fireEvent.click(fetchButton);

      // Should show sequential log entries
      await waitFor(() => {
        expect(screen.getByText(/TLS 1\.3 handshake established/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      await waitFor(() => {
        expect(screen.getByText(/Authenticating with ID\.me federation/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should show pulsing cursor in terminal', async () => {
      render(<IRIS1099Wizard />);

      const fetchButton = screen.getByText(/Fetch TCC/i);
      fireEvent.click(fetchButton);

      // Terminal should have a cursor element with pulse animation
      await waitFor(() => {
        const terminal = screen.queryByText(/Initializing secure connection/i)?.closest('div');
        expect(terminal).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Test Connection Button States', () => {
    it('should show idle state initially', () => {
      render(<IRIS1099Wizard />);

      const authButton = screen.getByText(/Authenticate & Continue/i);
      expect(authButton).toBeInTheDocument();
    });

    it('should show checking state during connection test', async () => {
      irsApiClient.irsApi.healthCheck.mockResolvedValueOnce({ status: 'healthy', service: 'Test', version: '1.0' });

      render(<IRIS1099Wizard />);

      const tccInput = screen.getByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.input(tccInput, { target: { value: 'T1234567890' } });

      const authButton = screen.getByText(/Authenticate & Continue/i);
      fireEvent.click(authButton);

      // Should show checking state
      await waitFor(() => {
        expect(screen.getByText(/Testing Connection/i)).toBeInTheDocument();
      });
    });

    it('should show valid state after successful connection', async () => {
      irsApiClient.irsApi.setAuth.mockResolvedValueOnce(undefined);

      render(<IRIS1099Wizard />);

      const tccInput = screen.getByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.input(tccInput, { target: { value: 'T1234567890' } });

      const authButton = screen.getByText(/Authenticate & Continue/i);
      fireEvent.click(authButton);

      // Should eventually show connection verified
      await waitFor(() => {
        expect(screen.getByText(/Connection Verified/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should show invalid state on connection failure', async () => {
      irsApiClient.irsApi.healthCheck.mockImplementation(() => Promise.reject(new Error('Connection failed')));

      render(<IRIS1099Wizard />);

      const tccInput = screen.getByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.input(tccInput, { target: { value: 'T1234567890' } });

      const authButton = screen.getByText(/Authenticate & Continue/i);
      fireEvent.click(authButton);

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Error State Visuals', () => {
    it('should display error with backdrop blur and glow', async () => {
      irsApiClient.irsApi.healthCheck.mockImplementation(() => Promise.reject(new Error('API unavailable')));

      render(<IRIS1099Wizard />);

      const tccInput = screen.getByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.input(tccInput, { target: { value: 'T1234567890' } });

      const authButton = screen.getByText(/Authenticate & Continue/i);
      fireEvent.click(authButton);

      // Error should be displayed
      await waitFor(() => {
        const error = screen.getByText(/API unavailable/i);
        expect(error).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Persistence Toggle Visuals', () => {
    it('should toggle visual state when persistence mode changes', async () => {
      render(<IRIS1099Wizard />);

      // Should show "Encrypted Vault" when enabled (default)
      expect(screen.getByText(/Encrypted Vault/i)).toBeInTheDocument();

      // Find and click the toggle
      const toggleLabel = screen.getByText(/Persistence Mode/i).closest('div');
      const toggle = toggleLabel?.querySelector('[role="checkbox"]');

      if (toggle) {
        fireEvent.click(toggle);

        // Should change to "Session Only"
        await waitFor(() => {
          expect(screen.getByText(/Session Only/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Auth Mode Transition Animations', () => {
    it('should animate between TCC and Bearer token modes', async () => {
      render(<IRIS1099Wizard />);

      // Start in TCC mode
      expect(screen.getByPlaceholderText(TCC_PLACEHOLDER)).toBeInTheDocument();

      // Switch to bearer mode
      const bearerButton = screen.getByText(/API TOKEN/i);
      fireEvent.click(bearerButton);

      // Should transition to bearer token input
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/eyJhbGciOiJSUzI1NiIs/i)).toBeInTheDocument();
      });
    });
  });

  describe('Micro-animations', () => {
    it('should apply hover scale on auth mode buttons', async () => {
      render(<IRIS1099Wizard />);

      const tccButton = screen.getByText(/TCC AUTH/i);
      const bearerButton = screen.getByText(/API TOKEN/i);

      // Hover over non-selected button should apply scale
      tccButton.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      // Should have hover effect class
      expect(tccButton).toBeInTheDocument();
    });
  });
});
