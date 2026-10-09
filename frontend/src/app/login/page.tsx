'use client';

import { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, Building2 } from 'lucide-react';
import LoginInput from '@/components/LoginInput';
import { useUser } from '@/contexts/UserContext';
import { useWorkspaceConfig } from '@/contexts/WorkspaceConfigContext';
import { loginWithEmail, startOAuthLogin } from '@/lib/api';
import { getAuthenticatedLandingPath } from '@/lib/role-access';
import styles from './login.module.css';

// Google icon SVG (inline, no external dependency)
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

// Apple icon SVG (inline)
function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 814 1000" fill="currentColor" aria-hidden="true">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663.6 0 541.8c0-194.3 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { user, refreshUser } = useUser();
  const workspace = useWorkspaceConfig();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      router.push(getAuthenticatedLandingPath(user));
    }
  }, [user, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('oauthError');
    const provider = params.get('provider');
    if (!oauthError) return;

    const providerName = provider === 'apple' ? 'Apple' : provider === 'google' ? 'Google' : 'OAuth';
    const messageByError: Record<string, string> = {
      pending: `${providerName} sign-in worked, but this account is waiting for manager approval.`,
      failed: `${providerName} sign-in could not be completed. Please try again or use email.`,
      not_configured: `${providerName} sign-in is not configured yet.`,
      state_mismatch: `${providerName} sign-in expired. Please start again.`,
    };

    setError(messageByError[oauthError] || `${providerName} sign-in could not be completed.`);
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
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: 'google' | 'apple') => {
    setError('');
    startOAuthLogin(provider);
  };

  if (user) {
    return null;
  }

  return (
    <main className={styles.loginContainer} aria-label="Deskii sign-in page">
      {/* Animated background orbs */}
      <div className={styles.orb1} aria-hidden="true" />
      <div className={styles.orb2} aria-hidden="true" />
      <div className={styles.orb3} aria-hidden="true" />
      {/* Dot grid overlay */}
      <div className={styles.dotGrid} aria-hidden="true" />

      <div className={styles.loginWrapper}>
        {/* Hero branding - left side on desktop, top on mobile */}
        <div className={styles.heroSection} aria-hidden="true">
        <div className={styles.logoMark}>
          {workspace.logoUrl ? (
            <img src={workspace.logoUrl} alt={workspace.logoAlt} className={styles.logoImage} />
          ) : (
          <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="7" fill="#0f1117"/>
            <rect x="4" y="18" width="24" height="3" rx="1.5" fill="#17d9f5"/>
            <rect x="6" y="21" width="2.5" height="7" rx="1" fill="#17d9f5" opacity="0.6"/>
            <rect x="23.5" y="21" width="2.5" height="7" rx="1" fill="#17d9f5" opacity="0.6"/>
            <rect x="14.5" y="14" width="3" height="4" rx="1" fill="#f23bbf" opacity="0.8"/>
            <rect x="8" y="5" width="16" height="10" rx="2" fill="#1a1f2e" stroke="#17d9f5" strokeWidth="1.2"/>
            <rect x="9.5" y="6.5" width="13" height="7" rx="1" fill="#17d9f5" opacity="0.15"/>
            <rect x="11" y="8" width="7" height="1.2" rx="0.6" fill="#17d9f5" opacity="0.7"/>
            <rect x="11" y="10.5" width="5" height="1.2" rx="0.6" fill="#f23bbf" opacity="0.7"/>
          </svg>
          )}
        </div>
        <h1 className={styles.heroTitle}>{workspace.name}</h1>
        <p className={styles.heroTagline}>{workspace.tagline}<br/>operations platform.</p>
        <ul className={styles.featureList}>
          <li>Task tracking &amp; collaboration</li>
          <li>Payroll &amp; time management</li>
          <li>Team chat &amp; announcements</li>
          <li>Projects &amp; file directory</li>
        </ul>

        {/* 3D Isometric Dashboard Scene */}
        <div className={styles.isometricScene} aria-hidden="true">
          <div className={styles.isoContainer}>
            {/* Base Layer: Project Workspace card */}
            <div className={`${styles.isoCard} ${styles.card1}`}>
              <div className={styles.isoCardHeader}>
                <span className={styles.isoCardDot} />
                <span className={styles.isoCardTitle}>PROJECT_WORKSPACE</span>
              </div>
              <div className={styles.isoCardBody}>
                <div className={styles.isoTaskItem}>
                  <span className={styles.isoCheckboxChecked} />
                  <span className={styles.isoTaskLine} style={{ width: '65%' }} />
                </div>
                <div className={styles.isoTaskItem}>
                  <span className={styles.isoCheckboxChecked} />
                  <span className={styles.isoTaskLine} style={{ width: '45%' }} />
                </div>
                <div className={styles.isoTaskItem}>
                  <span className={styles.isoCheckbox} />
                  <span className={styles.isoTaskLine} style={{ width: '55%' }} />
                </div>
              </div>
            </div>

            {/* Middle Layer: Metrics card */}
            <div className={`${styles.isoCard} ${styles.card2}`}>
              <div className={styles.isoCardHeader}>
                <span className={`${styles.isoCardDot} ${styles.pink}`} />
                <span className={styles.isoCardTitle}>METRICS_STREAM</span>
              </div>
              <div className={styles.isoChartContainer}>
                <div className={styles.isoChartBar} style={{ height: '35px', background: 'linear-gradient(180deg, #f23bbf, #8b5cf6)' }} />
                <div className={styles.isoChartBar} style={{ height: '55px', background: 'linear-gradient(180deg, #17d9f5, #0bb5cc)' }} />
                <div className={styles.isoChartBar} style={{ height: '40px', background: 'linear-gradient(180deg, #f23bbf, #8b5cf6)' }} />
                <div className={styles.isoChartBar} style={{ height: '65px', background: 'linear-gradient(180deg, #17d9f5, #0bb5cc)' }} />
                <div className={styles.isoChartBar} style={{ height: '48px', background: 'linear-gradient(180deg, #17d9f5, #f23bbf)' }} />
              </div>
            </div>

            {/* Top Layer: Alerts/Notifications card */}
            <div className={`${styles.isoCard} ${styles.card3}`}>
              <div className={styles.isoCardHeader}>
                <span className={`${styles.isoCardDot} ${styles.cyan}`} />
                <span className={styles.isoCardTitle}>SYSTEM_HEALTH</span>
              </div>
              <div className={styles.isoAlertBody}>
                <div className={styles.isoAlertText}>99.8% Core Uptime</div>
                <div className={styles.isoAlertStatus}>API Services Online</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auth card */}
      <div className={styles.card}>
        <div className={styles.header}>
          {/* Mobile-only logo */}
          <div className={styles.mobileLogoRow} aria-hidden="true">
            {workspace.logoUrl ? (
              <img src={workspace.logoUrl} alt="" className={styles.mobileLogoImage} />
            ) : (
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="7" fill="#0f1117"/>
              <rect x="4" y="18" width="24" height="3" rx="1.5" fill="#17d9f5"/>
              <rect x="14.5" y="14" width="3" height="4" rx="1" fill="#f23bbf" opacity="0.8"/>
              <rect x="8" y="5" width="16" height="10" rx="2" fill="#1a1f2e" stroke="#17d9f5" strokeWidth="1.2"/>
              <rect x="11" y="8" width="7" height="1.2" rx="0.6" fill="#17d9f5" opacity="0.7"/>
            </svg>
            )}
            <span className={styles.mobileLogoName}>{workspace.name}</span>
          </div>
          <h2 className={styles.title}>Welcome back</h2>
          <p className={styles.subtitle}>
            <Building2 size={13} style={{ display: 'inline', marginRight: 4, opacity: 0.6 }} />
            {workspace.signInMessage}
          </p>
        </div>

        {/* Social sign-in */}
        <div className={styles.socialRow}>
          <button
            type="button"
            className={styles.socialBtn}
            onClick={() => handleSocialLogin('google')}
            aria-label="Sign in with Google"
          >
            <GoogleIcon />
            <span>Google</span>
          </button>
          <button
            type="button"
            className={styles.socialBtn}
            onClick={() => handleSocialLogin('apple')}
            aria-label="Sign in with Apple"
          >
            <AppleIcon />
            <span>Apple</span>
          </button>
        </div>

        <div className={styles.divider}>
          <span className={styles.dividerLine} />
          <span className={styles.dividerText}>or continue with email</span>
          <span className={styles.dividerLine} />
        </div>

        <form className={styles.form} onSubmit={handleEmailLogin} noValidate>
          <LoginInput
            id="email"
            label="Email Address"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@company.com"
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
            placeholder="Enter your password"
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
            {loading ? 'Signing In…' : (
              <>
                Sign In
                <ArrowRight size={16} className={styles.btnArrow} />
              </>
            )}
          </button>
        </form>

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        <div className={styles.signUpSection}>
          <p className={styles.signUpText}>
            Don&apos;t have an account?
            <Link
              href="/signup"
              className={styles.signUpLink}
            >
              Request access
            </Link>
          </p>
        </div>
      </div>
      </div>
    </main>
  );
}
