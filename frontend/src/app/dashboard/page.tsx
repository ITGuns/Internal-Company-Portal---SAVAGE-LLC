"use client";

import React, { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Card from '@/components/Card'
import Button from '@/components/Button'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Clock, CheckCircle2, AlertCircle, TrendingUp, ExternalLink, Send, Megaphone, Star, Trophy } from 'lucide-react'
import { fetchTasks, calculateWeeklyStats } from '@/lib/tasks'
import { fetchTimeEntries, getTotalMinutesForDate, type TimeEntry } from '@/lib/time-entries'
import { fetchAnnouncements, getTimeAgo, type Announcement } from '@/lib/announcements'
import { useRouter } from 'next/navigation'
import { useSocket } from '@/context/SocketContext'
import { fetchConversations, fetchMessages, sendMessage, type Message, type Conversation } from '@/lib/chat'
import TimeClock from '@/components/TimeClock'

function QuickLink({ title, subtitle, icon: Icon, onClick, href }: { title: string; subtitle?: string; icon: React.ComponentType<{ className?: string }>; onClick?: () => void; href?: string }) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      window.open(href, '_blank');
    }
  };

  return (
    <Card variant="interactive" padding="sm" onClick={handleClick}>
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-[var(--muted)]" />
        <div className="flex-1">
          <div className="font-medium text-sm text-[var(--foreground)]">{title}</div>
          {subtitle && <div className="text-xs text-[var(--muted)] mt-1">{subtitle}</div>}
        </div>
        <ExternalLink className="w-3 h-3 text-[var(--muted)]" />
      </div>
    </Card>
  )
}

import { useUser } from '@/contexts/UserContext'

