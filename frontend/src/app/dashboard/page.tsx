"use client";

import React, { useEffect, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import Header from '@/components/Header'
import Card from '@/components/Card'
import Button from '@/components/Button'
import { DashboardSkeleton } from '@/components/ui/Skeleton'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  ExternalLink,
  FileText,
  Megaphone,
  Send,
  Star,
  TrendingUp,
  Trophy,
  UserCheck,
} from 'lucide-react'
import { getTimeAgo } from '@/lib/announcements'
import { useRouter } from 'next/navigation'
import { useSocket } from '@/context/SocketContext'
import { fetchConversations, fetchMessages, sendMessage, type Message, type Conversation } from '@/lib/chat'
import TimeClock from '@/components/TimeClock'
import { useTasks } from '@/hooks/useTasksQuery'
import { useAnnouncements } from '@/hooks/useAnnouncementsQuery'
import { useTimeEntries } from '@/hooks/useTimeEntriesQuery'
import { useToast } from '@/components/ToastProvider'
import { useDailyLogs } from '@/hooks/useDailyLogsQuery'
import { fetchPendingEmployees } from '@/lib/employees'
import {
  buildDashboardSummary,
  hasDashboardManagementAccess,
  type DashboardAttentionItem,
} from '@/lib/dashboard-summary'
import { DASHBOARD_DEEP_LINKS } from '@/lib/dashboard-deep-links'

const dashboardNumberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

function QuickLink({ title, subtitle, icon: Icon, onClick, href }: { title: string; subtitle?: string; icon: React.ComponentType<{ className?: string }>; onClick?: () => void; href?: string }) {
  const quickLinkClass = 'motion-interactive flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-3 text-left hover:border-[var(--accent)] hover:bg-[var(--surface-hover)] hover:shadow-[var(--shadow-sm)] active:scale-[0.995] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]';
  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-[var(--foreground)]">{title}</div>
        {subtitle && <div className="mt-1 truncate text-xs text-[var(--muted)]">{subtitle}</div>}
      </div>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" aria-hidden="true" />
    </>
  );

  if (href && !onClick) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={quickLinkClass}>
        {content}
      </a>
    );
  }

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      window.open(href, '_blank');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={quickLinkClass}
    >
      {content}
    </button>
  )
}

