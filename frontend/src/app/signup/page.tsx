'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User as UserIcon } from 'lucide-react';
import LoginInput from '@/components/LoginInput';
import { useUser } from '@/contexts/UserContext';
import styles from '../login/login.module.css';

export default function SignUpPage() {
  const router = useRouter();
  const { user } = useUser();
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Validate password match
  const validatePasswords = () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    return true;
  };

  // Handle sign up
  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate inputs
      if (!name || !email || !password || !confirmPassword) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      // Validate passwords
      if (!validatePasswords()) {
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

      // Sign up not yet implemented in backend
      // Simulate success for now
      setSuccess(true);
      setError('');
      
      // Show success message and redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);

    } catch (err: unknown) {
      console.error('Sign up error:', err);
      setError(err instanceof Error ? err.message : 'Sign up failed. Please try again.');
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
          <h1 className={styles.title}>Create Account</h1>
          <p className={styles.subtitle}>Join SAVAGE LLC today</p>
        </div>

        {success ? (
          /* Success Message */
          <div style={{
            padding: '24px',
            textAlign: 'center',
            color: 'var(--login-text-primary)'
          }}>
            <div style={{
              fontSize: '1.5625rem',
              fontWeight: 700,
              marginBottom: '8px'
            }}>
              Success! 🎉
            </div>
            <p style={{
              fontSize: '1rem',
              color: 'var(--login-text-secondary)',
              marginBottom: '16px'
            }}>
              Your account has been created.
            </p>
            <p style={{
              fontSize: '0.8rem',
              color: 'var(--login-text-secondary)'
            }}>
              Redirecting to login page...
            </p>
          </div>
        ) : (
          /* Sign Up Form */
          <form className={styles.form} onSubmit={handleSignUp}>
            <LoginInput
              id="name"
              label="Full Name"
              type="text"
              value={name}
              onChange={setName}
              placeholder="John Doe"
              required
              disabled={loading}
              icon={UserIcon}
              autoComplete="name"
            />

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

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading && <span className={styles.spinner} />}
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>
        )}

        {/* Error Message */}
        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        {!success && (
          /* Sign In Section */
          <div className={styles.signUpSection}>
            <p className={styles.signUpText}>
              Already have an account?
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
        )}
      </div>
    </div>
  );
}
