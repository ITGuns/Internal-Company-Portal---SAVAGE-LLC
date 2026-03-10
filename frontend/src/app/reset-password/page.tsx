'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock } from 'lucide-react';
import LoginInput from '@/components/LoginInput';
import { useUser } from '@/contexts/UserContext';
import { resetPassword } from '@/lib/api';
import styles from '../login/login.module.css';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token || !email) {
      setError('Invalid reset link. Please request a new one.');
      return;
    }

    if (!password || !confirmPassword) {
      setError('Please fill in both password fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter');
      return;
    }

    if (!/\d/.test(password)) {
      setError('Password must contain at least one number');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, email, password);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (user) return null;

  return (
    <div className={styles.loginContainer}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Set New Password</h1>
          <p className={styles.subtitle}>
            {success
              ? 'Your password has been reset successfully'
              : 'Enter your new password below'
            }
          </p>
        </div>

        {success ? (
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
              ✅
            </div>
            <p style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '8px',
              color: 'var(--login-text-primary)'
            }}>
              Password Reset!
            </p>
            <p style={{
              fontSize: '1rem',
              color: 'var(--login-text-secondary)',
              marginBottom: '16px',
              lineHeight: 1.5
            }}>
              You can now sign in with your new password.
            </p>
            <button
              className={styles.submitButton}
              onClick={() => router.push('/login')}
            >
              Go to Sign In
            </button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleResetPassword}>
            <LoginInput
              id="password"
              label="New Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              required
              disabled={loading}
              icon={Lock}
              autoComplete="new-password"
            />

            <LoginInput
              id="confirmPassword"
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="••••••••"
              required
              disabled={loading}
              icon={Lock}
              autoComplete="new-password"
            />

            <p style={{
              fontSize: '0.8rem',
              color: 'var(--login-text-secondary)',
              margin: '0 0 8px 0'
            }}>
              Must be 8+ characters with at least one uppercase letter and one number.
            </p>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading && <span className={styles.spinner} />}
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        <div className={styles.signUpSection}>
          <p className={styles.signUpText}>
            <a
              href="/login"
              className={styles.signUpLink}
              onClick={(e) => {
                e.preventDefault();
                router.push('/login');
              }}
            >
              Back to Sign In
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
