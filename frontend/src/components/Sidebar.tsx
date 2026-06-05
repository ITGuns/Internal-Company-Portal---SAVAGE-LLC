"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  Folder,
  Grid,
  Home,
  Megaphone,
  MessageSquare,
  ShieldCheck,
  Ticket,
  UserCircle,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import UserAvatar from '../assets/icons/UserAvatar';
import { useSocket } from '@/context/SocketContext';
import { useUser } from '@/contexts/UserContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { fetchClientOrganizations } from '@/lib/client-portal';
import { CLIENT_PORTAL_NAV_ITEMS } from '@/lib/client-portal-navigation';
import { isSidebarNavItemActive, type SidebarNavActiveMode } from '@/lib/sidebar-navigation';
import {
  getUserRoleNames,
  hasClientOperationsAccess,
  hasClientPortalAccess,
  hasClientWorkspaceShellAccess,
  hasManagementAccess,
} from '@/lib/role-access';
import { cn } from '@/lib/utils';

type NavItemConfig = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
  activeMode?: SidebarNavActiveMode;
};

const clientPortalIconByHref: Record<string, NavItemConfig['icon']> = {
  '/client': BriefcaseBusiness,
  '/client/work': Grid,
  '/client/tickets': Ticket,
  '/client/approvals': CheckCircle2,
  '/client/messages': MessageSquare,
  '/client/reports': BarChart3,
  '/client/resources': Folder,
  '/client/account': UserCircle,
  '/client/calendar': CalendarDays,
};

