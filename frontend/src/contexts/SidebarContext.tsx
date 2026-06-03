"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { STORAGE_KEYS } from "@/lib/constants";
import { getItem, setItem } from "@/lib/storage";
import { SIDEBAR_DESKTOP_MEDIA_QUERY, getSidebarToggleMode } from "@/lib/sidebar-navigation";

type SidebarContextValue = {
  desktopCollapsed: boolean;
  mobileOpen: boolean;
  isDesktopViewport: boolean;
  closeMobileSidebar: () => void;
  toggleDesktopSidebar: () => void;
  toggleNavigation: () => void;
};

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);

  useEffect(() => {
    setDesktopCollapsed(getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, false));
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(SIDEBAR_DESKTOP_MEDIA_QUERY);

    function syncViewportState() {
      setIsDesktopViewport(mediaQuery.matches);
      if (mediaQuery.matches) setMobileOpen(false);
    }

    syncViewportState();
    mediaQuery.addEventListener("change", syncViewportState);
    return () => mediaQuery.removeEventListener("change", syncViewportState);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const toggleDesktopSidebar = useCallback(() => {
    setDesktopCollapsed((current) => {
      const next = !current;
      setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, next);
      return next;
    });
  }, []);

  const toggleNavigation = useCallback(() => {
    if (getSidebarToggleMode(window.matchMedia(SIDEBAR_DESKTOP_MEDIA_QUERY).matches) === "desktop") {
      toggleDesktopSidebar();
      return;
    }

    setMobileOpen((current) => !current);
  }, [toggleDesktopSidebar]);

  const value = useMemo<SidebarContextValue>(() => ({
    desktopCollapsed,
    mobileOpen,
    isDesktopViewport,
    closeMobileSidebar,
    toggleDesktopSidebar,
    toggleNavigation,
  }), [
    closeMobileSidebar,
    desktopCollapsed,
    isDesktopViewport,
    mobileOpen,
    toggleDesktopSidebar,
    toggleNavigation,
  ]);

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}