function DashboardMetric({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'emerald' | 'blue' | 'amber' | 'red' | 'slate';
}) {
  const toneClass = {
    emerald: 'border-[var(--status-completed)] bg-[var(--status-completed-bg)] text-[var(--status-completed)]',
    blue: 'border-[var(--status-in-progress)] bg-[var(--status-in-progress-bg)] text-[var(--status-in-progress)]',
    amber: 'border-[var(--priority-medium)] bg-[var(--priority-medium-bg)] text-[var(--priority-medium)]',
    red: 'border-[var(--status-blocked)] bg-[var(--status-blocked-bg)] text-[var(--status-blocked)]',
    slate: 'border-[var(--border)] bg-[var(--card-surface)] text-[var(--foreground)]',
  }[tone];

  return (
    <Card padding="md" className="min-h-[120px] overflow-hidden">
      <div className="flex h-full items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{label}</div>
          <div className="mt-2 truncate text-2xl font-semibold tabular-nums text-[var(--foreground)]">{value}</div>
          <div className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{helper}</div>
        </div>
        <div className={`rounded-[var(--radius-md)] border p-2 shadow-[0_0_24px_-18px_currentColor] ${toneClass}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </Card>
  );
}

function AttentionRow({ item }: { item: DashboardAttentionItem }) {
  const iconClass = item.severity === 'danger'
    ? 'bg-red-500/10 text-red-500'
    : item.severity === 'warning'
      ? 'bg-amber-500/10 text-amber-500'
      : 'bg-sky-500/10 text-sky-500';

  return (
    <Link
      href={item.href}
      className="motion-interactive flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-3 hover:border-[var(--accent)] hover:bg-[var(--surface-hover)] hover:shadow-[var(--shadow-sm)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
    >
      <div className={`mt-0.5 rounded-md p-1.5 ${iconClass}`}>
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-[var(--foreground)]">{item.title}</div>
          {item.count != null && (
        <span className="rounded-[var(--radius-sm)] bg-[var(--card-surface)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
              {item.count}
            </span>
          )}
        </div>
        <div className="mt-1 text-xs text-[var(--muted)]">{item.description}</div>
      </div>
      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
    </Link>
  );
}

function ActionButton({
  label,
  helper,
  icon: Icon,
  onClick,
}: {
  label: string;
  helper: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="motion-interactive flex min-h-[86px] items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-3 text-left hover:border-[var(--accent)] hover:bg-[var(--surface-hover)] hover:shadow-[var(--shadow-sm)] active:scale-[0.995] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
    >
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-2 text-[var(--accent)]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="mt-1 text-xs text-[var(--muted)]">{helper}</div>
      </div>
    </button>
  );
}

import { useUser } from '@/contexts/UserContext'

function getTodayDateInput() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

export default function DashboardPage() {
  const { user, isLoading: userLoading } = useUser();
  const isManagementDashboard = hasDashboardManagementAccess(user);
  const { data: allTasks = [], isLoading: tasksLoading } = useTasks();
  const { data: allAnnouncements = [], isLoading: announcementsLoading } = useAnnouncements();
  const { data: timeEntries = [], isLoading: timeLoading } = useTimeEntries();
  const { data: dailyLogs = [], isLoading: dailyLogsLoading } = useDailyLogs();
  const { data: pendingEmployees = [], isLoading: pendingEmployeesLoading } = useQuery({
    queryKey: ['employees', 'pending'],
    queryFn: fetchPendingEmployees,
    enabled: isManagementDashboard,
    staleTime: 60 * 1000,
  });

  const today = useMemo(() => getTodayDateInput(), []);
  const dashboardSummary = useMemo(
    () => buildDashboardSummary({
      userId: user?.id,
      todayDate: today,
      tasks: allTasks,
      timeEntries,
      dailyLogs,
      pendingApprovals: pendingEmployees.length,
      isManagement: isManagementDashboard,
    }),
    [allTasks, dailyLogs, isManagementDashboard, pendingEmployees.length, timeEntries, today, user?.id],
  );
  const recentAnnouncements = useMemo(() => {
    const sorted = [...allAnnouncements].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return sorted.slice(0, 3);
  }, [allAnnouncements]);
  const recentShoutouts = useMemo(() => {
    const sorted = [...allAnnouncements].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return sorted.filter(a => a.category === 'shoutouts').slice(0, 3);
  }, [allAnnouncements]);
  const loading = tasksLoading || announcementsLoading || timeLoading || dailyLogsLoading || (isManagementDashboard && pendingEmployeesLoading);

  // Chat State
  const toast = useToast();
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [onlineCount] = useState(0);
  const chatScrollRef = React.useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Chat Initialization
  useEffect(() => {
    async function initChat() {
      try {
        const conversations = await fetchConversations();
        // Strictly find a public channel (General/Global) for the dashboard widget
        const globalConv = conversations.find(c =>
          c.type === 'channel' &&
          (c.name?.toLowerCase() === 'general' || c.name?.toLowerCase() === 'global')
        ) || conversations.find(c => c.type === 'channel');

        if (globalConv) {
          setActiveConversation(globalConv);
          const history = await fetchMessages(globalConv.id, 10);
          setMessages(history);

          if (socket) {
            socket.emit('join:conversation', globalConv.id);
          }
        }
      } catch (err) {
        console.error('Dashboard chat init failed', err);
      }
    }

    if (user) {
      initChat();
    }
  }, [user, socket]);

  // Socket Listener
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: Message) => {
      if (activeConversation && msg.conversationId === activeConversation.id) {
        setMessages(prev => {
          // Prevent duplicates by ID
          if (prev.some(m => m.id === msg.id)) return prev;

          // Handle race condition: check if this is a real message replacing our optimistic one
          const isFromMe = String(msg.senderId) === String(user?.id);
          if (isFromMe) {
            const tempIndex = prev.findIndex(m => m.id.startsWith('temp-') && m.content === msg.content);
            if (tempIndex !== -1) {
              const next = [...prev];
              next[tempIndex] = msg;
              return next;
            }
          }

          return [...prev, msg].slice(-10); // Keep last 10
        });
      }
    };

    socket.on('chat:message', handleNewMessage);
    return () => {
      socket.off('chat:message', handleNewMessage);
    };
  }, [socket, activeConversation, user?.id]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !activeConversation || sending) return;

    const content = newMessage.trim();
    const tempId = `temp-${Date.now()}`;

    // Optimistic Update
    const optimisticMsg: Message = {
      id: tempId,
      content,
      senderId: String(user?.id || ''),
      conversationId: activeConversation.id,
      createdAt: new Date().toISOString(),
      sender: {
        id: String(user?.id || ''),
        name: user?.name || 'Me',
        avatar: user?.avatar || '',
        email: user?.email || ''
      }
    };

    setMessages(prev => [...prev, optimisticMsg].slice(-10));
    setNewMessage('');

    try {
      setSending(true);
      const result = await sendMessage(activeConversation.id, content);
      setMessages(prev => prev.map(m => m.id === tempId ? result : m));
    } catch (err) {
      console.error('Failed to send msg', err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(content);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };


  const formatHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading || userLoading) {
    return (
      <main className="main-content-height bg-transparent p-6 text-[var(--foreground)]">
        <Header />
        <DashboardSkeleton />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="main-content-height bg-transparent p-6 text-[var(--foreground)]">
        <Header />
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <h2 className="text-2xl font-bold mb-4">Please Log In</h2>
          <p className="text-[var(--muted)] mb-6">You need to be logged in to view the dashboard.</p>
          <Button onClick={() => window.location.href = '/login'}>Go to Login</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content-height bg-transparent text-[var(--foreground)]">
      <Header />
      <div className="motion-content-enter mx-auto max-w-[1480px] p-4 pt-3 md:p-6">
        <div className="mt-5 grid grid-cols-1 items-start gap-4 xl:mt-8 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <Card padding="lg" className="relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,var(--accent),var(--accent-secondary))]" aria-hidden="true" />
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <div className="inline-flex rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card-surface)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                    {isManagementDashboard ? 'Team Command Center' : 'Personal Command Center'}
                  </div>
                  <h2 className="mt-3 max-w-xl text-2xl font-semibold leading-tight text-pretty text-[var(--foreground)] md:text-3xl">
                    {isManagementDashboard ? 'Review today before work piles up.' : 'Your day, tasks, logs, and payroll in one place.'}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                    {isManagementDashboard
                      ? 'Use the alerts and quick actions below to keep approvals, tasks, logs, and time entries moving.'
                      : 'Start with the attention list, then jump straight into the next action without hunting through pages.'}
                  </p>
                </div>
                <div className="hidden shrink-0 sm:block">
                  <TimeClock />
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 2xl:grid-cols-3">
              <DashboardMetric
                label="Today's Time"
                value={formatHours(dashboardSummary.metrics.todayMinutes)}
                helper={dashboardSummary.metrics.activeClockIn ? 'Clock is running' : 'Tracked today'}
                icon={Clock}
                tone="emerald"
              />
              <DashboardMetric
                label="Assigned Tasks"
                value={dashboardNumberFormatter.format(dashboardSummary.metrics.assignedTasks)}
                helper={isManagementDashboard ? 'Visible to your role' : 'Assigned to you'}
                icon={ClipboardList}
                tone="blue"
              />
              <DashboardMetric
                label="In Progress"
                value={dashboardNumberFormatter.format(dashboardSummary.metrics.inProgressTasks)}
                helper="Active work items"
                icon={TrendingUp}
                tone="slate"
              />
              <DashboardMetric
                label="Completed Today"
                value={dashboardNumberFormatter.format(dashboardSummary.metrics.completedToday)}
                helper="Closed today"
                icon={CheckCircle2}
                tone="emerald"
              />
              <DashboardMetric
                label="Overdue"
                value={dashboardNumberFormatter.format(dashboardSummary.metrics.overdueTasks)}
                helper="Past due and open"
                icon={AlertCircle}
                tone={dashboardSummary.metrics.overdueTasks > 0 ? 'red' : 'amber'}
              />
              <DashboardMetric
                label={isManagementDashboard ? 'Approvals' : 'Daily Log'}
                value={isManagementDashboard ? dashboardNumberFormatter.format(dashboardSummary.metrics.pendingApprovals) : (dashboardSummary.metrics.pendingDailyLog ? 'Open' : 'Done')}
                helper={isManagementDashboard ? 'Pending employees' : 'Today status'}
                icon={isManagementDashboard ? UserCheck : FileText}
                tone={dashboardSummary.metrics.pendingApprovals > 0 || dashboardSummary.metrics.pendingDailyLog ? 'amber' : 'emerald'}
              />
            </div>
          </div>

          <Card variant="elevated" className="overflow-hidden">
            <Card.Header className="py-4">
              <div>
                <h3 className="text-sm font-semibold">Needs Attention</h3>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  {dashboardSummary.attentionItems.length} open item{dashboardSummary.attentionItems.length === 1 ? '' : 's'}
                </div>
              </div>
            </Card.Header>
            <Card.Content className="space-y-2">
              {dashboardSummary.attentionItems.length === 0 ? (
                <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--card-bg)] p-4 text-sm text-[var(--muted)]">
                  Nothing needs immediate review.
                </div>
              ) : (
                dashboardSummary.attentionItems.slice(0, 4).map((item) => (
                  <AttentionRow key={item.id} item={item} />
                ))
              )}
            </Card.Content>
          </Card>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
          <div className="space-y-4">
            <Card variant="elevated" className="overflow-hidden">
              <Card.Header>
                <h3 className="font-semibold text-sm">Quick Links</h3>
              </Card.Header>

              <Card.Content className="grid gap-3">
                <QuickLink
                  title="Discord Server"
                  subtitle="Join the conversation"
                  icon={Send}
                  onClick={() => {
                    // Try to open Discord app
                    window.location.href = 'discord://discord.com/channels/1464856711813660694/1464865716200018042';
                    // Fallback to web after 500ms if app doesn't open
                    setTimeout(() => {
                      window.open('https://discord.com/channels/1464856711813660694/1464865716200018042', '_blank');
                    }, 500);
                  }}
                />
                <QuickLink
                  title="Google Drive"
                  subtitle="Access shared files"
                  icon={ExternalLink}
                  href="https://drive.google.com"
                />
              </Card.Content>
            </Card>

            <Card variant="elevated" className="overflow-hidden flex flex-col h-[400px]">
              <Card.Header>
                <div className="flex items-center justify-between w-full">
                  <h3 className="font-semibold text-sm">Company Chat</h3>
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-[var(--status-completed)]' : 'bg-[var(--status-blocked)]'}`} aria-hidden="true"></span>
                    <span className="text-[10px] text-[var(--muted)]">{onlineCount > 0 ? `${onlineCount} online` : 'Active'}</span>
                  </div>
                </div>
              </Card.Header>

              <div
                ref={chatScrollRef}
                className="chat-scroll flex-1 space-y-3 overflow-y-auto bg-[var(--card-bg)] p-4"
              >
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--border)] text-center">
                    <Send className="w-8 h-8 mx-auto text-[var(--muted)] mb-2" aria-hidden="true" />
                    <div className="text-xs text-[var(--muted)]">No messages yet</div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = String(msg.senderId) === String(user?.id);
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        {!isMe && <span className="text-[10px] text-[var(--muted)] mb-0.5 ml-1">{msg.sender.name}</span>}
                        <div className={`max-w-[85%] rounded-[var(--radius-md)] px-3 py-1.5 text-xs ${isMe
                          ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                          : 'border border-[var(--border)] bg-[var(--card-surface)] text-[var(--foreground)]'
                          }`}>
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <Card.Footer className="border-t border-[var(--border)]">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 w-full">
                  <input
                    aria-label="Type a message"
                    name="dashboard-chat-message"
                    autoComplete="off"
                    className="flex-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    placeholder="Type a message…"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={!activeConversation}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    aria-label="Send message"
                    className="rounded-[var(--radius-md)] bg-[var(--accent)] p-2 text-[var(--accent-foreground)] transition-[filter,transform] duration-150 ease-[var(--ease-out)] hover:brightness-95 active:translate-y-px active:scale-[0.98] disabled:opacity-30"
                  >
                    <Send className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </form>
              </Card.Footer>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <Card variant="elevated" className="overflow-hidden">
              <Card.Header>
                <h3 className="font-semibold text-sm">Company Announcements</h3>
                <Link href="/announcements" className="inline-flex min-h-10 items-center rounded-[var(--radius-md)] px-2 text-sm text-[var(--muted)] hover:text-[var(--accent)] hover:underline">View All</Link>
              </Card.Header>

              {recentAnnouncements.length === 0 ? (
                <div className="p-8 text-center bg-[var(--card-surface)]">
                  <Megaphone className="mx-auto mb-3 h-10 w-10 text-[var(--muted)] opacity-50" aria-hidden="true" />
                  <div className="text-sm text-[var(--muted)]">No announcements yet</div>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)] bg-[var(--card-surface)]">
                  {recentAnnouncements.map((announcement) => (
                    <div key={announcement.id} className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--card-surface)] text-xs font-semibold text-[var(--accent)]">
                          {announcement.author.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-medium text-sm truncate">{announcement.title}</div>
                            {announcement.isImportant && (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" aria-hidden="true" />
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
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <Card variant="elevated" className="overflow-hidden self-start">
                <Card.Header>
                  <h4 className="font-semibold">Recent Shoutouts</h4>
                  <Link href="/announcements" className="inline-flex min-h-10 items-center rounded-[var(--radius-md)] px-2 text-sm text-[var(--muted)] hover:text-[var(--accent)] hover:underline">View All</Link>
                </Card.Header>

                {recentShoutouts.length === 0 ? (
                  <div className="bg-[var(--card-bg)] p-8 text-center">
                    <Star className="mx-auto mb-3 h-10 w-10 text-[var(--muted)] opacity-50" aria-hidden="true" />
                    <div className="text-sm text-[var(--muted)]">No shoutouts yet</div>
                  </div>
                ) : (
                  <Card.Content className="space-y-3">
                    {recentShoutouts.map(shoutout => (
                      <div key={shoutout.id} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-3">
                        <div className="flex items-start gap-2 mb-1">
                          <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{shoutout.title}</div>
                            <div className="text-xs text-[var(--muted)] mt-1 line-clamp-2">{shoutout.body}</div>
                            <div className="text-xs text-[var(--muted)] mt-2">{getTimeAgo(shoutout.timestamp)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </Card.Content>
                )}
              </Card>

              <Card variant="elevated" className="overflow-hidden">
                <Card.Header>
                  <h4 className="font-semibold">Quick Actions</h4>
                </Card.Header>

                <Card.Content className="grid gap-3 sm:grid-cols-2">
                  <ActionButton
                    label="Create Task"
                    helper="Open task tracking"
                    icon={ClipboardList}
                    onClick={() => router.push(DASHBOARD_DEEP_LINKS.createTask)}
                  />
                  <ActionButton
                    label="Add Daily Log"
                    helper="Record today's work"
                    icon={FileText}
                    onClick={() => router.push(DASHBOARD_DEEP_LINKS.addDailyLog)}
                  />
                  <ActionButton
                    label="Review Payroll"
                    helper="Check time entries"
                    icon={CalendarDays}
                    onClick={() => router.push(DASHBOARD_DEEP_LINKS.reviewPayroll)}
                  />
                  <ActionButton
                    label={isManagementDashboard ? 'Approvals' : 'Announcements'}
                    helper={isManagementDashboard ? 'Review pending employees' : 'Read company updates'}
                    icon={isManagementDashboard ? UserCheck : Megaphone}
                    onClick={() => router.push(isManagementDashboard ? DASHBOARD_DEEP_LINKS.approvals : DASHBOARD_DEEP_LINKS.announcements)}
                  />
                </Card.Content>
              </Card>
            </div>
          </div>
        </div>

      </div>
    </main >
  )
}
