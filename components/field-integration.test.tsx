/**
 * Field Integration Tests
 *
 * Tests for Teach Mode field hover detection and mapping resolution.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, renderHook, act } from '@testing-library/react';
import {
  FieldMapping,
  resolveFieldMapping,
  TeachModeFieldProps,
  useTeachModeField,
  TeachModeFieldProvider,
  TeachModeField,
} from './field-integration';

// Mock manual mappings
const mockMappings: Record<string, FieldMapping> = {
  'i1099nec.tcc_format': {
    fieldId: 'tcc_format',
    label: 'TCC Format',
    description: 'Transmitter Control Code format',
    taxonomyPath: ['Preparation', 'TIN Format', 'TCC Format'],
  },
  'i1099nec.payment_amount': {
    fieldId: 'payment_amount',
    label: 'Payment Amount',
    description: 'Total amount of payments made',
    taxonomyPath: ['Validation', 'Thresholds', 'Payment Thresholds'],
    examples: {
      valid: ['$600.00', '$1250.50'],
      invalid: ['$599.99', 'text'],
    },
  },
};

describe('Field-to-Mapping Resolution', () => {
  it('should resolve field mapping for known field', () => {
    const result = resolveFieldMapping('i1099nec', 'tcc_format', mockMappings);

    expect(result).toBeDefined();
    expect(result?.fieldId).toBe('tcc_format');
    expect(result?.label).toBe('TCC Format');
  });

  it('should return null for unknown field', () => {
    const result = resolveFieldMapping('i1099nec', 'unknown_field', mockMappings);

    expect(result).toBeNull();
  });

  it('should return null for unknown form', () => {
    const result = resolveFieldMapping('unknown_form', 'tcc_format', mockMappings);

    expect(result).toBeNull();
  });

  it('should include taxonomy path in mapping', () => {
    const result = resolveFieldMapping('i1099nec', 'payment_amount', mockMappings);

    expect(result?.taxonomyPath).toEqual([
      'Validation',
      'Thresholds',
      'Payment Thresholds',
    ]);
  });

  it('should include examples when available', () => {
    const result = resolveFieldMapping('i1099nec', 'payment_amount', mockMappings);

    expect(result?.examples).toBeDefined();
    expect(result?.examples?.valid).toHaveLength(2);
  });
});

describe('Field State Tracking', () => {
  it('should track hover state for field', () => {
    const TestComponent = () => {
      const { isHovered, handleMouseEnter, handleMouseLeave } = useTeachModeField();

      return (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          data-hovered={isHovered}
        >
          Test Field
        </div>
      );
    };

    const { container } = render(
      <TeachModeFieldProvider teachModeEnabled={true}>
        <TestComponent />
      </TeachModeFieldProvider>
    );
    const field = container.firstChild as HTMLElement;

    expect(field.getAttribute('data-hovered')).toBe('false');

    fireEvent.mouseEnter(field);
    expect(field.getAttribute('data-hovered')).toBe('true');

    fireEvent.mouseLeave(field);
    expect(field.getAttribute('data-hovered')).toBe('false');
  });

  it('should share hover state across fields with Teach Mode enabled', () => {
    const { result } = renderHook(() => useTeachModeField(), {
      wrapper: ({ children }) => (
        <TeachModeFieldProvider teachModeEnabled={true}>
          {children}
        </TeachModeFieldProvider>
      ),
    });

    expect(result.current.isHovered).toBe(false);

    act(() => {
      result.current.handleMouseEnter();
    });

    expect(result.current.isHovered).toBe(true);
  });
});

describe('Teach Mode Gate', () => {
  it('should not show overlay when Teach Mode disabled', () => {
    const props: TeachModeFieldProps = {
      formId: 'i1099nec',
      fieldId: 'tcc_format',
      teachModeEnabled: false,
      mappings: mockMappings,
      children: <input type="text" />,
    };

    const { container } = render(<TeachModeField {...props} />);
    const overlay = container.querySelector('.teach-mode-overlay');

    expect(overlay).not.toBeInTheDocument();
  });

  it('should show overlay when Teach Mode enabled and field mapped', () => {
    const props: TeachModeFieldProps = {
      formId: 'i1099nec',
      fieldId: 'tcc_format',
      teachModeEnabled: true,
      mappings: mockMappings,
      children: <input type="text" />,
    };

    const { container } = render(<TeachModeField {...props} />);

    // Trigger hover
    const input = container.querySelector('input');
    fireEvent.mouseEnter(input!);

    const overlay = container.querySelector('.teach-mode-overlay');
    expect(overlay).toBeInTheDocument();
  });

  it('should not show overlay for unmapped field', () => {
    const props: TeachModeFieldProps = {
      formId: 'i1099nec',
      fieldId: 'unmapped_field',
      teachModeEnabled: true,
      mappings: mockMappings,
      children: <input type="text" />,
    };

    const { container } = render(<TeachModeField {...props} />);

    const input = container.querySelector('input');
    fireEvent.mouseEnter(input!);

    const overlay = container.querySelector('.teach-mode-overlay');
    expect(overlay).not.toBeInTheDocument();
  });
});
