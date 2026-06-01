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
  loadingOlderMessages: boolean;
  hasMoreMessages: boolean;
  error: string | null;

  messages: DashMessage[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string, isInitial?: boolean) => Promise<void>;
  fetchOlderMessages: (conversationId: string) => Promise<void>;
  sendMessage: (to: string, content: string, conversationId: string) => Promise<void>;
  sendReaction: (to: string, messageId: string, emoji: string, internalMessageId: string) => Promise<void>;
}

export const useDashStore = create<DashStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  setActiveConversation: (id) => set({ activeConversationId: id, messages: [], hasMoreMessages: true }),
  loadingConversations: false,
  loadingMessages: false,
  loadingOlderMessages: false,
  hasMoreMessages: true,
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

  fetchMessages: async (conversationId: string, isInitial = true) => {
    if (isInitial) {
      set({ loadingMessages: true, hasMoreMessages: true });
    }
    try {
      if (isInitial) {
        // 1. Initial Load: Fetch newest 30 messages in descending order, then reverse them
        const { data, error } = await supabase
          .from('whatsapp_portal_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(30);

        if (error) throw error;

        const mapped = (data || []).map((log: any) => ({
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

        const reversed = mapped.reverse();
        set({ 
          messages: reversed,
          hasMoreMessages: mapped.length === 30
        });
      } else {
        // 2. Polling Updates (isInitial = false): Fetch 30 newest.
        const { data, error } = await supabase
          .from('whatsapp_portal_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(30);

        if (error) throw error;

        const currentMessages = get().messages;
        const mapped = (data || []).map((log: any) => ({
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

        const newestInDb = mapped.reverse(); // Now ascending
        if (newestInDb.length === 0) return;

        // Map existing messages by id or wa_message_id for easy lookup
        const existingMap = new Map<string, DashMessage>();
        currentMessages.forEach(m => {
          existingMap.set(m.id, m);
          if (m.wa_message_id) {
            existingMap.set(m.wa_message_id, m);
          }
        });

        // Determine what the newest timestamp in state is
        let newestTimestampInState = new Date(0);
        if (currentMessages.length > 0) {
          newestTimestampInState = new Date(currentMessages[currentMessages.length - 1].created_at);
        }

        const updatedMessages = [...currentMessages];
        const toAppend: DashMessage[] = [];

        newestInDb.forEach((msg: DashMessage) => {
          const existing = existingMap.get(msg.id) || (msg.wa_message_id ? existingMap.get(msg.wa_message_id) : undefined);
          if (existing) {
            // Update modified status (read, delivered, reactions, etc.) in place
            Object.assign(existing, {
              status: msg.status,
              reactions: msg.reactions,
              delivered_at: msg.delivered_at,
              seen_at: msg.seen_at,
              media_url: msg.media_url || existing.media_url
            });
          } else {
            // Append only if it is newer than the newest in state (avoids duplicate/overlapping prepended messages)
            const msgTime = new Date(msg.created_at);
            if (msgTime > newestTimestampInState) {
              toAppend.push(msg);
            }
          }
        });

        set({ messages: [...updatedMessages, ...toAppend] });
      }
    } catch (err: any) {
      console.error('Failed to fetch messages:', err);
    } finally {
      if (isInitial) {
        set({ loadingMessages: false });
      }
    }
  },

  fetchOlderMessages: async (conversationId: string) => {
    const currentMessages = get().messages;
    if (currentMessages.length === 0) return;
    
    // Earliest message timestamp in state is the first message's created_at
    const earliestMessageTimestamp = currentMessages[0].created_at;
    set({ loadingOlderMessages: true });

    try {
      const { data, error } = await supabase
        .from('whatsapp_portal_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .lt('created_at', earliestMessageTimestamp)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      if (!data || data.length === 0) {
        set({ hasMoreMessages: false });
        return;
      }

      const mapped = data.map((log: any) => ({
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

      const reversed = mapped.reverse();
      set({
        messages: [...reversed, ...currentMessages],
        hasMoreMessages: mapped.length === 30
      });
    } catch (err: any) {
      console.error('Failed to fetch older messages:', err);
    } finally {
      set({ loadingOlderMessages: false });
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
