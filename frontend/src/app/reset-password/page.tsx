'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock } from 'lucide-react';
import LoginInput from '@/components/LoginInput';
import { useUser } from '@/contexts/UserContext';
import { resetPassword } from '@/lib/api';
import { getAuthenticatedLandingPath } from '@/lib/role-access';
import styles from '../login/login.module.css';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  // ?setup=1 - this link came from an invite, not a forgot-password request, so
  // the person has never had a password here. Telling them to "reset" one, or
  // that theirs "has been reset", describes something that never happened; for a
  // Gemfield client it lands moments after a warm welcome email and reads as a
  // breach notice. Purely cosmetic: the token, the API call and the rules are
  // identical either way. Emitted by the three invite/onboarding link builders
  // (clients, users, employees); the forgot-password flow deliberately omits it.
  const isSetup = ['1', 'true', 'yes'].includes(
    (searchParams.get('setup') || '').toLowerCase()
  );

  const copy = isSetup
    ? {
      title: 'Set up your password',
      subtitle: 'Choose a password and your portal is ready.',
      successSubtitle: 'Your account is ready',
      passwordLabel: 'Password',
      submit: 'Create my password',
      submitting: 'Setting up...',
      successHeading: "You're all set!",
      successBody: 'Sign in with your new password to open your portal.',
      invalidLink: 'This setup link is invalid or has expired. Reply to the email it came from and we will send you a new one.',
      failed: 'Could not set your password. This link may have expired - reply to the email it came from for a new one.',
    }
    : {
      title: 'Set New Password',
      subtitle: 'Enter your new password below',
      successSubtitle: 'Your password has been reset successfully',
      passwordLabel: 'New Password',
      submit: 'Reset Password',
      submitting: 'Resetting...',
      successHeading: 'Password Reset!',
      successBody: 'You can now sign in with your new password.',
      invalidLink: 'Invalid reset link. Please request a new one.',
      failed: 'Failed to reset password. The link may have expired.',
    };

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      router.push(getAuthenticatedLandingPath(user));
    }
  }, [user, router]);

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token || !email) {
      setError(copy.invalidLink);
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
      setError(err instanceof Error ? err.message : copy.failed);
    } finally {
      setLoading(false);
    }
  };

  if (user) return null;

  return (
    <main className={styles.loginContainer}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>{copy.title}</h1>
          <p className={styles.subtitle}>
            {success ? copy.successSubtitle : copy.subtitle}
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
              {copy.successHeading}
            </p>
            <p style={{
              fontSize: '1rem',
              color: 'var(--login-text-secondary)',
              marginBottom: '16px',
              lineHeight: 1.5
            }}>
              {copy.successBody}
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
              label={copy.passwordLabel}
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
              {loading ? copy.submitting : copy.submit}
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
            <Link
              href="/login"
              className={styles.signUpLink}
            >
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
