"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Users, Crown, ToggleLeft, ToggleRight, RefreshCw, ChevronDown, ChevronUp, Building2, Zap, AlertCircle } from "lucide-react";
import {
  fetchClientOrganizations,
  fetchClientServiceTiers,
  updateClientOrganizationServiceTier,
  type ClientOrganization,
  type ClientServiceTier,
} from "@/lib/client-portal";

// Feature flags that can be manually enabled/disabled per account
const ACCOUNT_FEATURES = [
  { key: "payroll",        label: "Payroll Module",     desc: "Access payroll dashboard & payslips" },
  { key: "whiteboard",     label: "Whiteboard",         desc: "Collaborative whiteboard tool" },
  { key: "file_directory", label: "File Directory",     desc: "Shared file storage & directory" },
  { key: "daily_logs",     label: "Daily Logs",         desc: "Employee daily log submissions" },
  { key: "task_tracking",  label: "Task Tracking",      desc: "Project & task management board" },
  { key: "discord",        label: "Discord Integration",desc: "Discord workspace sync" },
  { key: "client_portal",  label: "Client Portal",      desc: "Client-facing portal access" },
  { key: "advanced_reports",label: "Advanced Reports",  desc: "Analytics & reporting tools" },
];

function loadFeatureFlags(orgId: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(`acct_flags_${orgId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveFeatureFlags(orgId: string, flags: Record<string, boolean>) {
  localStorage.setItem(`acct_flags_${orgId}`, JSON.stringify(flags));
}

function TierBadge({ tier }: { tier?: ClientServiceTier | null }) {
  if (!tier) return (
    <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--border)] text-[var(--muted)]">
      No Tier
    </span>
  );
  const rank = tier.priorityRank ?? 0;
  const color = rank >= 50 ? "text-amber-400 bg-amber-500/10" :
                rank >= 40 ? "text-purple-400 bg-purple-500/10" :
                rank >= 30 ? "text-blue-400 bg-blue-500/10" :
                rank >= 20 ? "text-emerald-400 bg-emerald-500/10" :
                             "text-[var(--muted)] bg-[var(--border)]";
  return (
    <span className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded ${color}`}>
      {tier.name.split(" ").slice(0, 2).join(" ")}
    </span>
  );
}

interface AccountRowProps {
  org: ClientOrganization;
  tiers: ClientServiceTier[];
  onLog: (msg: string) => void;
}

