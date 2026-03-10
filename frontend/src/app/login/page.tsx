'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock } from 'lucide-react';
import LoginInput from '@/components/LoginInput';
import { useUser } from '@/contexts/UserContext';
import { loginWithEmail } from '@/lib/api';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { user, refreshUser } = useUser();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Handle email/password login
  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate inputs
      if (!email || !password) {
        setError('Please enter both email and password');
        setLoading(false);
        return;
      }

      await loginWithEmail({ email, password });
      await refreshUser();
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  // Don't render login form if already logged in
  if (user) {
    return null;
  }

  return (
    <div className={styles.loginContainer}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>SAVAGE LLC</h1>
          <p className={styles.subtitle}>Sign in to your account</p>
        </div>

        {/* Email/Password Form */}
        <form className={styles.form} onSubmit={handleEmailLogin}>
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

          <LoginInput
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            required
            disabled={loading}
            icon={Lock}
            autoComplete="current-password"
          />

          {/* Forgot Password Link */}
          <a
            href="/forgot-password"
            className={styles.forgotPassword}
            onClick={(e) => {
              e.preventDefault();
              router.push('/forgot-password');
            }}
          >
            Forgot password?
          </a>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading && <span className={styles.spinner} />}
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        {/* Sign Up Section */}
        <div className={styles.signUpSection}>
          <p className={styles.signUpText}>
            Don't have an account?
            <a
              href="/signup"
              className={styles.signUpLink}
              onClick={(e) => {
                e.preventDefault();
                router.push('/signup');
              }}
            >
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
