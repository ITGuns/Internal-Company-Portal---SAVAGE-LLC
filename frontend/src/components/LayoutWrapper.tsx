'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import AuthGuard from './AuthGuard';
import CommandPalette from './CommandPalette';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { useUser } from '@/contexts/UserContext';
import { hasStoredAuthSession } from '@/lib/auth-session';
import { cn } from '@/lib/utils';

interface LayoutWrapperProps {
  children: ReactNode;
}

/**
 * Layout Wrapper Component
 * Handles conditional rendering of Sidebar and layout classes
 * based on the current route
 */
function AuthenticatedShell({ children }: LayoutWrapperProps) {
  const pathname = usePathname();
  const { desktopCollapsed } = useSidebar();
  const { user, isLoading } = useUser();
  const isClientPortalRoute = pathname === '/client' || pathname.startsWith('/client/');

  // Routes where sidebar should be hidden
  const noSidebarRoutes = ['/login', '/signup', '/forgot-password', '/reset-password'];
  const hideSidebar = noSidebarRoutes.includes(pathname);
  const isUnknownProtectedSession = isLoading && !user && !hideSidebar && !hasStoredAuthSession();
  const showWorkspaceShell = !hideSidebar && !isUnknownProtectedSession;

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {showWorkspaceShell && <Sidebar />}
      {showWorkspaceShell && <CommandPalette />}
      <div
        id="main-content"
        tabIndex={-1}
        className={cn(
          'transition-[padding-left,padding-top] duration-200 ease-[var(--ease-out)]',
          !showWorkspaceShell
            ? 'min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]'
            : cn(
                'min-h-[100dvh] bg-transparent text-[var(--foreground)]',
                !isClientPortalRoute && 'pt-20 md:pt-24',
              ),
          showWorkspaceShell && (desktopCollapsed ? 'md:pl-20' : 'md:pl-72'),
        )}
      >
        {children}
      </div>
    </>
  );
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  return (
    <SidebarProvider>
      <AuthenticatedShell>
        <AuthGuard>{children}</AuthGuard>
      </AuthenticatedShell>
    </SidebarProvider>
  );
}
