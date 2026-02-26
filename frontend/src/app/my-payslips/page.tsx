"use client";

import React, { useEffect, useState } from "react";
import Header from "@/components/Header";
import Card from "@/components/Card";
import Button from "@/components/Button";
import EmptyState from "@/components/ui/EmptyState";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useToast } from "@/components/ToastProvider";
import { apiFetch } from "@/lib/api";
import { useUser } from "@/contexts/UserContext";
import {
    formatCurrency,
    formatPayPeriod,
    getStatusColor,
    generatePayslipPDF,
} from "@/lib/payroll-calendar/payslip-utils";
import type { Payslip } from "@/lib/payroll-calendar/types";
import {
    FileText,
    Download,
    Calendar,
    DollarSign,
    TrendingUp,
    Eye,
    X,
    CheckCircle2,
    Clock,
    AlertCircle,
} from "lucide-react";

// ─── helper: map raw API response to Payslip shape ──────────────────────────
function mapApiPayslip(raw: any): Payslip {
    return {
        id: raw.id,
        employeeId: raw.userId,
        employeeName: raw.user?.name || "Me",
        payPeriodStart: raw.period?.startDate?.split("T")[0] ?? "",
        payPeriodEnd: raw.period?.endDate?.split("T")[0] ?? "",
        issueDate: raw.generatedAt?.split("T")[0] ?? "",
        status: (raw.status as Payslip["status"]) || "issued",
        hoursWorked: 0, // not stored on payslip
        grossPay: raw.grossPay ?? 0,
        netPay: raw.netPay ?? 0,
        deductions:
            raw.items
                ?.filter((i: any) => i.amount < 0)
                .map((i: any) => ({
                    id: i.id,
                    type: "other" as const,
                    name: i.description,
                    amount: Math.abs(i.amount),
                })) ?? [],
        notes: undefined,
    };
}

