'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useDashStore } from '@/lib/store';
import dynamic from 'next/dynamic';
import {
  Search, Send, Image as ImageIcon, FileText, Smile, Phone,
  MoreVertical, CheckCheck, Check, Archive, VolumeX, ShieldAlert,
  UserX, UserCheck, ChevronLeft, SmilePlus, Download, Play, Paperclip,
} from 'lucide-react';

// Dynamic import — EmojiPicker only runs in browser (no SSR)
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

/* ─── Helpers ────────────────────────────────────────────────── */

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

/* ─── Page ───────────────────────────────────────────────────── */

export default function InboxPage() {
  const {
    conversations,
    activeConversationId,
    setActiveConversation,
    fetchConversations,
    messages,
    sendMessage,
    sendReaction,
    searchQuery,
    setSearchQuery,
  } = useDashStore();

  const [inputText, setInputText]       = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showMenu, setShowMenu]         = useState(false);
  const [showEmoji, setShowEmoji]       = useState(false);
  const [reactingToId, setReactingToId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef  = useRef<HTMLInputElement>(null);
  const docInputRef    = useRef<HTMLInputElement>(null);

  /* ─ data fetch & realtime ──────────────────────────────────── */

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

    return () => { sb.removeChannel(channel); };
  }, []);

  /* ─ derived ────────────────────────────────────────────────── */

  const filtered = conversations.filter(c => {
    const name = c.contact?.name || c.contact?.phone_number || '';
    const matchSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.contact?.phone_number || '').includes(searchQuery);
    if (!matchSearch) return false;

    if (activeFilter === 'unseen') return c.unread_count > 0;
    if (activeFilter === 'seen')   return c.unread_count === 0;
    return true;
  });

  const selectedConv    = conversations.find(c => c.id === activeConversationId);
  const selectedContact = selectedConv?.contact;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeConversationId]);

  /* ─ handlers ───────────────────────────────────────────────── */

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversationId || !selectedContact?.phone_number) return;
    try {
      await sendMessage(selectedContact.phone_number, inputText.trim(), activeConversationId);
      setInputText('');
      setShowEmoji(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEmojiClick = (emojiData: any) => {
    setInputText(prev => prev + emojiData.emoji);
  };

  const handleImageClick = () => {
    imageInputRef.current?.click();
  };

  const handleDocClick = () => {
    docInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    alert(`Selected ${type}: ${file.name}\n(Media upload to WhatsApp will be connected next)`);
    // Reset the input so the same file can be re-selected
    e.target.value = '';
  };

  /* ─ render ─────────────────────────────────────────────────── */

  return (
    <div className="flex-1 flex overflow-hidden bg-[var(--color-wa-bg)] w-full h-full min-h-0">
      {/* ── Contact list ────────────────────────────────────────── */}
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
            );
          })}
        </div>
      </div>

      {/* ── Chat area ───────────────────────────────────────────── */}
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
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 z-10">
            {messages.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[var(--color-wa-muted)] text-[13px] font-medium">No messages yet. Say hello! 👋</p>
              </div>
            )}
            {messages.map(m => {
              const isOut = m.direction === 'outbound';
              return (
              <div key={m.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                <div className="relative group max-w-[85%] md:max-w-[70%]">
                  {/* Bubble */}
                  <div className={`${isOut ? 'chat-bubble-out' : 'chat-bubble-in'} relative`}>
                    <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{m.content}</p>
                    <div className={`flex items-center gap-1 mt-1.5 ${isOut ? 'justify-end' : 'justify-start'}`}>
                      <span className={`text-[10px] ${isOut ? 'text-[var(--color-wa-teal)]' : 'text-[var(--color-wa-muted)]'}`}>
                        {new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isOut && <MsgStatus status={m.status} />}
                    </div>

                    {/* Reaction badges */}
                    {(() => {
                      const dbReactions = m.reactions || [];
                      const allReactions = [...dbReactions];
                      // Add local optimistic reaction if not already in DB
                      if (m.myReaction && !dbReactions.some((r: any) => r.sender === 'me')) {
                        allReactions.push({ emoji: m.myReaction, sender: 'me' });
                      }
                      if (allReactions.length === 0) return null;
                      return (
                        <div className={`absolute -bottom-3 ${isOut ? 'right-2' : 'left-2'} flex gap-0.5`}>
                          {allReactions.map((r: any, idx: number) => (
                            <button
                              key={idx}
                              onClick={() => {
                                if (r.sender === 'me' && m.wa_message_id && selectedContact?.phone_number) {
                                  sendReaction(selectedContact.phone_number, m.wa_message_id, '', m.id);
                                }
                              }}
                              className="bg-white px-1.5 py-0.5 rounded-full shadow-md border border-[var(--color-wa-border)] text-sm hover:scale-110 transition-transform cursor-pointer"
                              title={r.sender === 'me' ? 'Click to remove' : `Reacted by ${r.sender}`}
                            >
                              {r.emoji}
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* ── Floating reaction trigger (appears on hover) ── */}
                  <div className={`absolute -top-1 ${isOut ? '-left-9' : '-right-9'} opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20`}>
                    <button
                      className={`p-1.5 rounded-full shadow-sm border transition-all ${
                        reactingToId === m.id
                          ? 'bg-[var(--color-wa-green)] text-white border-[var(--color-wa-green)]'
                          : 'bg-white/95 text-[var(--color-wa-muted)] hover:text-[var(--color-wa-text)] border-[var(--color-wa-border)]'
                      }`}
                      onClick={() => setReactingToId(reactingToId === m.id ? null : m.id)}
                    >
                      <SmilePlus size={14} />
                    </button>

                    {/* ── Reaction bar (WhatsApp-style dark pill) ── */}
                    {reactingToId === m.id && (
                      <div
                        className={`absolute top-0 ${
                          isOut ? 'right-full mr-1.5' : 'left-full ml-1.5'
                        } flex items-center bg-[#1F2C34] px-2 py-1.5 rounded-full shadow-xl gap-1 animate-scaleIn`}
                      >
                        {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => {
                              if (m.wa_message_id && selectedContact?.phone_number) {
                                sendReaction(selectedContact.phone_number, m.wa_message_id, emoji, m.id);
                              }
                              setReactingToId(null);
                            }}
                            className="text-xl p-0.5 hover:scale-[1.35] transition-transform duration-150 hover:bg-white/10 rounded"
                          >
                            {emoji}
                          </button>
                        ))}
                        <div className="w-px h-5 bg-white/20 mx-0.5" />
                        <button
                          onClick={() => {
                            setReactingToId(null);
                            setShowEmoji(true);
                          }}
                          className="text-white/70 hover:text-white p-1 hover:bg-white/10 rounded transition-colors"
                          title="More emojis"
                        >
                          <SmilePlus size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Input Area ─────────────────────────────────────────── */}
          <div className="px-4 py-3 bg-[var(--color-wa-surface)] border-t border-[var(--color-wa-border)] flex-shrink-0 z-10 relative">

            {/* Hidden file inputs — always in DOM for ref stability */}
            <input
              type="file"
              ref={imageInputRef}
              className="hidden"
              accept="image/*,video/*"
              onChange={e => handleFileSelect(e, 'image/video')}
            />
            <input
              type="file"
              ref={docInputRef}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
              onChange={e => handleFileSelect(e, 'document')}
            />

            {/* Emoji Picker — positioned above input bar */}
            {showEmoji && (
              <div className="absolute bottom-full left-4 mb-2 z-[100] rounded-xl overflow-hidden shadow-2xl animate-scaleIn">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  autoFocusSearch={false}
                  theme={'light' as any}
                  searchPlaceholder="Search emojis..."
                  width={320}
                  height={400}
                  previewConfig={{ showPreview: false }}
                  skinTonesDisabled
                />
              </div>
            )}

            <form onSubmit={handleSend} className="flex items-center gap-1 md:gap-2">
              {/* Emoji toggle */}
              <button
                type="button"
                onClick={() => setShowEmoji(prev => !prev)}
                className={`hidden sm:flex p-2 rounded-full transition-colors ${
                  showEmoji
                    ? 'bg-[var(--color-wa-green)]/10 text-[var(--color-wa-green)]'
                    : 'text-[var(--color-wa-muted)] hover:text-[var(--color-wa-text)]'
                }`}
                title="Emojis"
              >
                <Smile size={18} />
              </button>

              {/* Image / Video */}
              <button
                type="button"
                onClick={handleImageClick}
                className="p-2 text-[var(--color-wa-muted)] hover:text-[var(--color-wa-text)]"
                title="Images & Videos"
              >
                <ImageIcon size={18} />
              </button>

              {/* Documents */}
              <button
                type="button"
                onClick={handleDocClick}
                className="hidden sm:flex p-2 text-[var(--color-wa-muted)] hover:text-[var(--color-wa-text)]"
                title="Documents"
              >
                <Paperclip size={18} />
              </button>

              {/* Text input */}
              <input
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onFocus={() => setShowEmoji(false)}
                placeholder="Type a message…"
                className="flex-1 cursor-text"
                style={{ background: 'var(--color-wa-bg)', fontSize: 13 }}
              />

              {/* Send */}
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
