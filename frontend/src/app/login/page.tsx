'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock } from 'lucide-react';
import LoginInput from '@/components/LoginInput';
import { useUser } from '@/contexts/UserContext';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { user, refreshUser } = useUser();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bypass, setBypass] = useState(false);

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

      // Email/password authentication not yet implemented in backend
      setError('Email/password authentication is not yet implemented. Please use Dev Login below.');
      setLoading(false);
    } catch (err: unknown) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  // Handle dev login
  const handleDevLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:4000/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@savage.com' }),
      });

      const data = await res.json();

      if (data.success && data.tokens) {
        // Store auth token and user data
        localStorage.setItem('accessToken', data.tokens.accessToken);
        localStorage.setItem('currentUser', JSON.stringify(data.user));

        // Refresh user context
        await refreshUser();

        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        setError('Dev login failed. Please try again.');
      }
    } catch (err) {
      console.error('Dev login error:', err);
      setError('Connection error. Make sure backend is running on port 4000.');
    } finally {
      setLoading(false);
    }
  };

  // Handle frontend bypass
  const handleBypass = () => {
    if (!bypass) return;

    // Set mock user data
    const mockUser = {
      id: 'bypass-user',
      email: 'bypass@savage.com',
      name: 'Bypass User',
      avatar: 'https://ui-avatars.com/api/?name=Bypass+User&background=random',
    };

    const mockToken = 'bypass-token-' + Date.now();

    localStorage.setItem('accessToken', mockToken);
    localStorage.setItem('currentUser', JSON.stringify(mockUser));

    // Refresh user context and redirect
    refreshUser();
    router.push('/dashboard');
  };

  // Don't render login form if already logged in
  if (user) {
    return null;
  }

  const isDev = process.env.NODE_ENV !== 'production';

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

        {/* Dev Options - Only in Development */}
        {isDev && (
          <>
            <div className={styles.divider}>
              <div className={styles.dividerLine}></div>
              <span className={styles.dividerText}>OR</span>
              <div className={styles.dividerLine}></div>
            </div>

            <div className={styles.devSection}>
              <button
                type="button"
                onClick={handleDevLogin}
                className={`${styles.secondaryButton} ${styles.devButton}`}
                disabled={loading}
              >
                Dev Login (Admin)
              </button>

              <div className={styles.bypassOption}>
                <input
                  type="checkbox"
                  id="bypass"
                  checked={bypass}
                  onChange={(e) => setBypass(e.target.checked)}
                  className={styles.bypassCheckbox}
                />
                <label htmlFor="bypass" className={styles.bypassLabel}>
                  Frontend Bypass (skip backend)
                </label>
              </div>

              {bypass && (
                <button
                  type="button"
                  onClick={handleBypass}
                  className={styles.secondaryButton}
                  style={{ marginTop: '16px' }}
                >
                  Enter with Bypass
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
