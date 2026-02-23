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

  // Render children if authenticated or on exempt route
  return <>{children}</>;
}
