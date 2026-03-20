import { create } from 'zustand';
import { Message, ChatState } from '../types';

interface ChatStore extends ChatState {
    addMessage: (matchId: string, message: Message) => void;
    setMessages: (matchId: string, messages: Message[]) => void;
    setTyping: (matchId: string, userId: string, isTyping: boolean) => void;
    markAsRead: (matchId: string) => void;
    incrementUnread: (matchId: string) => void;
    setLoading: (loading: boolean) => void;
    loadMessages: (matchId: string) => Promise<void>;
    sendMessage: (matchId: string, content: string) => Promise<Message>;
}

// Generate mock messages for a match
const generateMockMessages = (matchId: string, otherUserId: string): Message[] => {
    const messages: Message[] = [
        {
            id: `${matchId}-msg-1`,
            match_id: matchId,
            sender_id: otherUserId,
            content: 'Hey! 👋 I saw we matched!',
            message_type: 'text',
            is_read: true,
            created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
            id: `${matchId}-msg-2`,
            match_id: matchId,
            sender_id: 'current-user',
            content: 'Hi! Yeah, I loved your profile 😄',
            message_type: 'text',
            is_read: true,
            created_at: new Date(Date.now() - 3500000).toISOString(),
        },
        {
            id: `${matchId}-msg-3`,
            match_id: matchId,
            sender_id: otherUserId,
            content: 'Your photos are amazing! Where were they taken?',
            message_type: 'text',
            is_read: false,
            created_at: new Date(Date.now() - 1800000).toISOString(),
        },
    ];
    return messages;
};

export const useChatStore = create<ChatStore>((set, get) => ({
    messages: {},
    typingUsers: {},
    unreadCounts: {},
    isLoading: false,

    addMessage: (matchId, message) => set((state) => {
        const matchMessages = state.messages[matchId] || [];
        return {
            messages: {
                ...state.messages,
                [matchId]: [...matchMessages, message],
            },
        };
    }),

    setMessages: (matchId, messages) => set((state) => ({
        messages: {
            ...state.messages,
            [matchId]: messages,
        },
    })),

    setTyping: (matchId, userId, isTyping) => set((state) => {
        const typing = state.typingUsers[matchId] || [];
        const newTyping = isTyping
            ? [...typing, userId]
            : typing.filter((id) => id !== userId);
        return {
            typingUsers: {
                ...state.typingUsers,
                [matchId]: newTyping,
            },
        };
    }),

    markAsRead: (matchId) => set((state) => ({
        unreadCounts: {
            ...state.unreadCounts,
            [matchId]: 0,
        },
    })),

    incrementUnread: (matchId) => set((state) => ({
        unreadCounts: {
            ...state.unreadCounts,
            [matchId]: (state.unreadCounts[matchId] || 0) + 1,
        },
    })),

    setLoading: (isLoading) => set({ isLoading }),

    loadMessages: async (matchId) => {
        set({ isLoading: true });

        // Simulate API delay
        await new Promise<void>((resolve) => { setTimeout(resolve, 300); });

        // Generate mock messages based on match
        const messages = generateMockMessages(matchId, 'other-user');
        set((state) => ({
            messages: {
                ...state.messages,
                [matchId]: messages,
            },
            isLoading: false,
        }));
    },

    sendMessage: async (matchId, content) => {
        const message: Message = {
            id: `${matchId}-msg-${Date.now()}`,
            match_id: matchId,
            sender_id: 'current-user',
            content,
            message_type: 'text',
            is_read: false,
            created_at: new Date().toISOString(),
        };

        get().addMessage(matchId, message);
        return message;
    },
}));
