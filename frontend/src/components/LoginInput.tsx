'use client';

import React from 'react';
import { LucideIcon, Eye, EyeOff } from 'lucide-react';
import styles from '../app/login/login.module.css';

export interface LoginInputProps {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  autoComplete?: string;
  error?: string;
}

/**
 * Login Input Component
 * Styled input specifically for the login page using monochromatic design
 * Uses login.module.css for consistent styling
 */
export default function LoginInput({
  id,
  label,
  type: initialType = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  icon: Icon,
  autoComplete,
  error
}: LoginInputProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const isPassword = initialType === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : initialType;

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };
  return (
    <div className={styles.formGroup}>
      <label htmlFor={id} className={styles.label}>
        {Icon && <Icon className={styles.labelIcon} size={16} />}
        {label}
        {required && <span style={{ color: 'var(--login-error)' }}>*</span>}
      </label>

      <div className={styles.inputWrapper}>
        {Icon && <Icon className={styles.inputIcon} size={16} />}
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          className={`${styles.input} ${isPassword ? styles.passwordInput : ''}`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {isPassword && (
          <button
            type="button"
            onClick={togglePassword}
            className={styles.passwordToggle}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className={styles.eyeIcon} size={20} />
            ) : (
              <Eye className={styles.eyeIcon} size={20} />
            )}
          </button>
        )}
      </div>

      {error && (
        <div id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
