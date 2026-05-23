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
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'border border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)] hover:brightness-95',
  secondary: 'border border-[var(--border)] bg-[var(--card-surface)] text-[var(--foreground)] hover:border-[var(--muted)] hover:bg-[var(--surface-hover)]',
  success: 'border border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800',
  danger: 'border border-red-700 bg-red-700 text-white hover:bg-red-800',
  ghost: 'border border-transparent bg-transparent text-[var(--foreground)] hover:bg-[var(--card-surface)]',
  outline: 'border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:border-[var(--muted)] hover:bg-[var(--card-surface)]',
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
