import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

export const supabase = createClient();

export interface Contact {
  name: string;
  phone_number: string;
}

export interface Conversation {
  id: string;
  contact: Contact;
  last_message_at: string;
  last_message: string;
  unread_count: number;
}

export interface DashMessage {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  message_type: string;
  content: string;
  created_at: string;
  status: string;
  media?: any[];
  media_url?: string;
  file_name?: string;
  file_size?: number;
  wa_message_id?: string;
  reactions?: any[];
  myReaction?: string;
  delivered_at?: string;
  seen_at?: string;
}

export interface DashStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversation: (id: string | null) => void;
  loadingConversations: boolean;
  loadingMessages: boolean;
  error: string | null;

  messages: DashMessage[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (to: string, content: string, conversationId: string) => Promise<void>;
  sendReaction: (to: string, messageId: string, emoji: string, internalMessageId: string) => Promise<void>;
}

export const useDashStore = create<DashStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  setActiveConversation: (id) => set({ activeConversationId: id }),
  loadingConversations: false,
  loadingMessages: false,
  error: null,

  messages: [],
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  fetchConversations: async () => {
    set({ loadingConversations: true, error: null });
    try {
      const { data, error } = await supabase
        .from('whatsapp_portal_conversations')
        .select(`
          id,
          last_message,
          last_message_at,
          unread_count,
          whatsapp_portal_contacts (
            name,
            phone_number,
            profile_name
          )
        `)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      
      const convs = (data || []).map((row: any) => ({
        id: row.id,
        contact: {
          name: row.whatsapp_portal_contacts?.name || row.whatsapp_portal_contacts?.profile_name || row.whatsapp_portal_contacts?.phone_number || 'Unknown',
          phone_number: row.whatsapp_portal_contacts?.phone_number || ''
        },
        last_message: row.last_message || '',
        last_message_at: row.last_message_at,
        unread_count: row.unread_count || 0
      }));

      set({ conversations: convs });
    } catch (err: any) {
      console.error('Failed to fetch conversations:', err);
      set({ error: err.message });
    } finally {
      set({ loadingConversations: false });
    }
  },

  fetchMessages: async (conversationId: string) => {
    set({ loadingMessages: true });
    try {
      const { data, error } = await supabase
        .from('whatsapp_portal_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const messages: DashMessage[] = (data || []).map((log: any) => ({
        id: log.id,
        conversation_id: log.conversation_id,
        direction: log.direction,
        message_type: log.message_type || 'text',
        content: log.content || '',
        created_at: log.created_at,
        status: log.status || 'sent',
        wa_message_id: log.wa_message_id,
        reactions: log.reactions,
        delivered_at: log.delivered_at,
        seen_at: log.seen_at,
        media: log.media,
        media_url: log.media_url,
        file_name: log.file_name,
        file_size: log.file_size
      }));

      set({ messages });
    } catch (err: any) {
      console.error('Failed to fetch messages:', err);
    } finally {
      set({ loadingMessages: false });
    }
  },

  sendMessage: async (to, content, conversationId) => {
    const tempId = 'temp-' + Date.now();
    const optimisticMessage: DashMessage = {
      id: tempId,
      conversation_id: conversationId,
      direction: 'outbound',
      message_type: 'text',
      content,
      created_at: new Date().toISOString(),
      status: 'sending',
    };

    // Optimistically add message
    set(state => ({
      messages: [...state.messages, optimisticMessage]
    }));

    try {
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message: content, conversationId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      // Update message with database details
      set(state => ({
        messages: state.messages.map(m =>
          m.id === tempId
            ? { ...m, id: data.messageId || m.id, wa_message_id: data.waMessageId, status: 'sent' }
            : m
        ),
        conversations: state.conversations.map(c =>
          c.id === conversationId
            ? { ...c, last_message: content, last_message_at: new Date().toISOString() }
            : c
        )
      }));
    } catch (err: any) {
      console.error('Send message error:', err);
      // Mark as failed
      set(state => ({
        messages: state.messages.map(m =>
          m.id === tempId
            ? { ...m, status: 'failed' }
            : m
        ),
        error: err.message
      }));
    }
  },

  sendReaction: async (to, messageId, emoji, internalMessageId) => {
    // Optimistic update
    set(state => ({
      messages: state.messages.map(m =>
        m.id === internalMessageId
          ? { ...m, myReaction: emoji || undefined }
          : m
      )
    }));

    try {
      const response = await fetch('/api/send-reaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, messageId, emoji }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reaction');
      }
    } catch (err: any) {
      console.error('Send reaction error:', err);
      // Revert optimistic update
      set(state => ({
        messages: state.messages.map(m =>
          m.id === internalMessageId
            ? { ...m, myReaction: undefined }
            : m
        ),
        error: err.message
      }));
    }
  }
}));
