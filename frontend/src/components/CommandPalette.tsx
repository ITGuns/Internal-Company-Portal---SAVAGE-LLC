"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { hasClientOperationsAccess, hasClientPortalAccess, hasFullAccess, hasPayrollManagementAccess } from "@/lib/role-access";
import { searchGlobal, type GlobalSearchResult, type GlobalSearchResultType } from "@/lib/global-search";
import {
  BarChart3,
  CheckCircle2,
  Home,
  Grid,
  Users,
  MessageSquare,
  DollarSign,
  Megaphone,
  Folder,
  User,
  Search,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  PencilRuler,
  Ticket,
  Wallet,
  Wrench,
  UserPlus,
  FileText,
  Clock,
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  keywords?: string[];
  source?: string;
}

const PROFILE_COMMAND: CommandItem = {
  id: "profile",
  label: "Profile",
  description: "Your account settings",
  icon: User,
  href: "/profile",
  keywords: ["account", "settings", "avatar"],
};

const INTERNAL_COMMANDS: CommandItem[] = [
  { id: "dashboard", label: "Dashboard", description: "Overview and stats", icon: Home, href: "/dashboard", keywords: ["home", "overview"] },
  { id: "tasks", label: "Task Tracking", description: "Manage and track tasks", icon: Grid, href: "/task-tracking", keywords: ["todo", "board", "kanban"] },
  { id: "task-calendar", label: "Task Calendar", description: "Task schedule and due dates", icon: CalendarDays, href: "/task-calendar", keywords: ["schedule", "due dates", "calendar"] },
  { id: "payslips", label: "My Payslips", description: "Payslip history and downloads", icon: Wallet, href: "/my-payslips", keywords: ["pay", "salary", "history", "download"] },
  { id: "announcements", label: "Announcements", description: "Company news and updates", icon: Megaphone, href: "/announcements", keywords: ["news", "updates", "events"] },
  { id: "daily-logs", label: "Daily Logs", description: "Daily work activity reports", icon: Users, href: "/daily-logs", keywords: ["reports", "activity", "work"] },
  { id: "chat", label: "Messages & Chat", description: "Team communication", icon: MessageSquare, href: "/chat", keywords: ["messages", "dm", "channel"] },
  { id: "files", label: "File Directory", description: "Shared documents and files", icon: Folder, href: "/file-directory", keywords: ["documents", "drive", "upload"] },
];

const PAYROLL_MANAGEMENT_COMMANDS: CommandItem[] = [
  { id: "payroll", label: "Payroll Calendar", description: "Schedules and time entries", icon: DollarSign, href: "/payroll-calendar", keywords: ["salary", "payroll", "time", "clock", "finance"] },
  { id: "payroll-dashboard", label: "Payroll Dashboard", description: "Payroll review and reporting", icon: LayoutDashboard, href: "/payroll-dashboard", keywords: ["salary", "payroll", "reports", "audit", "finance"] },
];

const CLIENT_COMMANDS: CommandItem[] = [
  { id: "client-command-center", label: "Command Center", description: "Progress and next actions", icon: BriefcaseBusiness, href: "/client", keywords: ["client", "portal", "home", "progress"] },
  { id: "client-work", label: "Work", description: "Website progress and open work", icon: Grid, href: "/client/work", keywords: ["client", "work", "tasks", "progress"] },
  { id: "client-requests", label: "Requests", description: "Submit and review requests", icon: Ticket, href: "/client/tickets", keywords: ["client", "request", "ticket", "support"] },
  { id: "client-approvals", label: "Approvals", description: "Review items waiting for input", icon: CheckCircle2, href: "/client/approvals", keywords: ["client", "approval", "review"] },
  { id: "client-messages", label: "Messages", description: "Request and update conversations", icon: MessageSquare, href: "/client/messages", keywords: ["client", "messages", "conversation"] },
  { id: "client-reports", label: "Reports", description: "Published performance summaries", icon: BarChart3, href: "/client/reports", keywords: ["client", "reports", "performance"] },
  { id: "client-resources", label: "Resources", description: "Shared links, assets, and files", icon: Folder, href: "/client/resources", keywords: ["client", "files", "resources", "assets"] },
  { id: "client-account", label: "Account", description: "Service tier and account status", icon: User, href: "/client/account", keywords: ["client", "account", "settings"] },
  { id: "client-calendar", label: "Calendar", description: "Campaign and content schedule", icon: CalendarDays, href: "/client/calendar", keywords: ["client", "calendar", "schedule"] },
  PROFILE_COMMAND,
];

