/**
 * Validation Rule to Overlay Binding
 *
 * Binds validation rule events to Teach Mode overlay auto-display.
 */

import { useState, useCallback, useRef } from 'react';

export interface ValidationEvent {
  fieldId: string;
  errorCode: string;
  message: string;
}

export interface ValidationErrorOverlayProps {
  fieldId: string;
  formId: string;
  teachModeEnabled: boolean;
  mappings: Record<string, {
    fieldId: string;
    label: string;
    description: string;
    taxonomyPath: string[];
    validationRules?: string[];
  }>;
}

export interface ValidationResult {
  visible: boolean;
  error: ValidationEvent | null;
  getContent: () => { paragraph: { content: string; highlight?: string } } | null;
  getErrorContext: () => { rules: string[] } | null;
  triggerError: (error: ValidationEvent) => void;
  handleFieldChange: (value: string) => void;
}

/**
 * Bind validation error events for a field to overlay display.
 * Returns unbind function to stop listening.
 */
export function bindValidationToOverlay(
  fieldId: string,
  onError: (error: ValidationEvent) => void
): { unbind: () => void } {
  const handleValidationError = (event: Event) => {
    const customEvent = event as CustomEvent<ValidationEvent>;
    const error = customEvent.detail;

    if (error.fieldId === fieldId) {
      onError(error);
    }
  };

  window.addEventListener('validation:error', handleValidationError);

  return {
    unbind: () => {
      window.removeEventListener('validation:error', handleValidationError);
    },
  };
}

/**
 * Hook to bind validation errors to overlay visibility.
 */
export function useValidationOverlayBinding(
  props: ValidationErrorOverlayProps
): ValidationResult {
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<ValidationEvent | null>(null);
  const currentValueRef = useRef<string>('');

  const mapping = props.mappings[`${props.formId}.${props.fieldId}`];

  const triggerError = useCallback((err: ValidationEvent) => {
    if (props.teachModeEnabled && mapping) {
      setError(err);
      setVisible(true);
    }
  }, [props.teachModeEnabled, mapping]);

  const getContent = useCallback(() => {
    if (!mapping || !error) return null;

    // Find relevant portion of description to highlight
    const highlight = extractHighlight(mapping.description, error.errorCode);

    return {
      paragraph: {
        content: mapping.description,
        highlight,
      },
    };
  }, [mapping, error]);

  const getErrorContext = useCallback(() => {
    if (!mapping) return null;

    return {
      rules: mapping.validationRules || [],
    };
  }, [mapping]);

  const handleFieldChange = useCallback((value: string) => {
    currentValueRef.current = value;

    // If the new value is valid, hide the overlay
    // This is a simplified check - real implementation would validate
    if (isValidValue(value, error?.errorCode)) {
      setVisible(false);
      setError(null);
    }
  }, [error]);

  return {
    visible,
    error,
    getContent,
    getErrorContext,
    triggerError,
    handleFieldChange,
  };
}

/**
 * Extract highlight text from description based on error code.
 */
function extractHighlight(description: string, errorCode: string): string | undefined {
  // Simple heuristic: find format patterns in description
  const formatMatch = description.match(/[A-Z]{2}-[A-Z0-9]{7}/);
  if (formatMatch) {
    return formatMatch[0];
  }

  // Look for quoted examples
  const quotedMatch = description.match(/"([^"]+)"/);
  if (quotedMatch) {
    return quotedMatch[1];
  }

  return undefined;
}

/**
 * Simple validation check (placeholder).
 * Real implementation would use actual validation logic.
 */
function isValidValue(value: string, errorCode?: string): boolean {
  if (!errorCode) return true;

  switch (errorCode) {
    case 'INVALID_FORMAT':
      return /^[A-Z0-9]{2}-[A-Z0-9]{7}$/.test(value);
    case 'REQUIRED':
      return value.length > 0;
    default:
      return true;
  }
}
