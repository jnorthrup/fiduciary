/**
 * Shared Wizard Components
 * 
 * Reusable UI components for wizard flows to ensure consistency
 * and reduce duplication across 60+ wizard components.
 */

import React from 'react';
import { ArrowRight, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

// ============================================================================
// WIZARD CONTAINER
// ============================================================================

interface WizardContainerProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'formal' | 'legal';
}

export const WizardContainer: React.FC<WizardContainerProps> = ({
  title,
  subtitle,
  icon,
  children,
  className = '',
  variant = 'default',
}) => {
  const variants = {
    default: 'bg-slate-50 font-sans',
    formal: 'bg-[#fffbf5] font-serif',
    legal: 'bg-slate-100 font-mono',
  };

  return (
    <div className={`p-6 rounded-xl border border-slate-200 h-full flex flex-col ${variants[variant]} ${className}`}>
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
          {icon}
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        )}
      </div>
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

// ============================================================================
// STEP INDICATOR
// ============================================================================

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
  variant?: 'dots' | 'numbers' | 'progress';
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  totalSteps,
  labels,
  variant = 'dots',
}) => {
  if (variant === 'progress') {
    const progress = ((currentStep) / totalSteps) * 100;
    return (
      <div className="w-full">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Step {currentStep} of {totalSteps}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <React.Fragment key={i}>
          {variant === 'numbers' ? (
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                i + 1 === currentStep
                  ? 'bg-indigo-600 text-white'
                  : i + 1 < currentStep
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {i + 1 < currentStep ? <CheckCircle2 size={16} /> : i + 1}
            </div>
          ) : (
            <div
              className={`w-3 h-3 rounded-full transition-all ${
                i + 1 === currentStep
                  ? 'bg-indigo-600 scale-125'
                  : i + 1 < currentStep
                  ? 'bg-emerald-500'
                  : 'bg-slate-300'
              }`}
            />
          )}
          {i < totalSteps - 1 && (
            <div className={`w-8 h-0.5 ${i + 1 < currentStep ? 'bg-emerald-500' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ============================================================================
// WIZARD NAVIGATION
// ============================================================================

interface WizardNavigationProps {
  onBack?: () => void;
  onNext?: () => void;
  onComplete?: () => void;
  canGoBack?: boolean;
  canGoNext?: boolean;
  isLoading?: boolean;
  isLastStep?: boolean;
  backLabel?: string;
  nextLabel?: string;
  completeLabel?: string;
}

export const WizardNavigation: React.FC<WizardNavigationProps> = ({
  onBack,
  onNext,
  onComplete,
  canGoBack = true,
  canGoNext = true,
  isLoading = false,
  isLastStep = false,
  backLabel = 'Back',
  nextLabel = 'Continue',
  completeLabel = 'Complete',
}) => {
  return (
    <div className="flex justify-between items-center pt-6 border-t border-slate-100 mt-6">
      {onBack && canGoBack ? (
        <button
          onClick={onBack}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 disabled:opacity-50"
        >
          <ArrowLeft size={18} />
          {backLabel}
        </button>
      ) : (
        <div />
      )}

      {isLastStep ? (
        <button
          onClick={onComplete}
          disabled={!canGoNext || isLoading}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CheckCircle2 size={18} />
              {completeLabel}
            </>
          )}
        </button>
      ) : (
        <button
          onClick={onNext}
          disabled={!canGoNext || isLoading}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Loading...
            </>
          ) : (
            <>
              {nextLabel}
              <ArrowRight size={18} />
            </>
          )}
        </button>
      )}
    </div>
  );
};

// ============================================================================
// INFO BANNER
// ============================================================================

interface InfoBannerProps {
  title?: string;
  children: React.ReactNode;
  variant?: 'info' | 'warning' | 'success' | 'error';
}

export const InfoBanner: React.FC<InfoBannerProps> = ({
  title,
  children,
  variant = 'info',
}) => {
  const variants = {
    info: 'bg-indigo-50 border-indigo-100 text-indigo-800',
    warning: 'bg-amber-50 border-amber-100 text-amber-800',
    success: 'bg-emerald-50 border-emerald-100 text-emerald-800',
    error: 'bg-red-50 border-red-100 text-red-800',
  };

  const icons = {
    info: <AlertCircle className="text-indigo-600 shrink-0" size={20} />,
    warning: <AlertCircle className="text-amber-600 shrink-0" size={20} />,
    success: <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />,
    error: <AlertCircle className="text-red-600 shrink-0" size={20} />,
  };

  return (
    <div className={`p-4 rounded-lg border flex items-start gap-3 ${variants[variant]}`}>
      {icons[variant]}
      <div>
        {title && <h4 className="font-bold text-sm mb-1">{title}</h4>}
        <div className="text-xs leading-relaxed">{children}</div>
      </div>
    </div>
  );
};

// ============================================================================
// FORM FIELD
// ============================================================================

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  error,
  hint,
  children,
}) => {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-slate-400">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
};

// ============================================================================
// OPTION CARD
// ============================================================================

interface OptionCardProps {
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  disabled?: boolean;
}

export const OptionCard: React.FC<OptionCardProps> = ({
  selected,
  onClick,
  icon,
  title,
  description,
  disabled,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-4 border-2 rounded-xl transition-all text-left flex flex-col items-center gap-2 ${
        selected
          ? 'border-indigo-600 bg-indigo-50 shadow-md'
          : 'border-slate-100 hover:border-slate-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {icon && (
        <div className={selected ? 'text-indigo-600' : 'text-slate-400'}>
          {icon}
        </div>
      )}
      <span className={`text-sm font-bold ${selected ? 'text-indigo-900' : 'text-slate-600'}`}>
        {title}
      </span>
      {description && (
        <span className="text-xs text-slate-500 text-center">{description}</span>
      )}
    </button>
  );
};

// ============================================================================
// SELECTION GRID
// ============================================================================

interface SelectionGridProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { id: T; label: string; icon?: React.ReactNode; description?: string }[];
  columns?: 2 | 3 | 4;
}

export function SelectionGrid<T extends string>({
  value,
  onChange,
  options,
  columns = 3,
}: SelectionGridProps<T>) {
  const colsClass = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  };

  return (
    <div className={`grid grid-cols-1 ${colsClass[columns]} gap-3`}>
      {options.map((option) => (
        <OptionCard
          key={option.id}
          selected={value === option.id}
          onClick={() => onChange(option.id)}
          icon={option.icon}
          title={option.label}
          description={option.description}
        />
      ))}
    </div>
  );
}
