import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

// ---- Types ----
export interface Contact {
  id: string;
  user_id: string;
  phone_number: string;
  name: string | null;
  profile_name: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  contact_id: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
  contact?: Contact;
}

export interface DashMessage {
  id: string;
  user_id: string;
  conversation_id: string;
  wa_message_id: string | null;
  direction: 'inbound' | 'outbound';
  content: string;
  message_type: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  delivered_at: string | null;
  seen_at: string | null;
  created_at: string;
  // Media & reactions (jsonb columns in Supabase)
  reactions?: { emoji: string; sender: string }[];
  media?: { type: string; id?: string; fileName?: string; mime_type?: string; file_size?: number; url?: string }[];
  mime_type?: string;
  file_size?: number;
  myReaction?: string; // client-side only — optimistic UI
}

// ---- Store Shape ----
interface DashStore {
  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;
  loadingConversations: boolean;

  // Messages for active conversation
  messages: DashMessage[];
  loadingMessages: boolean;

  // Search
  searchQuery: string;

  // Actions
  setSearchQuery: (q: string) => void;
  setActiveConversation: (id: string | null) => void;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (to: string, message: string, conversationId: string) => Promise<void>;
  sendReaction: (to: string, waMessageId: string, emoji: string, msgId: string) => Promise<void>;
  markConversationRead: (conversationId: string) => Promise<void>;

  // Realtime handlers
  handleMessageInsert: (msg: DashMessage) => void;
  handleMessageUpdate: (msg: DashMessage) => void;
  handleConversationUpdate: (conv: Conversation) => void;
}

export const useDashStore = create<DashStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  loadingConversations: false,
  messages: [],
  loadingMessages: false,
  searchQuery: '',

  setSearchQuery: (q) => set({ searchQuery: q }),

  setActiveConversation: (id) => {
    set({ activeConversationId: id, messages: [] });
    if (id) {
      get().fetchMessages(id);
      get().markConversationRead(id);
    }
  },

  fetchConversations: async () => {
    set({ loadingConversations: true });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          contact:contacts(*)
        `)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      set({ conversations: (data as Conversation[]) || [] });
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      set({ loadingConversations: false });
    }
  },

  fetchMessages: async (conversationId) => {
    set({ loadingMessages: true });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      set({ messages: (data as DashMessage[]) || [] });
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      set({ loadingMessages: false });
    }
  },

  sendMessage: async (to, message, conversationId) => {
    try {
      const res = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message, conversationId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to send');
      }

      // Message will appear via realtime subscription
    } catch (err) {
      console.error('Send message error:', err);
      throw err;
    }
  },

  sendReaction: async (to, waMessageId, emoji, msgId) => {
    // Optimistic update — show the reaction immediately in UI
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id !== msgId) return m;
        const currentReactions = [...(m.reactions || [])];
        // Remove existing 'me' reaction
        const filtered = currentReactions.filter((r) => r.sender !== 'me');
        // Add new one if emoji is not empty
        if (emoji) {
          filtered.push({ emoji, sender: 'me' });
        }
        return { ...m, reactions: filtered, myReaction: emoji || undefined };
      }),
    }));

    try {
      await fetch('/api/send-reaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, messageId: waMessageId, emoji }),
      });
    } catch (err) {
      console.error('Send reaction error:', err);
      // Revert optimistic update on failure
      set((state) => ({
        messages: state.messages.map((m) => {
          if (m.id !== msgId) return m;
          const reverted = (m.reactions || []).filter((r) => r.sender !== 'me');
          return { ...m, reactions: reverted, myReaction: undefined };
        }),
      }));
    }
  },

  markConversationRead: async (conversationId) => {
    try {
      const supabase = createClient();
      await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);

      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, unread_count: 0 } : c
        ),
      }));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  },

  // Realtime: new message inserted
  handleMessageInsert: (msg) => {
    console.log('📬 store.handleMessageInsert:', msg);
    const { activeConversationId, conversations } = get();
    
    // If conversation is in the list, update its state
    const convExists = conversations.some(c => c.id === msg.conversation_id);
    
    if (msg.conversation_id === activeConversationId) {
      set((state) => {
        if (state.messages.some((m) => m.id === msg.id)) {
          return state;
        }
        return {
          messages: [...state.messages, msg],
        };
      });
    }

    if (convExists) {
      // Update conversation list
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === msg.conversation_id
            ? {
                ...c,
                last_message: msg.content,
                last_message_at: msg.created_at,
                unread_count:
                  msg.direction === 'inbound' && c.id !== activeConversationId
                    ? (c.unread_count || 0) + 1
                    : c.unread_count,
              }
            : c
        ).sort((a, b) => {
          const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
          const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
          return bTime - aTime;
        }),
      }));
    } else {
      // If conversation doesn't exist yet, refetch all to catch it
      console.log('🔄 New conversation detected via message, refetching...');
      get().fetchConversations();
    }
  },

  // Realtime: message status updated
  handleMessageUpdate: (msg) => {
    console.log('📬 store.handleMessageUpdate:', msg);
    const { activeConversationId } = get();
    if (msg.conversation_id === activeConversationId) {
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === msg.id ? { ...m, ...msg } : m
        ),
      }));
    }
  },

  // Realtime: conversation changed
  handleConversationUpdate: (conv) => {
    console.log('📬 store.handleConversationUpdate:', conv);
    set((state) => {
      const exists = state.conversations.find((c) => c.id === conv.id);
      if (exists) {
        return {
          conversations: state.conversations
            .map((c) => (c.id === conv.id ? { ...c, ...conv } : c))
            .sort((a, b) => {
              const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
              const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
              return bTime - aTime;
            }),
        };
      }
      // New conversation — refetch to get the contact join
      console.log('🔄 New conversation detected, refetching to get contact info...');
      setTimeout(() => get().fetchConversations(), 100);
      return state;
    });
  },
}));
