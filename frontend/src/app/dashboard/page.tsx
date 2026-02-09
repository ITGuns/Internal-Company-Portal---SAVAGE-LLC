"use client";

import React from 'react'
import Header from '@/components/Header'
import { Clock, CheckCircle2, AlertCircle, TrendingUp, ExternalLink, Send, Megaphone, Star, Trophy } from 'lucide-react'
import { getThisWeekTasks } from '@/lib/tasks'
import { getTotalMinutesForDate } from '@/lib/time-entries'
import { getRecentAnnouncements, getTimeAgo } from '@/lib/announcements'

function QuickLink({ title, subtitle, icon: Icon }: { title: string; subtitle?: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="p-3 bg-[var(--card-bg)] rounded-lg border border-[var(--border)] hover:shadow-sm transition cursor-pointer">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-[var(--muted)]" />
        <div className="flex-1">
          <div className="font-medium text-sm text-[var(--foreground)]">{title}</div>
          {subtitle && <div className="text-xs text-[var(--muted)] mt-1">{subtitle}</div>}
        </div>
        <ExternalLink className="w-3 h-3 text-[var(--muted)]" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  // Calculate stats using lazy initialization to avoid cascading renders
  const today = new Date().toISOString().slice(0, 10);
  const todayMinutes = getTotalMinutesForDate(today);
  const weekTasks = getThisWeekTasks();
  const recentAnnouncements = getRecentAnnouncements(3);
  const recentShoutouts = getRecentAnnouncements(10).filter(a => a.category === 'shoutouts').slice(0, 3);

  const formatHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <main style={{ minHeight: 'calc(100vh - var(--header-height))' }} className="bg-[var(--background)] text-[var(--foreground)]">
      <div className="p-6 pt-3">
        <Header />

        {/* Stats Overview */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded border border-[var(--border)] bg-[var(--card-bg)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-500/10">
                <Clock className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">Today&apos;s Time</div>
                <div className="text-lg font-semibold">{formatHours(todayMinutes)}</div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded border border-[var(--border)] bg-[var(--card-bg)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/10">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">This Week</div>
                <div className="text-lg font-semibold">{weekTasks.total} Tasks</div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded border border-[var(--border)] bg-[var(--card-bg)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">Completed</div>
                <div className="text-lg font-semibold">{weekTasks.completed}</div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded border border-[var(--border)] bg-[var(--card-bg)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/10">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">Overdue</div>
                <div className="text-lg font-semibold">{weekTasks.overdue}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="rounded shadow border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
              <div className="px-6 py-5 flex items-center justify-between bg-[var(--card-bg)] border-b border-[var(--border)]">
                <h3 className="font-semibold text-sm">Quick Links</h3>
              </div>

              <div className="p-4 grid gap-3 bg-[var(--card-surface)]">
                <QuickLink title="Discord Server" subtitle="Join the conversation" icon={Send} />
                <QuickLink title="Google Drive" subtitle="Access shared files" icon={ExternalLink} />
                <QuickLink title="Shared Resources" subtitle="Company documents" icon={ExternalLink} />
              </div>
            </div>

            <div className="rounded shadow border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
              <div className="px-6 py-5 flex items-center justify-between bg-[var(--card-bg)] border-b border-[var(--border)]">
                <h3 className="font-semibold text-sm">Company Chat</h3>
                <span className="text-xs text-[var(--muted)]">0 online</span>
              </div>

              <div className="p-8 text-center bg-[var(--card-surface)]">
                <Send className="w-12 h-12 mx-auto text-[var(--muted)] opacity-50 mb-3" />
                <div className="text-sm text-[var(--muted)]">No messages yet</div>
              </div>

              <div className="px-6 py-4 border-t border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <input aria-label="Type a message" className="flex-1 p-2 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]" placeholder="Type a message..." />
                  <button aria-label="Send message" className="p-2 rounded bg-[var(--card-bg)] border border-[var(--border)] hover:shadow-sm">
                    <Send className="w-4 h-4 text-[var(--foreground)]" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="rounded shadow border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
              <div className="px-6 py-5 flex items-center justify-between bg-[var(--card-bg)] border-b border-[var(--border)]">
                <h3 className="font-semibold text-sm">Company Announcements</h3>
                <a href="/announcements" className="text-sm text-[var(--muted)] hover:underline">View All</a>
              </div>

              {recentAnnouncements.length === 0 ? (
                <div className="p-8 text-center bg-[var(--card-surface)]">
                  <Megaphone className="w-12 h-12 mx-auto text-[var(--muted)] opacity-50 mb-3" />
                  <div className="text-sm text-[var(--muted)]">No announcements yet</div>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)] bg-[var(--card-surface)]">
                  {recentAnnouncements.map((announcement) => (
                    <div key={announcement.id} className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-[color:var(--accent)/12] text-[var(--accent)] flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {announcement.author.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-medium text-sm truncate">{announcement.title}</div>
                            {announcement.isImportant && (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
                            )}
                          </div>
                          <div className="text-xs text-[var(--muted)] mb-2">
                            {announcement.author} · {getTimeAgo(announcement.timestamp)}
                          </div>
                          <div className="text-sm text-[var(--foreground)] line-clamp-2">{announcement.body}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="rounded shadow border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden self-start">
                <div className="px-6 py-5 flex items-center justify-between bg-[var(--card-bg)] border-b border-[var(--border)]">
                  <h4 className="font-semibold">Recent Shoutouts</h4>
                  <a href="/announcements" className="text-sm text-[var(--muted)] hover:underline">View All</a>
                </div>

                {recentShoutouts.length === 0 ? (
                  <div className="p-8 text-center bg-[var(--card-surface)]">
                    <Star className="w-12 h-12 mx-auto text-[var(--muted)] opacity-50 mb-3" />
                    <div className="text-sm text-[var(--muted)]">No shoutouts yet</div>
                  </div>
                ) : (
                  <div className="p-4 space-y-3 bg-[var(--card-surface)]">
                    {recentShoutouts.map(shoutout => (
                      <div key={shoutout.id} className="p-3 bg-[var(--card-bg)] rounded border border-[var(--border)]">
                        <div className="flex items-start gap-2 mb-1">
                          <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{shoutout.title}</div>
                            <div className="text-xs text-[var(--muted)] mt-1 line-clamp-2">{shoutout.body}</div>
                            <div className="text-xs text-[var(--muted)] mt-2">{getTimeAgo(shoutout.timestamp)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded shadow border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
                <div className="px-6 py-5 flex items-center justify-between bg-[var(--card-bg)] border-b border-[var(--border)]">
                  <h4 className="font-semibold">Quick Actions</h4>
                </div>

                <div className="p-4 grid grid-cols-2 gap-3 items-start bg-[var(--card-surface)]">
                  <button className="py-2 px-3 bg-[var(--background)] rounded text-[var(--foreground)] border border-[var(--border)] hover:shadow-sm transition">New Task</button>
                  <button className="py-2 px-3 bg-[var(--background)] rounded text-[var(--foreground)] border border-[var(--border)] hover:shadow-sm transition">Schedule</button>
                  <button className="py-2 px-3 bg-[var(--background)] rounded text-[var(--foreground)] border border-[var(--border)] hover:shadow-sm transition">Announce</button>
                  <button className="py-2 px-3 bg-[var(--background)] rounded text-[var(--foreground)] border border-[var(--border)] hover:shadow-sm transition">Shoutout</button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}
