/**
 * Utility functions for Payroll Calendar
 */

import React from "react";
import { DollarSign, X, Clock, Calendar as CalendarIcon } from "lucide-react";
import type { EventType } from "./types";

/**
 * Get local date string from ISO timestamp (handles timezone conversion)
 */
export function getLocalDateString(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
