"use client"

import React from 'react'
// cSpell:ignore Tatom

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import UserAvatar from '../assets/icons/UserAvatar'
import {
  Home,
  Grid,
  Calendar,
  Users,
  MessageSquare,
  DollarSign,
  Megaphone,
  Mail,
  MoreHorizontal,
} from 'lucide-react'

function NavItem({ icon: Icon, label, badge, href }: { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string; badge?: number; href: string }) {
  return (
    <Link
      href={href}
      className="w-full text-left flex items-center gap-3 p-2 rounded transform transition duration-150 border border-transparent hover:bg-gray-50 dark:hover:bg-white/5 hover:border-[var(--border)] active:translate-y-[1px] active:bg-gray-100 dark:active:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400"
      aria-label={label}
    >
      <Icon className="w-5 h-5 opacity-80" />
      <span className="flex-1">{label}</span>
      {badge ? <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">{badge}</span> : null}
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname() || '/'
  const isDashboard = pathname === '/' || pathname === '/dashboard'

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-transparent pr-0 z-50">
      {/* vertical divider recreated as an absolute element so other borders can align to it */}
      <div data-sidebar-divider className="absolute right-0 top-0 bottom-0 w-px z-50 bg-[var(--border)]" />
      <div className="flex flex-col h-full">
        <header className="px-4 py-3 border-b border-[var(--border)] z-30">
          <div className="flex items-center gap-3">
            {!isDashboard && (
              <button aria-label="Toggle menu" className="p-2 rounded transform transition duration-150 border border-transparent hover:bg-gray-50 dark:hover:bg-white/5 hover:border-[var(--border)] active:translate-y-[1px] active:bg-gray-100 dark:active:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400">
                <svg className="w-5 h-5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
              </button>
            )}
            <div className="font-semibold">SAVAGE LLC</div>
          </div>

          <div className="mt-3">
            <label className="relative block">
              <span className="sr-only">Search</span>
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"></path></svg>
              </span>
              <input aria-label="Search" className="w-full pl-10 pr-3 py-2 rounded bg-base-200 placeholder:opacity-70" placeholder="Search" />
            </label>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto mt-4 px-2">
          <div className="text-xs text-muted uppercase px-2 mb-2">Main</div>
          <nav className="space-y-1 mb-4">
            <NavItem href="/dashboard" icon={Home} label="Dashboard" />
            <NavItem href="/task-tracking" icon={Grid} label="Task Tracking" />
            <NavItem href="/task-calendar" icon={Calendar} label="Task Calendar" />
            <NavItem href="/payroll-calendar" icon={DollarSign} label="Payroll Calendar" />
            <NavItem href="/announcements" icon={Megaphone} label="Announcements" />
            <NavItem href="/daily-logs" icon={Users} label="Daily Logs" />
          </nav>

          <div className="text-xs text-muted uppercase px-2 mb-2">Collaboration</div>
          <nav className="space-y-1 mb-4">
            <NavItem href="/company-chat" icon={MessageSquare} label="Company Chat" />
            <NavItem href="/private-messages" icon={Mail} label="Private Messages" badge={3} />
            <NavItem href="/whiteboard" icon={Grid} label="Whiteboard" />
            <NavItem href="/discord" icon={MoreHorizontal} label="Discord" />
          </nav>

          <div className="text-xs text-muted uppercase px-2 mb-2">Departments</div>
          <nav className="space-y-1 mb-6">
            <Link href="/operations" className="w-full text-left flex items-center gap-3 p-2 rounded transform transition duration-150 border border-transparent hover:bg-gray-50 dark:hover:bg-white/5 hover:border-[var(--border)] active:translate-y-[1px] active:bg-gray-100 dark:active:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400">
              <span className="w-2 h-2 bg-gray-400 rounded-full inline-block"></span>
              <span className="flex-1">Operations</span>
              <span className="text-sm text-muted">12</span>
            </Link>
          </nav>
        </div>

        <div className="relative py-4">
          <div className="absolute left-0 right-0 top-0 z-30 border-t border-[var(--border)]" />
          <div className="px-2">
            <div className="flex items-center gap-3">
              <Link href="/profile" className="flex items-center gap-3 flex-1 min-w-0">
                <UserAvatar className="w-10 h-10 rounded-full" size={40} aria-hidden={true} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">Jade Tatom</div>
                  <div className="text-xs text-muted truncate">Owner</div>
                </div>
              </Link>
              <button aria-label="Profile options" className="p-1 rounded transform transition duration-150 border border-transparent hover:bg-gray-50 dark:hover:bg-white/5 hover:border-[var(--border)] active:translate-y-[1px] active:bg-gray-100 dark:active:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
