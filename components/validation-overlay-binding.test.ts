/**
 * Validation Rule to Overlay Binding Tests
 *
 * Tests for Teach Mode integration with validation rule auto-trigger.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  ValidationEvent,
  ValidationErrorOverlayProps,
  useValidationOverlayBinding,
  bindValidationToOverlay,
} from './validation-overlay-binding';

describe('Rule-Fired Event Handling', () => {
  it('should listen for validation rule fired events', () => {
    const onValidationError = vi.fn();

    const { unbind } = bindValidationToOverlay('tcc_format', onValidationError);

    // Simulate validation error event
    const event = new CustomEvent<ValidationEvent>('validation:error', {
      detail: {
        fieldId: 'tcc_format',
        errorCode: 'INVALID_FORMAT',
        message: 'TCC must be in format XX-XXXXXXX',
      },
    });

    window.dispatchEvent(event);

    expect(onValidationError).toHaveBeenCalledWith(
      expect.objectContaining({
        fieldId: 'tcc_format',
        errorCode: 'INVALID_FORMAT',
      })
    );

    unbind();
  });

  it('should filter events for non-matching fields', () => {
    const onValidationError = vi.fn();

    bindValidationToOverlay('tcc_format', onValidationError);

    // Simulate validation error for different field
    const event = new CustomEvent<ValidationEvent>('validation:error', {
      detail: {
        fieldId: 'other_field',
        errorCode: 'INVALID_FORMAT',
        message: 'Some error',
      },
    });

    window.dispatchEvent(event);

    expect(onValidationError).not.toHaveBeenCalled();
  });

  it('should handle multiple validation listeners', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    bindValidationToOverlay('field1', listener1);
    bindValidationToOverlay('field2', listener2);

    const event1 = new CustomEvent<ValidationEvent>('validation:error', {
      detail: { fieldId: 'field1', errorCode: 'ERROR', message: 'Msg' },
    });

    const event2 = new CustomEvent<ValidationEvent>('validation:error', {
      detail: { fieldId: 'field2', errorCode: 'ERROR', message: 'Msg' },
    });

    window.dispatchEvent(event1);
    window.dispatchEvent(event2);

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  it('should stop listening when unbind called', () => {
    const onValidationError = vi.fn();

    const { unbind } = bindValidationToOverlay('tcc_format', onValidationError);
    unbind();

    const event = new CustomEvent<ValidationEvent>('validation:error', {
      detail: { fieldId: 'tcc_format', errorCode: 'ERROR', message: 'Msg' },
    });

    window.dispatchEvent(event);

    expect(onValidationError).not.toHaveBeenCalled();
  });
});

describe('Overlay Auto-Display on Error', () => {
  it('should show overlay when validation error occurs', () => {
    const props: ValidationErrorOverlayProps = {
      fieldId: 'tcc_format',
      formId: 'i1099nec',
      teachModeEnabled: true,
      mappings: {
        'i1099nec.tcc_format': {
          fieldId: 'tcc_format',
          label: 'TCC Format',
          description: 'Transmitter Control Code format',
          taxonomyPath: ['Preparation', 'TIN Format', 'TCC Format'],
        },
      },
    };

    const { result } = renderHook(() => useValidationOverlayBinding(props));

    act(() => {
      result.current.triggerError({
        fieldId: 'tcc_format',
        errorCode: 'INVALID_FORMAT',
        message: 'Invalid TCC format',
      });
    });

    expect(result.current.visible).toBe(true);
    expect(result.current.error).toEqual({
      fieldId: 'tcc_format',
      errorCode: 'INVALID_FORMAT',
      message: 'Invalid TCC format',
    });
  });

  it('should not show overlay when Teach Mode disabled', () => {
    const props: ValidationErrorOverlayProps = {
      fieldId: 'tcc_format',
      formId: 'i1099nec',
      teachModeEnabled: false,
      mappings: {},
    };

    const { result } = renderHook(() => useValidationOverlayBinding(props));

    act(() => {
      result.current.triggerError({
        fieldId: 'tcc_format',
        errorCode: 'INVALID_FORMAT',
        message: 'Invalid TCC format',
      });
    });

    expect(result.current.visible).toBe(false);
  });

  it('should hide overlay when field value corrected', () => {
    const props: ValidationErrorOverlayProps = {
      fieldId: 'tcc_format',
      formId: 'i1099nec',
      teachModeEnabled: true,
      mappings: {
        'i1099nec.tcc_format': {
          fieldId: 'tcc_format',
          label: 'TCC Format',
          description: 'Transmitter Control Code format',
          taxonomyPath: ['Preparation', 'TIN Format', 'TCC Format'],
        },
      },
    };

    const { result } = renderHook(() => useValidationOverlayBinding(props));

    act(() => {
      result.current.triggerError({
        fieldId: 'tcc_format',
        errorCode: 'INVALID_FORMAT',
        message: 'Invalid',
      });
    });

    expect(result.current.visible).toBe(true);

    act(() => {
      result.current.handleFieldChange('XX-1234567');
    });

    expect(result.current.visible).toBe(false);
  });
});

describe('Error-Specific Context Display', () => {
  it('should resolve error context from error code', () => {
    const props: ValidationErrorOverlayProps = {
      fieldId: 'tcc_format',
      formId: 'i1099nec',
      teachModeEnabled: true,
      mappings: {
        'i1099nec.tcc_format': {
          fieldId: 'tcc_format',
          label: 'TCC Format',
          description: 'Format: XX-XXXXXXX',
          taxonomyPath: ['Preparation', 'TIN Format', 'TCC Format'],
          validationRules: ['Must be 9 alphanumeric characters', 'Must use hyphen separator'],
        },
      },
    };

    const { result } = renderHook(() => useValidationOverlayBinding(props));

    act(() => {
      result.current.triggerError({
        fieldId: 'tcc_format',
        errorCode: 'INVALID_FORMAT',
        message: 'Invalid format',
      });
    });

    const context = result.current.getErrorContext();
    expect(context).toBeDefined();
    expect(context?.rules).toContain('Must be 9 alphanumeric characters');
  });

  it('should highlight error-relevant paragraph', () => {
    const props: ValidationErrorOverlayProps = {
      fieldId: 'tcc_format',
      formId: 'i1099nec',
      teachModeEnabled: true,
      mappings: {
        'i1099nec.tcc_format': {
          fieldId: 'tcc_format',
          label: 'TCC Format',
          description: 'The TCC format XX-XXXXXXX must be used',
          taxonomyPath: ['Preparation', 'TIN Format', 'TCC Format'],
        },
      },
    };

    const { result } = renderHook(() => useValidationOverlayBinding(props));

    act(() => {
      result.current.triggerError({
        fieldId: 'tcc_format',
        errorCode: 'INVALID_FORMAT',
        message: 'Invalid',
      });
    });

    const content = result.current.getContent();
    expect(content?.paragraph.highlight).toBe('XX-XXXXXXX');
  });
});
