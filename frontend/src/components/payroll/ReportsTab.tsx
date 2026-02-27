/**
 * Reports Tab - Payroll statistics and analytics
 */

import React, { useState, useEffect } from "react";
import { BarChart3, Download, TrendingUp, TrendingDown, PhilippinePeso, Users, FileText } from "lucide-react";
import Button from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { apiFetch } from "@/lib/api";
import StatCard from "./StatCard";
import LoadingSpinner from "@/components/LoadingSpinner";

interface ReportStat {
  periodId: string;
  label: string;
  gross: number;
  net: number;
  deductions: number;
  count: number;
  breakdown?: {
    tax: number;
    benefits: number;
  };
}

export default function ReportsTab() {
  const toast = useToast();
  const [stats, setStats] = useState<ReportStat[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <LoadingSpinner message="Loading reports..." />;

  if (stats.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 mx-auto text-[var(--muted)] mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Reports Yet</h3>
        <p className="text-[var(--muted)] mb-4">
          Generate payslips to see payroll analytics and summaries.
        </p>
      </div>
    );
  }

  const latest = stats[0];

  return (
    <div className="p-6 pt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<PhilippinePeso className="w-5 h-5" />}
          label="Total Gross"
          value={`₱${latest.gross.toLocaleString()}`}
          bgColor="bg-blue-500"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Net Income"
          value={`₱${latest.net.toLocaleString()}`}
          bgColor="bg-emerald-500"
        />
        <StatCard
          icon={<TrendingDown className="w-5 h-5" />}
          label="Total Deductions"
          value={`₱${latest.deductions.toLocaleString()}`}
          bgColor="bg-red-500"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Payslips Generated"
          value={latest.count}
          bgColor="bg-purple-500"
        />
      </div>

      {/* Main Report Table */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="font-semibold text-[var(--foreground)]">Recent Payroll Periods</h3>
          <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />}>
            Export CSV
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[var(--card-surface)] text-[var(--muted)] border-b border-[var(--border)]">
              <tr>
                <th className="px-6 py-3 font-medium">Period</th>
                <th className="px-6 py-3 font-medium">Gross Total</th>
                <th className="px-6 py-3 font-medium">Deducts Total</th>
                <th className="px-6 py-3 font-medium">Net Total</th>
                <th className="px-6 py-3 font-medium">Count</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {stats.map((row) => (
                <tr key={row.periodId} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium text-[var(--foreground)]">{row.label}</td>
                  <td className="px-6 py-4 text-[var(--foreground)]">₱{row.gross.toLocaleString()}</td>
                  <td className="px-6 py-4 text-red-500">-₱{row.deductions.toLocaleString()}</td>
                  <td className="px-6 py-4 text-emerald-500 font-semibold">₱{row.net.toLocaleString()}</td>
                  <td className="px-6 py-4 text-[var(--muted)]">{row.count} slips</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-blue-500 hover:text-blue-600 font-medium">View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analytics Placeholder */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" />
            Net Income Trends
          </h4>
          <div className="h-48 flex items-end justify-between gap-2 px-2">
            {stats.slice().reverse().map((row, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div
                  className="w-full bg-blue-500/20 group-hover:bg-blue-500/40 transition-all rounded-t-sm relative"
                  style={{ height: `${(row.net / latest.net) * 100}%`, minHeight: '4px' }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                    ₱{row.net.toLocaleString()}
                  </div>
                </div>
                <span className="text-[10px] text-[var(--muted)] rotate-45 origin-left truncate max-w-[60px]">
                  {row.label.split('-')[0].trim()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            Deductibles Breakdown
          </h4>
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--muted)]">Tax Withholding</span>
              <span className="font-medium">
                ₱{(latest.breakdown?.tax || 0).toLocaleString()} ({(latest.deductions > 0 ? ((latest.breakdown?.tax || 0) / latest.deductions) * 100 : 0).toFixed(1)}%)
              </span>
            </div>
            <div className="w-full h-2 bg-[var(--card-surface)] rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all duration-1000"
                style={{ width: `${latest.deductions > 0 ? ((latest.breakdown?.tax || 0) / latest.deductions) * 100 : 0}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--muted)]">Benefits & Other</span>
              <span className="font-medium">
                ₱{(latest.breakdown?.benefits || 0).toLocaleString()} ({(latest.deductions > 0 ? ((latest.breakdown?.benefits || 0) / latest.deductions) * 100 : 0).toFixed(1)}%)
              </span>
            </div>
            <div className="w-full h-2 bg-[var(--card-surface)] rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-400 transition-all duration-1000"
                style={{ width: `${latest.deductions > 0 ? ((latest.breakdown?.benefits || 0) / latest.deductions) * 100 : 0}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-[var(--muted)] pt-4 italic">
              * Percentages relative to total deductibles in latest period ({latest.label}).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
