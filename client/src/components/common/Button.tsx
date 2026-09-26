import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-ivory-200 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-5 py-3 gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-primary-950 hover:bg-primary-900 text-ivory-200 shadow-md shadow-primary-950/15 border border-primary-800/40 focus:ring-primary-800',
    secondary: 'bg-primary-950/[0.06] hover:bg-primary-950/[0.10] text-primary-900 border border-primary-950/10 hover:border-primary-950/20 focus:ring-primary-800/30',
    outline: 'bg-transparent hover:bg-primary-950/[0.04] text-primary-900 border border-primary-950/15 hover:border-primary-950/25 focus:ring-primary-800/30',
    ghost: 'bg-transparent hover:bg-primary-950/[0.04] text-primary-800 hover:text-primary-950 focus:ring-primary-800/30',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/15 border border-rose-500/30 focus:ring-rose-500',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
