'use client';

import { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock } from 'lucide-react';
import LoginInput from '@/components/LoginInput';
import { useUser } from '@/contexts/UserContext';
import { loginWithEmail } from '@/lib/api';
import { getAuthenticatedLandingPath } from '@/lib/role-access';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { user, refreshUser } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      router.push(getAuthenticatedLandingPath(user));
    }
  }, [user, router]);

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password) {
        setError('Please enter both email and password');
        setLoading(false);
        return;
      }

      const loginResponse = await loginWithEmail({ email, password });
      await refreshUser();
      router.push(getAuthenticatedLandingPath(loginResponse.user));
    } catch (err: unknown) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Login error:', err);
      }
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  if (user) {
    return null;
  }

  return (
    <main className={styles.loginContainer}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>MyDeskii</h1>
          <p className={styles.subtitle}>Sign in to SAVAGE LLC workspace</p>
        </div>

        <form className={styles.form} onSubmit={handleEmailLogin}>
          <LoginInput
            id="email"
            label="Email Address"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@savage.com…"
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
            placeholder="Enter your password…"
            required
            disabled={loading}
            icon={Lock}
            autoComplete="current-password"
          />

          <Link
            href="/forgot-password"
            className={styles.forgotPassword}
          >
            Forgot password?
          </Link>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading && <span className={styles.spinner} />}
            {loading ? 'Signing In…' : 'Sign In'}
          </button>
        </form>

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        <div className={styles.signUpSection}>
          <p className={styles.signUpText}>
            Don't have an account?
            <Link
              href="/signup"
              className={styles.signUpLink}
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
