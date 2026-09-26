import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      className = '',
      containerClassName = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={`w-full ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-primary-900/70 uppercase tracking-wider mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-primary-800/40">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full rounded-lg px-3.5 py-2.5 text-sm glass-input placeholder:text-ivory-600 focus:outline-none transition-all duration-150 ${
              leftIcon ? 'pl-10' : ''
            } ${rightIcon ? 'pr-10' : ''} ${
              error
                ? 'border-rose-400/60 focus:border-rose-500 focus:ring-rose-500/20'
                : 'border-primary-950/10 hover:border-primary-950/18 focus:border-primary-800 focus:ring-primary-800/15'
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center text-primary-800/40">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
            <span className="inline-block w-1 h-1 rounded-full bg-rose-500" />
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="mt-1.5 text-xs text-primary-800/50">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
