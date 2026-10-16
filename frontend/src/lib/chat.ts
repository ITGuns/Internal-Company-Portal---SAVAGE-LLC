
import { apiFetch } from './api';
import { fileToDataUri } from './gemfield';

/** What a new message stores about its file; the file itself is in the uploads service. */
export interface ChatAttachmentFile {
    name: string;
    type: string;
    size: number;
    uploadId: string;
}

export type ParsedChatAttachment =
    | { kind: 'stored'; file: ChatAttachmentFile }
    | { kind: 'inline'; src: string };

/**
 * New messages carry {"name","type","size","uploadId"} as a JSON string. Older messages carry the
 * file itself (a data URI) or a URL, which render as before.
 */
export function parseChatAttachment(attachment: string | null | undefined): ParsedChatAttachment | null {
    if (!attachment) return null;
    if (attachment.startsWith('{')) {
        try {
            const value = JSON.parse(attachment);
            if (
                value
                && typeof value.uploadId === 'string' && value.uploadId
                && typeof value.name === 'string'
                && typeof value.type === 'string'
                && typeof value.size === 'number'
            ) {
                return { kind: 'stored', file: { name: value.name, type: value.type, size: value.size, uploadId: value.uploadId } };
            }
        } catch {
            // Not JSON: treat it as an older inline value.
        }
    }
    return { kind: 'inline', src: attachment };
}

export function formatAttachmentSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Stores the file through POST /uploads and returns what the message should carry. */
export const uploadChatAttachment = async (file: File): Promise<ChatAttachmentFile> => {
    const res = await apiFetch('/uploads', {
        method: 'POST',
        body: JSON.stringify({ name: file.name, type: file.type || 'application/octet-stream', data: await fileToDataUri(file) }),
    });
    const uploaded = await res.json() as { id: string; name: string; type: string; size: number };
    return { name: uploaded.name, type: uploaded.type, size: uploaded.size, uploadId: uploaded.id };
};

// Stored files need the in-memory access token, so a plain link to the API would 401.
export const fetchChatAttachmentBlob = async (uploadId: string): Promise<Blob> => {
    const res = await apiFetch(`/uploads/files/${encodeURIComponent(uploadId)}`);
    return res.blob();
};

/** Saves a stored file under its own name through a short-lived blob URL. */
export const downloadChatAttachment = async (file: ChatAttachmentFile): Promise<void> => {
    const url = URL.createObjectURL(await fetchChatAttachmentBlob(file.uploadId));
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    attachment?: string;
    editedAt?: string;
    createdAt: string;
    reactions?: MessageReaction[];
    sender: {
        id: string;
        name: string;
        avatar: string;
        email: string;
    };
}

export interface MessageReaction {
    id: string;
    messageId: string;
    userId: string;
    emoji: string;
    createdAt?: string;
    user?: {
        id: string;
        name: string | null;
        avatar: string | null;
        email: string;
    };
}

export interface MessageReactionToggleResult {
    messageId: string;
    conversationId: string;
    emoji: string;
    userId: string;
    active: boolean;
    reactions: MessageReaction[];
}

export interface Conversation {
    id: string;
    type: 'direct' | 'group' | 'channel';
    name?: string;
    updatedAt: string;
    archivedAt?: string | null;
    unreadCount?: number;
    participants: {
        userId: string;
        user: {
            id: string;
            name: string;
            avatar: string;
            email: string;
        };
    }[];
    messages?: Message[];
}

export type ChatArchiveView = 'active' | 'archived' | 'all';

export const fetchConversations = async (view: ChatArchiveView = 'active'): Promise<Conversation[]> => {
    const res = await apiFetch(`/chat?view=${encodeURIComponent(view)}`);
    return res.json();
};

export const fetchMessages = async (conversationId: string, limit = 50, cursor?: string): Promise<Message[]> => {
    let url = `/chat/${conversationId}/messages?limit=${limit}`;
    if (cursor) url += `&cursor=${cursor}`;
    const res = await apiFetch(url);
    const messages = await res.json();
    return Array.isArray(messages) ? messages.reverse() : [];
};

export const sendMessage = async (conversationId: string, content: string, attachment?: ChatAttachmentFile): Promise<Message> => {
    const res = await apiFetch(`/chat/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content, attachment }),
    });
    return res.json();
};

export const createConversation = async (type: 'direct' | 'group' | 'channel', participantIds: string[], name?: string): Promise<Conversation> => {
    const res = await apiFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({ type, participantIds, name }),
    });
    return res.json();
};

export const markAsRead = async (conversationId: string): Promise<void> => {
    await apiFetch(`/chat/${conversationId}/read`, {
        method: 'POST'
    });
};

export const deleteMessage = async (messageId: string): Promise<void> => {
    await apiFetch(`/chat/messages/${messageId}`, {
        method: 'DELETE'
    });
};

export const deleteConversation = async (conversationId: string): Promise<void> => {
    await apiFetch(`/chat/${conversationId}`, {
        method: 'DELETE'
    });
};

export const archiveConversation = async (conversationId: string): Promise<void> => {
    await apiFetch(`/chat/${conversationId}/archive`, {
        method: 'POST'
    });
};

export const unarchiveConversation = async (conversationId: string): Promise<void> => {
    await apiFetch(`/chat/${conversationId}/unarchive`, {
        method: 'POST'
    });
};

export const editMessage = async (messageId: string, content: string): Promise<Message> => {
    const res = await apiFetch(`/chat/messages/${messageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
    });
    return res.json();
};

export const toggleMessageReaction = async (messageId: string, emoji: string): Promise<MessageReactionToggleResult> => {
    const res = await apiFetch(`/chat/messages/${messageId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
    });
    return res.json();
};

export interface SearchResult {
    id: string;
    content: string;
    createdAt: string;
    sender: { id: string; name: string; avatar: string; email: string };
    conversation: { id: string; name: string | null; type: string };
}

export const searchMessages = async (query: string): Promise<SearchResult[]> => {
    const res = await apiFetch(`/chat/search?q=${encodeURIComponent(query)}`);
    return res.json();
};

export const fetchOnlineUsers = async (): Promise<string[]> => {
    const res = await apiFetch('/chat/online');
    const data = await res.json();
    return data.onlineUserIds ?? [];
};
