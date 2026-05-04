'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const AppContext = createContext(null);

const DEFAULT_STATS = { sent: 0, delivered: 0, read: 0, failed: 0, queue: 0, replies: 0, total: 0 };
const DEFAULT_DATA = { 
  hourly: [], 
  messages: [], 
  templates: [], 
  contacts: [], 
  credits: { remaining: 0, used: 0, limit: 10000 } 
};

export function AppProvider({ children }) {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [activePage, setActivePage] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [lastSync, setLastSync] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Core real-time data
  const [data, setData] = useState(DEFAULT_DATA);
  const [stats, setStats] = useState(DEFAULT_STATS);

  const supabase = createClient();

  useEffect(() => {
    // 1. Initial Session Fetch
    const initSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        setIsInitializing(false);
        router.push('/login');
        return;
      }
      
      setSession({
        email: currentSession.user.email,
        name: currentSession.user.user_metadata?.name || 'User',
        id: currentSession.user.id
      });
      setIsInitializing(false);
      handleRefresh(); // Fetch data immediately after logging in
    };

    initSession();

    // 2. Auth State Listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (['SIGNED_OUT', 'USER_DELETED'].includes(event)) {
        setSession(null);
        router.push('/login');
      } else if (event === 'SIGNED_IN' && currentSession) {
        setSession({
          email: currentSession.user.email,
          name: currentSession.user.user_metadata?.name || 'User',
          id: currentSession.user.id
        });
        handleRefresh();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  // ── Auth ─────────────────────────────────────────────────────────────────
  // Note: Actual login logic is managed by /app/(auth)/login
  const login = () => { /* No-op, now handled in login page */ return false; };

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      router.push('/login');
    } catch (e) {
      console.error('Supabase signout error:', e);
    }
  }, [router, supabase.auth]);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // ── Refresh ───────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const payload = await res.json();
        if (payload.stats) setStats(payload.stats);
        if (payload.credits) {
          // Fetch templates separately as they come from Meta API
          let templates = [];
          try {
            const tRes = await fetch('/api/templates');
            if (tRes.ok) {
              const tData = await tRes.json();
              // Normalize templates with default stats
              templates = (tData.templates || []).map(t => ({
                id: t.name,
                name: t.name,
                category: t.category || 'marketing',
                status: t.status || 'approved',
                body: t.body || '',
                sent: 0,
                cost: 0,
                delivered: 0,
                read: 0,
                replied: 0,
                failed: 0,
                deliveryRate: 0,
                readRate: 0,
                replyRate: 0,
                ...t
              }));
            }
          } catch (te) {
            console.error('Failed to fetch templates:', te);
          }

          setData(prev => ({ 
            ...prev, 
            credits: payload.credits, 
            hourly: payload.hourly || [], 
            messages: payload.messages || [],
            templates: templates
          }));
        }
        setLastSync(new Date());
      } else if (res.status === 401) {
        // Handle unauthorized inside refresh
        router.push('/login');
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e);
      addToast('Failed to fetch latest stats', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [addToast, router]);

  // ── Send Message ─────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (contactId, text, media = []) => {
    // Find the conversation ID for this contact
    const conversation = data.conversations.find(c => c.contactId === contactId);
    const contact = data.contacts.find(c => c.id === contactId);
    
    if (!contact) return false;

    try {
      const res = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: contact.phone,
          message: text,
          conversationId: conversation?.id,
          media: media // Note: Backend support for media will be added next
        })
      });

      if (res.ok) {
        // Optimistically refresh or wait for webhook
        await handleRefresh();
        return true;
      } else {
        const err = await res.json();
        addToast(err.error || 'Failed to send message', 'error');
        return false;
      }
    } catch (e) {
      console.error('Send message error:', e);
      addToast('Network error while sending message', 'error');
      return false;
    }
  }, [data.conversations, data.contacts, handleRefresh, addToast]);

  const updateContact = useCallback((contactId, updates) => {
    addToast('Not implemented in prototype mode', 'info');
  }, [addToast]);

  if (isInitializing) {
    return <div className="h-screen w-screen flex items-center justify-center bg-[var(--color-wa-bg)]">Loading...</div>;
  }

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
