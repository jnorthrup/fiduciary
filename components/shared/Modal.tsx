
import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showClose?: boolean;
}

const widthClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-[95vw]',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  width = 'lg',
  showClose = true,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-xl shadow-2xl border border-slate-200 w-full ${widthClasses[width]} overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col`}
      >
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2 bg-indigo-100 rounded text-indigo-700 border border-indigo-200">
                {icon}
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-slate-800">{title}</h2>
              {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
          {showClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// QuickBooks-style form input
interface QBInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const QBInput: React.FC<QBInputProps> = ({ label, error, className = '', ...props }) => (
  <div className="space-y-1">
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
      {label}
    </label>
    <input
      {...props}
      className={`w-full border rounded-lg p-3 text-sm outline-none transition-all
        focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
        ${error ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300'}
        ${className}`}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

// QuickBooks-style select
interface QBSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  children: React.ReactNode;
}

export const QBSelect: React.FC<QBSelectProps> = ({ label, error, children, className = '', ...props }) => (
  <div className="space-y-1">
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
      {label}
    </label>
    <select
      {...props}
      className={`w-full border rounded-lg p-3 text-sm outline-none transition-all bg-white
        focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
        ${error ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'}
        ${className}`}
    >
      {children}
    </select>
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

// QuickBooks-style textarea
interface QBTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const QBTextArea: React.FC<QBTextAreaProps> = ({ label, error, className = '', ...props }) => (
  <div className="space-y-1">
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
      {label}
    </label>
    <textarea
      {...props}
      className={`w-full border rounded-lg p-3 text-sm outline-none transition-all resize-none
        focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
        ${error ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300'}
        ${className}`}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

// QuickBooks-style primary button
interface QBButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const QBButton: React.FC<QBButtonProps> = ({
  variant = 'primary',
  loading,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg disabled:bg-slate-300',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`px-6 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${className}`}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon}
      {children}
    </button>
  );
};

// Progress bar for wizard steps
interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

export const WizardProgress: React.FC<WizardProgressProps> = ({ currentStep, totalSteps, labels }) => (
  <div className="flex items-center gap-2">
    {Array.from({ length: totalSteps }).map((_, i) => (
      <div
        key={i}
        className={`h-2 flex-1 rounded-full transition-all duration-300 ${
          i < currentStep ? 'bg-indigo-600' : 'bg-slate-200'
        }`}
      />
    ))}
    {labels && labels[currentStep - 1] && (
      <span className="ml-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest whitespace-nowrap">
        {labels[currentStep - 1]}
      </span>
    )}
  </div>
);
