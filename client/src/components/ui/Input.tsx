import React from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-stone-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-10 w-full rounded-lg border bg-white px-3 text-sm text-stone-900',
            'placeholder:text-stone-400 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500',
            error ? 'border-rose-400 focus:ring-rose-400' : 'border-stone-300',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-rose-500">{error}</p>}
        {hint && !error && <p className="text-xs text-stone-500">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
