
"use client"

import React, { useEffect, useState, useRef, useCallback } from 'react'
import Header from '@/components/Header'
import Button from '@/components/Button'
import { MessageSquare, Paperclip, Trash2, Pencil, Check, X, Search } from 'lucide-react'
import Image from 'next/image'
import { fetchConversations, fetchMessages, sendMessage, createConversation, deleteMessage, deleteConversation, editMessage, searchMessages, fetchOnlineUsers, markAsRead, type Message, type Conversation, type SearchResult } from '@/lib/chat'
import { fetchUsers, type User as SystemUser } from '@/lib/users'
import { useSocket } from '@/context/SocketContext'
import { useUser } from '@/contexts/UserContext'
import { PageSkeleton } from '@/components/ui/Skeleton'
import ChatSidebar from '@/components/chat/ChatSidebar'
import MessageInput from '@/components/chat/MessageInput'
import NewChatModal from '@/components/chat/NewChatModal'
import CreateChannelModal from '@/components/chat/CreateChannelModal'
import { useToast } from '@/components/ToastProvider'

export default function UnifiedChatPage() {
    const { socket, isConnected, clearChatBadge } = useSocket()
    const { user: currentUser } = useUser()
    const toast = useToast()
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)

    // ... (rest of the previous state declarations if any)
    const [showNewChat, setShowNewChat] = useState(false)
    const [showCreateChannel, setShowCreateChannel] = useState(false)
    const [newChannelName, setNewChannelName] = useState('')
    const [users, setUsers] = useState<SystemUser[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [attachment, setAttachment] = useState<File | null>(null)
    const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null)
    const [selectedChannelUsers, setSelectedChannelUsers] = useState<string[]>([])
    const [searchChannelQuery, setSearchChannelQuery] = useState('')
    const scrollRef = useRef<HTMLDivElement>(null)
    const initialLoadDone = useRef(false)
    const currentUserRef = useRef(currentUser)
    currentUserRef.current = currentUser

    // Phase 5.1 — Chat enhancements
    const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())
    const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map()) // conversationId:userId → userName
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
    const [editContent, setEditContent] = useState('')
    const [searchOpen, setSearchOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [searchResults, setSearchResults] = useState<SearchResult[]>([])
    const [searching, setSearching] = useState(false)
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Clear global badge when on this page
    useEffect(() => {
        clearChatBadge();
    }, [clearChatBadge, messages]);

    // Fetch initial online users
    useEffect(() => {
        fetchOnlineUsers()
            .then(ids => setOnlineUserIds(new Set(ids)))
            .catch(() => {/* ignore */})
    }, [])

    // Presence & typing socket listeners
    useEffect(() => {
        if (!socket) return

        const handlePresenceOnline = ({ userId }: { userId: string }) => {
            setOnlineUserIds(prev => new Set(prev).add(userId))
        }
        const handlePresenceOffline = ({ userId }: { userId: string }) => {
            setOnlineUserIds(prev => {
                const next = new Set(prev)
                next.delete(userId)
                return next
            })
        }
        const handleTypingStart = ({ conversationId, userId, userName }: { conversationId: string; userId: string; userName: string }) => {
            setTypingUsers(prev => new Map(prev).set(`${conversationId}:${userId}`, userName))
        }
        const handleTypingStop = ({ conversationId, userId }: { conversationId: string; userId: string }) => {
            setTypingUsers(prev => {
                const next = new Map(prev)
                next.delete(`${conversationId}:${userId}`)
                return next
            })
        }

        socket.on('presence:online', handlePresenceOnline)
        socket.on('presence:offline', handlePresenceOffline)
        socket.on('typing:start', handleTypingStart)
        socket.on('typing:stop', handleTypingStop)

        return () => {
            socket.off('presence:online', handlePresenceOnline)
            socket.off('presence:offline', handlePresenceOffline)
            socket.off('typing:start', handleTypingStart)
            socket.off('typing:stop', handleTypingStop)
        }
    }, [socket])

    const handleCreateChannel = async () => {
        if (!newChannelName.trim()) {
            alert("Channel name is required");
            return;
        }

        if (selectedChannelUsers.length === 0) {
            alert("Please select at least one member for the channel.");
            return;
        }

        try {
            const conv = await createConversation('channel', selectedChannelUsers, newChannelName.trim());
            setConversations(prev => [conv, ...prev]);
            setSelectedId(conv.id);
            setShowCreateChannel(false);
            setNewChannelName('');
            setSelectedChannelUsers([]);
            setSearchChannelQuery('');
        } catch (err) {
            console.error("Failed to create channel", err);
            toast.error("Failed to create channel")
        }
    };

    // Load initial data
    useEffect(() => {
        let mounted = true;
        async function load() {
            try {
                if (!initialLoadDone.current) setLoading(true)
                const [convData, userData] = await Promise.all([
                    fetchConversations().catch(() => {
                        return new Promise<Conversation[]>((resolve) => {
                            setTimeout(async () => {
                                try {
                                    resolve(await fetchConversations())
                                } catch {
                                    resolve([])
                                }
                            }, 2000)
                        })
                    }),
                    fetchUsers()
                ])

                if (!mounted) return;
                setConversations(convData)
                setUsers(userData)

                // Initialize unread counts from server data
                const initialUnreads: Record<string, number> = {}
                for (const c of convData) {
                    if (c.unreadCount && c.unreadCount > 0) {
                        initialUnreads[c.id] = c.unreadCount
                    }
                }
                setUnreadCounts(initialUnreads)

                if (convData.length > 0 && !selectedId) {
                    const defaultConv = convData.find(c => c.type !== 'direct') || convData[0]
                    setSelectedId(defaultConv.id)
                }
            } catch (err) {
                console.error("Initial load failed", err)
                toast.error("Failed to load conversations")
            } finally {
                if (mounted) {
                    setLoading(false)
                    initialLoadDone.current = true
                }
            }
        }
        load()
        return () => { mounted = false; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Fetch messages when conversation changes
    useEffect(() => {
        if (!selectedId) return

        async function loadMessages() {
            if (!selectedId) return
            try {
                const data = await fetchMessages(selectedId)
                setMessages(data)

                // Clear unread count for this conversation
                setUnreadCounts(prev => ({ ...prev, [selectedId]: 0 }))
                clearChatBadge();

                // Mark as read on the server
                markAsRead(selectedId).catch(() => {/* ignore */})

                // Join room for real-time updates
                if (socket) {
                    socket.emit('join:conversation', selectedId)
                }
            } catch (err) {
                console.error("Failed to load messages", err)
                toast.error("Failed to load messages")
            }
        }
        loadMessages()
    }, [selectedId, socket, clearChatBadge])

    // Listen for real-time events
    useEffect(() => {
        if (!socket) return

        const handleNewMessage = (msg: Message) => {
            // Add message to current view if it belongs here
            if (msg.conversationId === selectedId) {
                setMessages(prev => {
                    if (prev.some(m => m.id === msg.id)) return prev

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
                clearChatBadge();
            } else {
                // Increment unread count for other conversations
                setUnreadCounts(prev => ({
                    ...prev,
                    [msg.conversationId]: (prev[msg.conversationId] || 0) + 1
                }))
            }

            // Update sidebar sorting/last activity
            setConversations(prev => {
                const existing = prev.find(c => c.id === msg.conversationId)
                if (existing) {
                    return prev.map(c =>
                        c.id === msg.conversationId ? { ...c, updatedAt: msg.createdAt } : c
                    ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                }
                return prev
            })
        }

        const handleMessageDeleted = ({ messageId, conversationId }: { messageId: string, conversationId: string }) => {
            if (conversationId === selectedId) {
                setMessages(prev => prev.filter(m => m.id !== messageId))
            }
        }

        const handleNewConversation = (conv: Conversation) => {
            setConversations(prev => {
                if (prev.some(c => c.id === conv.id)) return prev;
                return [conv, ...prev];
            });
        }

        const handleUserLeft = ({ userId, conversationId }: { userId: string; conversationId: string }) => {
            if (String(userId) === String(currentUser?.id)) {
                setConversations(prev => prev.filter(c => c.id !== conversationId))
                if (selectedId === conversationId) setSelectedId(null)
            }
        }

        const handleMessageEdited = ({ messageId, content, editedAt }: { messageId: string; conversationId: string; content: string; editedAt: string }) => {
            setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content, editedAt } : m))
        }

        const handleChatRead = ({ conversationId, userId }: { conversationId: string; userId: string }) => {
            // If *we* marked it read (from another tab), zero out our local count
            if (String(userId) === String(currentUser?.id)) {
                setUnreadCounts(prev => ({ ...prev, [conversationId]: 0 }))
            }
        }

        socket.on('chat:message', handleNewMessage)
        socket.on('chat:message_deleted', handleMessageDeleted)
        socket.on('chat:conversation_created', handleNewConversation)
        socket.on('chat:user_left', handleUserLeft)
        socket.on('chat:message_edited', handleMessageEdited)
        socket.on('chat:read', handleChatRead)

        return () => {
            socket.off('chat:message', handleNewMessage)
            socket.off('chat:message_deleted', handleMessageDeleted)
            socket.off('chat:conversation_created', handleNewConversation)
            socket.off('chat:user_left', handleUserLeft)
            socket.off('chat:message_edited', handleMessageEdited)
            socket.off('chat:read', handleChatRead)
        }
    }, [socket, selectedId, currentUser, clearChatBadge])

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setAttachment(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setAttachmentPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const clearAttachment = () => {
        setAttachment(null)
        setAttachmentPreview(null)
    }

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if ((!newMessage.trim() && !attachment) || !selectedId || sending) return

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
        const curAttachment = attachmentPreview
        clearAttachment()

        try {
            setSending(true)
            const result = await sendMessage(selectedId, content, curAttachment || undefined)
            // Replace temp with real
            setMessages(prev => prev.map(m => m.id === tempId ? result : m))
        } catch (err) {
            console.error("Send failed", err)
            setMessages(prev => prev.filter(m => m.id !== tempId))
            setNewMessage(content)
            toast.error("Failed to send message")
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
            toast.error("Failed to start conversation")
        }
    }

    const handleDeleteMessage = async (messageId: string) => {
        if (!confirm('Delete this message?')) return
        try {
            await deleteMessage(messageId)
            setMessages(prev => prev.filter(m => m.id !== messageId))
        } catch (err) { console.error(err); toast.error("Failed to delete message") }
    }

    const handleDeleteConversation = async (conversationId: string) => {
        if (!confirm('Delete this conversation history?')) return
        try {
            await deleteConversation(conversationId)
            setConversations(prev => prev.filter(c => c.id !== conversationId))
            if (selectedId === conversationId) setSelectedId(null)
        } catch (err) { console.error(err); toast.error("Failed to delete conversation") }
    }

    // Emit typing events with debounce
    const handleTypingEmit = useCallback(() => {
        if (!socket || !selectedId || !currentUser) return
        socket.emit('typing:start', { conversationId: selectedId, userId: String(currentUser.id), userName: currentUser.name })
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('typing:stop', { conversationId: selectedId, userId: String(currentUser.id) })
        }, 2000)
    }, [socket, selectedId, currentUser])

    const handleMessageChange = useCallback((value: string) => {
        setNewMessage(value)
        if (value.trim()) handleTypingEmit()
    }, [handleTypingEmit])

    // Message editing
    const handleStartEdit = (msg: Message) => {
        setEditingMessageId(msg.id)
        setEditContent(msg.content)
    }

    const handleCancelEdit = () => {
        setEditingMessageId(null)
        setEditContent('')
    }

    const handleSaveEdit = async () => {
        if (!editingMessageId || !editContent.trim()) return
        try {
            const updated = await editMessage(editingMessageId, editContent.trim())
            setMessages(prev => prev.map(m => m.id === editingMessageId ? { ...m, content: updated.content, editedAt: updated.editedAt } : m))
            setEditingMessageId(null)
            setEditContent('')
        } catch (err) {
            console.error(err)
            toast.error("Failed to edit message")
        }
    }

    // Message search
    const handleSearch = useCallback(async () => {
        if (!searchTerm.trim()) { setSearchResults([]); return }
        setSearching(true)
        try {
            const results = await searchMessages(searchTerm.trim())
            setSearchResults(results)
        } catch (err) {
            console.error(err)
            toast.error("Search failed")
        } finally {
            setSearching(false)
        }
    }, [searchTerm, toast])

    // Get typing users for the current conversation
    const currentTypingNames = selectedId
        ? Array.from(typingUsers.entries())
            .filter(([key]) => key.startsWith(`${selectedId}:`))
            .map(([, name]) => name)
        : []

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
                <PageSkeleton />
            </div>
        )
    }

    return (
        <div className="flex flex-col h-[calc(100vh-112px)] overflow-hidden">
            <Header
                title="Chat & Messages"
                subtitle={isDirect ? `Direct Message with ${otherUser?.name}` : `# ${selectedConv?.name || "Select a channel"}`}
            />

            {/* Search Panel Toggle + Panel */}
            <div className="flex items-center justify-end px-4 py-1 border-b border-[var(--border)] bg-[var(--card-surface)]">
                <button
                    onClick={() => setSearchOpen(prev => !prev)}
                    className={`p-1.5 rounded-lg transition-colors text-sm flex items-center gap-1.5 ${searchOpen ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)]'}`}
                    aria-label="Search messages"
                >
                    <Search className="w-4 h-4" />
                    <span className="text-xs">Search</span>
                </button>
            </div>
            {searchOpen && (
                <div className="border-b border-[var(--border)] bg-[var(--card-surface)] p-3 animate-in slide-in-from-top-2">
                    <div className="flex gap-2 items-center max-w-lg mx-auto">
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            placeholder="Search messages..."
                            className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                            autoFocus
                        />
                        <button onClick={handleSearch} disabled={searching} className="px-3 py-2 bg-[var(--accent)] text-white rounded-lg text-sm disabled:opacity-50">
                            {searching ? '...' : 'Search'}
                        </button>
                        <button onClick={() => { setSearchOpen(false); setSearchTerm(''); setSearchResults([]) }} className="p-2 text-[var(--muted)] hover:text-[var(--foreground)]" aria-label="Close search">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    {searchResults.length > 0 && (
                        <div className="max-w-lg mx-auto mt-2 max-h-60 overflow-y-auto space-y-1">
                            {searchResults.map(r => (
                                <button
                                    key={r.id}
                                    onClick={() => { setSelectedId(r.conversation.id); setSearchOpen(false); setSearchTerm(''); setSearchResults([]) }}
                                    className="w-full text-left flex items-start gap-2 p-2 rounded-lg hover:bg-[var(--background)] transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-[var(--foreground)]">{r.sender.name}</span>
                                            <span className="text-[10px] text-[var(--muted)]">in {r.conversation.name || 'DM'}</span>
                                        </div>
                                        <p className="text-sm text-[var(--muted)] truncate">{r.content}</p>
                                    </div>
                                    <span className="text-[10px] text-[var(--muted)] flex-shrink-0">{new Date(r.createdAt).toLocaleDateString()}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    {searchResults.length === 0 && searchTerm && !searching && (
                        <p className="text-center text-xs text-[var(--muted)] mt-2">No results found</p>
                    )}
                </div>
            )}

            <div className="flex flex-1 overflow-hidden relative">
                <ChatSidebar
                    channels={channels}
                    directMessages={directMessages}
                    selectedId={selectedId}
                    unreadCounts={unreadCounts}
                    isConnected={isConnected}
                    onSelectConversation={setSelectedId}
                    onDeleteConversation={handleDeleteConversation}
                    onCreateChannel={() => setShowCreateChannel(true)}
                    onNewChat={() => setShowNewChat(true)}
                    getOtherParticipant={getOtherParticipant}
                    onlineUserIds={onlineUserIds}
                />

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
                                                        <Image src={msg.sender.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender.name)}`} alt={msg.sender.name} width={32} height={32} className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                                {!isMe && !showHeader && <div className="w-10 flex-shrink-0" />}

                                                <div className={`relative px-4 py-2.5 rounded-2xl text-sm shadow-sm transition-all ${isMe
                                                    ? 'bg-[var(--accent)] text-white rounded-tr-none'
                                                    : 'bg-[var(--card-surface)] text-[var(--foreground)] border border-[var(--border)] rounded-tl-none'
                                                    }`}>
                                                    {editingMessageId === msg.id ? (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                value={editContent}
                                                                onChange={e => setEditContent(e.target.value)}
                                                                onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') handleCancelEdit() }}
                                                                className="flex-1 bg-transparent border-b border-white/40 focus:outline-none text-sm py-0.5"
                                                                autoFocus
                                                                aria-label="Edit message"
                                                            />
                                                            <button onClick={handleSaveEdit} className="p-1 hover:bg-white/20 rounded" aria-label="Save edit"><Check className="w-3.5 h-3.5" /></button>
                                                            <button onClick={handleCancelEdit} className="p-1 hover:bg-white/20 rounded" aria-label="Cancel edit"><X className="w-3.5 h-3.5" /></button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {msg.content}
                                                            {msg.editedAt && (
                                                                <span className={`text-[10px] ml-1.5 ${isMe ? 'text-white/60' : 'text-[var(--muted)]'}`}>(edited)</span>
                                                            )}
                                                        </>
                                                    )}
                                                    {msg.attachment && (
                                                        <div className="mt-2 rounded-lg overflow-hidden border border-[var(--border)] bg-black/10">
                                                            {msg.attachment.startsWith('data:image/') || msg.attachment.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                                <img
                                                                    src={msg.attachment}
                                                                    alt="Attachment"
                                                                    className="max-h-60 w-auto object-contain cursor-pointer transition-transform hover:scale-[1.02]"
                                                                    onClick={() => window.open(msg.attachment, '_blank')}
                                                                />
                                                            ) : (
                                                                <a
                                                                    href={msg.attachment}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 p-3 text-xs bg-[var(--background)] hover:bg-[var(--card-surface)] transition-colors"
                                                                >
                                                                    <Paperclip className="w-4 h-4" />
                                                                    <span className="truncate max-w-[200px]">View Attachment</span>
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Message Actions (Edit + Delete) */}
                                                    {isMe && !editingMessageId && (
                                                        <div className="absolute -left-16 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-all">
                                                            <button
                                                                onClick={() => handleStartEdit(msg)}
                                                                className="p-1.5 text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--background)] rounded-full transition-all"
                                                                aria-label="Edit message"
                                                            >
                                                                <Pencil className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteMessage(msg.id)}
                                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-all"
                                                                aria-label="Delete message"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
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

                            {/* Typing Indicator */}
                            {currentTypingNames.length > 0 && (
                                <div className="px-6 py-1.5 text-xs text-[var(--muted)] animate-pulse">
                                    {currentTypingNames.length === 1
                                        ? `${currentTypingNames[0]} is typing...`
                                        : `${currentTypingNames.join(', ')} are typing...`}
                                </div>
                            )}

                            <MessageInput
                                newMessage={newMessage}
                                onMessageChange={handleMessageChange}
                                onSend={handleSend}
                                sending={sending}
                                attachment={attachment}
                                attachmentPreview={attachmentPreview}
                                onFileSelect={handleFileSelect}
                                onClearAttachment={clearAttachment}
                                placeholder={`Message ${isDirect ? otherUser?.name : '#' + selectedConv?.name}...`}
                            />
                        </>
                    )}
                </div>

                <NewChatModal
                    isOpen={showNewChat}
                    onClose={() => setShowNewChat(false)}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    users={users}
                    currentUserId={currentUser?.id ? String(currentUser.id) : undefined}
                    onStartChat={startPrivateChat}
                />
                <CreateChannelModal
                    isOpen={showCreateChannel}
                    onClose={() => setShowCreateChannel(false)}
                    channelName={newChannelName}
                    onChannelNameChange={setNewChannelName}
                    selectedUsers={selectedChannelUsers}
                    onSelectedUsersChange={setSelectedChannelUsers}
                    searchQuery={searchChannelQuery}
                    onSearchQueryChange={setSearchChannelQuery}
                    users={users}
                    currentUserId={currentUser?.id ? String(currentUser.id) : undefined}
                    onCreateChannel={handleCreateChannel}
                />
            </div>
        </div>
    )
}
