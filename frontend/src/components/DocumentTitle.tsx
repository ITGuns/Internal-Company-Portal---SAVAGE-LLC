'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useWorkspaceConfig } from '@/contexts/WorkspaceConfigContext';
import { getRouteTitle } from '@/lib/route-titles';

// Sets a route-specific browser tab title on every client navigation (WCAG 2.4.2).
// Mounted once in the authenticated shell; the root layout metadata remains the
// SSR/first-paint default. This is the single owner of document.title.
export default function DocumentTitle() {
  const pathname = usePathname() || '/';
  const workspace = useWorkspaceConfig();

  useEffect(() => {
    const brand = workspace.name || 'Deskii';
    const route = getRouteTitle(pathname);
    document.title = route?.title ? `${route.title} | ${brand}` : `${brand} | Internal Portal`;
  }, [pathname, workspace.name]);

  return null;
}
