
import { apiFetch } from './api';

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    attachment?: string;
    createdAt: string;
    sender: {
        id: string;
        name: string;
        avatar: string;
        email: string;
    };
}

export interface Conversation {
    id: string;
    type: 'direct' | 'group' | 'channel';
    name?: string;
    updatedAt: string;
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

export const fetchConversations = async (): Promise<Conversation[]> => {
    const res = await apiFetch('/chat');
    return res.json();
};

export const fetchMessages = async (conversationId: string, limit = 50, cursor?: string): Promise<Message[]> => {
    let url = `/chat/${conversationId}/messages?limit=${limit}`;
    if (cursor) url += `&cursor=${cursor}`;
    const res = await apiFetch(url);
    const messages = await res.json();
    return Array.isArray(messages) ? messages.reverse() : [];
};

export const sendMessage = async (conversationId: string, content: string, attachment?: string): Promise<Message> => {
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
