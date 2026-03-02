/**
 * EOD Report Modal - Generate a Daily Log based on today's tasks
 */

import React, { useState, useEffect } from "react";
import { X, ClipboardCheck, History, Clock } from "lucide-react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { useUser } from "@/contexts/UserContext";
import type { Task } from "@/lib/tasks";

interface EODReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: Task[];
}

export type LogPeriod = "daily" | "weekly" | "monthly";

export default function LogReportModal({ isOpen, onClose, tasks }: EODReportModalProps) {
    const { user } = useUser();
    const toast = useToast();
    const [logType, setLogType] = useState<LogPeriod>("daily");
    const [content, setContent] = useState("");
    const [shiftNotes, setShiftNotes] = useState("");
    const [hoursLogged, setHoursLogged] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [periodTasks, setPeriodTasks] = useState<Task[]>([]);

    useEffect(() => {
        if (isOpen) {
            const now = new Date();
            let startDate = new Date();

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isContentValid = content.trim();
        const isNotesValid = logType === 'daily' ? shiftNotes.trim() : true;
        const isHoursValid = hoursLogged > 0;

        if (!isContentValid || !isNotesValid || !isHoursValid) {
            toast.error("Please fill in all required fields accurately.");
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
                    department: user?.department || "General",
                    status: "completed",
                    tasks: periodTasks.map(t => t.id),
                    date: new Date().toISOString()
                })
            });

            if (res.ok) {
                toast.success(`${logType.charAt(0).toUpperCase() + logType.slice(1)} Report submitted successfully!`);
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
            <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--card-surface)]">
                    <div className="flex items-center gap-2">
                        <ClipboardCheck className="w-5 h-5 text-blue-500" />
                        <h3 className="font-bold text-lg">Generate {modalTitle}</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-[var(--background)] rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="px-6 py-4 bg-[var(--card-bg)] border-b border-[var(--border)]">
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

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 chat-scroll">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                            <div className="flex items-center gap-2 text-blue-500 mb-2">
                                <History className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase">Tasks ({logType})</span>
                            </div>
                            <div className="text-2xl font-bold">{periodTasks.length}</div>
                            <div className="text-[10px] text-[var(--muted)]">Tasks updated during this {logType} period</div>
                        </div>
                        <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
                            <div className="flex items-center gap-2 text-purple-500 mb-2">
                                <Clock className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase">Total Time</span>
                            </div>
                            <div className="text-2xl font-bold">{hoursLogged} hrs</div>
                            <div className="text-[10px] text-[var(--muted)]">Cumulative task time for this period</div>
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
                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 text-sm min-h-[150px] focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder={`Summary of what you achieved this ${logType}...`}
                        />
                    </div>

                    {logType === 'daily' && (
                        <div>
                            <label className="block text-sm font-semibold mb-2">
                                Additional Shift Notes <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={shiftNotes}
                                onChange={(e) => setShiftNotes(e.target.value)}
                                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 text-sm min-h-[100px] focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Any roadblocks, handovers, or notes for the next shift..."
                                required
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-4 pt-2">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-[var(--muted)] mb-1 uppercase tracking-wider">
                                {logType === 'daily' ? 'Overridden Hours' : 'Total Hours for Period'} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                value={hoursLogged}
                                onChange={(e) => setHoursLogged(parseFloat(e.target.value) || 0)}
                                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                required
                                min="0.1"
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
                        onClick={handleSubmit}
                        disabled={isSubmitting || !content.trim()}
                    >
                        {isSubmitting ? "Submitting..." : `Submit ${logType.charAt(0).toUpperCase() + logType.slice(1)} Report`}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
