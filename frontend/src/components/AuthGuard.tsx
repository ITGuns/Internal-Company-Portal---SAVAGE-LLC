'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * AuthGuard Component
 * Protects routes by redirecting unauthenticated users to /login
 * Exempts login-related routes to prevent redirect loops
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useUser();

  // Routes that don't require authentication
  const exemptRoutes = ['/login', '/signup', '/forgot-password', '/reset-password'];
  const isExemptRoute = exemptRoutes.includes(pathname);

  useEffect(() => {
    // Don't redirect while still loading user data
    if (isLoading) {
      return;
    }

    // Don't redirect if on an exempt route
    if (isExemptRoute) {
      return;
    }

    // Redirect to login if not authenticated
    if (!user) {
      router.push('/login');
    }
  }, [user, isLoading, pathname, isExemptRoute, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-[var(--foreground)] border-r-transparent" />
          <p className="text-sm text-[var(--foreground)] opacity-70">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render protected content if not authenticated (unless exempt route)
  if (!user && !isExemptRoute) {
    return null;
  }

  // Handle approval workflow
  const isApprovedStatus = user?.isApproved === true || (user?.status && user.status !== 'pending');
  if (user && !isApprovedStatus && !isExemptRoute) {
    return (
      <div className="relative min-h-screen">
        {/* Blurred Content */}
        <div className="pointer-events-none h-[100dvh] select-none overflow-hidden blur-md brightness-75">
          {children}
        </div>

        {/* Approval Overlay */}
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card-bg)] p-8 text-center shadow-[var(--shadow-md)] animate-in fade-in zoom-in duration-200">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[var(--radius-md)] bg-[var(--priority-medium-bg)]">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-[var(--priority-medium)] border-t-transparent" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-3">
              Account Pending Approval
            </h2>
            <p className="text-[var(--muted)] mb-8 leading-relaxed">
              Welcome to the portal, <strong>{user.name}</strong>! Your account has been created successfully but is currently awaiting approval from an Operations Manager.
            </p>
            <div className="mb-8 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-4 text-left">
              <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Status: <strong>Awaiting Verification</strong></span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full rounded-[var(--radius-md)] bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)] transition-[filter,transform] duration-150 ease-[var(--ease-out)] hover:brightness-95 active:translate-y-px active:scale-[0.98]"
              >
                Check Approval Status
              </button>
              <button
                onClick={() => {
                  logout();
                  window.location.href = '/login';
                }}
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] px-4 py-3 font-semibold text-[var(--foreground)] transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-[var(--surface-hover)] active:translate-y-px active:scale-[0.98]"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render children if authenticated or on exempt route
  return <>{children}</>;
}
