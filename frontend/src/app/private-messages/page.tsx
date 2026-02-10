
"use client"

import React, { useEffect, useState, useRef } from 'react'
import Header from '@/components/Header'
import Card from '@/components/Card'
import Button from '@/components/Button'
import { Send, User, Search, MessageSquare, Loader2, Paperclip, Plus, X } from 'lucide-react'
import { fetchConversations, fetchMessages, sendMessage, createConversation, type Message, type Conversation } from '@/lib/chat'
import { fetchUsers, type User as SystemUser } from '@/lib/users'
import { useSocket } from '@/context/SocketContext'

export default function PrivateMessagesPage() {
  const { socket } = useSocket()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showNewChat, setShowNewChat] = useState(false)
  const [users, setUsers] = useState<SystemUser[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load initial data
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser') || localStorage.getItem('user')
    if (storedUser) setCurrentUser(JSON.parse(storedUser))

    async function load() {
      try {
        const [convData, userData] = await Promise.all([
          fetchConversations(),
          fetchUsers()
        ])
        setConversations(convData.filter(c => c.type === 'direct'))
        setUsers(userData)

        if (convData.length > 0) {
          const firstDirect = convData.find(c => c.type === 'direct')
          if (firstDirect) setSelectedId(firstDirect.id)
        }
      } catch (err) {
        console.error("Failed to load data", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Fetch messages
  useEffect(() => {
    if (!selectedId) return
    async function loadMessages() {
      if (!selectedId) return
      try {
        const data = await fetchMessages(selectedId)
        setMessages(data)
        if (socket) socket.emit('join:conversation', selectedId)
      } catch (err) {
        console.error("Failed to load messages", err)
      }
    }
    loadMessages()
  }, [selectedId, socket])

  // Real-time
  useEffect(() => {
    if (!socket) return
    const handleNewMessage = (msg: Message) => {
      if (msg.conversationId === selectedId) {
        setMessages(prev => [...prev, msg])
      }
      // Update sidebar
      setConversations(prev => {
        const existing = prev.find(c => c.id === msg.conversationId)
        if (existing) {
          return prev.map(c => c.id === msg.conversationId ? { ...c, updatedAt: msg.createdAt } : c)
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        }
        return prev // Might need to fetch if it's a completely new direct chat
      })
    }
    socket.on('chat:message', handleNewMessage)
    return () => { socket.off('chat:message', handleNewMessage) }
  }, [socket, selectedId])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!newMessage.trim() || !selectedId || sending) return
    try {
      setSending(true)
      await sendMessage(selectedId, newMessage.trim())
      setNewMessage('')
    } finally { setSending(false) }
  }

  const startChat = async (targetUser: SystemUser) => {
    try {
      const conv = await createConversation('direct', [targetUser.id])
      if (!conversations.find(c => c.id === conv.id)) {
        setConversations(prev => [conv, ...prev])
      }
      setSelectedId(conv.id)
      setShowNewChat(false)
    } catch (err) {
      console.error("Failed to start chat", err)
    }
  }

  const getOtherParticipant = (conv: Conversation) => {
    return conv.participants.find(p => p.userId !== currentUser?.id)?.user
  }

  const selectedConv = conversations.find(c => c.id === selectedId)
  const otherUser = selectedConv ? getOtherParticipant(selectedConv) : null

  if (loading) return (
    <div className="flex flex-col h-[calc(100vh-112px)]">
      <Header title="Private Messages" />
      <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>
    </div>
  )

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] overflow-hidden">
      <Header title="Private Messages" subtitle={otherUser?.name || "Select a member"} />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Conversations Sidebar */}
        <div className="w-80 border-r border-[var(--border)] bg-[var(--card-surface)] flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
            <h3 className="text-sm font-semibold">Messages</h3>
            <Button variant="ghost" size="sm" className="p-1 h-8 w-8" onClick={() => setShowNewChat(true)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map(c => {
              const other = getOtherParticipant(c)
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left p-4 border-b border-[var(--border)] transition-colors flex items-center gap-3 ${selectedId === c.id ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--background)]'
                    }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--background)] flex items-center justify-center overflow-hidden border border-[var(--border)]">
                    {other?.avatar ? <img src={other.avatar} alt="" className="w-full h-full object-cover" /> : <User className="w-6 h-6 opacity-40" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${selectedId === c.id ? 'text-white' : 'text-[var(--foreground)]'}`}>
                      {other?.name || 'Unknown User'}
                    </p>
                    <p className={`text-xs truncate ${selectedId === c.id ? 'text-white/70' : 'text-[var(--muted)]'}`}>
                      Last active: {new Date(c.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              )
            })}
            {conversations.length === 0 && (
              <div className="p-8 text-center text-sm text-[var(--muted)]">No messages yet.</div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-[var(--background)] h-full overflow-hidden">
          {!selectedId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--muted)]">
              <MessageSquare className="w-16 h-16 opacity-10 mb-4" />
              <p>Select a message to start chatting</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowNewChat(true)}>New Message</Button>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg, i) => {
                  const myId = currentUser?.id || currentUser?.userId
                  const isMe = msg.senderId === myId
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-[var(--accent)] text-white rounded-tr-none' : 'bg-[var(--card-surface)] border border-[var(--border)] rounded-tl-none'
                        }`}>
                        {msg.content}
                        <div className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-[var(--muted)]'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {messages.length === 0 && <div className="text-center py-20 text-[var(--muted)] text-sm">No messages.</div>}
              </div>

              <div className="p-4 bg-[var(--card-surface)] border-t border-[var(--border)]">
                <form onSubmit={handleSend} className="flex gap-2">
                  <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                  <button type="submit" disabled={!newMessage.trim() || sending} className="p-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-all"><Send className="w-5 h-5" /></button>
                </form>
              </div>
            </>
          )}
        </div>

        {/* New Chat Modal Over */}
        {showNewChat && (
          <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center p-4">
            <Card className="w-full max-w-md h-[400px] flex flex-col overflow-hidden">
              <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
                <h3 className="font-semibold">New Message</h3>
                <button onClick={() => setShowNewChat(false)}><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--muted)]" />
                  <input
                    placeholder="Search people..."
                    className="w-full pl-10 pr-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {users.filter(u => u.id !== currentUser?.id && u.name?.toLowerCase().includes(searchQuery.toLowerCase())).map(u => (
                  <button
                    key={u.id}
                    onClick={() => startChat(u)}
                    className="w-full text-left p-2 hover:bg-[var(--background)] rounded-lg flex items-center gap-3 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--card-surface)] border border-[var(--border)] flex items-center justify-center">
                      {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : <User className="w-6 h-6 opacity-30" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{u.name}</p>
                      <p className="text-xs text-[var(--muted)]">{u.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
