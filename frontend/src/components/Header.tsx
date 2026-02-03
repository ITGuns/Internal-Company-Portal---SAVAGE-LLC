"use client"

import React, { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import BrandLogo from '../assets/icons/BrandLogo'
import IconButton from './IconButton'
import ThemeToggle from './ThemeToggle'
import UserAvatar from '../assets/icons/UserAvatar'
import { Bell, Search, Settings } from 'lucide-react'

export default function Header({ title, subtitle }: { title?: string; subtitle?: string }) {
  const pathname = usePathname() || '/'

  const isDashboard = pathname === '/' || pathname === '/dashboard'
  const headerRef = useRef<HTMLElement | null>(null)
  const [outlineLeft, setOutlineLeft] = useState<number | null>(null)
  const [outlineWidth, setOutlineWidth] = useState<number | null>(null)
  const [outlineTop, setOutlineTop] = useState<number | null>(null)
  const [debugMode, setDebugMode] = useState(false)
  const [debugInfo, setDebugInfo] = useState<{ headerLeft: number; headerWidth: number; dividerRight: number | null } | null>(null)

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
    <header ref={headerRef} className="fixed top-0 left-64 right-0 z-35 flex items-center justify-between h-25 pl-4 pr-6 bg-[var(--background)]">
      <div className="flex items-center gap-4">
        {/* left area: allow explicit title, else show dashboard greeting or brand */}
        {title ? (
          <div className="text-left">
            <h2 className="text-xl font-semibold">{title}</h2>
            {subtitle ? <div className="text-sm text-[var(--muted)] mt-1">{subtitle}</div> : null}
          </div>
        ) : isDashboard ? (
          <div className="text-left">
            <h2 className="text-xl font-semibold">Welcome back, User</h2>
            <div className="text-sm text-[var(--muted)]">Here's what's happening today</div>
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

        <ThemeToggle />

        <button aria-label="settings" className="btn btn-ghost btn-circle">
          <Settings className="w-5 h-5" />
        </button>

        <button aria-label="notifications" className="btn btn-ghost btn-circle">
          <Bell className="w-5 h-5" />
        </button>

        <UserAvatar className="w-8 h-8 rounded-full" size={32} ariaHidden={true} />
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
    </header>
  )
}
