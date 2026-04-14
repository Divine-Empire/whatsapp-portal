'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useDashStore } from '@/lib/store';
import { StatusBadge } from '@/components/ui/Cards';
import { Search, Send, Image as ImageIcon, FileText, Smile, Phone, MoreVertical, CheckCheck, Check, Archive, VolumeX, ShieldAlert, BadgeInfo, UserX, UserCheck, ChevronLeft } from 'lucide-react';

function Avatar({ name, color, size = 9 }: any) {
  const initials = name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '??';
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 shadow-sm`}
      style={{ background: color || '#25D366', fontSize: size <= 8 ? 11 : 13 }}
    >
      {initials}
    </div>
  );
}

function MsgStatus({ status }: any) {
  if (status === 'sending') return <div className="w-3 h-3 border border-[var(--color-wa-muted)] border-t-transparent rounded-full animate-spin-slow" />;
  if (status === 'read')      return <CheckCheck size={13} color="#25D366" />;
  if (status === 'delivered') return <CheckCheck size={13} color="var(--color-wa-muted)" />;
  return <Check size={13} color="var(--color-wa-muted)" />;
}

export default function InboxPage() {
  const {
    conversations,
    activeConversationId,
    setActiveConversation,
    fetchConversations,
    messages,
    sendMessage,
    searchQuery,
    setSearchQuery,
  } = useDashStore();

  const [inputText, setInputText] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    const sb = createClient();
    const channel = sb
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: any) => useDashStore.getState().handleMessageInsert(payload.new as any)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload: any) => useDashStore.getState().handleMessageUpdate(payload.new as any)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        (payload: any) => useDashStore.getState().handleConversationUpdate(payload.new as any)
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, []);

  const filtered = conversations.filter(c => {
    const name = c.contact?.name || c.contact?.phone_number || '';
    const matchSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.contact?.phone_number || '').includes(searchQuery);
    if (!matchSearch) return false;

    if (activeFilter === 'unseen') return c.unread_count > 0;
    if (activeFilter === 'seen') return c.unread_count === 0;
    
    return true; 
  });

  const selectedConv = conversations.find(c => c.id === activeConversationId);
  const selectedContact = selectedConv?.contact;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeConversationId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversationId || !selectedContact?.phone_number) return;
    try {
      await sendMessage(selectedContact.phone_number, inputText.trim(), activeConversationId);
      setInputText('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[var(--color-wa-bg)] w-full h-full min-h-0">
      {/* Contact list */}
      <div className={`
        w-full md:w-[300px] flex-shrink-0 border-r border-[var(--color-wa-border)] flex flex-col bg-[var(--color-wa-surface)]
        ${activeConversationId ? 'hidden md:flex' : 'flex'}
      `}>
        {/* Filters */}
        <div className="px-3 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-[var(--color-wa-border)] bg-[var(--color-wa-bg)]/30">
          {[
            { id: 'all', label: 'All' },
            { id: 'unseen', label: 'Unseen' },
            { id: 'seen', label: 'Seen' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap
                ${activeFilter === f.id 
                  ? 'bg-[var(--color-wa-green)] text-white shadow-sm' 
                  : 'bg-white text-[var(--color-wa-muted)] border border-[var(--color-wa-border)] hover:bg-[var(--color-wa-bg)]'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="p-3 border-b border-[var(--color-wa-border)]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-wa-muted)]" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search chats…" style={{ paddingLeft: '34px', fontSize: 13 }} />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map(c => {
             const name = c.contact?.name || c.contact?.phone_number || 'Unknown';
             return (
            <div
              key={c.id}
              onClick={() => setActiveConversation(c.id)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--color-wa-bg)] transition border-b border-[var(--color-wa-border)]/50
                ${activeConversationId === c.id ? 'bg-[var(--color-wa-bg)]' : ''}`}
            >
              <Avatar name={name} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <p className="text-[13px] font-medium text-[var(--color-wa-text)] truncate">{name}</p>
                  <span className="text-[10px] text-[var(--color-wa-muted)] flex-shrink-0 ml-2">
                    {c.last_message_at ? new Date(c.last_message_at).toLocaleDateString() : ''}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1 min-w-0">
                    <p className="text-[11px] text-[var(--color-wa-muted)] truncate">{c.last_message}</p>
                  </div>
                  {c.unread_count > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[#25D366] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 ml-1 shadow-sm">
                      {c.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )})}
        </div>
      </div>

      {/* Chat area */}
      {activeConversationId ? (
        <div className="flex-1 flex flex-col min-w-0 bg-[var(--color-wa-bg)] relative">
          <div className="absolute inset-0 z-0 opacity-40 pointer-events-none" style={{
              backgroundImage: 'radial-gradient(var(--color-wa-border) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              backgroundAttachment: 'local',
          }} />

          {/* Chat header */}
          <div className="h-14 flex items-center justify-between px-4 bg-[var(--color-wa-surface)] border-b border-[var(--color-wa-border)] flex-shrink-0 z-10">
            <div className="flex items-center gap-3">
              <button
                className="md:hidden p-1 -ml-1 text-[var(--color-wa-muted)] hover:text-[var(--color-wa-text)]"
                onClick={() => setActiveConversation(null)}
              >
                <ChevronLeft size={20} />
              </button>
              <Avatar name={selectedContact?.name || selectedContact?.phone_number} size={8} />
              <div>
                <p className="text-[13px] font-semibold text-[var(--color-wa-text)]">{selectedContact?.name || selectedContact?.phone_number}</p>
                <p className="text-[11px] text-[var(--color-wa-muted)]">{selectedContact?.phone_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 relative">
              <button className="p-2 text-[var(--color-wa-muted)] hover:text-[var(--color-wa-text)]"><Phone size={16} /></button>
              <button 
                className={`p-2 transition-colors rounded-full ${showMenu ? 'bg-[var(--color-wa-bg)] text-[var(--color-wa-text)]' : 'text-[var(--color-wa-muted)] hover:text-[var(--color-wa-text)]'}`}
                onClick={() => setShowMenu(!showMenu)}
              >
                <MoreVertical size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 z-10"
          >
            {messages.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[var(--color-wa-muted)] text-[13px] font-medium">No messages yet. Say hello! 👋</p>
              </div>
            )}
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                <div className={m.direction === 'outbound' ? 'chat-bubble-out' : 'chat-bubble-in'}>
                  <p className="text-[14px] leading-relaxed">{m.content}</p>
                  <div className={`flex items-center gap-1 mt-1.5 ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                    <span className={`text-[10px] ${m.direction === 'outbound' ? 'text-[var(--color-wa-teal)]' : 'text-[var(--color-wa-muted)]'}`}>
                      {new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {m.direction === 'outbound' && <MsgStatus status={m.status} />}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 bg-[var(--color-wa-surface)] border-t border-[var(--color-wa-border)] flex-shrink-0 z-10">
              <form onSubmit={handleSend} className="flex items-center gap-1 md:gap-2">
                <button type="button" className="hidden sm:flex p-2 text-[var(--color-wa-muted)] hover:text-[var(--color-wa-text)]"><Smile size={18} /></button>
                <button type="button" className="p-2 text-[var(--color-wa-muted)] hover:text-[var(--color-wa-text)]"><ImageIcon size={18} /></button>
                <button type="button" className="hidden sm:flex p-2 text-[var(--color-wa-muted)] hover:text-[var(--color-wa-text)]"><FileText size={18} /></button>
                <input
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1 cursor-text"
                  style={{ background: 'var(--color-wa-bg)', fontSize: 13 }}
                />
                <button
                  type="submit"
                  className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0 hover:bg-[#1ebe5d] transition shadow-md disabled:bg-[#25d36680]"
                  disabled={!inputText.trim()}
                >
                  <Send size={16} color="#FFFFFF" />
                </button>
              </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex flex-col items-center justify-center gap-4 bg-[var(--color-wa-bg)]">
          <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm border border-[var(--color-wa-border)]">
            <Search size={32} className="text-[var(--color-wa-green)]" />
          </div>
          <div className="text-center">
            <p className="text-[var(--color-wa-text)] text-[16px] font-semibold">WhatsApp Web</p>
            <p className="text-[var(--color-wa-muted)] text-[13px] mt-1">Select a contact to start chatting and manage your business.</p>
          </div>
        </div>
      )}
    </div>
  );
}