// ─── stat card ───────────────────────────────────────────────────────────────
function StatCard({
    icon,
    label,
    value,
    accent,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    accent: string;
}) {
    return (
        <Card padding="md">
            <div className="flex items-center gap-4">
                <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${accent}`}
                >
                    {icon}
                </div>
                <div>
                    <p className="text-xs text-[var(--muted)] font-medium uppercase tracking-wide">
                        {label}
                    </p>
                    <p className="text-xl font-bold text-[var(--foreground)]">{value}</p>
                </div>
            </div>
        </Card>
    );
}

// ─── status icon ─────────────────────────────────────────────────────────────
function StatusIcon({ status }: { status: Payslip["status"] }) {
    if (status === "paid")
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (status === "issued") return <Clock className="w-4 h-4 text-blue-500" />;
    return <AlertCircle className="w-4 h-4 text-[var(--muted)]" />;
}

// ─── detail modal ────────────────────────────────────────────────────────────
function PayslipModal({
    payslip,
    onClose,
    onDownload,
}: {
    payslip: Payslip;
    onClose: () => void;
    onDownload: () => void;
}) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--card-bg)] rounded-2xl w-full max-w-lg shadow-2xl border border-[var(--border)] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <h2 className="font-bold text-[var(--foreground)] text-lg">
                                Payslip Details
                            </h2>
                            <p className="text-xs text-[var(--muted)]">
                                {formatPayPeriod(payslip.payPeriodStart, payslip.payPeriodEnd)}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-[var(--card-surface)] transition-colors text-[var(--muted)]"
                        aria-label="Close payslip details"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-5">
                    {/* Status */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--muted)]">Status</span>
                        <span
                            className={`px-3 py-1 text-xs font-semibold rounded-full capitalize ${getStatusColor(payslip.status)}`}
                        >
                            {payslip.status}
                        </span>
                    </div>

                    {/* Earnings */}
                    <div className="bg-[var(--card-surface)] rounded-xl p-4 space-y-3">
                        <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
                            Earnings
                        </h3>
                        <div className="flex justify-between text-sm">
                            <span className="text-[var(--foreground)]">Base / Hourly Pay</span>
                            <span className="font-semibold text-[var(--foreground)]">
                                {formatCurrency(payslip.grossPay)}
                            </span>
                        </div>
                    </div>

                    {/* Deductions */}
                    {payslip.deductions.length > 0 && (
                        <div className="bg-[var(--card-surface)] rounded-xl p-4 space-y-3">
                            <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
                                Deductions
                            </h3>
                            {payslip.deductions.map((d) => (
                                <div key={d.id} className="flex justify-between text-sm">
                                    <span className="text-[var(--foreground)]">{d.name}</span>
                                    <span className="text-red-500 font-medium">
                                        -{formatCurrency(d.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Net Pay */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 flex items-center justify-between">
                        <span className="text-white font-semibold text-sm">Net Pay</span>
                        <span className="text-white font-bold text-xl">
                            {formatCurrency(payslip.netPay)}
                        </span>
                    </div>

                    {/* Issue date */}
                    <div className="flex items-center justify-between text-sm text-[var(--muted)]">
                        <span>Issue Date</span>
                        <span>{new Date(payslip.issueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[var(--border)] flex gap-3 justify-end">
                    <Button variant="ghost" onClick={onClose}>
                        Close
                    </Button>
                    <Button
                        variant="primary"
                        icon={<Download className="w-4 h-4" />}
                        onClick={onDownload}
                    >
                        Download PDF
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── main page ───────────────────────────────────────────────────────────────
export default function MyPayslipsPage() {
    const { user } = useUser();
    const toast = useToast();
    const [payslips, setPayslips] = useState<Payslip[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await apiFetch("/payroll/my-payslips");
                if (res.ok) {
                    const data = await res.json();
                    setPayslips(data.map(mapApiPayslip));
                } else {
                    toast.error("Failed to load payslips");
                }
            } catch {
                toast.error("Connection error — could not load payslips");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // YTD stats
    const currentYear = new Date().getFullYear();
    const ytdPayslips = payslips.filter(
        (p) => new Date(p.payPeriodStart).getFullYear() === currentYear
    );
    const ytdGross = ytdPayslips.reduce((s, p) => s + p.grossPay, 0);
    const ytdNet = ytdPayslips.reduce((s, p) => s + p.netPay, 0);
    const lastPay = payslips[0];

    const handleDownload = (payslip: Payslip) => {
        if (!user) return;
        generatePayslipPDF(payslip, {
            id: user.id,
            name: user.name || "Employee",
            role: (user as any).role || "Staff",
            department: (user as any).department || "SAVAGE LLC",
            avatar: user.avatar || "",
            hoursThisWeek: 0,
            salary: payslip.grossPay,
            performance: 0,
            email: user.email,
            status: "active",
        });
        toast.success("PDF download started");
    };

    return (
        <div className="min-h-screen bg-[var(--background)]">
            <Header
                title="My Payslips"
                subtitle="Your complete payroll history from SAVAGE LLC"
            />

            <main className="ml-64 pt-28 px-8 pb-10">
                {loading ? (
                    <div className="flex items-center justify-center py-32">
                        <LoadingSpinner />
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto space-y-8">
                        {/* Stats strip */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard
                                icon={<FileText className="w-5 h-5" />}
                                label="Total Payslips"
                                value={payslips.length}
                                accent="bg-blue-500"
                            />
                            <StatCard
                                icon={<TrendingUp className="w-5 h-5" />}
                                label="YTD Gross"
                                value={formatCurrency(ytdGross)}
                                accent="bg-emerald-500"
                            />
                            <StatCard
                                icon={<DollarSign className="w-5 h-5" />}
                                label="YTD Net"
                                value={formatCurrency(ytdNet)}
                                accent="bg-violet-500"
                            />
                            <StatCard
                                icon={<Calendar className="w-5 h-5" />}
                                label="Last Pay Date"
                                value={
                                    lastPay
                                        ? new Date(lastPay.issueDate).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                        })
                                        : "—"
                                }
                                accent="bg-amber-500"
                            />
                        </div>

                        {/* Payslip list */}
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                                Payslip History
                            </h2>

                            {payslips.length === 0 ? (
                                <EmptyState
                                    icon={FileText}
                                    title="No payslips yet"
                                    description="Your payslips will appear here once they are generated by the Operations team."
                                />
                            ) : (
                                <div className="space-y-3">
                                    {payslips.map((ps) => (
                                        <Card key={ps.id} padding="md">
                                            <div className="flex items-center gap-4">
                                                {/* Icon */}
                                                <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                                    <FileText className="w-5 h-5 text-blue-500" />
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <StatusIcon status={ps.status} />
                                                        <span className="font-semibold text-[var(--foreground)] text-sm truncate">
                                                            {formatPayPeriod(ps.payPeriodStart, ps.payPeriodEnd)}
                                                        </span>
                                                        <span
                                                            className={`hidden sm:inline px-2 py-0.5 text-xs font-medium rounded-full capitalize ${getStatusColor(ps.status)}`}
                                                        >
                                                            {ps.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-[var(--muted)]">
                                                        Issued:{" "}
                                                        {new Date(ps.issueDate).toLocaleDateString("en-US", {
                                                            year: "numeric",
                                                            month: "long",
                                                            day: "numeric",
                                                        })}
                                                    </p>
                                                </div>

                                                {/* Pay amounts */}
                                                <div className="text-right hidden sm:block">
                                                    <p className="font-bold text-[var(--foreground)]">
                                                        {formatCurrency(ps.netPay)}
                                                    </p>
                                                    <p className="text-xs text-[var(--muted)]">
                                                        Gross: {formatCurrency(ps.grossPay)}
                                                    </p>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button
                                                        onClick={() => setSelectedPayslip(ps)}
                                                        className="p-2 rounded-lg hover:bg-[var(--card-surface)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                                                        title="View details"
                                                        aria-label="View payslip details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownload(ps)}
                                                        className="p-2 rounded-lg hover:bg-[var(--card-surface)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                                                        title="Download PDF"
                                                        aria-label="Download payslip PDF"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Detail modal */}
            {selectedPayslip && (
                <PayslipModal
                    payslip={selectedPayslip}
                    onClose={() => setSelectedPayslip(null)}
                    onDownload={() => {
                        handleDownload(selectedPayslip);
                        setSelectedPayslip(null);
                    }}
                />
            )}
        </div>
    );
}