const CLIENT_OPERATIONS_COMMANDS: CommandItem[] = [
  { id: "operations", label: "Operations", description: "Departments, roles, and approvals", icon: Wrench, href: "/operations", keywords: ["admin", "department", "roles", "approval"] },
  { id: "client-operations", label: "Client Operations", description: "Admin client workspaces", icon: Building2, href: "/operations/clients", keywords: ["client", "operations", "accounts", "delivery"] },
  { id: "client-operations-requests", label: "Operations Client Requests", description: "Admin request queue", icon: ClipboardList, href: "/operations/clients/requests", keywords: ["client", "operations", "request", "ticket"] },
];

const ADMIN_COMMANDS: CommandItem[] = [
  { id: "onboarding", label: "Onboarding", description: "Generate setup links for approved users", icon: UserPlus, href: "/operations/onboarding", keywords: ["invite", "setup", "password", "role", "employee"] },
  { id: "whiteboard", label: "Whiteboard", description: "Admin brainstorming workspace", icon: PencilRuler, href: "/whiteboard", keywords: ["draw", "canvas", "brainstorm"] },
];

const globalSearchIconByType: Record<GlobalSearchResultType, CommandItem["icon"]> = {
  task: Grid,
  "daily-log": FileText,
  announcement: Megaphone,
  person: User,
  message: MessageSquare,
  file: Folder,
  client: BriefcaseBusiness,
  "client-project": BriefcaseBusiness,
  "client-ticket": Ticket,
  "client-work": Grid,
  "client-approval": CheckCircle2,
  "client-report": BarChart3,
  "client-resource": Folder,
  "client-asset": Folder,
  "client-calendar": CalendarDays,
  "client-roadmap": ClipboardList,
  "client-update": FileText,
  "client-activity": Clock,
  "payroll-event": DollarSign,
  "payroll-time": Clock,
  "payroll-payslip": Wallet,
  "payroll-profile": User,
};

