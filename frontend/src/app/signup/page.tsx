'use client';

import { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Mail, Lock, User as UserIcon } from 'lucide-react';
import LoginInput from '@/components/LoginInput';
import { useUser } from '@/contexts/UserContext';
import { getAuthenticatedLandingPath } from '@/lib/role-access';
import { getSignupRoleOptions, type SignupDepartmentOption } from '@/lib/signup-options';
import styles from '../login/login.module.css';

export default function SignUpPage() {
  const router = useRouter();
  const { user } = useUser();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [role, setRole] = useState('');

  const [departments, setDepartments] = useState<SignupDepartmentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      router.push(getAuthenticatedLandingPath(user));
    }
  }, [user, router]);

  useEffect(() => {
    async function loadOptions() {
      try {
        const deptRes = await fetch('/api/departments').then((r) => r.json());
        setDepartments(Array.isArray(deptRes) ? deptRes : []);
      } catch (e) {
        console.error('Failed to load signup options', e);
      }
    }

    loadOptions();
  }, []);

  const roleOptions = getSignupRoleOptions(departments, departmentId);

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

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!name || !email || !password || !confirmPassword || !departmentId || !role) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      if (!validatePasswords()) {
        setLoading(false);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      const res = await fetch('/backend-auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, departmentId, role }),
      });

      if (res.ok) {
        setSuccess(true);
        setError('');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
        return;
      }

      const data = await res.json();
      setError(data.error || 'Sign up failed. Please try again.');
      setLoading(false);
    } catch (err: unknown) {
      console.error('Sign up error:', err);
      setError('Connection failed. Please try again.');
      setLoading(false);
    }
  };

  if (user) {
    return null;
  }

  return (
    <div className={styles.loginContainer}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Create Account</h1>
          <p className={styles.subtitle}>Request access to MyDeskii</p>
        </div>

        {success ? (
          <div className={styles.success}>
            <div className={styles.successIcon} aria-hidden="true">
              <CheckCircle2 size={22} />
            </div>
            <div className={styles.successTitle}>Account request submitted</div>
            <p className={styles.successText}>
              Your account is waiting for approval before you can sign in.
            </p>
            <p className={styles.successMeta}>Redirecting to login page.</p>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSignUp}>
            <LoginInput
              id="name"
              label="Full Name"
              type="text"
              value={name}
              onChange={setName}
              placeholder="Pol Villorente…"
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
              placeholder="Create a password…"
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
              placeholder="Confirm password…"
              required
              disabled={loading}
              icon={Lock}
              autoComplete="new-password"
            />

            <div className={styles.formGroup}>
              <label htmlFor="department" className={styles.label}>
                Department <span style={{ color: 'var(--login-error)' }}>*</span>
              </label>
              <select
                id="department"
                name="departmentId"
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setRole('');
                }}
                className={styles.select}
                required
                disabled={loading}
              >
                <option value="">Select Department…</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
              <p className={styles.helperText}>
                Your selected department controls the available signup roles.
              </p>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="role" className={styles.label}>
                Role <span style={{ color: 'var(--login-error)' }}>*</span>
              </label>
              <select
                id="role"
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={styles.select}
                required
                disabled={loading || !departmentId || roleOptions.length === 0}
              >
                <option value="">
                  {!departmentId
                    ? 'Select Department First…'
                    : roleOptions.length === 0
                      ? 'No roles configured'
                      : 'Select Role…'}
                </option>
                {roleOptions.map((roleOption) => (
                  <option key={roleOption.id} value={roleOption.name}>
                    {roleOption.name}
                  </option>
                ))}
              </select>
              <p className={styles.helperText}>
                {!departmentId
                  ? 'Choose a department first so MyDeskii can show the right roles.'
                  : roleOptions.length === 0
                    ? 'No signup roles are configured for this department yet.'
                    : `${roleOptions.length} role option${roleOptions.length === 1 ? '' : 's'} available for this department.`}
              </p>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading && <span className={styles.spinner} />}
              {loading ? 'Creating Account…' : 'Sign Up'}
            </button>
          </form>
        )}

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        {!success && (
          <div className={styles.signUpSection}>
            <p className={styles.signUpText}>
              Already have an account?
              <Link
                href="/login"
                className={styles.signUpLink}
              >
                Sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
