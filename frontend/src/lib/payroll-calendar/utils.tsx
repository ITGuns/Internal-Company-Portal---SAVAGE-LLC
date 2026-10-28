/**
 * Utility functions for Payroll Calendar
 */

import React from "react";
import { DollarSign, X, Clock, Calendar as CalendarIcon } from "lucide-react";
import type { EventType } from "./types";
import { manilaDayKey } from "../payroll-dates";

/**
 * Payroll (Manila) day of an instant. Until 2026-10-28 this was the browser
 * day, which put "today" on a different day than the server for viewers
 * outside Manila. The name stays for OvertimeRequestModal; new code calls
 * manilaDayKey / manilaTodayKey from lib/payroll-dates.
 */
export function getLocalDateString(isoOrDate: string | Date): string {
  return manilaDayKey(isoOrDate) ?? "";
}

/**
 * Get background color class for event type
 */
export function colorForType(t?: EventType): string {
  if (t === "payday") return "bg-emerald-500/90";
  if (t === "holiday") return "bg-red-500/90";
  if (t === "deadline") return "bg-amber-500/90";
  if (t === "time") return "bg-sky-500/90";
  if (t === "meeting") return "bg-indigo-500/90";
  if (t === "other") return "bg-slate-500/90";
  return "bg-slate-400";
}

/**
 * Get icon component for event type
 */
export function iconForType(t?: EventType): React.ReactNode {
  if (t === "payday")
    return <DollarSign className="w-5 h-5" aria-hidden="true" />;
  if (t === "holiday") return <X className="w-5 h-5" aria-hidden="true" />;
  if (t === "deadline") return <Clock className="w-5 h-5" aria-hidden="true" />;
  if (t === "meeting")
    return <CalendarIcon className="w-5 h-5" aria-hidden="true" />;
  return <CalendarIcon className="w-5 h-5" aria-hidden="true" />;
}

/**
 * Get solid background color for event type (used in event cards)
 */
export function bgForType(t?: EventType): string {
  if (t === "payday") return "bg-emerald-500";
  if (t === "holiday") return "bg-red-500";
  if (t === "deadline") return "bg-amber-500";
  if (t === "meeting") return "bg-indigo-500";
  if (t === "other") return "bg-slate-500";
  return "bg-slate-400";
}

/**
 * Get dot color for event type (used in event lists)
 */
export function dotForType(t?: EventType): string {
  if (t === "payday") return "bg-emerald-500";
  if (t === "holiday") return "bg-red-500";
  if (t === "deadline") return "bg-amber-500";
  if (t === "meeting") return "bg-indigo-500";
  if (t === "other") return "bg-slate-500";
  return "bg-slate-400";
}

/**
 * Format minutes to human-readable string
 */
export function formatMinutes(minutes: number): string {
  if (minutes >= 60) {
    return `${Math.round(minutes / 60)}h`;
  }
  return `${minutes}m`;
}

/**
 * Calculate duration in minutes between two dates
 */
export function calculateDuration(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}
