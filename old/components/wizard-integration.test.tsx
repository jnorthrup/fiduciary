/**
 * Form Wizard Teach Mode Integration Tests
 *
 * Tests for Teach Mode integration with IRIS1099Wizard.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  TeachModeWizardProvider,
  TeachModeWizardProviderProps,
  useTeachModeWizard,
  TeachModeWizardField,
} from './wizard-integration';

describe('Teach Mode Context Provider', () => {
  it('should provide Teach Mode enabled state to children', () => {
    const props: TeachModeWizardProviderProps = {
      teachModeEnabled: true,
      children: <div data-testid="child">Child</div>,
    };

    render(<TeachModeWizardProvider {...props} />);

    const child = screen.getByTestId('child');
    expect(child).toBeInTheDocument();
  });

  it('should update Teach Mode state when prop changes', async () => {
    const { rerender } = render(
      <TeachModeWizardProvider
        teachModeEnabled={false}
        children={<div data-testid="child">Child</div>}
      />
    );

    let child = screen.getByTestId('child');
    expect(child).toBeInTheDocument();

    rerender(
      <TeachModeWizardProvider
        teachModeEnabled={true}
        children={<div data-testid="child">Child</div>}
      />
    );

    // Re-find child after rerender
    child = screen.getByTestId('child');
    expect(child).toBeInTheDocument();
  });
});

describe('Step-Level Teach Mode State', () => {
  it('should track current wizard step', () => {
    const TestComponent = () => {
      const { currentStep, setCurrentStep } = useTeachModeWizard();

      return (
        <div>
          <span data-testid="step">{currentStep}</span>
          <button onClick={() => setCurrentStep('step2')}>Set Step 2</button>
        </div>
      );
    };

    const wrapper = ({ children }) => (
      <TeachModeWizardProvider teachModeEnabled={true}>
        {children}
      </TeachModeWizardProvider>
    );

    render(<TestComponent />, { wrapper });

    const step = screen.getByTestId('step');
    expect(step.textContent).toBe('step1');

    const button = screen.getByText('Set Step 2');
    fireEvent.click(button);

    expect(step.textContent).toBe('step2');
  });

  it('should provide field mappings for current step', () => {
    const TestComponent = () => {
      const { getFieldMappings } = useTeachModeWizard();

      const step1Mappings = getFieldMappings('step1');
      const step2Mappings = getFieldMappings('step2');

      return (
        <div>
          <span data-testid="step1-count">{step1Mappings?.length || 0}</span>
          <span data-testid="step2-count">{step2Mappings?.length || 0}</span>
        </div>
      );
    };

    const wrapper = ({ children }) => (
      <TeachModeWizardProvider
        teachModeEnabled={true}
        stepMappings={{
          step1: ['tcc_format', 'ein_format'],
          step2: ['payment_amount', 'payment_date'],
        }}
      >
        {children}
      </TeachModeWizardProvider>
    );

    render(<TestComponent />, { wrapper });

    const step1Count = screen.getByTestId('step1-count');
    const step2Count = screen.getByTestId('step2-count');

    expect(step1Count.textContent).toBe('2');
    expect(step2Count.textContent).toBe('2');
  });
});

describe('Teach Mode Wizard Field', () => {
  it('should wrap field with Teach Mode overlay on hover', async () => {
    const props = {
      formId: 'i1099nec',
      fieldId: 'tcc_format',
      stepId: 'step1',
      label: 'TCC Format',
      children: <input type="text" data-testid="tcc-input" />,
    };

    const wrapper = ({ children }) => (
      <TeachModeWizardProvider
        teachModeEnabled={true}
        stepMappings={{
          step1: ['tcc_format'],
        }}
        mappings={{
          'i1099nec.tcc_format': {
            fieldId: 'tcc_format',
            label: 'TCC Format',
            description: 'Transmitter Control Code format: XX-XXXXXXX',
            taxonomyPath: ['Preparation', 'TIN Format', 'TCC Format'],
          },
        }}
      >
        {children}
      </TeachModeWizardProvider>
    );

    render(<TeachModeWizardField {...props} />, { wrapper });

    const input = screen.getByTestId('tcc-input');
    fireEvent.mouseEnter(input);

    // Wait for overlay to appear
    await waitFor(() => {
      const overlay = document.querySelector('.teach-mode-overlay');
      expect(overlay).toBeInTheDocument();
    });
  });

  it('should not show overlay when Teach Mode disabled', () => {
    const props = {
      formId: 'i1099nec',
      fieldId: 'tcc_format',
      stepId: 'step1',
      label: 'TCC Format',
      children: <input type="text" data-testid="tcc-input" />,
    };

    const wrapper = ({ children }) => (
      <TeachModeWizardProvider teachModeEnabled={false}>
        {children}
      </TeachModeWizardProvider>
    );

    render(<TeachModeWizardField {...props} />, { wrapper });

    const input = screen.getByTestId('tcc-input');
    fireEvent.mouseEnter(input);

    // Overlay should not appear
    const overlay = document.querySelector('.teach-mode-overlay');
    expect(overlay).not.toBeInTheDocument();
  });
});

describe('Validation and Overlay Coordination', () => {
  it('should show overlay on validation error', async () => {
    const TestComponent = () => {
      const { triggerValidationError } = useTeachModeWizard();

      return (
        <div>
          <TeachModeWizardField
            formId="i1099nec"
            fieldId="tcc_format"
            stepId="step1"
            label="TCC Format"
          >
            <input type="text" data-testid="tcc-input" />
          </TeachModeWizardField>
          <button
            onClick={() =>
              triggerValidationError('tcc_format', {
                errorCode: 'INVALID_FORMAT',
                message: 'Invalid TCC format',
              })
            }
          >
            Trigger Error
          </button>
        </div>
      );
    };

    const wrapper = ({ children }) => (
      <TeachModeWizardProvider
        teachModeEnabled={true}
        stepMappings={{ step1: ['tcc_format'] }}
        mappings={{
          'i1099nec.tcc_format': {
            fieldId: 'tcc_format',
            label: 'TCC Format',
            description: 'TCC Format: XX-XXXXXXX',
            taxonomyPath: ['Preparation', 'TIN Format', 'TCC Format'],
          },
        }}
      >
        {children}
      </TeachModeWizardProvider>
    );

    render(<TestComponent />, { wrapper });

    const button = screen.getByText('Trigger Error');
    fireEvent.click(button);

    // After validation error, hover over the input to see overlay
    const input = screen.getByTestId('tcc-input');
    fireEvent.mouseEnter(input);

    await waitFor(() => {
      const overlay = document.querySelector('.teach-mode-overlay');
      expect(overlay).toBeInTheDocument();
    });
  });

  it('should dismiss overlay when field value is corrected', async () => {
    const TestComponent = () => {
      const { triggerValidationError, markFieldCorrected } = useTeachModeWizard();

      return (
        <div>
          <TeachModeWizardField
            formId="i1099nec"
            fieldId="tcc_format"
            stepId="step1"
            label="TCC Format"
          >
            <input type="text" data-testid="tcc-input" />
          </TeachModeWizardField>
          <button
            onClick={() =>
              triggerValidationError('tcc_format', {
                errorCode: 'INVALID_FORMAT',
                message: 'Invalid',
              })
            }
          >
            Trigger Error
          </button>
          <button onClick={() => markFieldCorrected('tcc_format', 'XX-1234567')}>
            Mark Corrected
          </button>
        </div>
      );
    };

    const wrapper = ({ children }) => (
      <TeachModeWizardProvider
        teachModeEnabled={true}
        stepMappings={{ step1: ['tcc_format'] }}
        mappings={{
          'i1099nec.tcc_format': {
            fieldId: 'tcc_format',
            label: 'TCC Format',
            description: 'TCC Format: XX-XXXXXXX',
            taxonomyPath: ['Preparation', 'TIN Format', 'TCC Format'],
          },
        }}
      >
        {children}
      </TeachModeWizardProvider>
    );

    render(<TestComponent />, { wrapper });

    // Trigger error
    const errorButton = screen.getByText('Trigger Error');
    fireEvent.click(errorButton);

    // Hover to see overlay
    const input = screen.getByTestId('tcc-input');
    fireEvent.mouseEnter(input);

    await waitFor(() => {
      const overlay = document.querySelector('.teach-mode-overlay');
      expect(overlay).toBeInTheDocument();
    });

    // Mark as corrected
    const correctButton = screen.getByText('Mark Corrected');
    fireEvent.click(correctButton);

    // After correction, overlay should not appear even on hover
    fireEvent.mouseEnter(input);

    await waitFor(() => {
      const overlay = document.querySelector('.teach-mode-overlay');
      expect(overlay).not.toBeInTheDocument();
    });
  });
});
