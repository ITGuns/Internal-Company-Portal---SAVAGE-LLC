"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Clock, Play, Pause, Square, AlertCircle, Loader2 } from 'lucide-react';
import { clockIn, clockOut, fetchTimeEntries, getActiveEntry, type TimeEntry } from '@/lib/time-entries';
import { useToast } from '@/components/ToastProvider';
import Button from '@/components/Button';

export default function TimeClock() {
    const toast = useToast();
    const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0); // seconds
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Initial load to check for active entry
    useEffect(() => {
        async function loadActive() {
            try {
                const entries = await fetchTimeEntries();
                const active = getActiveEntry(entries);
                setActiveEntry(active || null);
            } catch (err) {
                console.error('Failed to load active entry:', err);
            } finally {
                setLoading(false);
            }
        }
        loadActive();
    }, []);

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

    return (
        <div className="flex items-center gap-4 px-4 py-2 bg-[var(--card-surface)] border border-[var(--border)] rounded-2xl shadow-sm">
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${activeEntry ? 'bg-emerald-500 animate-pulse' : 'bg-[var(--muted)]'}`}></div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted)]">
                        {activeEntry ? 'Working' : 'Not Clocked In'}
                    </span>
                </div>
                {activeEntry && (
                    <div className="text-sm font-mono font-bold text-[var(--foreground)] tabular-nums">
                        {formatTime(elapsedTime)}
                    </div>
                )}
            </div>

            <div className="h-8 w-px bg-[var(--border)]"></div>

            {activeEntry ? (
                <button
                    onClick={handleClockOut}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5 fill-current" />}
                    Clock Out
                </button>
            ) : (
                <button
                    onClick={handleClockIn}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:opacity-90 text-white rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    Clock In
                </button>
            )}
        </div>
    );
}