function NavItem({ icon: Icon, label, badge, href, activeMode, collapsed }: NavItemConfig & { collapsed: boolean }) {
  const pathname = usePathname() || '/';
  const isActive = isSidebarNavItemActive(pathname, href, activeMode);

  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'nav-animated relative flex min-h-10 w-full items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2 text-sm',
        'transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out)]',
        'focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar)]',
        collapsed && 'md:justify-center md:gap-0 md:px-2',
        isActive
          ? 'border-[var(--accent)] bg-[var(--card-surface)] font-semibold text-[var(--foreground)] shadow-[inset_0_0_0_1px_rgba(23,217,245,0.14)]'
          : 'border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]',
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-[var(--accent)]' : 'text-current')} aria-hidden="true" />
      <span className={cn('min-w-0 flex-1 truncate', collapsed && 'md:sr-only')}>{label}</span>
      {badge ? (
        <span className={cn(
          'rounded-[var(--radius-sm)] bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[var(--accent-foreground)]',
          collapsed && 'md:absolute md:right-1.5 md:top-1.5 md:h-2 md:w-2 md:p-0 md:text-transparent',
        )}>
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  );
}

function NavSection({ title, items, collapsed }: { title: string; items: NavItemConfig[]; collapsed: boolean }) {
  return (
    <section className="space-y-2">
      <h2 className={cn(
        'px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]',
        collapsed && 'md:sr-only',
      )}>
        {title}
      </h2>
      <nav className="space-y-1" aria-label={title}>
        {items.map((item) => (
          <NavItem key={item.href} {...item} collapsed={collapsed} />
        ))}
      </nav>
    </section>
  );
}

export default function Sidebar() {
  const pathname = usePathname() || '/';
  const { user } = useUser();
  const { unreadChatCount } = useSocket();
  const { desktopCollapsed, mobileOpen, closeMobileSidebar } = useSidebar();
  const [hasClientWorkspace, setHasClientWorkspace] = useState(false);
  const [clientWorkspaceChecked, setClientWorkspaceChecked] = useState(false);
  const isAdmin = getUserRoleNames(user).includes('admin');
  const canAccessClientOperations = useMemo(() => hasClientOperationsAccess(user), [user]);
  const canUseOperationsAdmin = useMemo(() => hasManagementAccess(user), [user]);
  const hasRoleBasedClientPortalAccess = useMemo(() => hasClientPortalAccess(user), [user]);
  const canUseClientPortal = hasRoleBasedClientPortalAccess || hasClientWorkspace;
  const usesClientShell = useMemo(
    () => hasClientWorkspaceShellAccess(user, hasClientWorkspace),
    [hasClientWorkspace, user],
  );
  const isResolvingClientWorkspace = Boolean(user)
    && !canAccessClientOperations
    && !hasRoleBasedClientPortalAccess
    && !clientWorkspaceChecked;

  useEffect(() => {
    closeMobileSidebar();
  }, [closeMobileSidebar, pathname]);

  useEffect(() => {
    let ignore = false;
    setClientWorkspaceChecked(false);

    async function checkClientWorkspace() {
      if (!user || canAccessClientOperations || hasRoleBasedClientPortalAccess) {
        if (!ignore) {
          setHasClientWorkspace(false);
          setClientWorkspaceChecked(true);
        }
        return;
      }

      try {
        const organizations = await fetchClientOrganizations();
        if (!ignore) setHasClientWorkspace(organizations.length > 0);
      } catch {
        if (!ignore) setHasClientWorkspace(false);
      } finally {
        if (!ignore) setClientWorkspaceChecked(true);
      }
    }

    void checkClientWorkspace();

    return () => {
      ignore = true;
    };
  }, [canAccessClientOperations, hasRoleBasedClientPortalAccess, user]);

  const employeeMainItems: NavItemConfig[] = [
    { href: '/dashboard', icon: Home, label: 'Dashboard' },
    ...(canUseClientPortal ? [{ href: '/client', icon: BriefcaseBusiness, label: 'Client Portal', activeMode: 'exact' as SidebarNavActiveMode }] : []),
    { href: '/task-tracking', icon: Grid, label: 'Task Tracking' },
    { href: '/daily-logs', icon: Users, label: 'Daily Logs' },
    { href: '/payroll-calendar', icon: CalendarDays, label: 'Payroll Calendar' },
    { href: '/my-payslips', icon: DollarSign, label: 'My Payslips' },
  ];

  const clientPortalItems: NavItemConfig[] = CLIENT_PORTAL_NAV_ITEMS.map((item) => ({
    href: item.href,
    icon: clientPortalIconByHref[item.href] || BriefcaseBusiness,
    label: item.label,
    activeMode: item.href === '/client' ? 'exact' : undefined,
  }));
  const mainItems = usesClientShell ? clientPortalItems : isResolvingClientWorkspace ? [] : employeeMainItems;

  const collaborationItems: NavItemConfig[] = usesClientShell || isResolvingClientWorkspace
    ? []
    : [
        { href: '/announcements', icon: Megaphone, label: 'Announcements' },
        { href: '/chat', icon: MessageSquare, label: 'Messages & Chat', badge: unreadChatCount },
        { href: '/file-directory', icon: Folder, label: 'File Directory' },
      ];

  const adminItems: NavItemConfig[] = usesClientShell || isResolvingClientWorkspace
    ? []
    : [
        ...(canUseOperationsAdmin ? [{ href: '/operations', icon: ShieldCheck, label: 'Operations', activeMode: 'exact' as SidebarNavActiveMode }] : []),
        ...(isAdmin ? [{ href: '/operations/onboarding', icon: UserPlus, label: 'Onboarding' }] : []),
        ...(canAccessClientOperations ? [{ href: '/operations/clients', icon: BriefcaseBusiness, label: 'Clients' }] : []),
        ...(isAdmin ? [{ href: '/whiteboard', icon: Grid, label: 'Whiteboard' }] : []),
      ];

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[var(--scrim)] backdrop-blur-[2px] md:hidden"
          onClick={closeMobileSidebar}
          aria-label="Close navigation"
        />
      ) : null}

      <aside
        id="primary-sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] text-[var(--sidebar-foreground)] shadow-[var(--shadow-md)]',
          'transition-[transform,width] duration-200 ease-[var(--ease-out)] md:translate-x-0 md:shadow-none',
          desktopCollapsed ? 'md:w-20' : 'md:w-72',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        data-collapsed={desktopCollapsed ? 'true' : 'false'}
      >
        <div className="flex h-full flex-col">
          <header className="flex h-24 items-center justify-between border-b border-[var(--sidebar-border)] px-5">
            <div className={cn('flex min-w-0 items-center gap-3', desktopCollapsed && 'md:justify-center')}>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-md)] border border-[var(--accent)] bg-[var(--card-surface)] text-sm font-bold text-[var(--accent)] shadow-[0_0_24px_-14px_var(--accent)]" aria-hidden="true">
                M
              </div>
              <div className={cn('min-w-0', desktopCollapsed && 'md:sr-only')}>
                <div className="truncate text-base font-semibold tracking-tight">MyDeskii</div>
                <div className="mt-0.5 text-xs text-[var(--muted)]">SAVAGE LLC workspace</div>
              </div>
            </div>
            <button
              type="button"
              className="nav-animated inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:text-[var(--foreground)] md:hidden"
              onClick={closeMobileSidebar}
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>

          <div className="sidebar-scroll flex-1 space-y-6 overflow-y-auto px-3 py-5">
            {mainItems.length > 0 ? (
              <NavSection title={usesClientShell ? 'Client Workspace' : 'Work'} items={mainItems} collapsed={desktopCollapsed} />
            ) : null}
            {collaborationItems.length > 0 ? <NavSection title="Company" items={collaborationItems} collapsed={desktopCollapsed} /> : null}
            {adminItems.length > 0 ? <NavSection title="Admin" items={adminItems} collapsed={desktopCollapsed} /> : null}
          </div>

          <footer className="border-t border-[var(--sidebar-border)] p-3">
            <Link
              href="/profile"
              aria-label="Profile"
              className={cn(
                'nav-animated flex min-h-14 items-center gap-3 rounded-[var(--radius-md)] border border-transparent px-3 py-2 hover:border-[var(--border)] hover:bg-[var(--surface-hover)]',
                desktopCollapsed && 'md:justify-center md:gap-0 md:px-2',
              )}
            >
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)]">
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
              </div>
              <div className={cn('min-w-0 flex-1', desktopCollapsed && 'md:sr-only')}>
                <div className="truncate text-sm font-semibold">{user?.name || 'User'}</div>
                <div className="truncate text-xs text-[var(--muted)]">{user?.email || 'Guest'}</div>
              </div>
              <UserCircle className={cn('h-4 w-4 text-[var(--muted)]', desktopCollapsed && 'md:hidden')} aria-hidden="true" />
            </Link>
          </footer>
        </div>
      </aside>
    </>
  );
}
