/**
 * Form Wizard Teach Mode Integration
 *
 * Integrates Teach Mode with IRIS1099Wizard for step-level context and validation.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { TeachModeField } from './field-integration';
import { FieldMapping } from './field-integration';

export interface TeachModeWizardContextValue {
  teachModeEnabled: boolean;
  currentStep: string;
  setCurrentStep: (step: string) => void;
  getFieldMappings: (stepId: string) => string[] | null;
  triggerValidationError: (fieldId: string, error: { errorCode: string; message: string }) => void;
  markFieldCorrected: (fieldId: string, value: string) => void;
  visibleOverlays: Record<string, boolean>;
  mappings: Record<string, FieldMapping>;
}

const TeachModeWizardContext = createContext<TeachModeWizardContextValue | null>(null);

export interface TeachModeWizardProviderProps {
  children: React.ReactNode;
  teachModeEnabled: boolean;
  stepMappings?: Record<string, string[]>;
  mappings?: Record<string, FieldMapping>;
}

export function TeachModeWizardProvider({
  children,
  teachModeEnabled,
  stepMappings = {},
  mappings = {},
}: TeachModeWizardProviderProps) {
  const [currentStep, setCurrentStep] = useState('step1');
  const [visibleOverlays, setVisibleOverlays] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, { errorCode: string; message: string }>>({});

  const getFieldMappings = useCallback((stepId: string) => {
    return stepMappings[stepId] || null;
  }, [stepMappings]);

  const triggerValidationError = useCallback((fieldId: string, error: { errorCode: string; message: string }) => {
    setFieldErrors(prev => ({ ...prev, [fieldId]: error }));
    setVisibleOverlays(prev => ({ ...prev, [fieldId]: true }));
  }, []);

  const markFieldCorrected = useCallback((fieldId: string, value: string) => {
    // Remove error when field is corrected
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldId];
      return newErrors;
    });
    setVisibleOverlays(prev => {
      const newVisible = { ...prev };
      delete newVisible[fieldId];
      return newVisible;
    });
  }, []);

  return (
    <TeachModeWizardContext.Provider
      value={{
        teachModeEnabled,
        currentStep,
        setCurrentStep,
        getFieldMappings,
        triggerValidationError,
        markFieldCorrected,
        visibleOverlays,
        mappings,
      }}
    >
      {children}
    </TeachModeWizardContext.Provider>
  );
}

export function useTeachModeWizard(): TeachModeWizardContextValue {
  const context = useContext(TeachModeWizardContext);
  if (!context) {
    throw new Error('useTeachModeWizard must be used within TeachModeWizardProvider');
  }
  return context;
}

export interface TeachModeWizardFieldProps {
  formId: string;
  fieldId: string;
  stepId: string;
  label: string;
  children: React.ReactNode;
}

export function TeachModeWizardField({
  formId,
  fieldId,
  stepId,
  label,
  children,
}: TeachModeWizardFieldProps) {
  const { teachModeEnabled, visibleOverlays, markFieldCorrected, mappings } = useTeachModeWizard();

  const isVisible = visibleOverlays[fieldId] || false;
  const mappingKey = `${formId}.${fieldId}`;

  // Create mappings object for this specific field
  const fieldMappings: Record<string, FieldMapping> = {};
  if (mappings[mappingKey]) {
    fieldMappings[mappingKey] = mappings[mappingKey];
  }

  const handleValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    markFieldCorrected(fieldId, e.target.value);
  }, [fieldId, markFieldCorrected]);

  return (
    <TeachModeField
      formId={formId}
      fieldId={fieldId}
      teachModeEnabled={teachModeEnabled && isVisible}
      mappings={fieldMappings}
    >
      <div onChange={handleValueChange}>
        {children}
      </div>
    </TeachModeField>
  );
}
