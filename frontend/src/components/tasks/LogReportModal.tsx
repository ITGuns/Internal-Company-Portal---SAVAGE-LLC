/**
 * EOD Report Modal - Generate a Daily Log based on today's tasks
 */

import React, { useState, useEffect } from "react";
import { X, ClipboardCheck, History, Clock } from "lucide-react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { buildDailyLogTasksFromTaskReport } from "@/lib/daily-log-task-import";
import type { Task } from "@/lib/tasks";
import { useQueryClient } from "@tanstack/react-query";

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

export default function LogReportModal({ isOpen, onClose, tasks }: EODReportModalProps) {
    const dialogTitleId = React.useId();
    const dialogDescriptionId = React.useId();
    const { dialogRef, handleDialogKeyDown } = useDialogA11y({ isOpen, onClose });
    const toast = useToast();
    const queryClient = useQueryClient();
    const [logType, setLogType] = useState<LogPeriod>("daily");
    const [content, setContent] = useState("");
    const [shiftNotes, setShiftNotes] = useState("");
    const [hoursLogged, setHoursLogged] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [periodTasks, setPeriodTasks] = useState<Task[]>([]);

    useEffect(() => {
        if (isOpen) {
            const now = new Date();
            const startDate = new Date();

            if (logType === 'daily') {
                startDate.setHours(0, 0, 0, 0);
            } else if (logType === 'weekly') {
                // Get start of week (Sunday)
                const day = now.getDay();
                startDate.setDate(now.getDate() - day);
                startDate.setHours(0, 0, 0, 0);
            } else if (logType === 'monthly') {
                // Get start of month
                startDate.setDate(1);
                startDate.setHours(0, 0, 0, 0);
            }

            const filtered = tasks.filter(t => {
                if (!t.updatedAt) return false;
                const updatedDate = new Date(t.updatedAt);
                return updatedDate >= startDate && updatedDate <= now;
            });

            setPeriodTasks(filtered);

            // Pre-fill content with task summaries
            const taskSummary = filtered.map(t => `- [${t.status.replace('_', ' ')}] ${t.title} (${t.progress}%)`).join('\n');
            const periodLabel = logType === 'daily' ? 'today' : (logType === 'weekly' ? 'this week' : 'this month');
            setContent(taskSummary || `No tasks worked on ${periodLabel}.`);

            // Calculate hours
            const totalSecs = filtered.reduce((sum, t) => sum + (t.totalElapsed || 0), 0);
            setHoursLogged(Math.round((totalSecs / 3600) * 100) / 100);
        }
    }, [isOpen, tasks, logType]);

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
        <div className="portal-form-backdrop fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={dialogTitleId}
                aria-describedby={dialogDescriptionId}
                tabIndex={-1}
                onKeyDown={handleDialogKeyDown}
                className="w-full max-w-2xl"
            >
            <Card className="max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 text-[var(--foreground)]">
                <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--card-bg)]">
                    <div className="flex items-center gap-2">
                        <ClipboardCheck className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                        <h3 id={dialogTitleId} className="font-bold text-lg">Generate {modalTitle}</h3>
                        <p id={dialogDescriptionId} className="sr-only">
                            Generate a daily, weekly, or monthly work report from recent task activity.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 text-[var(--muted)] hover:bg-[var(--card-surface)] hover:text-[var(--foreground)] rounded-full transition-colors" aria-label="Close modal">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="px-6 py-4 bg-[var(--card-bg)] border-b border-[var(--border)]">
                    <div className="flex items-center gap-2 bg-[var(--card-surface)] p-1 rounded-lg w-fit border border-[var(--border)]">
                        {(['daily', 'weekly', 'monthly'] as LogPeriod[]).map((type) => (
                            <button
                                type="button"
                                key={type}
                                onClick={() => setLogType(type)}
                                className={`min-h-8 px-4 py-1.5 text-xs font-medium rounded-md transition-all ${logType === type
                                    ? 'bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm'
                                    : 'text-[var(--foreground)] hover:bg-[var(--surface-hover)]'
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
                    className="flex-1 overflow-y-auto p-6 space-y-6 chat-scroll"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="p-4 rounded-xl bg-[var(--card-surface)] border border-blue-500/30">
                            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-2">
                                <History className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase">Tasks ({logType})</span>
                            </div>
                            <div className="text-2xl font-bold">{periodTasks.length}</div>
                            <div className="text-xs text-[var(--muted)]">Tasks updated during this {logType} period</div>
                        </div>
                        <div className="p-4 rounded-xl bg-[var(--card-surface)] border border-violet-500/30">
                            <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300 mb-2">
                                <Clock className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase">Total Time</span>
                            </div>
                            <div className="text-2xl font-bold">{hoursLogged} hrs</div>
                            <div className="text-xs text-[var(--muted)]">Cumulative task time for this period</div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2 flex items-center justify-between">
                            <span>Summary Content <span className="text-red-500">*</span></span>
                            <span className="text-[10px] text-[var(--muted)]">Auto-generated for {logType} period</span>
                        </label>
                        <textarea
                            required
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] min-h-[150px] focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder={`Summary of what you achieved this ${logType}...`}
                        />
                    </div>

                    {logType === 'daily' && (
                        <div>
                            <label className="block text-sm font-semibold mb-2">
                                Additional Shift Notes
                            </label>
                            <textarea
                                value={shiftNotes}
                                onChange={(e) => setShiftNotes(e.target.value)}
                                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] min-h-[100px] focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Optional roadblocks, handovers, or notes for the next shift..."
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-4 pt-2">
                        <div className="flex-1">
                            <label htmlFor="hours-logged" className="block text-xs font-semibold text-[var(--muted)] mb-1 uppercase tracking-wider">
                                {logType === 'daily' ? 'Overridden Hours' : 'Total Hours for Period'} <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="hours-logged"
                                type="number"
                                step="0.1"
                                value={hoursLogged}
                                onChange={(e) => setHoursLogged(parseFloat(e.target.value) || 0)}
                                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-2 text-sm text-[var(--foreground)] focus:ring-2 focus:ring-blue-500"
                                required
                                min="0"
                            />
                        </div>
                    </div>
                </form>

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
                        {isSubmitting ? "Posting..." : `Post ${logType.charAt(0).toUpperCase() + logType.slice(1)} to Daily Logs`}
                    </Button>
                </div>
            </Card>
            </div>
        </div>
    );
}
