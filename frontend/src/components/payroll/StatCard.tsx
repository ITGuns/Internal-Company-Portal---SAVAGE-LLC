/**
 * Reusable stat card component for displaying metrics
 */

import React from "react";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  bgColor: string;
}

export default function StatCard({ icon, label, value, bgColor }: StatCardProps) {
  return (
    <div className="p-4 rounded border bg-white/5 border-[var(--border)] flex items-center gap-3">
      <div
        className={`w-10 h-10 flex items-center justify-center rounded-full text-white ${bgColor}`}
      >
        {icon}
      </div>
      <div>
        <div className="text-xs text-[var(--muted)]">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
    </div>
  );
}
