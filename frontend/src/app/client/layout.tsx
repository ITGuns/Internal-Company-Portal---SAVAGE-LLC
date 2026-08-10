"use client";

import type { ReactNode } from "react";
import { TourProvider } from "@/components/tour/TourProvider";

/**
 * Scopes the guided-tour state to the client portal.
 *
 * Here rather than in the root layout on purpose: only clients get these guides,
 * and this way the /tour fetch never fires for staff, for signed-out visitors on
 * the marketing pages, or on the login screen. One fetch per portal session,
 * shared by every page underneath.
 */
export default function ClientPortalLayout({ children }: { children: ReactNode }) {
  return <TourProvider>{children}</TourProvider>;
}
