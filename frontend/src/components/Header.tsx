"use client"

import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import BrandLogo from '../assets/icons/BrandLogo'
import IconButton from './IconButton'
import ThemeToggle from './ThemeToggle'
import UserAvatar from '../assets/icons/UserAvatar'
import NotificationSidebar from './NotificationSidebar'
import ProfileSidebar from './ProfileSidebar'
import { Bell, Menu, Search } from 'lucide-react'
import { useSocket } from '@/context/SocketContext'
import { useUser } from '@/contexts/UserContext'
import TimeClock from './TimeClock'

export default function Header({ title, subtitle }: { title?: string; subtitle?: string }) {
  const pathname = usePathname() || '/'
  const { unreadCount, notifications, markAsRead, markAllAsRead, clearNotifications, connect, isConnected } = useSocket()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const { user } = useUser()

  const isDashboard = pathname === '/' || pathname === '/dashboard'

  // Auto-resolve page title from route when not explicitly provided
  const routeTitles: Record<string, { title: string; subtitle?: string }> = {
    '/task-tracking': { title: 'Task Tracking', subtitle: 'Manage and track your tasks' },
    '/payroll-calendar': { title: 'Payroll Calendar', subtitle: 'Schedules and time entries' },
    '/announcements': { title: 'Announcements', subtitle: 'Company news and updates' },
    '/daily-logs': { title: 'Daily Logs', subtitle: 'Daily work activity reports' },
    '/chat': { title: 'Messages & Chat', subtitle: 'Team communication' },
    '/file-directory': { title: 'File Directory', subtitle: 'Shared documents and files' },
    '/whiteboard': { title: 'Whiteboard', subtitle: 'Collaborative workspace' },
    '/profile': { title: 'Profile', subtitle: 'Your account settings' },
    '/employees': { title: 'Employees', subtitle: 'Team directory' },
    '/departments': { title: 'Departments', subtitle: 'Organization structure' },
  }
  // Match exact route or find prefix match for sub-routes
  const autoTitle = routeTitles[pathname] ?? Object.entries(routeTitles).find(([key]) => pathname.startsWith(key + '/'))?.[1]
  const resolvedTitle = title ?? autoTitle?.title
  const resolvedSubtitle = subtitle ?? autoTitle?.subtitle
  const headerRef = useRef<HTMLElement | null>(null)
  const [outlineLeft, setOutlineLeft] = useState<number | null>(null)
  const [outlineWidth, setOutlineWidth] = useState<number | null>(null)
  const [outlineTop, setOutlineTop] = useState<number | null>(null)
  const [debugMode, setDebugMode] = useState(false)
  const [debugInfo, setDebugInfo] = useState<{ headerLeft: number; headerWidth: number; dividerRight: number | null } | null>(null)


  // Ensure outline updates on mount and resize
  useEffect(() => {
    function updateOutline() {
      const headerEl = headerRef.current
      if (!headerEl) return
      const headerRect = headerEl.getBoundingClientRect()

      // Prefer the exact divider element for pixel-perfect alignment
      const divider = document.querySelector('[data-sidebar-divider]') as HTMLElement | null
      if (divider) {
        const divRect = divider.getBoundingClientRect()
        // use the divider right edge and add a 2px overlap to ensure no visible seam
        const dividerRight = Math.round(divRect.right)
        const leftViewport = dividerRight - 2 // absolute viewport coordinate
        const width = Math.max(0, Math.round(window.innerWidth - leftViewport))
        setOutlineLeft(leftViewport)
        setOutlineWidth(width)

        // Prefer aligning the outline vertically to the sidebar header's bottom border
        const asideHeader = document.querySelector('aside header') as HTMLElement | null
        if (asideHeader) {
          const asideHeaderRect = asideHeader.getBoundingClientRect()
          setOutlineTop(Math.round(asideHeaderRect.bottom))
        } else {
          setOutlineTop(Math.round(headerRect.bottom))
        }

        setDebugInfo({ headerLeft: Math.round(headerRect.left), headerWidth: Math.round(headerRect.width), dividerRight })
        return
      }

      // fallback to using the aside element's right edge
      const aside = document.querySelector('aside') as HTMLElement | null
      if (aside) {
        const asideRect = aside.getBoundingClientRect()
        const asideRight = Math.round(asideRect.right)
        const leftViewport = asideRight - 1
        const width = Math.max(0, Math.round(window.innerWidth - leftViewport))
        setOutlineLeft(leftViewport)
        setOutlineWidth(width)

        const asideHeader = document.querySelector('aside header') as HTMLElement | null
        if (asideHeader) {
          const asideHeaderRect = asideHeader.getBoundingClientRect()
          setOutlineTop(Math.round(asideHeaderRect.bottom))
        } else {
          setOutlineTop(Math.round(headerRect.bottom))
        }

        return
      }

      const defaultLeft = Math.max(0, Math.round(headerRect.left))
      setOutlineLeft(defaultLeft)
      setOutlineWidth(Math.round(window.innerWidth - defaultLeft))
      setOutlineTop(Math.round(headerRect.bottom))
      setDebugInfo({ headerLeft: Math.round(headerRect.left), headerWidth: Math.round(headerRect.width), dividerRight: null })
    }

    updateOutline()
    window.addEventListener('resize', updateOutline)
    const ro = new ResizeObserver(updateOutline)
    ro.observe(document.documentElement)
    return () => {
      window.removeEventListener('resize', updateOutline)
      ro.disconnect()
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDebugMode(window.location.search.includes('outlineDebug'))
    }
  }, [])

  return (
    <header ref={headerRef} className="fixed top-0 left-0 md:left-64 right-0 z-35 flex items-center justify-between h-28 pl-4 md:pl-7 pr-6 bg-[var(--background)]">
      <div className="flex items-center gap-4">
        {/* Mobile hamburger toggle */}
        <button
          className="md:hidden p-2 -ml-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          onClick={() => window.dispatchEvent(new Event('toggle-sidebar'))}
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        {/* left area: allow explicit title, auto-resolve from route, else show dashboard greeting */}
        {isDashboard ? (
          <div className="text-left">
            <h2 className="text-xl font-semibold">Welcome back, {user?.name || 'Guest'}</h2>
            <div className="text-sm text-[var(--muted)]">Here's what's happening today</div>
          </div>
        ) : resolvedTitle ? (
          <div className="text-left">
            <h2 className="text-xl font-semibold">{resolvedTitle}</h2>
            {resolvedSubtitle ? <div className="text-sm text-[var(--muted)] mt-1">{resolvedSubtitle}</div> : null}
          </div>
        ) : (
          <>
            <BrandLogo width={28} height={28} ariaHidden={true} />
            <h1 className="text-2xl font-semibold">SAVAGE - LLC ENTERPRISES</h1>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Search and Add Task intentionally removed for a cleaner header */}

        {/* Command palette trigger */}
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--muted)] bg-[var(--card-bg)] border border-[var(--border)] rounded-lg hover:border-[var(--muted)] hover:text-[var(--foreground)] transition-all duration-150"
          aria-label="Open command palette"
        >
          <Search className="w-4 h-4" />
          <span>Search</span>
          <kbd className="ml-1 text-xs font-mono opacity-70">Ctrl+K</kbd>
        </button>

        {user && <TimeClock />}

        <ThemeToggle />

        <button
          aria-label="notifications"
          className="btn btn-ghost btn-circle relative"
          onClick={() => setShowNotifications(!showNotifications)}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[var(--background)]"></span>
          )}
        </button>

        <button
          onClick={() => setShowProfile(true)}
          className="rounded-full hover:ring-2 hover:ring-[var(--border)] transition-all overflow-hidden"
          aria-label="Open profile"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--card-surface)] border-2 border-[var(--border)]">
            {user?.avatar ? (
              <Image
                src={user.avatar}
                alt={user.name || "User"}
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserAvatar className="w-full h-full" size={32} ariaHidden={true} />
            )}
          </div>
        </button>
      </div>

      {/* subtle bottom outline using theme border token + small shadow
          stretch left to sit under the fixed sidebar (sidebar width: 16rem) */}
      {/* fixed positioned outline so it reaches viewport right edge reliably */}
      {outlineTop !== null ? (
        <>
          <div
            style={{
              position: 'fixed',
              top: `${outlineTop - 1}px`,
              left: `${outlineLeft ?? -2}px`,
              right: 0,
              height: '1px',
              background: 'var(--border)',
              opacity: 0.9,
              zIndex: 1200,
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              position: 'fixed',
              top: `${outlineTop}px`,
              left: `${outlineLeft ?? -2}px`,
              right: 0,
              height: '6px',
              boxShadow: '0 6px 18px rgba(2,6,23,0.04)',
              zIndex: 1190,
              pointerEvents: 'none',
            }}
          />
        </>
      ) : (
        <>
          <div className="absolute bottom-0 h-px bg-[var(--border)]/90" style={{ left: '-1px', width: 'calc(100% + 1px)', zIndex: 20 }} />
          <div className="absolute bottom-[-6px] h-[6px] pointer-events-none" style={{ left: '-1px', width: 'calc(100% + 1px)', boxShadow: '0 6px 18px rgba(2,6,23,0.04)', zIndex: 10 }} />
        </>
      )}

      {debugMode && debugInfo && (
        <>
          <div
            style={{
              position: 'fixed',
              top: `${outlineTop ? outlineTop - (outlineTop ? (outlineTop - outlineTop) : 0) : 0}px`,
              left: `${debugInfo.headerLeft}px`,
              width: `${debugInfo.headerWidth}px`,
              height: '52px',
              background: 'rgba(0,255,0,0.06)',
              pointerEvents: 'none',
              zIndex: 1000,
            }}
          />
          {typeof debugInfo.dividerRight === 'number' && (
            <div
              style={{
                position: 'fixed',
                top: `${outlineTop ? outlineTop - 52 : 0}px`,
                left: `${debugInfo.dividerRight - 1}px`,
                width: '2px',
                height: '64px',
                background: 'rgba(255,0,0,0.7)',
                pointerEvents: 'none',
                zIndex: 1001,
              }}
            />
          )}
        </>
      )}

      {/* Notification Sidebar */}
      <NotificationSidebar
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onClear={clearNotifications}
      />

      {/* Profile Sidebar */}
      <ProfileSidebar isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </header>
  )
}
