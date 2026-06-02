'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import AuthGuard from './AuthGuard';
import CommandPalette from './CommandPalette';

interface LayoutWrapperProps {
  children: ReactNode;
}

/**
 * Layout Wrapper Component
 * Handles conditional rendering of Sidebar and layout classes
 * based on the current route
 */
export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();

  // Routes where sidebar should be hidden
  const noSidebarRoutes = ['/login', '/signup', '/forgot-password', '/reset-password'];
  const hideSidebar = noSidebarRoutes.includes(pathname);

  return (
    <AuthGuard>
      {!hideSidebar && <Sidebar />}
      {!hideSidebar && <CommandPalette />}
      <div
        className={
          hideSidebar
            ? "min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]"
            : "min-h-[100dvh] bg-transparent pt-20 text-[var(--foreground)] md:pl-72 md:pt-24"
        }
      >
        {children}
      </div>
    </AuthGuard>
  );
}
