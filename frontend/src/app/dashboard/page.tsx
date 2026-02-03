import React from 'react'
import Header from '@/components/Header'
import { Star, Trophy } from 'lucide-react'

function QuickLink({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="p-3 bg-[var(--card-bg)] rounded-lg border border-[var(--border)] hover:shadow-sm transition">
      <div className="font-medium text-sm text-[var(--foreground)]">{title}</div>
      {subtitle ? <div className="text-xs text-[var(--muted)] mt-1">{subtitle}</div> : null}
    </div>
  )
}

function AnnouncementItem({ author, title, when, body }: { author: string; title: string; when: string; body: string }) {
  return (
    <div className="py-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-[color:var(--accent)/12] text-[var(--accent)] flex items-center justify-center text-sm font-semibold">{author.charAt(0)}</div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-4">
            <div className="font-medium text-[var(--foreground)]">{title}</div>
            <div className="ml-2">
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(155,108,255,0.12)', color: 'var(--accent)' }}>Important</span>
            </div>
          </div>
          <div className="text-xs text-[var(--muted)] mt-2">{author} · {when}</div>
          <div className="mt-3 text-sm text-[var(--foreground)]">{body}</div>
        </div>
      </div>
    </div>
  )
}

function ChatMessage({ who, text, time }: { who: string; text: string; time: string }) {
  const isYou = who.toLowerCase() === 'you';
  return (
    <div className="mb-3">
      <div className={`flex items-start gap-3 ${isYou ? 'justify-end' : ''}`}>
        {!isYou && <div className="w-8 h-8 rounded-full bg-[var(--card-bg)] text-[var(--foreground)] flex items-center justify-center">{who.charAt(0)}</div>}
        <div className={`flex-1 ${isYou ? 'text-right' : ''}`}>
          <div className="text-sm"><span className="font-medium text-[var(--foreground)]">{who}</span> <span className="text-xs text-[var(--muted)]">{time}</span></div>
          <div className={`${isYou ? 'ml-auto bg-[var(--accent)] text-white' : 'mt-2 bg-[var(--card-bg)] text-[var(--foreground)]'} mt-2 inline-block px-4 py-2 rounded-lg max-w-full`}>{text}</div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <main style={{ minHeight: 'calc(100vh - 10rem)' }} className="bg-[var(--background)] text-[var(--foreground)]">
      <div className="p-6 pt-3">
        <Header />

        <div className="mt-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="rounded shadow border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
              <div className="px-6 py-5 flex items-center justify-between bg-[var(--card-bg)] border-b border-[var(--border)]">
                <h3 className="font-semibold text-sm">Quick Links</h3>
              </div>

              <div className="p-4 grid gap-3 bg-[var(--card-surface)]">
                <QuickLink title="Discord Server" subtitle="Join the conversation" />
                <QuickLink title="Google Drive" subtitle="Access shared files" />
                <QuickLink title="Shared Resources" subtitle="Company documents" />
              </div>
            </div>

            <div className="rounded shadow border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
              <div className="px-6 py-5 flex items-center justify-between bg-[var(--card-bg)] border-b border-[var(--border)]">
                <h3 className="font-semibold text-sm">Company Chat</h3>
              </div>

              <div className="p-4 max-h-64 overflow-y-auto chat-scroll bg-[var(--card-surface)]">
                <ChatMessage who="Alex Martinez" time="9:42 AM" text="Good morning team! Ready for the sprint planning?" />
                <ChatMessage who="Emma Wilson" time="9:45 AM" text="Yes! I've prepared the user stories for review." />
                <ChatMessage who="James Cooper" time="9:48 AM" text="Can someone share the Q1 metrics dashboard link?" />
              </div>

              <div className="px-6 py-4">
                <input className="w-full p-2 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]" placeholder="Type a message..." />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="rounded shadow border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
              <div className="px-6 py-5 flex items-center justify-between bg-[var(--card-bg)] border-b border-[var(--border)]">
                <h3 className="font-semibold text-sm">Company Announcements</h3>
                <a href="/announcements" className="text-sm text-[var(--muted)] hover:underline">View All</a>
              </div>

              <div className="px-6 py-0 divide-y divide-[var(--border)] bg-[var(--card-surface)]">
                <AnnouncementItem author="Michael Chen" title="Q1 All-Hands Meeting - Tomorrow at 2 PM" when="2 hours ago" body="Don't forget to join us tomorrow for the quarterly review. We'll be discussing achievements and goals for Q2." />
                <AnnouncementItem author="HR Department" title="New Benefits Package Available" when="5 hours ago" body="We're excited to announce enhanced health benefits starting next month. Check your email for details." />
                <AnnouncementItem author="IT Department" title="System Maintenance Scheduled" when="Yesterday" body="Planned maintenance this Saturday from 2-4 AM EST. Services may be temporarily unavailable." />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="rounded shadow border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden self-start">
                <div className="px-6 py-5 flex items-center justify-between bg-[var(--card-bg)] border-b border-[var(--border)]">
                  <h4 className="font-semibold">Shoutouts</h4>
                  <a href="/shoutouts" className="text-sm text-[var(--muted)] hover:underline">View All</a>
                </div>

                <div className="p-4 space-y-3 bg-[var(--card-surface)]">
                  <div className="p-3 bg-[var(--card-bg)] rounded border border-[var(--border)]">
                    <div className="flex items-start gap-4">
                      <div className="w-9 h-9 flex items-center justify-center rounded text-[var(--accent)] bg-[color:var(--accent)/8]">
                        <Star className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">David Lee recognized Rachel Green</div>
                        <div className="mt-2 text-sm text-[var(--muted)] italic">"Amazing work on the client presentation! Your dedication really showed."</div>
                        <div className="mt-2 text-xs text-[var(--muted)]">2 hours ago</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-[var(--card-bg)] rounded border border-[var(--border)]">
                    <div className="flex items-start gap-4">
                      <div className="w-9 h-9 flex items-center justify-center rounded text-[var(--accent)] bg-[color:var(--accent)/8]">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">Team Lead recognized Dev Team</div>
                        <div className="mt-2 text-sm text-[var(--muted)] italic">"Crushed the sprint goals! 100% completion rate this week 🚀"</div>
                        <div className="mt-2 text-xs text-[var(--muted)]">5 hours ago</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded shadow border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
                  <div className="px-6 py-5 flex items-center justify-between bg-[var(--card-bg)] border-b border-[var(--border)]">
                    <h4 className="font-semibold">Quick Actions</h4>
                  </div>

                  <div className="p-4 grid grid-cols-2 gap-3 items-start bg-[var(--card-surface)]">
                    <button className="py-2 px-3 bg-[var(--background)] rounded text-[var(--foreground)]">New Task</button>
                    <button className="py-2 px-3 bg-[var(--background)] rounded text-[var(--foreground)]">Schedule</button>
                    <button className="py-2 px-3 bg-[var(--background)] rounded text-[var(--foreground)]">Announce</button>
                    <button className="py-2 px-3 bg-[var(--background)] rounded text-[var(--foreground)]">Shoutout</button>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
