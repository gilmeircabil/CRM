import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FormFieldProps {
  label: string;
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required,
  children,
  htmlFor,
  className = '',
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={htmlFor}
          className="block text-xs font-semibold text-slate-700 tracking-wider uppercase"
        >
          {label} {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
        {error && (
          <span
            role="alert"
            className="text-xs font-semibold text-rose-600 flex items-center space-x-1 animate-in fade-in duration-150"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500 mr-1" />
            <span>{error}</span>
          </span>
        )}
      </div>
      {children}
    </div>
  );
};

export function getInputClassName(
  error?: string | null,
  options?: {
    hasIcon?: boolean;
    extraClasses?: string;
  }
): string {
  const { hasIcon = false, extraClasses = '' } = options || {};
  const base = `w-full rounded-lg text-xs transition-colors focus:outline-none ${
    hasIcon ? 'pl-9 pr-3 py-2' : 'px-3 py-2'
  }`;

  if (error) {
    return `${base} border border-rose-500 ring-1 ring-rose-500/50 bg-rose-50/20 text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/30 ${extraClasses}`;
  }

  return `${base} border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 ${extraClasses}`;
}