function AccountRow({ org, tiers, onLog }: AccountRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [selectedTierId, setSelectedTierId] = useState<string>(org.tierId ?? "");
  const [saving, setSaving] = useState(false);
  const [tierSaved, setTierSaved] = useState(false);

  useEffect(() => {
    setFlags(loadFeatureFlags(org.id));
  }, [org.id]);

  const toggleFeature = (key: string) => {
    const next = { ...flags, [key]: !flags[key] };
    setFlags(next);
    saveFeatureFlags(org.id, next);
    onLog(`[${org.name}] Feature "${key}" ${next[key] ? "ENABLED" : "DISABLED"}`);
  };

  const handleTierChange = async (tierId: string) => {
    setSelectedTierId(tierId);
    setSaving(true);
    try {
      await updateClientOrganizationServiceTier(org.id, tierId || null);
      const tier = tiers.find(t => t.id === tierId);
      onLog(`[${org.name}] Tier updated → ${tier?.name ?? "None"}`);
      setTierSaved(true);
      setTimeout(() => setTierSaved(false), 2000);
    } catch {
      onLog(`[${org.name}] ERROR: Failed to update tier`);
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = Object.values(flags).filter(Boolean).length;

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden transition-all hover:border-[var(--accent)]/40">
      {/* Row Header */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer bg-[var(--card-bg)] hover:bg-[var(--background)] transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <Building2 className="h-4 w-4 text-[var(--accent)] shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold truncate">{org.name}</span>
            <TierBadge tier={org.tier} />
            <span className={`text-[9px] uppercase font-mono px-1 py-0.5 rounded ${
              org.status === "active" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-400"
            }`}>{org.status}</span>
          </div>
          <div className="text-[10px] text-[var(--muted)] mt-0.5">
            {enabledCount} feature{enabledCount !== 1 ? "s" : ""} manually enabled
            {org.counts?.memberships ? ` · ${org.counts.memberships} member${org.counts.memberships !== 1 ? "s" : ""}` : ""}
          </div>
        </div>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-[var(--muted)] shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-[var(--muted)] shrink-0" />}
      </div>

      {/* Expanded Panel */}
      {expanded && (
        <div className="border-t border-[var(--border)] bg-[var(--background)] p-4 space-y-4">
          {/* Tier Selector */}
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[var(--muted)] mb-2 flex items-center gap-1">
              <Crown className="h-3 w-3" /> Subscription Tier
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedTierId}
                onChange={e => handleTierChange(e.target.value)}
                disabled={saving}
                className="flex-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-md p-2 text-xs focus:ring-2 focus:ring-[var(--accent)] focus:outline-none text-[var(--foreground)] disabled:opacity-60"
              >
                <option value="">— No Tier —</option>
                {tiers.map(t => (
                  <option key={t.id} value={t.id}>{t.name} {t.monthlyPrice ? `($${t.monthlyPrice.toLocaleString()}/mo)` : ""}</option>
                ))}
              </select>
              {saving && <RefreshCw className="h-4 w-4 text-[var(--accent)] animate-spin shrink-0" />}
              {tierSaved && <span className="text-[10px] text-emerald-500 shrink-0">Saved ✓</span>}
            </div>
          </div>

          {/* Feature Flags */}
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[var(--muted)] mb-2 flex items-center gap-1">
              <Zap className="h-3 w-3" /> Manual Feature Overrides
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ACCOUNT_FEATURES.map(feat => {
                const enabled = !!flags[feat.key];
                return (
                  <div
                    key={feat.key}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] hover:border-[var(--accent)]/40 transition-colors cursor-pointer"
                    onClick={() => toggleFeature(feat.key)}
                  >
                    <div className="min-w-0 mr-2">
                      <span className="text-[11px] font-semibold block">{feat.label}</span>
                      <span className="text-[9px] text-[var(--muted)] leading-tight block">{feat.desc}</span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); toggleFeature(feat.key); }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none ${
                        enabled ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5 ${
                        enabled ? "translate-x-4" : "translate-x-0.5"
                      }`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface AccountControlPanelProps {
  onLog: (type: "info" | "warn" | "error", module: string, message: string) => void;
}

export default function AccountControlPanel({ onLog }: AccountControlPanelProps) {
  const [orgs, setOrgs] = useState<ClientOrganization[]>([]);
  const [tiers, setTiers] = useState<ClientServiceTier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterTierId, setFilterTierId] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orgsData, tiersData] = await Promise.all([
        fetchClientOrganizations(),
        fetchClientServiceTiers(),
      ]);
      setOrgs(orgsData);
      setTiers(tiersData);
      onLog("info", "account.control", `Loaded ${orgsData.length} accounts, ${tiersData.length} tiers`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError("Failed to load accounts — " + msg);
      onLog("error", "account.control", "Failed to fetch client organizations or tiers: " + msg);
    } finally {
      setLoading(false);
    }
  }, [onLog]);

  useEffect(() => { load(); }, [load]);

  const filtered = orgs.filter(o => {
    const matchesTier = filterTierId === "all" || o.tierId === filterTierId || (!o.tierId && filterTierId === "none");
    const matchesSearch = !search || o.name.toLowerCase().includes(search.toLowerCase()) || o.slug.toLowerCase().includes(search.toLowerCase());
    return matchesTier && matchesSearch;
  });

  // Group by tier for stat display
  const byTier = tiers.map(t => ({ tier: t, count: orgs.filter(o => o.tierId === t.id).length }));
  const untiered = orgs.filter(o => !o.tierId).length;

  return (
    <div className="space-y-4">
      {/* Tier Summary Stats */}
      <div className="flex flex-wrap gap-2">
        {byTier.filter(bt => bt.count > 0).map(bt => (
          <div key={bt.tier.id} className="px-3 py-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] text-[10px]">
            <span className="text-[var(--muted)]">{bt.tier.name.split(" ").slice(0, 3).join(" ")}</span>
            <span className="ml-2 font-bold text-[var(--foreground)]">{bt.count}</span>
          </div>
        ))}
        {untiered > 0 && (
          <div className="px-3 py-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] text-[10px]">
            <span className="text-[var(--muted)]">Unassigned</span>
            <span className="ml-2 font-bold text-amber-400">{untiered}</span>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          placeholder="Search accounts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-md p-2 text-xs focus:ring-2 focus:ring-[var(--accent)] focus:outline-none text-[var(--foreground)]"
        />
        <select
          value={filterTierId}
          onChange={e => setFilterTierId(e.target.value)}
          className="bg-[var(--background)] border border-[var(--border)] rounded-md p-2 text-xs focus:ring-2 focus:ring-[var(--accent)] focus:outline-none text-[var(--foreground)]"
        >
          <option value="all">All Tiers</option>
          <option value="none">No Tier</option>
          {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-[var(--card-bg)] border border-[var(--border)] text-xs hover:border-[var(--accent)] transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[var(--accent)]" : "text-[var(--muted)]"}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !orgs.length && (
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-14 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] animate-pulse" />
          ))}
        </div>
      )}

      {/* Account list */}
      {!loading && !error && filtered.length === 0 && (
        <div className="py-10 text-center border border-dashed border-[var(--border)] rounded-lg">
          <Users className="h-8 w-8 text-[var(--muted)] mx-auto mb-2 opacity-30" />
          <p className="text-xs text-[var(--muted)]">No accounts found.</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(org => (
          <AccountRow
            key={org.id}
            org={org}
            tiers={tiers}
            onLog={msg => onLog("info", "account.control", msg)}
          />
        ))}
      </div>

      {filtered.length > 0 && (
        <p className="text-[10px] text-[var(--muted)] text-right">
          Showing {filtered.length} of {orgs.length} accounts
        </p>
      )}
    </div>
  );
}
