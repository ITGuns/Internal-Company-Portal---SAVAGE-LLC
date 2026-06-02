import React from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  loading?: boolean;
}

const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-[var(--ease-out)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] active:translate-y-px active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0 disabled:active:scale-100';

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-10 px-3 py-2 text-sm',
  md: 'min-h-10 px-4 py-2 text-sm',
  lg: 'min-h-12 px-6 py-3 text-base',
};

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'border border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_12px_32px_-22px_var(--accent)] hover:brightness-105 hover:shadow-[0_16px_38px_-20px_var(--accent)]',
  secondary: 'border border-[var(--border)] bg-[var(--card-surface)] text-[var(--foreground)] hover:border-[var(--accent)] hover:bg-[var(--surface-hover)]',
  success: 'border border-[var(--status-completed)] bg-[var(--status-completed)] text-white hover:brightness-105',
  danger: 'border border-[var(--status-blocked)] bg-[var(--status-blocked)] text-white hover:brightness-105',
  ghost: 'border border-transparent bg-transparent text-[var(--foreground)] hover:bg-[var(--card-surface)]',
  outline: 'border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:border-[var(--accent)] hover:bg-[var(--card-surface)]',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const combinedClassName = cn(
    baseStyles,
    sizeStyles[size],
    variantStyles[variant],
    fullWidth && 'w-full',
    className,
  );
  
  return (
    <button
      className={combinedClassName}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {!loading && icon && iconPosition === 'left' && icon}
      {children}
      {!loading && icon && iconPosition === 'right' && icon}
    </button>
  );
}
