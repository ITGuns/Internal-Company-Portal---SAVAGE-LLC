/**
 * Reports Tab - Payroll analytics with sub-tab navigation
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  Download,
  TrendingUp,
  TrendingDown,
  PhilippinePeso,
  Users,
  FileText,
  Clock,
  PieChart,
  Layers,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Search,
  CheckCircle2,
  AlertCircle,
  FileClock,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { apiFetch } from "@/lib/api";
import StatCard from "./StatCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { Payslip } from "@/lib/payroll-calendar/types";
import { generatePayslipPDF } from "@/lib/payroll-calendar/payslip-utils";

// ── Types ────────────────────────────────────────────────

interface ReportStat {
  periodId: string;
  label: string;
  gross: number;
  net: number;
  deductions: number;
  count: number;
  breakdown?: { tax: number; benefits: number };
}

type SubTab = "summary" | "detailed" | "my-reports";

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "detailed", label: "Detailed" },
  { id: "my-reports", label: "Payslip Archive" },
];

// ── Mini helpers ─────────────────────────────────────────

function BarChartPlaceholder({
  stats,
  valueKey,
  color,
}: {
  stats: ReportStat[];
  valueKey: "gross" | "net" | "deductions" | "count";
  color: string;
}) {
  const max = Math.max(...stats.map((s) => s[valueKey] as number), 1);
  return (
    <div className="flex items-end justify-between gap-1.5 h-36 px-1">
      {stats
        .slice()
        .reverse()
        .map((row, i) => {
          const pct = ((row[valueKey] as number) / max) * 100;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1 group relative"
            >
              <div
                className="w-full rounded-t transition-all duration-700 group-hover:opacity-80"
                style={{
                  height: `${Math.max(pct, 4)}%`,
                  background: color,
                  minHeight: 4,
                }}
              />
              <span className="text-[9px] text-[var(--muted)] truncate max-w-full text-center">
                {row.label.split(" ")[0]}
              </span>
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--foreground)] text-[var(--background)] text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                {valueKey === "count"
                  ? `${row[valueKey]} slips`
                  : `PHP ${(row[valueKey] as number).toLocaleString()}`}
              </div>
            </div>
          );
        })}
    </div>
  );
}

function DonutChart({
  segments,
}: {
  segments: { value: number; color: string; label: string }[];
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let cum = -90;
  const r = 36;
  const cx = 50;
  const cy = 50;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const arcs = segments.map((seg) => {
    const angle = (seg.value / total) * 360;
    const start = cum;
    cum += angle;
    const x1 = cx + r * Math.cos(toRad(start));
    const y1 = cy + r * Math.sin(toRad(start));
    const x2 = cx + r * Math.cos(toRad(cum));
    const y2 = cy + r * Math.sin(toRad(cum));
    const large = angle > 180 ? 1 : 0;
    return {
      ...seg,
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`,
    };
  });

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="w-24 h-24 flex-shrink-0">
        {arcs.map((arc, i) => (
          <path key={i} d={arc.d} fill={arc.color} opacity={0.85} />
        ))}
        <circle cx={cx} cy={cy} r={22} fill="var(--card-bg)" />
      </svg>
      <div className="flex flex-col gap-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: seg.color }}
            />
            <span className="text-[var(--muted)]">{seg.label}</span>
            <span className="ml-auto font-semibold text-[var(--foreground)] pl-4">
              {total > 0 ? ((seg.value / total) * 100).toFixed(1) : "0"}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NoDataPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-[var(--muted)]">
      <BarChart3 className="w-16 h-16 opacity-30" />
      <p className="text-sm font-medium">Nothing to see here yet</p>
      <p className="text-xs opacity-70 text-center max-w-xs">{label}</p>
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ReactNode; cls: string }> = {
    paid: { icon: <CheckCircle2 className="w-3 h-3" />, cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    issued: { icon: <FileClock className="w-3 h-3" />, cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    draft: { icon: <AlertCircle className="w-3 h-3" />, cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
    void: { icon: <AlertCircle className="w-3 h-3" />, cls: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
  };
  const { icon, cls } = map[status] ?? map.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${cls}`}>
      {icon}
      {status}
    </span>
  );
}

// ── Payslip Archive tab ───────────────────────────────────

function PayslipArchive() {
  const toast = useToast();
  const [allPayslips, setAllPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const res = await apiFetch("/payroll/payslips/all");
        if (res.ok) {
          const data = await res.json();
          setAllPayslips(data);
        }
      } catch (err) {
        console.error(err);
        toast.error("Could not load payslip archive");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    return allPayslips.filter((p) => {
      const matchSearch =
        !search.trim() ||
        p.employeeName?.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        filterStatus === "all" || p.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [allPayslips, search, filterStatus]);

  const handleDownload = (payslip: Payslip) => {
    generatePayslipPDF(payslip, {
      id: payslip.employeeId,
      name: payslip.employeeName ?? "Employee",
      role: "",
      department: "",
      avatar: "",
      hoursThisWeek: 0,
      salary: payslip.grossPay,
      performance: 0,
      status: "active",
    });
    toast.success(`Downloading payslip for ${payslip.employeeName}`);
  };

  if (loading) return <LoadingSpinner message="Loading payslip archive..." />;

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Search by name or payslip ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
          />
        </div>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
        >
          <option value="all">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="issued">Issued</option>
          <option value="draft">Draft</option>
          <option value="void">Void</option>
        </select>

        <span className="text-xs text-[var(--muted)] ml-auto">
          {filtered.length} payslip{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-[var(--muted)]">
          <FileClock className="w-14 h-14 opacity-25" />
          <p className="text-sm font-medium">No payslips found</p>
          <p className="text-xs opacity-60 text-center max-w-xs">
            {allPayslips.length === 0
              ? "Payslips will appear here once they are generated from the Payslips Management tab."
              : "Try adjusting your search or status filter."}
          </p>
        </div>
      ) : (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--card-surface)] text-[var(--muted)] border-b border-[var(--border)]">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold">Employee</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold">Period</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold">Gross Pay</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold">Net Pay</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold">Issue Date</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-[var(--card-surface)] transition-colors group"
                  >
                    {/* Employee */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {(p.employeeName ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-[var(--foreground)] text-sm">
                            {p.employeeName ?? "Unknown"}
                          </div>
                          <div className="text-[10px] text-[var(--muted)]">
                            ID: {String(p.employeeId)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Period */}
                    <td className="px-5 py-3.5 text-[var(--foreground)]">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Calendar className="w-3 h-3 text-[var(--muted)]" />
                        {p.payPeriodStart
                          ? new Date(p.payPeriodStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                          : "—"}
                        {" "}&ndash;{" "}
                        {p.payPeriodEnd
                          ? new Date(p.payPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : "—"}
                      </div>
                    </td>

                    {/* Gross */}
                    <td className="px-5 py-3.5 text-right font-medium text-[var(--foreground)]">
                      PHP {(p.grossPay ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>

                    {/* Net */}
                    <td className="px-5 py-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      PHP {(p.netPay ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <StatusBadge status={p.status} />
                    </td>

                    {/* Issue Date */}
                    <td className="px-5 py-3.5 text-xs text-[var(--muted)]">
                      {p.issueDate
                        ? new Date(p.issueDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                        : "—"}
                    </td>

                    {/* Download */}
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDownload(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all border border-[var(--accent)]/20"
                      >
                        <Download className="w-3 h-3" />
                        Download PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────

export default function ReportsTab() {
  const toast = useToast();
  const [stats, setStats] = useState<ReportStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SubTab>("summary");

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/payroll/reports");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch reports", err);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && activeTab !== "my-reports")
    return <LoadingSpinner message="Loading reports..." />;

  const latest = stats[0] ?? null;

  const deductionSegments = latest
    ? [
      { value: latest.breakdown?.tax ?? 0, color: "#ef4444", label: "Tax Withholding" },
      { value: latest.breakdown?.benefits ?? 0, color: "#f97316", label: "Benefits & Other" },
      {
        value: Math.max(latest.net - (latest.breakdown?.tax ?? 0) - (latest.breakdown?.benefits ?? 0), 0),
        color: "#10b981",
        label: "Net Take-home",
      },
    ]
    : [];

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* ── Sub-tab navigation bar ── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border)] bg-[var(--card-bg)] flex-shrink-0 gap-4">
        {/* Period navigator (left) */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button className="p-1.5 rounded-lg hover:bg-[var(--card-surface)] transition-colors text-[var(--muted)]">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[var(--card-surface)] transition-colors text-sm font-medium text-[var(--foreground)]">
            <Calendar className="w-3.5 h-3.5 text-[var(--muted)]" />
            This week
          </button>
          <button className="p-1.5 rounded-lg hover:bg-[var(--card-surface)] transition-colors text-[var(--muted)]">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-tabs (center) */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {SUB_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${activeTab === tab.id
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-surface)]"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Spacer (right) */}
        <div className="flex-shrink-0 w-24" />
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto chat-scroll p-6 space-y-6">

        {/* SUMMARY */}
        {activeTab === "summary" && (
          <>
            {!latest ? (
              <NoDataPlaceholder label="Generate payslips to see payroll analytics and summaries." />
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard icon={<PhilippinePeso className="w-5 h-5" />} label="Total Gross" value={`PHP ${latest.gross.toLocaleString()}`} bgColor="bg-blue-500" />
                  <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Net Income" value={`PHP ${latest.net.toLocaleString()}`} bgColor="bg-emerald-500" />
                  <StatCard icon={<TrendingDown className="w-5 h-5" />} label="Total Deductions" value={`PHP ${latest.deductions.toLocaleString()}`} bgColor="bg-red-500" />
                  <StatCard icon={<Users className="w-5 h-5" />} label="Payslips Generated" value={latest.count} bgColor="bg-purple-500" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        Net Income Trends
                      </h4>
                      <span className="text-[10px] text-[var(--muted)] flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        Stack by: Period
                      </span>
                    </div>
                    <BarChartPlaceholder stats={stats} valueKey="net" color="linear-gradient(to top, #3b82f6, #60a5fa)" />
                  </div>

                  <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        Deductibles Breakdown
                      </h4>
                      <span className="text-[10px] text-[var(--muted)] flex items-center gap-1">
                        <PieChart className="w-3 h-3" />
                        Slice by: Type
                      </span>
                    </div>
                    <DonutChart segments={deductionSegments} />
                    <div className="mt-4 space-y-2 pt-3 border-t border-[var(--border)]">
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--muted)]">Tax Withholding</span>
                        <span className="font-medium">
                          PHP {(latest.breakdown?.tax ?? 0).toLocaleString()} (
                          {latest.deductions > 0 ? (((latest.breakdown?.tax ?? 0) / latest.deductions) * 100).toFixed(1) : "0"}%)
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--muted)]">Benefits &amp; Other</span>
                        <span className="font-medium">
                          PHP {(latest.breakdown?.benefits ?? 0).toLocaleString()} (
                          {latest.deductions > 0 ? (((latest.breakdown?.benefits ?? 0) / latest.deductions) * 100).toFixed(1) : "0"}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Period and Member Breakdown</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[var(--card-surface)] text-[var(--muted)] border-b border-[var(--border)]">
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-semibold">Period</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold">Gross Total</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold">Deducts Total</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold">Net Total</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold">Count</th>
                          <th className="px-5 py-3 text-right text-xs font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {stats.map((row) => (
                          <tr key={row.periodId} className="hover:bg-[var(--card-surface)] transition-colors">
                            <td className="px-5 py-3.5 font-medium text-[var(--foreground)]">{row.label}</td>
                            <td className="px-5 py-3.5">PHP {row.gross.toLocaleString()}</td>
                            <td className="px-5 py-3.5 text-red-500 font-medium">-PHP {row.deductions.toLocaleString()}</td>
                            <td className="px-5 py-3.5 text-emerald-500 font-semibold">PHP {row.net.toLocaleString()}</td>
                            <td className="px-5 py-3.5 text-[var(--muted)]">{row.count} slips</td>
                            <td className="px-5 py-3.5 text-right">
                              <button className="text-[var(--accent)] text-xs font-semibold hover:opacity-75 transition-opacity">
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* DETAILED */}
        {activeTab === "detailed" && (
          <>
            {!latest ? (
              <NoDataPlaceholder label="No detailed data yet. Generate payslips to see per-period breakdowns." />
            ) : (
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[var(--border)]">
                  <h4 className="font-semibold text-sm">Detailed Period Breakdown</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--card-surface)] text-[var(--muted)] border-b border-[var(--border)]">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold">Period</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold">Gross</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold">Tax</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold">Benefits</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold">Net</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold">Slips</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {stats.map((row) => (
                        <tr key={row.periodId} className="hover:bg-[var(--card-surface)] transition-colors">
                          <td className="px-5 py-3.5 font-medium text-[var(--foreground)]">{row.label}</td>
                          <td className="px-5 py-3.5 text-right">PHP {row.gross.toLocaleString()}</td>
                          <td className="px-5 py-3.5 text-right text-red-400">PHP {(row.breakdown?.tax ?? 0).toLocaleString()}</td>
                          <td className="px-5 py-3.5 text-right text-orange-400">PHP {(row.breakdown?.benefits ?? 0).toLocaleString()}</td>
                          <td className="px-5 py-3.5 text-right text-emerald-500 font-semibold">PHP {row.net.toLocaleString()}</td>
                          <td className="px-5 py-3.5 text-right text-[var(--muted)]">{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* PAYSLIP ARCHIVE */}
        {activeTab === "my-reports" && <PayslipArchive />}


      </div>
    </div>
  );
}
