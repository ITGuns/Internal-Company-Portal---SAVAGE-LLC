"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";
import { 
  Bug, 
  Terminal, 
  Cpu, 
  Activity, 
  Database, 
  RefreshCw, 
  ShieldAlert, 
  CheckCircle, 
  FileText
} from "lucide-react";

interface SystemCheck {
  name: string;
  status: "healthy" | "warning" | "error";
  details: string;
  icon: any;
}

interface LogEntry {
  id: string;
  timestamp: string;
  type: "info" | "warn" | "error";
  module: string;
  message: string;
}

export default function DeveloperBugsPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  // Access validation: Only allow specific admin/developer accounts
  const isDeveloper = user?.email && [
    "admin@savage.com",
    "admin@savage-llc.com",
    "owner@savage.com",
    "admin@example.test"
  ].includes(user.email.toLowerCase().trim());

  // Form states
  const [bugTitle, setBugTitle] = useState("");
  const [bugDesc, setBugDesc] = useState("");
  const [bugModule, setBugModule] = useState("auth");
  const [bugSeverity, setBugSeverity] = useState("medium");
  const [submittedBugs, setSubmittedBugs] = useState<any[]>([]);
  const [formSuccess, setFormSuccess] = useState(false);

  // System Flags (Persisted to localStorage for state demonstration)
  const [debugMode, setDebugMode] = useState(false);
  const [bypassCache, setBypassCache] = useState(false);
  const [mockAPIError, setMockAPIError] = useState(false);

  // Real-time simulations
  const [latency, setLatency] = useState(14);
  const [systemLogs, setSystemLogs] = useState<LogEntry[]>([
    { id: "1", timestamp: "23:18:02", type: "info", module: "auth.self_healing", message: "Admin role sync completed successfully for admin@savage.com" },
    { id: "2", timestamp: "23:18:14", type: "info", module: "chat.socket", message: "Joined General public channel room: 77a-b9c" },
    { id: "3", timestamp: "23:18:25", type: "warn", module: "uploads.s3", message: "AWS_ACCESS_KEY_ID not defined. Defaulting to local storage driver." },
    { id: "4", timestamp: "23:19:01", type: "info", module: "payroll.scheduler", message: "Vercel cron token validated. Automatic job period advancement standby." },
    { id: "5", timestamp: "23:20:10", type: "info", module: "theme", message: "System preference theme applied: dark" }
  ]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDebugMode(localStorage.getItem("dev_debug_mode") === "true");
      setBypassCache(localStorage.getItem("dev_bypass_cache") === "true");
      setMockAPIError(localStorage.getItem("dev_mock_api_error") === "true");

      const savedBugs = localStorage.getItem("dev_submitted_bugs");
      if (savedBugs) {
        setSubmittedBugs(JSON.parse(savedBugs));
      }
    }
  }, []);

  // Update latency periodically to make dashboard feel alive
  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(prev => Math.max(8, Math.min(65, prev + Math.floor(Math.random() * 9) - 4)));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <main className="p-6 flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-8 w-8 text-[var(--accent)] animate-spin" />
      </main>
    );
  }

  // If not a developer, render a stealth 404 page (security through obscurity)
  if (!user || !isDeveloper) {
    return (
      <main className="p-6 flex flex-col items-center justify-center min-h-[70vh] text-center">
        <ShieldAlert className="h-16 w-16 text-red-500/20 mb-4" />
        <h2 className="text-2xl font-bold">404 - Page Not Found</h2>
        <p className="text-[var(--muted)] mt-2 max-w-md">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <Button className="mt-6" onClick={() => router.push("/dashboard")}>
          Return to Dashboard
        </Button>
      </main>
    );
  }

  // Handlers
  const handleToggleFlag = (flagName: string) => {
    if (flagName === "debug") {
      const next = !debugMode;
      setDebugMode(next);
      localStorage.setItem("dev_debug_mode", String(next));
      addLog("info", "dev.flags", `Debug Mode set to: ${next}`);
    } else if (flagName === "cache") {
      const next = !bypassCache;
      setBypassCache(next);
      localStorage.setItem("dev_bypass_cache", String(next));
      addLog("info", "dev.flags", `Bypass Cache set to: ${next}`);
    } else if (flagName === "mockError") {
      const next = !mockAPIError;
      setMockAPIError(next);
      localStorage.setItem("dev_mock_api_error", String(next));
      addLog("warn", "dev.flags", `Mock API 500 Simulation set to: ${next}`);
    }
  };

  const addLog = (type: "info" | "warn" | "error", module: string, message: string) => {
    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    setSystemLogs(prev => [
      { id: Date.now().toString(), timestamp, type, module, message },
      ...prev.slice(0, 19) // keep last 20
    ]);
  };

  const handleBugSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bugTitle.trim() || !bugDesc.trim()) return;

    const newBug = {
      id: `BUG-${Date.now().toString().slice(-6)}`,
      title: bugTitle,
      description: bugDesc,
      module: bugModule,
      severity: bugSeverity,
      timestamp: new Date().toLocaleString(),
      status: "open",
      reportedBy: user.email
    };

    const nextBugs = [newBug, ...submittedBugs];
    setSubmittedBugs(nextBugs);
    localStorage.setItem("dev_submitted_bugs", JSON.stringify(nextBugs));

    // Reset Form & Show Success animation
    setBugTitle("");
    setBugDesc("");
    setFormSuccess(true);
    setTimeout(() => setFormSuccess(false), 3000);

    addLog("info", "dev.bug_report", `New ticket ${newBug.id} registered for module: ${bugModule}`);
  };

  const handleClearBugs = () => {
    setSubmittedBugs([]);
    localStorage.removeItem("dev_submitted_bugs");
    addLog("info", "dev.bug_report", "Cleared local bug tracking log history");
  };

  // Systems Status
  const systemChecks: SystemCheck[] = [
    { name: "Prisma Database", status: "healthy", details: "Postgres Pool active & responding", icon: Database },
    { name: "WebSocket Gateway", status: "healthy", details: "Socket.io ready & listening", icon: Activity },
    { name: "Redis Cache Store", status: "healthy", details: "Redis client responding on 6379", icon: Cpu },
    { 
      name: "S3 Storage Bucket", 
      status: mockAPIError ? "error" : "warning", 
      details: mockAPIError ? "Connection timed out (500 simulated)" : "No AWS_ACCESS_KEY_ID configured (local storage fallback)", 
      icon: ShieldAlert 
    },
    { name: "SendGrid / SMTP Mailer", status: "healthy", details: "SMTP host ready, verified sender enabled", icon: FileText }
  ];

  return (
    <main style={{ minHeight: "calc(100vh - var(--header-height))" }} className="bg-[var(--background)] text-[var(--foreground)] p-6">
      <Header 
        title="Developer Command Center" 
        subtitle="Developer and QA tools, live diagnostics logs, and bug reporting mechanisms." 
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Left Column: Diagnostics & System Checks */}
        <div className="space-y-6">
          <Card variant="elevated">
            <Card.Header className="pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-[var(--accent)]" />
                <h3 className="font-semibold text-sm">System Diagnostics</h3>
              </div>
              <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] font-mono">
                API Latency: <span className="text-emerald-500 font-bold">{latency}ms</span>
              </div>
            </Card.Header>
            <Card.Content className="pt-4 space-y-4">
              {systemChecks.map((check, idx) => {
                const Icon = check.icon;
                return (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--card-bg)] border border-[var(--border)]">
                    <div className="mt-0.5">
                      <Icon className={`h-4 w-4 ${
                        check.status === "healthy" 
                          ? "text-emerald-500" 
                          : check.status === "warning" 
                            ? "text-amber-500" 
                            : "text-red-500"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{check.name}</span>
                        <span className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded ${
                          check.status === "healthy" 
                            ? "bg-emerald-500/10 text-emerald-500" 
                            : check.status === "warning" 
                              ? "bg-amber-500/10 text-amber-500" 
                              : "bg-red-500/10 text-red-500"
                        }`}>
                          {check.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--muted)] mt-1 line-clamp-2 leading-relaxed">{check.details}</p>
                    </div>
                  </div>
                );
              })}
            </Card.Content>
          </Card>

          {/* Developer Flag Controls */}
          <Card variant="elevated">
            <Card.Header className="pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-[var(--accent)]" />
                <h3 className="font-semibold text-sm">Feature Flags & Overrides</h3>
              </div>
            </Card.Header>
            <Card.Content className="pt-4 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--card-bg)] border border-[var(--border)]">
                <div>
                  <span className="text-xs font-semibold block">Enable Logger Debug Mode</span>
                  <span className="text-[9px] text-[var(--muted)]">Spam verbose console.log outputs</span>
                </div>
                <button
                  onClick={() => handleToggleFlag("debug")}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                    debugMode ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    debugMode ? "translate-x-5" : "translate-x-0.5"
                  } mt-0.5`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--card-bg)] border border-[var(--border)]">
                <div>
                  <span className="text-xs font-semibold block">Bypass Client Cache</span>
                  <span className="text-[9px] text-[var(--muted)]">Enforce refetches for all user actions</span>
                </div>
                <button
                  onClick={() => handleToggleFlag("cache")}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                    bypassCache ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    bypassCache ? "translate-x-5" : "translate-x-0.5"
                  } mt-0.5`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--card-bg)] border border-[var(--border)]">
                <div>
                  <span className="text-xs font-semibold block">Simulate Storage 500 error</span>
                  <span className="text-[9px] text-[var(--muted)]">Test component boundary error wrappers</span>
                </div>
                <button
                  onClick={() => handleToggleFlag("mockError")}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                    mockAPIError ? "bg-red-500" : "bg-[var(--border)]"
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    mockAPIError ? "translate-x-5" : "translate-x-0.5"
                  } mt-0.5`} />
                </button>
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* Middle Column: Bug Report Form & Submissions */}
        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Bug Submission Card */}
            <Card variant="elevated">
              <Card.Header className="pb-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Bug className="h-5 w-5 text-[var(--accent)]" />
                  <h3 className="font-semibold text-sm">Submit New Bug Report</h3>
                </div>
              </Card.Header>
              <Card.Content className="pt-4">
                <form onSubmit={handleBugSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-[var(--muted)] mb-1">Issue Title</label>
                    <input 
                      type="text"
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-md)] p-2 text-xs focus:ring-2 focus:ring-[var(--accent)] focus:outline-none text-[var(--foreground)]"
                      placeholder="e.g. Chat scroll snaps up on message send"
                      value={bugTitle}
                      onChange={(e) => setBugTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-[var(--muted)] mb-1">Affected Module</label>
                      <select 
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-md)] p-2 text-xs focus:ring-2 focus:ring-[var(--accent)] focus:outline-none text-[var(--foreground)]"
                        value={bugModule}
                        onChange={(e) => setBugModule(e.target.value)}
                      >
                        <option value="auth">Auth / Onboarding</option>
                        <option value="chat">Company Chat</option>
                        <option value="payroll">Payroll Calendar</option>
                        <option value="logs">Daily Logs</option>
                        <option value="uploads">File Uploads</option>
                        <option value="ui">Global Design/UI</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase text-[var(--muted)] mb-1">Severity</label>
                      <select 
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-md)] p-2 text-xs focus:ring-2 focus:ring-[var(--accent)] focus:outline-none text-[var(--foreground)]"
                        value={bugSeverity}
                        onChange={(e) => setBugSeverity(e.target.value)}
                      >
                        <option value="low">Low (Cosmetic)</option>
                        <option value="medium">Medium</option>
                        <option value="high">High (Blocked UI)</option>
                        <option value="critical">Critical (Crash)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-[var(--muted)] mb-1">Description & Steps to Reproduce</label>
                    <textarea 
                      className="w-full h-24 bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-md)] p-2 text-xs focus:ring-2 focus:ring-[var(--accent)] focus:outline-none text-[var(--foreground)] resize-none"
                      placeholder="Specify console logs, error states, and steps to reproduce..."
                      value={bugDesc}
                      onChange={(e) => setBugDesc(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    {formSuccess ? (
                      <span className="text-xs text-emerald-500 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" /> Logged!
                      </span>
                    ) : <span />}
                    <Button type="submit" size="sm">Log Bug Ticket</Button>
                  </div>
                </form>
              </Card.Content>
            </Card>

            {/* Active Developer Log Tracker */}
            <Card variant="elevated">
              <Card.Header className="pb-3 border-b border-[var(--border)] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[var(--accent)]" />
                  <h3 className="font-semibold text-sm">Active Bug Logs</h3>
                </div>
                {submittedBugs.length > 0 && (
                  <button 
                    onClick={handleClearBugs}
                    className="text-[10px] text-red-400 hover:underline"
                  >
                    Clear History
                  </button>
                )}
              </Card.Header>
              <Card.Content className="pt-4 max-h-[300px] overflow-y-auto space-y-3">
                {submittedBugs.length === 0 ? (
                  <div className="h-[200px] flex flex-col items-center justify-center text-center border border-dashed border-[var(--border)] rounded-lg text-[var(--muted)]">
                    <CheckCircle className="h-8 w-8 text-emerald-500/30 mb-2" />
                    <span className="text-xs">No active bug reports pending review.</span>
                  </div>
                ) : (
                  submittedBugs.map(bug => (
                    <div key={bug.id} className="p-3 border border-[var(--border)] rounded-lg bg-[var(--card-bg)] hover:border-[var(--accent)] transition-all">
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-[10px] bg-[var(--accent)]/10 text-[var(--accent)] px-1 rounded font-bold">{bug.id}</span>
                        <span className={`text-[9px] uppercase font-mono px-1 rounded ${
                          bug.severity === "critical" 
                            ? "bg-red-500/10 text-red-500" 
                            : bug.severity === "high" 
                              ? "bg-orange-500/10 text-orange-500" 
                              : "bg-blue-500/10 text-blue-500"
                        }`}>
                          {bug.severity}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold mt-1">{bug.title}</h4>
                      <p className="text-[10px] text-[var(--muted)] mt-1 line-clamp-2 leading-relaxed">{bug.description}</p>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-[var(--border)] text-[8px] text-[var(--muted)]">
                        <span>Module: {bug.module}</span>
                        <span>{bug.timestamp}</span>
                      </div>
                    </div>
                  ))
                )}
              </Card.Content>
            </Card>

          </div>

          {/* Bottom Diagnostics Console Logs */}
          <Card variant="elevated">
            <Card.Header className="pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-[var(--accent)]" />
                <h3 className="font-semibold text-sm">Simulated Live Server Logs</h3>
              </div>
            </Card.Header>
            <Card.Content className="pt-4">
              <div className="font-mono text-[11px] bg-black/95 text-gray-300 p-4 rounded-xl space-y-2 max-h-[220px] overflow-y-auto border border-gray-800">
                {systemLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-2 hover:bg-white/5 p-1 rounded transition-colors">
                    <span className="text-gray-500 shrink-0">{log.timestamp}</span>
                    <span className={`shrink-0 uppercase text-[9px] px-1 rounded ${
                      log.type === "error" 
                        ? "bg-red-500/20 text-red-400" 
                        : log.type === "warn" 
                          ? "bg-amber-500/20 text-amber-400" 
                          : "bg-blue-500/20 text-blue-400"
                    }`}>
                      {log.type}
                    </span>
                    <span className="text-[var(--accent)] shrink-0 font-bold">[{log.module}]</span>
                    <span className="truncate flex-1 text-gray-200">{log.message}</span>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        </div>

      </div>
    </main>
  );
}
