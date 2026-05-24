"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  BriefcaseBusiness,
  DollarSign,
  Folder,
  Grid,
  Home,
  Megaphone,
  MessageSquare,
  ShieldCheck,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import UserAvatar from '../assets/icons/UserAvatar';
import { useSocket } from '@/context/SocketContext';
import { useUser } from '@/contexts/UserContext';
import { cn } from '@/lib/utils';

type NavItemConfig = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
};

function NavItem({ icon: Icon, label, badge, href }: NavItemConfig) {
  const pathname = usePathname() || '/';
  const isActive = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'nav-animated flex min-h-10 w-full items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2 text-sm',
        'transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out)]',
        'focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar)]',
        isActive
          ? 'border-[var(--accent)] bg-[var(--card-surface)] font-semibold text-[var(--foreground)]'
          : 'border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]',
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-[var(--accent)]' : 'text-current')} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge ? (
        <span className="rounded-[var(--radius-sm)] bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[var(--accent-foreground)]">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  );
}

function NavSection({ title, items }: { title: string; items: NavItemConfig[] }) {
  return (
    <section className="space-y-2">
      <h2 className="px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
        {title}
      </h2>
      <nav className="space-y-1" aria-label={title}>
        {items.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>
    </section>
  );
}

export default function Sidebar() {
  const pathname = usePathname() || '/';
  const { user } = useUser();
  const { unreadChatCount } = useSocket();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    function handleToggle() {
      setMobileOpen((prev) => !prev);
    }

    window.addEventListener('toggle-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-sidebar', handleToggle);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const mainItems: NavItemConfig[] = [
    { href: '/dashboard', icon: Home, label: 'Dashboard' },
    { href: '/client', icon: BriefcaseBusiness, label: 'Client Portal' },
    { href: '/task-tracking', icon: Grid, label: 'Task Tracking' },
    { href: '/daily-logs', icon: Users, label: 'Daily Logs' },
    { href: '/payroll-calendar', icon: CalendarDays, label: 'Payroll Calendar' },
    { href: '/my-payslips', icon: DollarSign, label: 'My Payslips' },
  ];

  const collaborationItems: NavItemConfig[] = [
    { href: '/announcements', icon: Megaphone, label: 'Announcements' },
    { href: '/chat', icon: MessageSquare, label: 'Messages & Chat', badge: unreadChatCount },
    { href: '/file-directory', icon: Folder, label: 'File Directory' },
  ];

  const adminItems: NavItemConfig[] = [
    { href: '/operations', icon: ShieldCheck, label: 'Operations' },
    ...(isAdmin ? [{ href: '/whiteboard', icon: Grid, label: 'Whiteboard' }] : []),
  ];

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[1px] md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] text-[var(--sidebar-foreground)] shadow-[var(--shadow-md)]',
          'transition-transform duration-200 ease-[var(--ease-out)] md:translate-x-0 md:shadow-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col">
          <header className="flex h-24 items-center justify-between border-b border-[var(--sidebar-border)] px-5">
            <div>
              <div className="text-base font-semibold tracking-tight">MyDeskii</div>
              <div className="mt-0.5 text-xs text-[var(--muted)]">SAVAGE LLC workspace</div>
            </div>
            <button
              type="button"
              className="nav-animated inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:text-[var(--foreground)] md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="sidebar-scroll flex-1 space-y-6 overflow-y-auto px-3 py-5">
            <NavSection title="Work" items={mainItems} />
            <NavSection title="Company" items={collaborationItems} />
            {adminItems.length > 0 ? <NavSection title="Admin" items={adminItems} /> : null}
          </div>

          <footer className="border-t border-[var(--sidebar-border)] p-3">
            <Link
              href="/profile"
              className="nav-animated flex min-h-14 items-center gap-3 rounded-[var(--radius-md)] border border-transparent px-3 py-2 hover:border-[var(--border)] hover:bg-[var(--surface-hover)]"
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
                  <UserAvatar className="h-full w-full" size={40} aria-hidden={true} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{user?.name || 'User'}</div>
                <div className="truncate text-xs text-[var(--muted)]">{user?.email || 'Guest'}</div>
              </div>
              <UserCircle className="h-4 w-4 text-[var(--muted)]" />
            </Link>
          </footer>
        </div>
      </aside>
    </>
  );
}
