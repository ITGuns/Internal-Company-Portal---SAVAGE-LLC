'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail } from 'lucide-react';
import LoginInput from '@/components/LoginInput';
import { useUser } from '@/contexts/UserContext';
import { requestPasswordReset } from '@/lib/api';
import styles from '../login/login.module.css';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { user } = useUser();
  
  // Form state
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Handle forgot password
  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate email
      if (!email) {
        setError('Please enter your email address');
        setLoading(false);
        return;
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      // Password reset not yet implemented in backend
      // Simulate success for now
      await requestPasswordReset(email);
      
      setSuccess(true);
      setError('');
      setLoading(false);

    } catch (err: unknown) {
      console.error('Forgot password error:', err);
      setError(err instanceof Error ? err.message : 'Request failed. Please try again.');
      setLoading(false);
    }
  };

  // Don't render if already logged in
  if (user) {
    return null;
  }

  return (
    <div className={styles.loginContainer}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Reset Password</h1>
          <p className={styles.subtitle}>
            {success 
              ? "Check your email for further instructions"
              : "Enter your email to receive a password reset link"
            }
          </p>
        </div>

        {success ? (
          /* Success Message */
          <div style={{
            padding: '24px',
            textAlign: 'center',
            color: 'var(--login-text-primary)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 16px',
              borderRadius: '50%',
              backgroundColor: 'var(--login-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px'
            }}>
              📧
            </div>
            <p style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '8px',
              color: 'var(--login-text-primary)'
            }}>
              Email Sent!
            </p>
            <p style={{
              fontSize: '1rem',
              color: 'var(--login-text-secondary)',
              marginBottom: '16px',
              lineHeight: 1.5
            }}>
              We've sent password reset instructions to <strong>{email}</strong>
            </p>
            <p style={{
              fontSize: '0.8rem',
              color: 'var(--login-text-secondary)'
            }}>
              Didn't receive the email? Check your spam folder or try again.
            </p>
          </div>
        ) : (
          /* Forgot Password Form */
          <form className={styles.form} onSubmit={handleForgotPassword}>
            <LoginInput
              id="email"
              label="Email Address"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@savage.com"
              required
              disabled={loading}
              icon={Mail}
              autoComplete="email"
            />

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading && <span className={styles.spinner} />}
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        {/* Error Message */}
        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        {/* Back to Login Section */}
        <div className={styles.signUpSection}>
          <p className={styles.signUpText}>
            Remember your password?
            <a 
              href="/login" 
              className={styles.signUpLink}
              onClick={(e) => {
                e.preventDefault();
                router.push('/login');
              }}
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
