
"use client"

import React, { useEffect, useState, useRef } from 'react'
import Header from '@/components/Header'
import Card from '@/components/Card'
import Button from '@/components/Button'
import EmptyState from '@/components/ui/EmptyState'
import { Send, Hash, Users, MessageSquare, Loader2, Paperclip, Plus, X, Trash2, Search, User } from 'lucide-react'
import { fetchConversations, fetchMessages, sendMessage, createConversation, deleteConversation, type Message, type Conversation } from '@/lib/chat'
import { fetchUsers, type User as SystemUser } from '@/lib/users'
import { useSocket } from '@/context/SocketContext'
import { useUser } from '@/contexts/UserContext'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function CompanyChatPage() {
  const { socket, isConnected } = useSocket()
  const { user: currentUser } = useUser()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [showNewChannel, setShowNewChannel] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [users, setUsers] = useState<SystemUser[]>([])

  // Load initial data
  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const [data, userData] = await Promise.all([
          fetchConversations(),
          fetchUsers()
        ])
        setConversations(data)
        setUsers(userData)
        if (data.length > 0 && !selectedId) {
          setSelectedId(data[0].id)
        }
      } catch (err: any) {
        console.warn("Retrying fetch in 2s...", err)
        // If it fails (maybe token not ready), try once more after 2s
        setTimeout(async () => {
          try {
            const [data, userData] = await Promise.all([
              fetchConversations(),
              fetchUsers()
            ])
            setConversations(data)
            setUsers(userData)
            setError(null)
          } catch (e) {
            setError("Failed to load channels.")
          }
        }, 2000)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentUser, selectedId])

  // Fetch messages when conversation changes
  useEffect(() => {
    if (!selectedId) return

    async function loadMessages() {
      if (!selectedId) return
      try {
        const data = await fetchMessages(selectedId)
        // lib/chat.ts already reverses messages to ASC order
        setMessages(data)

        // Join room for real-time updates
        if (socket) {
          socket.emit('join:conversation', selectedId)
        }
      } catch (err) {
        console.error("Failed to load messages", err)
      }
    }
    loadMessages()
  }, [selectedId, socket])

  // Listen for new messages
  useEffect(() => {
    if (!socket) return

    const handleNewMessage = (msg: Message) => {
      // Only add if not already present (optimistic update fallback)
      setMessages(prev => {
        // Prevent duplicates by ID
        if (prev.some(m => m.id === msg.id)) return prev;

        // Handle race condition: check if this is a real message replacing our optimistic one
        const isFromMe = String(msg.senderId) === String(currentUser?.id);
        if (isFromMe) {
          const tempIndex = prev.findIndex(m => m.id.startsWith('temp-') && m.content === msg.content);
          if (tempIndex !== -1) {
            const next = [...prev];
            next[tempIndex] = msg;
            return next;
          }
        }

        if (msg.conversationId === selectedId) {
          return [...prev, msg]
        }
        return prev
      })

      // Update last message in conversations list
      setConversations(prev => prev.map(c =>
        c.id === msg.conversationId ? { ...c, updatedAt: msg.createdAt } : c
      ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()))
    }

    socket.on('chat:message', handleNewMessage)

    const handleUserLeft = ({ userId, conversationId }: { userId: string, conversationId: string }) => {
      if (userId === String(currentUser?.id)) {
        setConversations(prev => prev.filter(c => c.id !== conversationId))
        if (selectedId === conversationId) setSelectedId(null)
      }
    }
    socket.on('chat:user_left', handleUserLeft)

    return () => {
      socket.off('chat:message', handleNewMessage)
      socket.off('chat:user_left', handleUserLeft)
    }
  }, [socket, selectedId, currentUser])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!newMessage.trim() || !selectedId || sending) return

    const content = newMessage.trim()
    const tempId = `temp-${Date.now()}`

    // Optimistic update
    const optimisticMsg: Message = {
      id: tempId,
      content,
      senderId: currentUser?.id ? String(currentUser.id) : '',
      conversationId: selectedId,
      createdAt: new Date().toISOString(),
      sender: {
        id: currentUser?.id ? String(currentUser.id) : '',
        name: currentUser?.name || 'Me',
        avatar: currentUser?.avatar || '',
        email: currentUser?.email || ''
      }
    }

    setMessages(prev => [...prev, optimisticMsg])
    setNewMessage('')

    try {
      setSending(true)
      setError(null)
      const result = await sendMessage(selectedId, content)

      if ((result as any).error) {
        throw new Error((result as any).error)
      }

      // Replace temporary message with real one from server
      setMessages(prev => prev.map(m => m.id === tempId ? result : m))
    } catch (err: any) {
      console.error("Failed to send message", err)
      setError(err.message || "Failed to send message")
      // Remove failed optimistic message
      setMessages(prev => prev.filter(m => m.id !== tempId))
      // Put message back in input for retry
      setNewMessage(content)
    } finally {
      setSending(false)
    }
  }

  const startChannel = async () => {
    if (!newChannelName.trim()) {
      alert("Channel name is required")
      return
    }
    if (selectedUsers.length === 0) {
      alert("Please select at least one member")
      return
    }

    try {
      const conv = await createConversation('channel', selectedUsers, newChannelName.trim())
      if (!conversations.find(c => c.id === conv.id)) {
        setConversations(prev => [conv, ...prev])
      }
      setSelectedId(conv.id)
      setShowNewChannel(false)
      setNewChannelName('')
      setSelectedUsers([])
      setSearchQuery('')
    } catch (err) {
      console.error("Failed to start channel", err)
      alert("Failed to create channel")
    }
  }

  const handleDeleteConversation = async (conversationId: string) => {
    if (!confirm('Are you sure you want to delete this channel?')) return
    try {
      await deleteConversation(conversationId)
      setConversations(prev => prev.filter(c => c.id !== conversationId))
      if (selectedId === conversationId) setSelectedId(null)
    } catch (err) {
      console.error("Failed to delete conversation", err)
    }
  }

  const selectedConv = conversations.find(c => c.id === selectedId)

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-112px)]">
        <Header title="Company Chat" />
        <LoadingSpinner message="Loading chat..." />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] overflow-hidden">
      <Header title="Company Chat" subtitle={selectedConv?.name || "Global Communication"} />

      <div className="flex flex-1 overflow-hidden">
        {/* Conversations Sidebar */}
        <div className="w-64 border-r border-[var(--border)] bg-[var(--card-surface)] flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-[var(--border)]">
            <h3 className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Channels
              </span>
              <span
                className={`w-2 h-2 rounded-full cursor-help ${isConnected ? 'bg-green-500' : 'bg-red-500'} shadow-[0_0_8px_rgba(34,197,94,0.5)]`}
                title={isConnected ? 'Connected' : 'Disconnected. Click for info'}
                onClick={() => !isConnected && alert(`Chat server connection failed. Check if backend is running on port 4000. Try refreshing.`)}
              ></span>
            </h3>
          </div>
          {error && (
            <div className="p-3 m-2 bg-red-500/10 border border-red-500/20 rounded-md flex flex-col items-center gap-1">
              <span className="text-[10px] text-red-500 text-center">{error}</span>
              <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => window.location.reload()}>Retry</Button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 chat-scroll">
            {conversations.filter(c => c.type !== 'direct').map(c => (
              <div key={c.id} className="relative group">
                <button
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-2 text-sm ${selectedId === c.id
                    ? 'bg-[var(--accent)] text-white'
                    : 'hover:bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)]'
                    }`}
                >
                  <Hash className="w-4 h-4 opacity-70" />
                  <span className="truncate">{c.name || 'Group Chat'}</span>
                </button>
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteConversation(c.id)
                  }}
                  className={`absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-full cursor-pointer transition-all z-10 ${selectedId === c.id
                    ? 'bg-white text-red-600 hover:bg-gray-100'
                    : 'hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400'
                    }`}
                  title="Delete Channel"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
            {conversations.filter(c => c.type !== 'direct').length === 0 && (
              <div className="p-4 text-center text-xs text-[var(--muted)]">
                No public channels found.
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-[var(--border)] px-2">
              <Button variant="outline" size="sm" fullWidth className="text-xs" onClick={() => setShowNewChannel(true)}>
                <Users className="w-3 h-3 mr-1" /> New Channel
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-[var(--background)] h-full overflow-hidden">
          {!selectedId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--muted)]">
              <MessageSquare className="w-16 h-16 opacity-10 mb-4" />
              <p>Select a channel to start chatting</p>
            </div>
          ) : (
            <>
              {/* Messages List */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth chat-scroll"
              >
                {messages.map((msg, i) => {
                  const myEmail = currentUser?.email
                  const myId = currentUser?.id ? String(currentUser.id) : undefined
                  const isMe = (myId && msg.senderId === myId) || (myEmail && msg.sender?.email === myEmail)
                  const showHeader = i === 0 || messages[i - 1].senderId !== msg.senderId

                  return (
                    <div key={msg.id} className={`flex flex-col mb-4 ${isMe ? 'items-end' : 'items-start'}`}>
                      {showHeader && !isMe && (
                        <div className="flex items-center gap-2 mb-1 pl-1">
                          <span className="text-xs font-semibold text-[var(--foreground)]">{msg.sender.name}</span>
                          <span className="text-[10px] text-[var(--muted)]">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                      <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm shadow-sm relative group ${isMe
                        ? 'bg-[var(--accent)] text-white rounded-tr-none'
                        : 'bg-[var(--card-surface)] text-[var(--foreground)] border border-[var(--border)] rounded-tl-none'
                        }`}>
                        {msg.content}

                        {/* Timestamp on hover for my messages */}
                        {isMe && (
                          <div className="absolute -bottom-4 right-0 text-[9px] text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                      {isMe && i === messages.length - 1 && (
                        <div className="text-[10px] text-[var(--muted)] mt-1 pr-1 italic">
                          {msg.id.startsWith('temp-') ? 'Sending...' : 'Sent'}
                        </div>
                      )}
                    </div>
                  )
                })}                {messages.length === 0 && (
                  <EmptyState
                    icon={MessageSquare}
                    title="No messages yet"
                    description="Say hi! 👋 Start a conversation with your team."
                    variant="compact"
                  />
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-[var(--border)] bg-[var(--card-surface)]">
                <form onSubmit={handleSend} className="flex items-center gap-3">
                  <button type="button" className="p-2 text-[var(--muted)] hover:text-[var(--accent)] transition-colors" aria-label="Attach file">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Message #${selectedConv?.name || 'channel'}...`}
                    className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="p-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-all active:scale-95" aria-label="Send message"                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

        {/* New Channel Modal */}
        {showNewChannel && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md h-[550px] flex flex-col overflow-hidden shadow-xl">
              <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
                <h3 className="font-semibold">New Channel</h3>
                <button onClick={() => setShowNewChannel(false)} aria-label="Close"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-4 border-b border-[var(--border)] flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">Channel Name</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-2 w-4 h-4 text-[var(--muted)]" />
                    <input
                      placeholder="e.g. project-updates"
                      className="w-full pl-9 pr-4 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">Search Members to Add</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2 w-4 h-4 text-[var(--muted)]" />
                    <input
                      placeholder="Search people..."
                      className="w-full pl-9 pr-4 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--background)]/50 text-xs font-semibold text-[var(--muted)] items-center flex justify-between">
                <span>Select Members ({selectedUsers.length} selected)</span>
                <button
                  className={`text-[var(--accent)] hover:underline ${selectedUsers.length === users.filter(u => u.id !== String(currentUser?.id)).length ? 'hidden' : ''}`}
                  onClick={() => setSelectedUsers(users.filter(u => u.id !== String(currentUser?.id)).map(u => u.id))}
                >
                  Select All
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 chat-scroll">
                {users.filter(u => u.id !== String(currentUser?.id) && u.name?.toLowerCase().includes(searchQuery.toLowerCase())).map(u => {
                  const isSelected = selectedUsers.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        setSelectedUsers(prev =>
                          isSelected ? prev.filter(id => id !== u.id) : [...prev, u.id]
                        );
                      }}
                      className={`w-full text-left p-2 hover:bg-[var(--background)] rounded-lg flex items-center justify-between gap-3 transition-colors ${isSelected ? 'bg-[var(--accent)]/10' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--card-surface)] border border-[var(--border)] flex items-center justify-center">
                          {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 opacity-30" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-[var(--foreground)]">{u.name}</p>
                          <p className="text-xs text-[var(--muted)]">{u.email}</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--muted)]'}`}>
                        {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="p-4 border-t border-[var(--border)]">
                <Button variant="primary" fullWidth onClick={startChannel} disabled={!newChannelName.trim() || selectedUsers.length === 0}>
                  Create Channel
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
