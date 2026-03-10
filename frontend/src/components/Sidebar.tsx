"use client"

import React, { useEffect, useRef, useState } from 'react'
// cSpell:ignore Tatom

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import UserAvatar from '../assets/icons/UserAvatar'
import { DEPARTMENT_ROLES, DEPARTMENTS } from '@/lib/departments'
import { useUser } from '@/contexts/UserContext'
import { cn } from '@/lib/utils'

// Sidebar departments: use the top-level DEPARTMENTS list
const SIDEBAR_DEPARTMENTS = DEPARTMENTS;
import { useSocket } from '@/context/SocketContext'
import {
  Home,
  Grid,
  Users,
  MessageSquare,
  DollarSign,
  Megaphone,
  Mail,
  Folder,
} from 'lucide-react'

function NavItem({ icon: Icon, label, badge, href }: { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string; badge?: number; href: string }) {
  const pathname = usePathname() || '/'
  // Exact match or sub-route match (require '/' after prefix to avoid partial collisions)
  const isActive = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'nav-animated relative w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg group',
        'transition-all duration-150 ease-out border border-transparent',
        'hover:bg-gray-50 dark:hover:bg-white/5 hover:border-[var(--border)]',
        'active:translate-y-[1px] active:scale-[0.995] active:bg-gray-100 dark:active:bg-white/10',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400',
        isActive && 'bg-[var(--card-surface)] border-[var(--border)] shadow-sm font-medium',
      )}
    >
      {/* Active indicator bar */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-indigo-600 dark:bg-red-400" />
      )}
      <Icon className={cn(
        'w-5 h-5 transition-colors duration-150',
        isActive ? 'text-indigo-600 dark:text-red-400' : 'opacity-90 text-muted group-hover:text-indigo-600 dark:group-hover:text-red-400',
      )} />
      <span className="flex-1">{label}</span>
      {badge ? <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full animate-pulse">{badge}</span> : null}
    </Link>
  )
}

function SidebarDepartment({ dept, roles, depth = 0 }: { dept: string; roles: string[]; depth?: number }) {
  const pathname = usePathname() || '/'
  const [open, setOpen] = useState(false)

  const base = "nav-animated w-full text-left flex items-center gap-3 px-3 py-2 rounded-md group transform transition-colors transition-transform duration-150 ease-out border border-transparent hover:bg-gray-50 dark:hover:bg-white/5 hover:border-[var(--border)] active:translate-y-[1px] active:scale-[0.995] active:bg-gray-100 dark:active:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400"

  // Count all nested roles recursively
  const totalRoles = roles.reduce((sum, r) => sum + 1 + (DEPARTMENT_ROLES[r]?.length || 0), 0);

  // ARIA attribute value must be string literal
  const ariaExpanded = open ? "true" : "false";

  return (
    <div>
      <button onClick={() => setOpen(open => !open)} className={`${base} ${depth > 0 ? 'text-sm' : ''}`} aria-expanded={ariaExpanded}>
        <span className="flex-1">{dept}</span>
        {totalRoles > 0 && <span className="text-sm text-muted">{totalRoles}</span>}
      </button>
      {open && roles.length > 0 && (
        <div className="ml-4 mt-1 space-y-1">
          {roles.map(r => {
            const subRoles = DEPARTMENT_ROLES[r];
            // If this role has its own sub-roles, render it as a nested department
            if (subRoles && subRoles.length > 0) {
              return <SidebarDepartment key={r} dept={r} roles={subRoles} depth={depth + 1} />;
            }
            return (
              <Link key={r} href={`/departments/${encodeURIComponent(dept)}/${encodeURIComponent(r)}`} className="block px-3 py-2 rounded-md nav-animated text-sm text-muted hover:bg-gray-50 dark:hover:bg-white/5">
                {r}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const pathname = usePathname() || '/'
  const isDashboard = pathname === '/' || pathname === '/dashboard'
  const asideRef = useRef<HTMLElement | null>(null)
  const { user } = useUser()
  const { unreadChatCount } = useSocket()

  useEffect(() => {
    const el = asideRef.current
    if (!el) return

    function setSidebarWidth() {
      const curr = asideRef.current
      if (!curr) return
      const rect = curr.getBoundingClientRect()
      // expose the exact width so overlays can align to the content area
      document.documentElement.style.setProperty('--sidebar-width', `${rect.width}px`)
      document.documentElement.style.setProperty('--sidebar-right', `${rect.right}px`)
    }

    setSidebarWidth()
    const ro = new ResizeObserver(setSidebarWidth)
    ro.observe(el)
    window.addEventListener('resize', setSidebarWidth)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', setSidebarWidth)
    }
  }, [])

  return (
    <aside
      ref={asideRef}
      className="fixed left-0 top-0 h-full w-64 pr-0 bg-white dark:bg-[var(--background)]"
      style={{ zIndex: 9999, isolation: 'isolate' }}
    >
      {/* vertical divider recreated as an absolute element so other borders can align to it */}
      <div data-sidebar-divider className="absolute right-0 top-0 bottom-0 w-px z-50 bg-[var(--border)]" />
      <div className="flex flex-col h-full">
        <header className="px-4 py-3 border-b border-[var(--border)] z-30 h-28 pl-6">
          <div className="flex items-center gap-3">
            <div className="font-semibold">SAVAGE LLC</div>
          </div>

        </header>

        <div className="flex-1 overflow-y-auto mt-0 px-2 sidebar-scroll">
          <div className="text-xs text-muted uppercase mt-4 px-2 mb-2">Main</div>
          <nav className="space-y-1 mb-4">
            <NavItem href="/dashboard" icon={Home} label="Dashboard" />
            <NavItem href="/task-tracking" icon={Grid} label="Task Tracking" />
            <NavItem href="/payroll-calendar" icon={DollarSign} label="Payroll Calendar" />
            <NavItem href="/announcements" icon={Megaphone} label="Announcements" />
            <NavItem href="/daily-logs" icon={Users} label="Daily Logs" />
          </nav>

          <div className="text-xs text-muted uppercase px-2 mb-2">Collaboration</div>
          <nav className="space-y-1 mb-4">
            <NavItem href="/chat" icon={MessageSquare} label="Messages & Chat" badge={unreadChatCount} />
            <NavItem href="/file-directory" icon={Folder} label="File Directory" />
            {user?.role?.toLowerCase() === 'admin' && (
              <NavItem href="/whiteboard" icon={Grid} label="Whiteboard" />
            )}
          </nav>
        </div>

        <div className="relative py-4">
          <div className="absolute left-0 right-0 top-0 z-30 border-t border-[var(--border)]" />
          <div className="px-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--card-surface)] border-2 border-[var(--border)] flex-shrink-0">
                  {user?.avatar ? (
                    <Image
                      src={user.avatar}
                      alt={user.name || "User"}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserAvatar className="w-full h-full" size={40} aria-hidden={true} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{user?.name || 'User'}</div>
                  <div className="text-xs text-muted truncate">{user?.email || 'Guest'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
