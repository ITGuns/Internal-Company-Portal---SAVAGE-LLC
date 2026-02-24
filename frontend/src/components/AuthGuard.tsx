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
  const { user, isLoading } = useUser();

  // Routes that don't require authentication
  const exemptRoutes = ['/login', '/dev-login', '/signup', '/forgot-password'];
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
      console.log('[AuthGuard] No user found, redirecting to /login');
      router.push('/login');
    }
  }, [user, isLoading, pathname, isExemptRoute, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--background)',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid var(--foreground)',
            borderRightColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{
            fontSize: '14px',
            color: 'var(--foreground)',
            opacity: 0.7,
          }}>
            Loading...
          </p>
        </div>

        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  // Don't render protected content if not authenticated (unless exempt route)
  if (!user && !isExemptRoute) {
    return null;
  }

  // Handle approval workflow
  if (user && !user.isApproved && !isExemptRoute) {
    return (
      <div className="relative min-h-screen">
        {/* Blurred Content */}
        <div className="blur-md pointer-events-none brightness-75 select-none overflow-hidden h-screen">
          {children}
        </div>

        {/* Approval Overlay */}
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="max-w-md w-full mx-4 bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] shadow-2xl p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-3">
              Account Pending Approval
            </h2>
            <p className="text-[var(--muted)] mb-8 leading-relaxed">
              Welcome to the portal, <strong>{user.name}</strong>! Your account has been created successfully but is currently awaiting approval from an Operations Manager.
            </p>
            <div className="p-4 bg-[var(--card-surface)] rounded-xl border border-[var(--border)] mb-8 text-left">
              <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Status: <strong>Awaiting Verification</strong></span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
              >
                Check Approval Status
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('refreshToken');
                  window.location.href = '/login';
                }}
                className="w-full py-3 px-4 bg-[var(--card-surface)] hover:bg-[var(--border)] text-[var(--foreground)] rounded-xl font-semibold border border-[var(--border)] transition-all active:scale-[0.98]"
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
