"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Grid,
  Users,
  MessageSquare,
  DollarSign,
  Megaphone,
  Folder,
  User,
  Search,
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  keywords?: string[];
}

const COMMANDS: CommandItem[] = [
  { id: "dashboard", label: "Dashboard", description: "Overview and stats", icon: Home, href: "/dashboard", keywords: ["home", "overview"] },
  { id: "tasks", label: "Task Tracking", description: "Manage and track tasks", icon: Grid, href: "/task-tracking", keywords: ["todo", "board", "kanban"] },
  { id: "payroll", label: "Payroll Calendar", description: "Schedules and time entries", icon: DollarSign, href: "/payroll-calendar", keywords: ["salary", "pay", "time", "clock"] },
  { id: "announcements", label: "Announcements", description: "Company news and updates", icon: Megaphone, href: "/announcements", keywords: ["news", "updates", "events"] },
  { id: "daily-logs", label: "Daily Logs", description: "Daily work activity reports", icon: Users, href: "/daily-logs", keywords: ["reports", "activity", "work"] },
  { id: "chat", label: "Messages & Chat", description: "Team communication", icon: MessageSquare, href: "/chat", keywords: ["messages", "dm", "channel"] },
  { id: "files", label: "File Directory", description: "Shared documents and files", icon: Folder, href: "/file-directory", keywords: ["documents", "drive", "upload"] },
  { id: "profile", label: "Profile", description: "Your account settings", icon: User, href: "/profile", keywords: ["account", "settings", "avatar"] },
];

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const filtered = query.trim()
    ? COMMANDS.filter((cmd) => {
        const q = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.description?.toLowerCase().includes(q) ||
          cmd.keywords?.some((k) => k.includes(q))
        );
      })
    : COMMANDS;

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

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
        setSelectedIndex((i) => (i + 1) % filtered.length);
        break;
      case "ArrowUp":
        e.preventDefault();
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
      className="fixed inset-0 z-[99999] flex items-start justify-center pt-[20vh] animate-fadeIn"
      onClick={close}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg mx-4 bg-[var(--card-surface)] rounded-xl shadow-2xl ring-1 ring-[var(--border)] overflow-hidden animate-slideUp"
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
            placeholder="Search pages..."
            className="flex-1 py-4 bg-transparent text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none text-base"
            aria-label="Search pages"
            autoComplete="off"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-mono text-[var(--muted)] bg-[var(--card-bg)] rounded border border-[var(--border)]">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-72 overflow-y-auto py-2 chat-scroll" role="listbox">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--muted)]">
              No results found.
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
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-100",
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
        </div>
      </div>
    </div>
  );
}
