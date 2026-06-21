"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, Square, Loader2 } from 'lucide-react';
import { clockIn, clockOut, fetchActiveTimeEntry, type TimeEntry } from '@/lib/time-entries';
import { useToast } from '@/components/ToastProvider';

const ACTIVE_TIME_ENTRY_QUERY_KEY = ['time-entries', 'active'] as const;

export default function TimeClock() {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0); // seconds
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const { data: fetchedActiveEntry = null, isLoading: loading } = useQuery({
        queryKey: ACTIVE_TIME_ENTRY_QUERY_KEY,
        queryFn: fetchActiveTimeEntry,
        staleTime: 30 * 1000,
    });

    useEffect(() => {
        setActiveEntry(fetchedActiveEntry);
    }, [fetchedActiveEntry]);

    // Timer logic
    useEffect(() => {
        if (activeEntry && !activeEntry.end) {
            const start = new Date(activeEntry.start).getTime();

            const updateTimer = () => {
                const now = new Date().getTime();
                setElapsedTime(Math.floor((now - start) / 1000));
            };

            updateTimer();
            timerRef.current = setInterval(updateTimer, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
            setElapsedTime(0);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [activeEntry]);

    const handleClockIn = async () => {
        try {
            setActionLoading(true);
            const entry = await clockIn();
            setActiveEntry(entry);
            queryClient.setQueryData(ACTIVE_TIME_ENTRY_QUERY_KEY, entry);
            toast.success("Clocked in successfully");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to clock in");
        } finally {
            setActionLoading(false);
        }
    };

    const handleClockOut = async () => {
        try {
            setActionLoading(true);
            await clockOut();
            setActiveEntry(null);
            queryClient.setQueryData(ACTIVE_TIME_ENTRY_QUERY_KEY, null);
            toast.success("Clocked out successfully");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to clock out");
        } finally {
            setActionLoading(false);
        }
    };

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (loading) return null;
    const isClockedIn = Boolean(activeEntry);

    return (
        <div className={`flex items-center gap-3 rounded-[var(--radius-md)] border bg-[var(--card-bg)] px-3 py-2 shadow-[var(--shadow-sm)] ${isClockedIn ? 'border-emerald-500/40' : 'border-sky-500/35'}`}>
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isClockedIn ? 'bg-emerald-500 animate-pulse' : 'bg-sky-500'}`}></div>
                    <span className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${isClockedIn ? 'text-emerald-500' : 'text-sky-500'}`}>
                        {isClockedIn ? 'Working' : 'Ready'}
                    </span>
                </div>
                {isClockedIn && (
                    <div className="text-sm font-mono font-bold text-[var(--foreground)] tabular-nums">
                        {formatTime(elapsedTime)}
                    </div>
                )}
            </div>

            <div className="h-8 w-px bg-[var(--border)]" />

            {activeEntry ? (
                <button
                    onClick={handleClockOut}
                    disabled={actionLoading}
                    className="flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] border border-red-700 bg-red-700 px-3 py-2 text-xs font-semibold text-white transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-red-800 active:translate-y-px active:scale-[0.98] disabled:opacity-50"
                >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5 fill-current" />}
                    Clock Out
                </button>
            ) : (
                <button
                    onClick={handleClockIn}
                    disabled={actionLoading}
                    className="flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--accent)] bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--accent-foreground)] transition-[filter,transform] duration-150 ease-[var(--ease-out)] hover:brightness-95 active:translate-y-px active:scale-[0.98] disabled:opacity-50"
                >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    Clock In
                </button>
            )}
        </div>
    );
}
