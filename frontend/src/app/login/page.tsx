'use client';

import { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Apple, Lock, Mail } from 'lucide-react';
import LoginInput from '@/components/LoginInput';
import { useUser } from '@/contexts/UserContext';
import { loginWithEmail } from '@/lib/api';
import { getAuthenticatedLandingPath } from '@/lib/role-access';
import styles from './login.module.css';

const DEFAULT_WORKSPACE_NAME = process.env.NEXT_PUBLIC_WORKSPACE_NAME || 'SAVAGE LLC';

export default function LoginPage() {
  const router = useRouter();
  const { user, refreshUser } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [workspaceName, setWorkspaceName] = useState(DEFAULT_WORKSPACE_NAME);

  useEffect(() => {
    if (user) {
      router.push(getAuthenticatedLandingPath(user));
    }
  }, [user, router]);

  useEffect(() => {
    const workspace = new URLSearchParams(window.location.search).get('workspace')?.trim();
    if (workspace) {
      setWorkspaceName(workspace.slice(0, 80));
    }
  }, []);

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

  const workspaceSignInCopy = `Sign in to ${workspaceName} workspace`;

  return (
    <main className={styles.loginContainer}>
      <div className={styles.authShell}>
        <section className={styles.heroPanel} aria-label="Deskii workspace overview">
          <div className={styles.brandMark} aria-hidden="true">D</div>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Workspace command center</p>
            <h1 className={styles.heroTitle}>Deskii</h1>
            <p className={styles.heroText}>
              Keep tasks, reports, client work, approvals, and team operations moving from one secure workspace.
            </p>
          </div>
          <div className={styles.signalGrid} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        </section>

        <div className={styles.card}>
          <div className={styles.header}>
            <h2 className={styles.title}>Deskii</h2>
            <p className={styles.subtitle}>{workspaceSignInCopy}</p>
          </div>

          <div className={styles.oauthStack} aria-label="Social sign in options">
            <a className={styles.oauthButton} href="/backend-auth/google">
              <span className={styles.googleGlyph} aria-hidden="true">G</span>
              Continue with Google
            </a>
            <button
              type="button"
              className={styles.oauthButton}
              disabled
              title="Apple sign in needs Apple Developer credentials before it can be enabled."
            >
              <Apple className={styles.oauthIcon} aria-hidden="true" />
              Continue with Apple
              <span className={styles.oauthTag}>Soon</span>
            </button>
          </div>

          <div className={styles.divider} role="separator">
            <span>or</span>
          </div>

          <form className={styles.form} onSubmit={handleEmailLogin}>
            <LoginInput
              id="email"
              label="Email Address"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@company.com..."
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
              placeholder="Enter your password..."
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
              {loading ? 'Signing In...' : 'Sign In'}
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
      </div>
    </main>
  );
}
