"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Bell, Menu, Search } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import UserAvatar from '../assets/icons/UserAvatar';
import NotificationSidebar from './NotificationSidebar';
import ProfileSidebar from './ProfileSidebar';
import { useSocket } from '@/context/SocketContext';
import { useUser } from '@/contexts/UserContext';
import TimeClock from './TimeClock';
import { cn } from '@/lib/utils';
import { getClientOperationsRouteTitle } from '@/lib/client-operations-navigation';
import { getClientPortalRouteTitle } from '@/lib/client-portal-navigation';

const routeTitles: Record<string, { title: string; subtitle?: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Today, tasks, logs, and approvals' },
  '/client/tickets': { title: 'Client Tickets', subtitle: 'Submit requests and review status' },
  '/task-tracking': { title: 'Task Tracking', subtitle: 'Plan, assign, and close work' },
  '/task-calendar': { title: 'Task Calendar', subtitle: 'Task schedule and due dates' },
  '/payroll-calendar': { title: 'Payroll Calendar', subtitle: 'Time entries, events, and day review' },
  '/payroll-dashboard': { title: 'Payroll Dashboard', subtitle: 'Payroll review and reporting' },
  '/my-payslips': { title: 'My Payslips', subtitle: 'Payslip history and details' },
  '/announcements': { title: 'Announcements', subtitle: 'Company updates and shoutouts' },
  '/daily-logs': { title: 'Daily Logs', subtitle: 'Daily work reports and reviews' },
  '/chat': { title: 'Messages & Chat', subtitle: 'Team communication' },
  '/company-chat': { title: 'Company Chat', subtitle: 'Public team channels' },
  '/private-messages': { title: 'Private Messages', subtitle: 'Direct conversations' },
  '/file-directory': { title: 'File Directory', subtitle: 'Shared documents and folders' },
  '/operations': { title: 'Operations', subtitle: 'Departments, roles, and approvals' },
  '/operations/clients': { title: 'Client Operations', subtitle: 'Client workspaces, requests, approvals, reports, and delivery progress' },
  '/profile': { title: 'Profile', subtitle: 'Account settings' },
  '/whiteboard': { title: 'Whiteboard', subtitle: 'Collaborative workspace' },
  '/discord': { title: 'Discord', subtitle: 'External team channel' },
};

function getRouteTitle(pathname: string) {
  if (routeTitles[pathname]) return routeTitles[pathname];

  if (pathname === '/operations/clients' || pathname.startsWith('/operations/clients/')) {
    return getClientOperationsRouteTitle(pathname);
  }

  const clientRoute = getClientPortalRouteTitle(pathname);
  if (clientRoute) return clientRoute;

  return Object.entries(routeTitles).find(([key]) => pathname.startsWith(`${key}/`))?.[1];
}

export default function Header({ title, subtitle }: { title?: string; subtitle?: string }) {
  const pathname = usePathname() || '/';
  const { unreadCount, notifications, markAsRead, markAllAsRead, clearNotifications } = useSocket();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { user } = useUser();

  const isDashboard = pathname === '/' || pathname === '/dashboard';
  const autoTitle = getRouteTitle(pathname);
  const resolvedTitle = title ?? (isDashboard ? `Welcome back, ${user?.name || 'Guest'}` : autoTitle?.title);
  const resolvedSubtitle = subtitle ?? (isDashboard ? 'Your work status and next actions for today' : autoTitle?.subtitle);
  const shouldShowTimeClock = Boolean(user) && !pathname.startsWith('/client');

  const iconButtonClass = cn(
    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] text-[var(--muted)]',
    'transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out)]',
    'hover:border-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]',
    'active:translate-y-px active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
  );

  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-20 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-raised)]/95 px-4 shadow-[var(--shadow-sm)] backdrop-blur-xl md:left-72 md:h-24 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          className={cn(iconButtonClass, 'md:hidden')}
          onClick={() => window.dispatchEvent(new Event('toggle-sidebar'))}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight text-[var(--foreground)] md:text-xl">
            {resolvedTitle}
          </h1>
          {resolvedSubtitle ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-[var(--muted)] md:text-sm">
              {resolvedSubtitle}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
          className="hidden h-10 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] px-3 text-sm text-[var(--muted)] transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out)] hover:border-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] active:translate-y-px sm:flex"
          aria-label="Open command palette"
        >
          <Search className="h-4 w-4" />
          <span className="hidden lg:inline">Search</span>
          <kbd className="hidden rounded border border-[var(--border)] bg-[var(--card-surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)] lg:inline">
            Ctrl K
          </kbd>
        </button>

        {shouldShowTimeClock ? (
          <div className="hidden xl:block">
            <TimeClock />
          </div>
        ) : null}

        <ThemeToggle />

        <button
          type="button"
          aria-label="Open notifications"
          className={cn(iconButtonClass, 'relative')}
          onClick={() => setShowNotifications((open) => !open)}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-[var(--background)] bg-[var(--accent)]" />
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setShowProfile(true)}
          className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] transition-[border-color,transform] duration-150 ease-[var(--ease-out)] hover:border-[var(--muted)] active:translate-y-px active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
          aria-label="Open profile"
        >
          {user?.avatar ? (
            <Image
              src={user.avatar}
              alt={user.name || 'User'}
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          ) : (
            <UserAvatar className="h-full w-full" size={40} ariaHidden={true} />
          )}
        </button>
      </div>

      <NotificationSidebar
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onClear={clearNotifications}
      />

      <ProfileSidebar isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </header>
  );
}
