
"use client"

import React, { useEffect, useState, useRef } from 'react'
import Header from '@/components/Header'
import Card from '@/components/Card'
import Button from '@/components/Button'
import { Send, Hash, Users, MessageSquare, Loader2, Paperclip } from 'lucide-react'
import { fetchConversations, fetchMessages, sendMessage, createConversation, type Message, type Conversation } from '@/lib/chat'
import { useSocket } from '@/context/SocketContext'

export default function CompanyChatPage() {
  const { socket, isConnected } = useSocket()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load/Poll user data
  useEffect(() => {
    const updateUser = () => {
      const stored = localStorage.getItem('currentUser') || localStorage.getItem('user')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (JSON.stringify(parsed) !== JSON.stringify(currentUser)) {
            setCurrentUser(parsed)
          }
        } catch (e) { }
      }
    }

    updateUser()
    const interval = setInterval(updateUser, 1000)
    return () => clearInterval(interval)
  }, [currentUser])

  // Load initial data
  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchConversations()
        setConversations(data)
        if (data.length > 0 && !selectedId) {
          setSelectedId(data[0].id)
        }
      } catch (err: any) {
        console.warn("Retrying fetch in 2s...", err)
        // If it fails (maybe token not ready), try once more after 2s
        setTimeout(async () => {
          try {
            const data = await fetchConversations()
            setConversations(data)
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
        if (prev.some(m => m.id === msg.id)) return prev
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
    return () => {
      socket.off('chat:message', handleNewMessage)
    }
  }, [socket, selectedId])

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
      senderId: currentUser?.id,
      conversationId: selectedId,
      createdAt: new Date().toISOString(),
      sender: currentUser || { name: 'Me' }
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

  const selectedConv = conversations.find(c => c.id === selectedId)

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-112px)]">
        <Header title="Company Chat" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
        </div>
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
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.filter(c => c.type !== 'direct').map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-2 text-sm ${selectedId === c.id
                  ? 'bg-[var(--accent)] text-white'
                  : 'hover:bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
              >
                <Hash className="w-4 h-4 opacity-70" />
                <span className="truncate">{c.name || 'Group Chat'}</span>
              </button>
            ))}
            {conversations.filter(c => c.type !== 'direct').length === 0 && (
              <div className="p-4 text-center text-xs text-[var(--muted)]">
                No public channels found.
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-[var(--border)] px-2">
              <Button variant="outline" size="sm" fullWidth className="text-xs" onClick={() => {/* TODO: Create Dialog */ }}>
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
                className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
              >
                {messages.map((msg, i) => {
                  const myEmail = currentUser?.email
                  const myId = currentUser?.id || currentUser?.userId || currentUser?._id
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
                })}
                {messages.length === 0 && (
                  <div className="text-center py-20 text-[var(--muted)] flex flex-col items-center">
                    <div className="p-3 rounded-full bg-[var(--card-surface)] mb-4">
                      <MessageSquare className="w-6 h-6 opacity-30" />
                    </div>
                    <p className="text-sm">No messages yet. Say hi! 👋</p>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-[var(--border)] bg-[var(--card-surface)]">
                <form onSubmit={handleSend} className="flex items-center gap-3">
                  <button type="button" className="p-2 text-[var(--muted)] hover:text-[var(--accent)] transition-colors">
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
                    className="p-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-all active:scale-95"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