function globalResultToCommand(result: GlobalSearchResult): CommandItem {
  return {
    id: `global:${result.id}`,
    label: result.title,
    description: [result.section, result.subtitle].filter(Boolean).join(" - "),
    icon: globalSearchIconByType[result.type] || Search,
    href: result.href,
    source: result.section,
  };
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [globalResults, setGlobalResults] = useState<GlobalSearchResult[]>([]);
  const [globalSearching, setGlobalSearching] = useState(false);
  const [globalSearchError, setGlobalSearchError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user } = useUser();

  const isClientPortalUser = hasClientPortalAccess(user);
  const canAccessClientOperations = hasClientOperationsAccess(user);
  const canUseFullAccessAdmin = hasFullAccess(user);
  const canUsePayrollManagement = hasPayrollManagementAccess(user);
  const commands = useMemo(() => {
    if (isClientPortalUser) return CLIENT_COMMANDS;

    return [
      ...INTERNAL_COMMANDS,
      ...(canUsePayrollManagement ? PAYROLL_MANAGEMENT_COMMANDS : []),
      ...(canAccessClientOperations ? CLIENT_OPERATIONS_COMMANDS : []),
      ...(canUseFullAccessAdmin ? ADMIN_COMMANDS : []),
      PROFILE_COMMAND,
    ];
  }, [canAccessClientOperations, canUseFullAccessAdmin, canUsePayrollManagement, isClientPortalUser]);

  const filteredCommands = query.trim()
    ? commands.filter((cmd) => {
        const q = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.description?.toLowerCase().includes(q) ||
          cmd.keywords?.some((k) => k.includes(q))
        );
      })
    : commands;
  const globalCommandResults = query.trim().length >= 2
    ? globalResults.map(globalResultToCommand)
    : [];
  const filtered = [...filteredCommands, ...globalCommandResults];

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setGlobalResults([]);
    setGlobalSearchError("");
    setSelectedIndex(0);
  }, []);
  useEscapeToClose({ isOpen, onClose: close });

  const navigate = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!isOpen || normalizedQuery.length < 2) {
      setGlobalResults([]);
      setGlobalSearching(false);
      setGlobalSearchError("");
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      setGlobalSearching(true);
      setGlobalSearchError("");

      searchGlobal(normalizedQuery)
        .then((results) => {
          if (!cancelled) setGlobalResults(results);
        })
        .catch((error) => {
          if (!cancelled) {
            setGlobalResults([]);
            setGlobalSearchError(error instanceof Error ? error.message : "Search failed");
          }
        })
        .finally(() => {
          if (!cancelled) setGlobalSearching(false);
        });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [isOpen, query]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-command-item]");
    items[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (filtered.length === 0) return;
        setSelectedIndex((i) => (i + 1) % filtered.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (filtered.length === 0) return;
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[selectedIndex]) {
          navigate(filtered[selectedIndex].href);
        }
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-start justify-center pt-[20vh] motion-fade-in"
      onClick={close}
    >
      {/* Backdrop */}
      <div className="portal-form-backdrop absolute inset-0" aria-hidden="true" />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg mx-4 bg-[var(--card-surface)] rounded-xl shadow-2xl ring-1 ring-[var(--border)] overflow-hidden motion-panel-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-[var(--border)]">
          <Search className="w-5 h-5 text-[var(--muted)] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, tasks, clients, messages..."
            className="flex-1 py-4 bg-transparent text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none text-base"
            aria-label="Search everything you can access"
            autoComplete="off"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-mono text-[var(--muted)] bg-[var(--card-bg)] rounded border border-[var(--border)]">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2 chat-scroll" role="listbox">
          {globalSearching ? (
            <div className="px-4 pb-2 pt-1 text-xs text-[var(--muted)]">
              Searching records you can access...
            </div>
          ) : null}
          {globalSearchError ? (
            <div className="mx-4 mb-2 rounded-[var(--radius-md)] border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-300">
              {globalSearchError}
            </div>
          ) : null}
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--muted)]">
              {query.trim().length < 2 ? "Type at least 2 characters to search records." : "No authorized results found."}
            </div>
          ) : (
            filtered.map((cmd, index) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  data-command-item
                  role="option"
                  aria-selected={index === selectedIndex}
                  className={cn(
                    "motion-interactive motion-list-in w-full flex items-center gap-3 px-4 py-3 text-left",
                    index === selectedIndex
                      ? "bg-indigo-600/10 dark:bg-indigo-400/10 text-[var(--foreground)]"
                      : "text-[var(--foreground)] hover:bg-[var(--card-bg)]",
                  )}
                  onClick={() => navigate(cmd.href)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0",
                      index === selectedIndex
                        ? "bg-indigo-600/20 dark:bg-indigo-400/20 text-indigo-600 dark:text-indigo-400"
                        : "bg-[var(--card-bg)] text-[var(--muted)]",
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{cmd.label}</div>
                    {cmd.description && (
                      <div className="text-xs text-[var(--muted)] truncate">{cmd.description}</div>
                    )}
                  </div>
                  {cmd.source ? (
                    <span className="hidden shrink-0 rounded-[var(--radius-sm)] border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--muted)] sm:inline">
                      {cmd.source}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[var(--border)] text-xs text-[var(--muted)]">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 font-mono bg-[var(--card-bg)] rounded border border-[var(--border)]">&uarr;&darr;</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 font-mono bg-[var(--card-bg)] rounded border border-[var(--border)]">&crarr;</kbd>
            open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 font-mono bg-[var(--card-bg)] rounded border border-[var(--border)]">esc</kbd>
            close
          </span>
          <span className="ml-auto hidden sm:inline">authorized results only</span>
        </div>
      </div>
    </div>
  );
}
