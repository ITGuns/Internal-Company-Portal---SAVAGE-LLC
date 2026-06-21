export const SIDEBAR_DESKTOP_MEDIA_QUERY = "(min-width: 768px)";

export function getSidebarToggleMode(isDesktopViewport: boolean): "desktop" | "mobile" {
  return isDesktopViewport ? "desktop" : "mobile";
}

export function getNavigationToggleLabel(
  isDesktopViewport: boolean,
  desktopCollapsed: boolean,
  mobileOpen = false,
): string {
  if (!isDesktopViewport) return mobileOpen ? "Close navigation" : "Open navigation";
  return desktopCollapsed ? "Expand navigation" : "Collapse navigation";
}

export type SidebarNavActiveMode = "exact" | "section";

export function isSidebarNavItemActive(
  pathname: string,
  href: string,
  activeMode: SidebarNavActiveMode = "section",
): boolean {
  if (href === "/" || activeMode === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
