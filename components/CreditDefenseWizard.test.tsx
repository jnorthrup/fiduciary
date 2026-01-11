
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreditDefenseWizard } from './CreditDefenseWizard';
import { Entity } from '../types';
import { vi, describe, it, expect } from 'vitest';

// Mock the GoogleGenAI class using a real class definition for Vitest
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: vi.fn().mockResolvedValue({
          text: 'MOCKED DISPUTE LETTER CONTENT'
        })
      }
    }
  };
});

// Mock the props
const mockEntity: Entity = {
  id: 'ENT-123',
  name: 'Test Entity',
  type: 'Trust',
  jurisdiction: 'WY',
  status: 'Active',
  dateCreated: '2023-01-01',
  einLast4: '1234'
};

const mockOnComplete = vi.fn();

describe('CreditDefenseWizard', () => {
  it('renders correctly', () => {
    render(<CreditDefenseWizard entity={mockEntity} onComplete={mockOnComplete} />);
    expect(screen.getByText('Ens Legis Credit Defense')).toBeInTheDocument();
    expect(screen.getByText('Dispute')).toBeInTheDocument();
  });

  it('allows entering dispute details and generating a letter', async () => {
    render(<CreditDefenseWizard entity={mockEntity} onComplete={mockOnComplete} />);

    // Fill in inputs
    const itemInput = screen.getByPlaceholderText('e.g. Account #1234-5678 (Acme Bank)');
    fireEvent.change(itemInput, { target: { value: 'Test Item' } });

    const reasonInput = screen.getByPlaceholderText('Explain why this item is inaccurate, unverifiable, or obsolete...');
    fireEvent.change(reasonInput, { target: { value: 'Test Reason' } });

    // Click Generate
    const generateBtn = screen.getByRole('button', { name: /generate instrument/i });
    fireEvent.click(generateBtn);

    // Wait for the generated content to appear
    await waitFor(() => {
      expect(screen.getByText('MOCKED DISPUTE LETTER CONTENT')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('completes the process when Finalize is clicked', async () => {
    render(<CreditDefenseWizard entity={mockEntity} onComplete={mockOnComplete} />);

    // Fill in inputs
    fireEvent.change(screen.getByPlaceholderText('e.g. Account #1234-5678 (Acme Bank)'), { target: { value: 'Test Item' } });
    fireEvent.change(screen.getByPlaceholderText('Explain why this item is inaccurate, unverifiable, or obsolete...'), { target: { value: 'Test Reason' } });

    // Click Generate
    const generateBtn = screen.getByRole('button', { name: /generate instrument/i });
    fireEvent.click(generateBtn);

    // Wait for generated content
    await waitFor(() => {
      expect(screen.getByText('MOCKED DISPUTE LETTER CONTENT')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Click Finalize
    const finalizeBtn = screen.getByRole('button', { name: /finalize & record/i });
    fireEvent.click(finalizeBtn);

    // Check if onComplete was called with correct data
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
    const calledArg = mockOnComplete.mock.calls[0][0];
    expect(calledArg.entityId).toBe('ENT-123');
    expect(calledArg.type).toBe('Dispute');
    expect(calledArg.status).toBe('Sent');
    
    // Check for success message
    expect(screen.getByText('Successfully recorded')).toBeInTheDocument();
  });
});
