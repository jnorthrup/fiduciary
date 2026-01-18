/**
 * useWizard Hook
 * 
 * A reusable hook for multi-step wizard flows that reduces boilerplate
 * across the 60+ wizard components in this application.
 * 
 * Features:
 * - Step navigation with validation
 * - Loading state management
 * - Form data tracking with type safety
 * - Async action execution with loading states
 * - History for back navigation
 */

import { useState, useCallback, useMemo } from 'react';

export interface WizardStep<T = any> {
  id: string;
  title: string;
  description?: string;
  validate?: (data: T) => boolean | string; // Returns true or error message
}

export interface UseWizardOptions<T extends Record<string, any>> {
  steps: WizardStep<T>[];
  initialData: T;
  onComplete?: (data: T) => void | Promise<void>;
}

export interface UseWizardReturn<T extends Record<string, any>> {
  // Current state
  currentStep: number;
  currentStepConfig: WizardStep<T>;
  totalSteps: number;
  data: T;
  isLoading: boolean;
  error: string | null;
  
  // Navigation
  canGoNext: boolean;
  canGoBack: boolean;
  goNext: () => void;
  goBack: () => void;
  goToStep: (step: number) => void;
  
  // Data management
  setField: <K extends keyof T>(field: K, value: T[K]) => void;
  setFields: (updates: Partial<T>) => void;
  resetData: () => void;
  
  // Actions
  execute: <R>(action: () => Promise<R>) => Promise<R | undefined>;
  complete: () => Promise<void>;
  
  // UI helpers
  isFirstStep: boolean;
  isLastStep: boolean;
  progress: number; // 0-100
  stepHistory: number[];
}

export function useWizard<T extends Record<string, any>>(
  options: UseWizardOptions<T>
): UseWizardReturn<T> {
  const { steps, initialData, onComplete } = options;

  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepHistory, setStepHistory] = useState<number[]>([0]);

  // Derived state
  const currentStepConfig = steps[currentStep];
  const totalSteps = steps.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Validation
  const validateCurrentStep = useCallback((): boolean | string => {
    if (!currentStepConfig.validate) return true;
    return currentStepConfig.validate(data);
  }, [currentStepConfig, data]);

  const canGoNext = useMemo(() => {
    const result = validateCurrentStep();
    return result === true;
  }, [validateCurrentStep]);

  const canGoBack = currentStep > 0;

  // Navigation
  const goNext = useCallback(() => {
    const validation = validateCurrentStep();
    if (validation !== true) {
      setError(typeof validation === 'string' ? validation : 'Validation failed');
      return;
    }
    setError(null);
    if (currentStep < totalSteps - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setStepHistory(prev => [...prev, nextStep]);
    }
  }, [currentStep, totalSteps, validateCurrentStep]);

  const goBack = useCallback(() => {
    setError(null);
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      setStepHistory(prev => [...prev, prevStep]);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < totalSteps) {
      setError(null);
      setCurrentStep(step);
      setStepHistory(prev => [...prev, step]);
    }
  }, [totalSteps]);

  // Data management
  const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setData(prev => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  const setFields = useCallback((updates: Partial<T>) => {
    setData(prev => ({ ...prev, ...updates }));
    setError(null);
  }, []);

  const resetData = useCallback(() => {
    setData(initialData);
    setCurrentStep(0);
    setError(null);
    setStepHistory([0]);
  }, [initialData]);

  // Action execution with loading state
  const execute = useCallback(async <R,>(action: () => Promise<R>): Promise<R | undefined> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await action();
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Completion handler
  const complete = useCallback(async () => {
    const validation = validateCurrentStep();
    if (validation !== true) {
      setError(typeof validation === 'string' ? validation : 'Validation failed');
      return;
    }

    if (onComplete) {
      await execute(async () => {
        await onComplete(data);
      });
    }
  }, [data, onComplete, execute, validateCurrentStep]);

  return {
    // State
    currentStep,
    currentStepConfig,
    totalSteps,
    data,
    isLoading,
    error,
    
    // Navigation
    canGoNext,
    canGoBack,
    goNext,
    goBack,
    goToStep,
    
    // Data
    setField,
    setFields,
    resetData,
    
    // Actions
    execute,
    complete,
    
    // UI helpers
    isFirstStep,
    isLastStep,
    progress,
    stepHistory,
  };
}

/**
 * Simple step-based wizard hook for wizards that don't need 
 * complex validation or data management
 */
export function useSimpleWizard(totalSteps: number) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const next = useCallback(() => {
    if (step < totalSteps) setStep(s => s + 1);
  }, [step, totalSteps]);

  const back = useCallback(() => {
    if (step > 1) setStep(s => s - 1);
  }, [step]);

  const reset = useCallback(() => setStep(1), []);

  const withLoading = useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    try {
      return await action();
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    step,
    setStep,
    next,
    back,
    reset,
    isLoading,
    setIsLoading,
    withLoading,
    isFirst: step === 1,
    isLast: step === totalSteps,
    progress: (step / totalSteps) * 100,
  };
}

export default useWizard;
