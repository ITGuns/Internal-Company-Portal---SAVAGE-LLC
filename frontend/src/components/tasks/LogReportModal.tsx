/**
 * EOD Report Modal - Generate a Daily/Weekly/Monthly Log with full task breakdown
 * P2-13: decimal override hours | P2-14: H+M display | P2-15-17: Deskii branding + creator
 * P2-19: enhanced EOD with task breakdown
 */

import React, { useState, useEffect, useMemo } from "react";
import { X, ClipboardCheck, History, Clock, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { buildDailyLogTasksFromTaskReport } from "@/lib/daily-log-task-import";
import type { Task } from "@/lib/tasks";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";

interface EODReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: Task[];
}

export type LogPeriod = "daily" | "weekly" | "monthly";

function getLocalDateInput(date = new Date()) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
}

/** Convert decimal hours (e.g. 2.5) → "2h 30m" */
function decimalHoursToHM(decimal: number): string {
    if (!decimal || decimal <= 0) return "0h 0m";
    const totalMinutes = Math.round(decimal * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

const STATUS_LABELS: Record<string, string> = {
    todo: "To Do",
    in_progress: "In Progress",
    review: "Review",
    completed: "Completed",
};

const STATUS_COLORS: Record<string, string> = {
    todo: "text-gray-500",
    in_progress: "text-blue-500",
    review: "text-amber-500",
    completed: "text-emerald-500",
};

export default function LogReportModal({ isOpen, onClose, tasks }: EODReportModalProps) {
    const toast = useToast();
    const queryClient = useQueryClient();
    const { user: currentUser } = useUser();

    const [logType, setLogType] = useState<LogPeriod>("daily");
    const [content, setContent] = useState("");
    const [shiftNotes, setShiftNotes] = useState("");
    const [hoursLogged, setHoursLogged] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [periodTasks, setPeriodTasks] = useState<Task[]>([]);
    const [showTaskBreakdown, setShowTaskBreakdown] = useState(true);

    useEffect(() => {
        if (!isOpen) return;

        const now = new Date();
        const startDate = new Date();

        if (logType === 'daily') {
            startDate.setHours(0, 0, 0, 0);
        } else if (logType === 'weekly') {
            const day = now.getDay();
            startDate.setDate(now.getDate() - day);
            startDate.setHours(0, 0, 0, 0);
        } else if (logType === 'monthly') {
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
        }

        const filtered = tasks.filter(t => {
            if (!t.updatedAt) return false;
            const updatedDate = new Date(t.updatedAt);
            return updatedDate >= startDate && updatedDate <= now;
        });

        setPeriodTasks(filtered);

        // Enhanced task summary with status and progress
        const taskSummary = filtered.map(t => {
            const elapsedH = t.totalElapsed ? (t.totalElapsed / 3600).toFixed(1) : "0";
            return `- [${STATUS_LABELS[t.status] || t.status}] ${t.title} — ${t.progress || 0}% complete (${elapsedH}h logged)`;
        }).join('\n');

        const periodLabel = logType === 'daily' ? 'today' : (logType === 'weekly' ? 'this week' : 'this month');
        setContent(taskSummary || `No tasks worked on ${periodLabel}.`);

        // Calculate hours from totalElapsed
        const totalSecs = filtered.reduce((sum, t) => sum + (t.totalElapsed || 0), 0);
        setHoursLogged(Math.round((totalSecs / 3600) * 100) / 100);
    }, [isOpen, tasks, logType]);

    // Derived stats
    const completedInPeriod = useMemo(() => periodTasks.filter(t => t.status === 'completed'), [periodTasks]);
    const inProgressInPeriod = useMemo(() => periodTasks.filter(t => t.status === 'in_progress'), [periodTasks]);
    const totalSecsInPeriod = useMemo(() => periodTasks.reduce((s, t) => s + (t.totalElapsed || 0), 0), [periodTasks]);

    const handleSubmit = async () => {
        const isContentValid = content.trim();
        const isHoursValid = Number.isFinite(hoursLogged) && hoursLogged >= 0;

        if (!isContentValid || !isHoursValid) {
            toast.error("Please add report content and a valid hour total.");
            return;
        }

        try {
            setIsSubmitting(true);
            const res = await apiFetch("/daily-logs", {
                method: "POST",
                body: JSON.stringify({
                    content,
                    shiftNotes,
                    hoursLogged,
                    logType,
                    status: "completed",
                    tasks: buildDailyLogTasksFromTaskReport(periodTasks),
                    date: getLocalDateInput()
                })
            });

            if (res.ok) {
                queryClient.invalidateQueries({ queryKey: ["daily-logs"] });
                toast.success(`${logType.charAt(0).toUpperCase() + logType.slice(1)} report posted to Daily Logs.`);
                onClose();
                setContent("");
                setShiftNotes("");
            } else {
                throw new Error("Failed to submit report");
            }
        } catch (err) {
            console.error(err);
            toast.error(`Failed to submit ${logType} report`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const modalTitle = {
        daily: "Daily (EOD) Report",
        weekly: "End of Week Report",
        monthly: "End of Month Report"
    }[logType];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl max-h-[93vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* ── Header ─────────────────────────────────── */}
                <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-gradient-to-r from-[var(--card-surface)] to-[var(--background)]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md flex-shrink-0">
                            <ClipboardCheck className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base leading-tight">Generate {modalTitle}</h3>
                            <p className="text-[11px] text-[var(--muted)] mt-0.5">
                                Prepared by <span className="font-medium text-[var(--foreground)]">{currentUser?.name || currentUser?.email || "You"}</span>
                                {" · "}{new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-[var(--background)] rounded-full transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* ── Period Tabs ────────────────────────────── */}
                <div className="px-6 py-3 bg-[var(--card-bg)] border-b border-[var(--border)]">
                    <div className="flex items-center gap-2 bg-[var(--background)] p-1 rounded-lg w-fit">
                        {(['daily', 'weekly', 'monthly'] as LogPeriod[]).map((type) => (
                            <button
                                key={type}
                                onClick={() => setLogType(type)}
                                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${logType === type
                                    ? 'bg-[var(--accent)] text-white shadow-sm'
                                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                                    }`}
                            >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <form
                    id="task-report-daily-log-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void handleSubmit();
                    }}
                    className="flex-1 overflow-y-auto p-6 space-y-5 chat-scroll"
                >
                    {/* ── Stats Row ──────────────────────────── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                            <div className="flex items-center gap-1.5 text-blue-500 mb-1">
                                <History className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold uppercase">Tasks</span>
                            </div>
                            <div className="text-xl font-bold tabular-nums">{periodTasks.length}</div>
                            <div className="text-[10px] text-[var(--muted)]">this {logType}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                            <div className="flex items-center gap-1.5 text-emerald-500 mb-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold uppercase">Done</span>
                            </div>
                            <div className="text-xl font-bold tabular-nums">{completedInPeriod.length}</div>
                            <div className="text-[10px] text-[var(--muted)]">completed</div>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                            <div className="flex items-center gap-1.5 text-amber-500 mb-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold uppercase">Active</span>
                            </div>
                            <div className="text-xl font-bold tabular-nums">{inProgressInPeriod.length}</div>
                            <div className="text-[10px] text-[var(--muted)]">in progress</div>
                        </div>
                        <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
                            <div className="flex items-center gap-1.5 text-purple-500 mb-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold uppercase">Time</span>
                            </div>
                            <div className="text-xl font-bold tabular-nums">{decimalHoursToHM(totalSecsInPeriod / 3600)}</div>
                            <div className="text-[10px] text-[var(--muted)]">tracked</div>
                        </div>
                    </div>

                    {/* ── Task Breakdown (P2-19) ─────────────── */}
                    {periodTasks.length > 0 && (
                        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setShowTaskBreakdown(v => !v)}
                                className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--card-surface)] text-xs font-semibold uppercase tracking-wider text-[var(--muted)] hover:bg-[var(--card-bg)] transition-colors"
                            >
                                <span>Task Breakdown ({periodTasks.length})</span>
                                {showTaskBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                            {showTaskBreakdown && (
                                <div className="divide-y divide-[var(--border)] max-h-48 overflow-y-auto chat-scroll">
                                    {periodTasks.map(t => {
                                        const elapsed = t.totalElapsed ? decimalHoursToHM(t.totalElapsed / 3600) : "0m";
                                        return (
                                            <div key={t.id} className="flex items-center justify-between px-4 py-2 bg-[var(--card-bg)] text-xs">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className={`font-medium ${STATUS_COLORS[t.status] || 'text-[var(--muted)]'}`}>
                                                        ●
                                                    </span>
                                                    <span className="truncate font-medium">{t.title}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-[var(--muted)] flex-shrink-0 ml-2">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                        t.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' :
                                                        t.status === 'in_progress' ? 'bg-blue-500/10 text-blue-600' :
                                                        'bg-[var(--card-surface)] text-[var(--muted)]'
                                                    }`}>
                                                        {STATUS_LABELS[t.status] || t.status}
                                                    </span>
                                                    <span className="tabular-nums w-12 text-right">{elapsed}</span>
                                                    <span className="w-10 text-right">{t.progress || 0}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Summary Content ────────────────────── */}
                    <div>
                        <label className="block text-sm font-semibold mb-2 flex items-center justify-between">
                            <span>Summary Content <span className="text-red-500">*</span></span>
                            <span className="text-[10px] text-[var(--muted)] font-normal">Auto-generated · editable</span>
                        </label>
                        <textarea
                            required
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 text-sm min-h-[140px] focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-xs"
                            placeholder={`Summary of what you achieved this ${logType}...`}
                        />
                    </div>

                    {logType === 'daily' && (
                        <div>
                            <label className="block text-sm font-semibold mb-2">
                                Shift Notes / Handover
                            </label>
                            <textarea
                                value={shiftNotes}
                                onChange={(e) => setShiftNotes(e.target.value)}
                                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 text-sm min-h-[80px] focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Optional roadblocks, handovers, or notes for the next shift..."
                            />
                        </div>
                    )}

                    {/* ── Hours Override (P2-13 / P2-14) ─────── */}
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-[var(--card-surface)] border border-[var(--border)]">
                        <div className="flex-1">
                            <label htmlFor="hours-logged" className="block text-xs font-semibold text-[var(--muted)] mb-1 uppercase tracking-wider">
                                {logType === 'daily' ? 'Override Hours Logged' : 'Total Hours for Period'}
                                {" "}<span className="text-red-500">*</span>
                            </label>
                            <input
                                id="hours-logged"
                                type="number"
                                step="0.1"
                                min="0"
                                value={hoursLogged}
                                onChange={(e) => setHoursLogged(parseFloat(e.target.value) || 0)}
                                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            />
                            <p className="mt-1 text-[10px] text-[var(--muted)]">
                                Supports decimals (e.g. 2.5 = 2h 30m). Auto-filled from timer data.
                            </p>
                        </div>
                        <div className="flex flex-col items-center justify-center px-4 py-2 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-lg min-w-[80px]">
                            <div className="text-[10px] text-[var(--muted)] uppercase font-bold mb-0.5">H + M</div>
                            <div className="text-lg font-bold text-[var(--accent)] tabular-nums">
                                {decimalHoursToHM(hoursLogged)}
                            </div>
                        </div>
                    </div>
                </form>

                {/* ── Footer ────────────────────────────────── */}
                <div className="p-4 bg-[var(--card-surface)] border-t border-[var(--border)] flex gap-3 justify-end">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        type="submit"
                        form="task-report-daily-log-form"
                        disabled={isSubmitting || !content.trim()}
                    >
                        {isSubmitting ? "Posting..." : `Post ${logType.charAt(0).toUpperCase() + logType.slice(1)} Report`}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
