'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
// Dummy data disconnected; awaiting backend integration

const AppContext = createContext(null);

const DUMMY_USER = { email: 'admin@wabusiness.com', password: 'admin123', name: 'Admin User' };

function initialize() {
  return { 
    contacts: [], 
    messages: [], 
    templates: [], 
    hourly: [], 
    daily: [], 
    credits: { used: 0, remaining: 0, limit: 10000 }, 
    conversations: [] 
  };
}

export function AppProvider({ children }) {
  const [session,       setSession]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('wa_session')) || null; } catch { return null; }
  });
  const [activePage,    setActivePage]    = useState('overview');
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [toasts,        setToasts]        = useState([]);
  const [lastSync,      setLastSync]      = useState(new Date());
  const [refreshing,    setRefreshing]    = useState(false);

  // Core data
  const [data, setData] = useState(() => {
    try {
      const initialized = localStorage.getItem('wa_initialized_v5');
      if (initialized) {
        return {
          contacts:      JSON.parse(localStorage.getItem('wa_contacts')     || '[]'),
          messages:      JSON.parse(localStorage.getItem('wa_messages')     || '[]'),
          templates:     JSON.parse(localStorage.getItem('wa_templates')    || '[]'),
          hourly:        JSON.parse(localStorage.getItem('wa_hourly')       || '[]'),
          daily:         JSON.parse(localStorage.getItem('wa_daily')        || '[]'),
          credits:       JSON.parse(localStorage.getItem('wa_credits')      || '{}'),
          conversations: JSON.parse(localStorage.getItem('wa_conversations')|| '[]'),
        };
      }
    } catch {}
    const fresh = initialize();
    localStorage.setItem('wa_contacts',      JSON.stringify(fresh.contacts));
    localStorage.setItem('wa_messages',      JSON.stringify(fresh.messages));
    localStorage.setItem('wa_templates',     JSON.stringify(fresh.templates));
    localStorage.setItem('wa_hourly',        JSON.stringify(fresh.hourly));
    localStorage.setItem('wa_daily',         JSON.stringify(fresh.daily));
    localStorage.setItem('wa_credits',       JSON.stringify(fresh.credits));
    localStorage.setItem('wa_conversations', JSON.stringify(fresh.conversations));
    localStorage.setItem('wa_initialized_v5', '1');
    return fresh;
  });

  // ── Auth ─────────────────────────────────────────────────────────────────
  const login = useCallback((email, password) => {
    if (email === DUMMY_USER.email && password === DUMMY_USER.password) {
      const s = { email, name: DUMMY_USER.name, loginTime: new Date().toISOString() };
      localStorage.setItem('wa_session', JSON.stringify(s));
      setSession(s);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('wa_session');
    setSession(null);
  }, []);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // ── Refresh ───────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setLastSync(new Date());
      setRefreshing(false);
      addToast('Data refreshed successfully', 'success');
    }, 1200);
  }, [addToast]);

  // ── Send message (deducts credit) ─────────────────────────────────────────
  const sendMessage = useCallback((contactId, text) => {
    if (data.credits.remaining <= 0) {
      addToast('Insufficient credits! Please top up.', 'error');
      return false;
    }
    const contact = data.contacts.find(c => c.id === contactId);
    const newMsg = {
      id: `M${Date.now()}`,
      contactId, contactName: contact?.name || 'Unknown',
      contactPhone: contact?.phone || '',
      templateId: 'MANUAL', templateName: 'Direct Message',
      status: 'sending', text,
      hasReply: false, replyText: null,
      timestamp: new Date().toISOString(),
      hour: new Date().getHours(),
      creditCost: 1, type: 'text',
    };

    // Update conversation
    setData(prev => {
      const convos = prev.conversations.map(c => {
        if (c.contactId !== contactId) return c;
        return { ...c, messages: [...c.messages, { id: newMsg.id, direction: 'out', text, timestamp: newMsg.timestamp, status: 'sending' }] };
      });
      const credits = { ...prev.credits, used: prev.credits.used + 1, remaining: prev.credits.remaining - 1 };
      const updated = { ...prev, conversations: convos, credits };
      localStorage.setItem('wa_conversations', JSON.stringify(convos));
      localStorage.setItem('wa_credits', JSON.stringify(credits));
      return updated;
    });

    // Simulate delivery
    setTimeout(() => {
      setData(prev => {
        const convos = prev.conversations.map(c => {
          if (c.contactId !== contactId) return c;
          return { ...c, messages: c.messages.map(m => m.id === newMsg.id ? { ...m, status: 'delivered' } : m) };
        });
        localStorage.setItem('wa_conversations', JSON.stringify(convos));
        return { ...prev, conversations: convos };
      });
    }, 1500);

    // Simulate auto-reply
    if (Math.random() < 0.5) {
      const replies = ['Thanks!', 'OK got it', 'Sure', 'Please call me', 'Interested!', 'Not now'];
      setTimeout(() => {
        const replyText = replies[Math.floor(Math.random() * replies.length)];
        const replyMsg = { id: `R${Date.now()}`, direction: 'in', text: replyText, timestamp: new Date().toISOString(), status: 'read' };
        setData(prev => {
          const convos = prev.conversations.map(c => {
            if (c.contactId !== contactId) return c;
            return { ...c, messages: [...c.messages, replyMsg] };
          });
          localStorage.setItem('wa_conversations', JSON.stringify(convos));
          return { ...prev, conversations: convos };
        });
        addToast(`New reply from ${contact?.name}`, 'info');
      }, 2000 + Math.random() * 3000);
    }

    addToast('Message sent!', 'success');
    return true;
  }, [data, addToast]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    sent:      data.messages.filter(m => ['sent','delivered','read'].includes(m.status)).length,
    delivered: data.messages.filter(m => ['delivered','read'].includes(m.status)).length,
    read:      data.messages.filter(m => m.status === 'read').length,
    failed:    data.messages.filter(m => m.status === 'failed').length,
    queue:     data.messages.filter(m => m.status === 'queue').length,
    replies:   data.messages.filter(m => m.hasReply).length,
    total:     data.messages.length,
  };

  // ── Update Contact State ────────────────────────────────────────────────
  const updateContact = useCallback((contactId, updates) => {
    setData(prev => {
      const contacts = prev.contacts.map(c => c.id === contactId ? { ...c, ...updates } : c);
      const updated = { ...prev, contacts };
      localStorage.setItem('wa_contacts', JSON.stringify(contacts));
      return updated;
    });
    const msg = updates.isBlocked !== undefined ? (updates.isBlocked ? 'Contact blocked' : 'Contact unblocked') 
              : updates.isMuted !== undefined ? (updates.isMuted ? 'Notifications muted' : 'Notifications unmuted')
              : updates.isArchived !== undefined ? (updates.isArchived ? 'Chat archived' : 'Chat unarchived')
              : 'Contact updated';
    addToast(msg, 'info');
  }, [addToast]);

  return (
    <AppContext.Provider value={{
      session, login, logout,
      activePage, setActivePage,
      sidebarOpen, setSidebarOpen,
      toasts, addToast,
      lastSync, refreshing, handleRefresh,
      data, stats,
      sendMessage, updateContact,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);



