
"use client"

import React, { useEffect, useState, useRef } from 'react'
import Header from '@/components/Header'
import Card from '@/components/Card'
import Button from '@/components/Button'
import { Send, Hash, Users, MessageSquare, Loader2, Paperclip, Plus, X, Trash2, Search, User } from 'lucide-react'
import { fetchConversations, fetchMessages, sendMessage, createConversation, deleteMessage, deleteConversation, type Message, type Conversation } from '@/lib/chat'
import { fetchUsers, type User as SystemUser } from '@/lib/users'
import { useSocket } from '@/context/SocketContext'
import { useUser } from '@/contexts/UserContext'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function UnifiedChatPage() {
    const { socket, isConnected } = useSocket()
    const { user: currentUser } = useUser()
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [showNewChat, setShowNewChat] = useState(false)
    const [showCreateChannel, setShowCreateChannel] = useState(false)
    const [newChannelName, setNewChannelName] = useState('')
    const [users, setUsers] = useState<SystemUser[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const scrollRef = useRef<HTMLDivElement>(null)

    const handleCreateChannel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChannelName.trim()) return;

        try {
            // For now, creating a channel requires at least 2 people per backend rules.
            // We'll add the first available other user automatically for demo/simplicity, 
            // or we could show a participant selector. 
            // Let's just use the current user and the first other user found.
            const firstOtherUser = users.find(u => u.id !== String(currentUser?.id));
            if (!firstOtherUser) {
                alert("You need at least one other user in the system to create a channel.");
                return;
            }

            const conv = await createConversation('channel', [firstOtherUser.id], newChannelName.trim());
            setConversations(prev => [conv, ...prev]);
            setSelectedId(conv.id);
            setShowCreateChannel(false);
            setNewChannelName('');
        } catch (err) {
            console.error("Failed to create channel", err);
            alert("Failed to create channel. (Make sure you have at least one other member in the team)");
        }
    };

    // Load initial data
    useEffect(() => {
        async function load() {
            try {
                setLoading(true)
                setError(null)
                const [convData, userData] = await Promise.all([
                    fetchConversations().catch(err => {
                        console.warn("Retrying fetch in 2s...", err)
                        return new Promise<Conversation[]>((resolve) => {
                            setTimeout(async () => {
                                try {
                                    resolve(await fetchConversations())
                                } catch (e) {
                                    setError("Failed to load conversations.")
                                    resolve([])
                                }
                            }, 2000)
                        })
                    }),
                    fetchUsers()
                ])

                setConversations(convData)
                setUsers(userData)

                if (convData.length > 0 && !selectedId) {
                    // Default to the first conversation (usually a channel)
                    const defaultConv = convData.find(c => c.type !== 'direct') || convData[0]
                    setSelectedId(defaultConv.id)
                }
            } catch (err: any) {
                console.error("Initial load failed", err)
                setError("Failed to load data.")
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [currentUser])

    // Fetch messages when conversation changes
    useEffect(() => {
        if (!selectedId) return

        async function loadMessages() {
            if (!selectedId) return
            try {
                const data = await fetchMessages(selectedId)
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

    // Listen for real-time events
    useEffect(() => {
        if (!socket) return

        const handleNewMessage = (msg: Message) => {
            // Update sidebar sorting/last activity
            setConversations(prev => {
                const existing = prev.find(c => c.id === msg.conversationId)
                if (existing) {
                    return prev.map(c =>
                        c.id === msg.conversationId ? { ...c, updatedAt: msg.createdAt } : c
                    ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                } else {
                    // If it's a new conversation we don't have yet, might need to re-fetch or wait
                    // For now let's just keep as is, it'll show up on refresh
                    return prev
                }
            })

            // Add message to current view if it belongs here
            if (msg.conversationId === selectedId) {
                setMessages(prev => {
                    // Prevent duplicates by ID (e.g. from multiple socket events)
                    if (prev.some(m => m.id === msg.id)) return prev

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

                    return [...prev, msg]
                })
            }
        }

        const handleMessageDeleted = ({ messageId, conversationId }: { messageId: string, conversationId: string }) => {
            if (conversationId === selectedId) {
                setMessages(prev => prev.filter(m => m.id !== messageId))
            }
        }

        socket.on('chat:message', handleNewMessage)
        socket.on('chat:message_deleted', handleMessageDeleted)

        return () => {
            socket.off('chat:message', handleNewMessage)
            socket.off('chat:message_deleted', handleMessageDeleted)
        }
    }, [socket, selectedId])

    // Scroll to bottom
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
        const myId = currentUser?.id ? String(currentUser.id) : ''
        const optimisticMsg: Message = {
            id: tempId,
            content,
            senderId: myId,
            conversationId: selectedId,
            createdAt: new Date().toISOString(),
            sender: {
                id: myId,
                name: currentUser?.name || 'Me',
                avatar: currentUser?.avatar || '',
                email: currentUser?.email || ''
            }
        }

        setMessages(prev => [...prev, optimisticMsg])
        setNewMessage('')

        try {
            setSending(true)
            const result = await sendMessage(selectedId, content)
            // Replace temp with real
            setMessages(prev => prev.map(m => m.id === tempId ? result : m))
        } catch (err: any) {
            console.error("Send failed", err)
            setMessages(prev => prev.filter(m => m.id !== tempId))
            setNewMessage(content)
            alert("Failed to send message")
        } finally {
            setSending(false)
        }
    }

    const startPrivateChat = async (targetUser: SystemUser) => {
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

    const handleDeleteMessage = async (messageId: string) => {
        if (!confirm('Delete this message?')) return
        try {
            await deleteMessage(messageId)
            setMessages(prev => prev.filter(m => m.id !== messageId))
        } catch (err) { console.error(err) }
    }

    const handleDeleteConversation = async (conversationId: string) => {
        if (!confirm('Delete this conversation history?')) return
        try {
            await deleteConversation(conversationId)
            setConversations(prev => prev.filter(c => c.id !== conversationId))
            if (selectedId === conversationId) setSelectedId(null)
        } catch (err) { console.error(err) }
    }

    const getOtherParticipant = (conv: Conversation) => {
        return conv.participants.find(p => p.userId !== (currentUser?.id ? String(currentUser.id) : undefined))?.user
    }

    const selectedConv = conversations.find(c => c.id === selectedId)
    const isDirect = selectedConv?.type === 'direct'
    const otherUser = isDirect ? getOtherParticipant(selectedConv!) : null

    const channels = conversations.filter(c => c.type !== 'direct')
    const directMessages = conversations.filter(c => c.type === 'direct')

    if (loading) {
        return (
            <div className="flex flex-col h-[calc(100vh-112px)]">
                <Header title="Company Chat" />
                <LoadingSpinner message="Loading messages..." />
            </div>
        )
    }

    return (
        <div className="flex flex-col h-[calc(100vh-112px)] overflow-hidden">
            <Header
                title="Chat & Messages"
                subtitle={isDirect ? `Direct Message with ${otherUser?.name}` : `# ${selectedConv?.name || "Select a channel"}`}
            />

            <div className="flex flex-1 overflow-hidden relative">
                {/* Sidebar */}
                <div className="w-72 border-r border-[var(--border)] bg-[var(--card-surface)] flex flex-col h-full overflow-hidden">

                    {/* Channels Section */}
                    <div className="p-4 border-b border-[var(--border)]">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-2">
                                <Hash className="w-3.5 h-3.5" /> Channels
                            </h3>
                            <button
                                onClick={() => setShowCreateChannel(true)}
                                className="p-1 hover:bg-[var(--background)] rounded-md text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
                                title="Create Channel"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-1">
                            {channels.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => setSelectedId(c.id)}
                                    className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-all flex items-center gap-2 ${selectedId === c.id
                                        ? 'bg-[var(--accent)] text-white shadow-sm'
                                        : 'text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]'
                                        }`}
                                >
                                    <Hash className={`w-4 h-4 ${selectedId === c.id ? 'opacity-100' : 'opacity-40'}`} />
                                    <span className="truncate">{c.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Direct Messages Section */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-4 flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-2">
                                <Users className="w-3.5 h-3.5" /> Direct Messages
                            </h3>
                            <button
                                onClick={() => setShowNewChat(true)}
                                className="p-1 hover:bg-[var(--background)] rounded-md text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
                                title="New Message"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 chat-scroll">
                            {directMessages.map(c => {
                                const other = getOtherParticipant(c)
                                const isActive = selectedId === c.id
                                return (
                                    <button
                                        key={c.id}
                                        onClick={() => setSelectedId(c.id)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-3 group relative ${isActive
                                            ? 'bg-[var(--accent)] text-white shadow-md'
                                            : 'text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]'
                                            }`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-[var(--background)] border border-[var(--border)] overflow-hidden flex-shrink-0">
                                            {other?.avatar ? (
                                                <img src={other.avatar} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-[var(--accent)] text-white text-[10px] font-bold">
                                                    {other?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium truncate ${isActive ? 'text-white' : 'text-[var(--foreground)]'}`}>
                                                {other?.name || 'Unknown'}
                                            </p>
                                            <p className={`text-[10px] truncate opacity-70`}>
                                                {new Date(c.updatedAt).toLocaleDateString()}
                                            </p>
                                        </div>

                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteConversation(c.id); }}
                                            className={`absolute right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-red-500 text-white transition-opacity ${isActive ? 'bg-white text-red-500' : ''}`}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </button>
                                )
                            })}
                            {directMessages.length === 0 && (
                                <div className="px-3 py-4 text-center text-xs text-[var(--muted)] italic">
                                    No private chats yet
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Connection Status Footer */}
                    <div className="p-3 border-t border-[var(--border)] bg-[var(--background)] flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500'}`} />
                        <span className="text-[10px] text-[var(--muted)] font-medium">
                            {isConnected ? 'Connected to chat' : 'Reconnecting...'}
                        </span>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-[var(--background)] h-full overflow-hidden">
                    {!selectedId ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-[var(--muted)] p-8 text-center">
                            <div className="w-20 h-20 bg-[var(--card-surface)] rounded-full flex items-center justify-center mb-6 shadow-sm">
                                <MessageSquare className="w-10 h-10 opacity-20" />
                            </div>
                            <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">Your Conversations</h3>
                            <p className="max-w-xs text-sm">Select a channel or message from the sidebar to start chatting with your team.</p>
                            <Button variant="primary" size="md" className="mt-6" onClick={() => setShowNewChat(true)}>
                                Start a New Discussion
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Messages Container */}
                            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 chat-scroll">
                                {messages.map((msg, i) => {
                                    const myId = currentUser?.id ? String(currentUser.id) : undefined
                                    const isMe = msg.senderId === myId
                                    const showHeader = i === 0 || messages[i - 1].senderId !== msg.senderId

                                    return (
                                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
                                            {showHeader && !isMe && (
                                                <div className="flex items-center gap-2 mb-1 pl-2">
                                                    <span className="text-xs font-bold text-[var(--foreground)]">{msg.sender.name}</span>
                                                    <span className="text-[10px] text-[var(--muted)]">
                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex items-center max-w-[85%] md:max-w-[70%]">
                                                {!isMe && showHeader && (
                                                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mr-2 border border-[var(--border)] self-end mb-1">
                                                        <img src={msg.sender.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender.name)}`} alt="" />
                                                    </div>
                                                )}
                                                {!isMe && !showHeader && <div className="w-10 flex-shrink-0" />}

                                                <div className={`relative px-4 py-2.5 rounded-2xl text-sm shadow-sm transition-all ${isMe
                                                    ? 'bg-[var(--accent)] text-white rounded-tr-none'
                                                    : 'bg-[var(--card-surface)] text-[var(--foreground)] border border-[var(--border)] rounded-tl-none'
                                                    }`}>
                                                    {msg.content}

                                                    {/* Message Actions (Delete) */}
                                                    {isMe && (
                                                        <button
                                                            onClick={() => handleDeleteMessage(msg.id)}
                                                            className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-all"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Timestamp for my messages or if it's the last in a group */}
                                            {isMe && (
                                                <div className="text-[9px] text-[var(--muted)] mt-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {msg.id.startsWith('temp-') && ' • Sending...'}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                                {messages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-20 text-[var(--muted)]">
                                        <div className="p-4 bg-[var(--card-surface)] rounded-full mb-4">
                                            <MessageSquare className="w-8 h-8 opacity-20" />
                                        </div>
                                        <p className="font-medium">No messages yet</p>
                                        <p className="text-xs">Be the first to say hello!</p>
                                    </div>
                                )}
                            </div>

                            {/* Message Input */}
                            <div className="p-4 bg-[var(--card-surface)] border-t border-[var(--border)] shadow-lg">
                                <form onSubmit={handleSend} className="flex gap-3 items-center">
                                    <button type="button" className="p-2 text-[var(--muted)] hover:text-[var(--accent)] transition-colors rounded-full hover:bg-[var(--background)]">
                                        <Paperclip className="w-5 h-5" />
                                    </button>
                                    <div className="relative flex-1">
                                        <input
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder={`Message ${isDirect ? otherUser?.name : '#' + selectedConv?.name}...`}
                                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSend();
                                                }
                                            }}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim() || sending}
                                        className="p-3 bg-[var(--accent)] text-white rounded-full hover:shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </form>
                            </div>
                        </>
                    )}
                </div>

                {/* New Chat Modal Overhead */}
                {showNewChat && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <Card className="w-full max-w-md h-[450px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--card-surface)]">
                                <h3 className="font-bold text-lg">Send a Message</h3>
                                <button
                                    onClick={() => setShowNewChat(false)}
                                    className="p-1 hover:bg-[var(--background)] rounded-full transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="p-4 bg-[var(--card-surface)]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 w-4 h-4 text-[var(--muted)]" />
                                    <input
                                        autoFocus
                                        placeholder="Search people by name or email..."
                                        className="w-full pl-10 pr-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--accent)] outline-none"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 chat-scroll">
                                {users
                                    .filter(u => u.id !== (currentUser?.id ? String(currentUser.id) : undefined) &&
                                        (u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            u.email?.toLowerCase().includes(searchQuery.toLowerCase())))
                                    .map(u => (
                                        <button
                                            key={u.id}
                                            onClick={() => startPrivateChat(u)}
                                            className="w-full text-left p-3 hover:bg-[var(--background)] rounded-xl flex items-center gap-4 transition-all hover:translate-x-1"
                                        >
                                            <div className="w-12 h-12 rounded-full overflow-hidden bg-[var(--card-surface)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                                                {u.avatar ? (
                                                    <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-sm font-bold">
                                                        {u.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-[var(--foreground)]">{u.name}</p>
                                                <p className="text-xs text-[var(--muted)] truncate">{u.email}</p>
                                            </div>
                                        </button>
                                    ))}
                                {users.length === 0 && !loading && (
                                    <div className="text-center py-10 text-[var(--muted)]">
                                        No team members found.
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                )}
                {/* Create Channel Modal Overlay */}
                {showCreateChannel && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <Card className="w-full max-w-sm flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--card-surface)]">
                                <h3 className="font-bold text-lg text-[var(--foreground)]">Create Channel</h3>
                                <button
                                    onClick={() => setShowCreateChannel(false)}
                                    className="p-1 hover:bg-[var(--background)] rounded-full transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <form onSubmit={handleCreateChannel} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-2 text-[var(--foreground)]">
                                        Channel Name
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] font-bold">#</span>
                                        <input
                                            autoFocus
                                            placeholder="e.g. general-discussions"
                                            className="w-full pl-8 pr-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--accent)] outline-none"
                                            value={newChannelName}
                                            onChange={(e) => {
                                                // Slack/Discord style channel naming
                                                const val = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                                                setNewChannelName(val);
                                            }}
                                            required
                                        />
                                    </div>
                                    <p className="mt-2 text-[10px] text-[var(--muted)]">
                                        Channels are great for topics like #marketing or #project-x.
                                    </p>
                                </div>

                                <div className="flex gap-3 justify-end pt-4">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setShowCreateChannel(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                    >
                                        Create
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    )
}