export default function DashboardPage() {
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [weekTasks, setWeekTasks] = useState({ total: 0, completed: 0, inProgress: 0, overdue: 0 });
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [recentShoutouts, setRecentShoutouts] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const { user, isLoading: userLoading } = useUser();

  // Chat State
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const chatScrollRef = React.useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      try {
        const today = new Date().toISOString().slice(0, 10);

        // Fetch Tasks (Separate from others so failure doesn't block)
        try {
          const tasks = await fetchTasks();
          setWeekTasks(calculateWeeklyStats(tasks));
        } catch (e) { console.error('Tasks load failed', e); }

        // Fetch Time Entries
        try {
          const entries = await fetchTimeEntries();
          const minutes = getTotalMinutesForDate(entries, today);
          setTodayMinutes(minutes);
        } catch (e) { console.error('Time logs load failed', e); }

        // Fetch Announcements & Shoutouts
        try {
          const announcements = await fetchAnnouncements();
          const sortedAnnouncements = [...announcements].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setRecentAnnouncements(sortedAnnouncements.slice(0, 3));
          setRecentShoutouts(sortedAnnouncements.filter(a => a.category === 'shoutouts').slice(0, 3));
        } catch (e) { console.error('Announcements load failed', e); }

      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

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
  }, [socket, activeConversation]);

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
      setNewMessage(content); // Put back for retry
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
      <main className="main-content-height bg-[var(--background)] text-[var(--foreground)] p-6">
        <Header />
        <LoadingSpinner message="Loading dashboard..." />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="main-content-height bg-[var(--background)] text-[var(--foreground)] p-6">
        <Header />
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <h2 className="text-2xl font-bold mb-4">Please Log In</h2>
          <p className="text-[var(--muted)] mb-6">You need to be logged in to view the dashboard.</p>
          <Button onClick={() => window.location.href = '/dev-login'}>Go to Login</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
      <div className="p-6 pt-3">
        <Header />

        {user && (
          <div className="mt-8 mb-4 flex justify-between items-center bg-gradient-to-r from-blue-600/10 to-indigo-600/10 p-6 rounded-3xl border border-blue-500/20">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-bold text-[var(--foreground)]">Track Your Work Hours</h2>
              <p className="text-sm text-[var(--muted)]">Every minute counts towards your next payslip. Don't forget to Clock In!</p>
            </div>
            <TimeClock />
          </div>
        )}

        {/* Stats Overview */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-500/10">
                <Clock className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">Today&apos;s Time</div>
                <div className="text-lg font-semibold">{formatHours(todayMinutes)}</div>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/10">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">This Week</div>
                <div className="text-lg font-semibold">{weekTasks.total} Tasks</div>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">Completed</div>
                <div className="text-lg font-semibold">{weekTasks.completed}</div>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/10">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">Overdue</div>
                <div className="text-lg font-semibold">{weekTasks.overdue}</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></span>
                    <span className="text-[10px] text-[var(--muted)]">{onlineCount > 0 ? `${onlineCount} online` : 'Active'}</span>
                  </div>
                </div>
              </Card.Header>

              <div
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--card-surface)] chat-scroll"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                    <Send className="w-8 h-8 mx-auto text-[var(--muted)] mb-2" />
                    <div className="text-xs text-[var(--muted)]">No messages yet</div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = String(msg.senderId) === String(user?.id);
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        {!isMe && <span className="text-[10px] text-[var(--muted)] mb-0.5 ml-1">{msg.sender.name}</span>}
                        <div className={`px-3 py-1.5 rounded-2xl text-xs max-w-[85%] ${isMe
                          ? 'bg-[var(--accent)] text-white rounded-tr-none'
                          : 'bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] rounded-tl-none'
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
                    className="flex-1 p-2 text-xs rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={!isConnected || !activeConversation}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending || !isConnected}
                    aria-label="Send message"
                    className="p-2 rounded bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-30 transition-all active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </Card.Footer>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <Card variant="elevated" className="overflow-hidden">
              <Card.Header>
                <h3 className="font-semibold text-sm">Company Announcements</h3>
                <a href="/announcements" className="text-sm text-[var(--muted)] hover:underline">View All</a>
              </Card.Header>

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
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <Card variant="elevated" className="overflow-hidden self-start">
                <Card.Header>
                  <h4 className="font-semibold">Recent Shoutouts</h4>
                  <a href="/announcements" className="text-sm text-[var(--muted)] hover:underline">View All</a>
                </Card.Header>

                {recentShoutouts.length === 0 ? (
                  <div className="p-8 text-center bg-[var(--card-surface)]">
                    <Star className="w-12 h-12 mx-auto text-[var(--muted)] opacity-50 mb-3" />
                    <div className="text-sm text-[var(--muted)]">No shoutouts yet</div>
                  </div>
                ) : (
                  <Card.Content className="space-y-3">
                    {recentShoutouts.map(shoutout => (
                      <Card key={shoutout.id} padding="sm">
                        <div className="flex items-start gap-2 mb-1">
                          <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{shoutout.title}</div>
                            <div className="text-xs text-[var(--muted)] mt-1 line-clamp-2">{shoutout.body}</div>
                            <div className="text-xs text-[var(--muted)] mt-2">{getTimeAgo(shoutout.timestamp)}</div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </Card.Content>
                )}
              </Card>

              <Card variant="elevated" className="overflow-hidden">
                <Card.Header>
                  <h4 className="font-semibold">Quick Actions</h4>
                </Card.Header>

                <Card.Content className="grid grid-cols-2 gap-3 items-start">
                  <button onClick={() => router.push('/task-tracking')} className="py-2 px-3 bg-[var(--background)] rounded text-xs text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--card-surface)] hover:shadow-sm transition">New Task</button>
                  <button onClick={() => router.push('/payroll-calendar')} className="py-2 px-3 bg-[var(--background)] rounded text-xs text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--card-surface)] hover:shadow-sm transition">Schedule</button>
                  <button onClick={() => router.push('/announcements')} className="py-2 px-3 bg-[var(--background)] rounded text-xs text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--card-surface)] hover:shadow-sm transition">Announce</button>
                  <button onClick={() => router.push('/announcements')} className="py-2 px-3 bg-[var(--background)] rounded text-xs text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--card-surface)] hover:shadow-sm transition">Shoutout</button>
                </Card.Content>
              </Card>
            </div>
          </div>
        </div>

      </div>
    </main >
  )
}
