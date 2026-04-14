'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/ui/Cards';
import { Search, Send, Image, FileText, Smile, Phone, MoreVertical, CheckCheck, Check, Archive, VolumeX, ShieldAlert, BadgeInfo, UserX, UserCheck, ChevronLeft } from 'lucide-react';

function Avatar({ name, color, size = 9 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 shadow-sm`}
      style={{ background: color || '#25D366', fontSize: size <= 8 ? 11 : 13 }}
    >
      {initials}
    </div>
  );
}

function MsgStatus({ status }) {
  if (status === 'sending') return <div className="w-3 h-3 border border-[var(--color-wa-muted)] border-t-transparent rounded-full animate-spin-slow" />;
  if (status === 'read')      return <CheckCheck size={13} color="#25D366" />;
  if (status === 'delivered') return <CheckCheck size={13} color="var(--color-wa-muted)" />;
  return <Check size={13} color="var(--color-wa-muted)" />;
}

export default function InboxPage() {
  const { data, sendMessage, updateContact } = useApp();
  const [selectedId,   setSelectedId]   = useState(data.contacts[0]?.id || null);
  const [inputText,    setInputText]    = useState('');
  const [search,       setSearch]       = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showMenu,     setShowMenu]     = useState(false);
  const messagesEndRef = useRef(null);

  const contacts = data.contacts;
  
  const filtered = contacts.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    if (!matchSearch) return false;

    if (activeFilter === 'unseen')  return c.unread > 0;
    if (activeFilter === 'seen')    return c.unread === 0;
    if (activeFilter === 'archive') return c.isArchived;
    if (activeFilter === 'mute')    return c.isMuted;
    
    // 'all' filter shows only non-archived, non-blocked by default
    return !c.isArchived && !c.isBlocked;
  });

  const selected  = data.contacts.find(c => c.id === selectedId);
  const convo     = data.conversations?.find(c => c.contactId === selectedId);
  const messages  = convo?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, selectedId]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedId) return;
    sendMessage(selectedId, inputText.trim());
    setInputText('');
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[var(--color-wa-bg)] w-full h-full min-h-0">
      {/* Contact list */}
      <div className={`
        w-full md:w-[300px] flex-shrink-0 border-r border-[var(--color-wa-border)] flex flex-col bg-[var(--color-wa-surface)]
        ${selectedId ? 'hidden md:flex' : 'flex'}
      `}>
        {/* Filters */}
        <div className="px-3 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-[var(--color-wa-border)] bg-[var(--color-wa-bg)]/30">
          {[
            { id: 'all', label: 'All' },
            { id: 'unseen', label: 'Unseen' },
            { id: 'seen', label: 'Seen' },
            { id: 'archive', label: 'Archive' },
            { id: 'mute', label: 'Muted' },
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chats…" style={{ paddingLeft: '34px', fontSize: 13 }} />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map(c => (
            <div
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--color-wa-bg)] transition border-b border-[var(--color-wa-border)]/50
                ${selectedId === c.id ? 'bg-[var(--color-wa-bg)]' : ''}`}
            >
              <Avatar name={c.name} color={c.color} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <p className="text-[13px] font-medium text-[var(--color-wa-text)] truncate">{c.name}</p>
                  <span className="text-[10px] text-[var(--color-wa-muted)] flex-shrink-0 ml-2">
                    {new Date(c.lastTime).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1 min-w-0">
                    {c.isMuted && <VolumeX size={12} className="text-[var(--color-wa-muted)] flex-shrink-0" />}
                    <p className="text-[11px] text-[var(--color-wa-muted)] truncate">{c.lastMessage}</p>
                  </div>
                  {c.unread > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[#25D366] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 ml-1 shadow-sm">
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      {selectedId ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="h-14 flex items-center justify-between px-4 bg-[var(--color-wa-surface)] border-b border-[var(--color-wa-border)] flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                className="md:hidden p-1 -ml-1 text-[var(--color-wa-muted)] hover:text-[var(--color-wa-text)]"
                onClick={() => setSelectedId(null)}
              >
                <ChevronLeft size={20} />
              </button>
              <Avatar name={selected?.name} color={selected?.color} size={8} />
              <div>
                <p className="text-[13px] font-semibold text-[var(--color-wa-text)]">{selected?.name}</p>
                <p className="text-[11px] text-[var(--color-wa-muted)]">{selected?.phone}</p>
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

              {showMenu && (
                <div className="absolute right-0 top-10 w-44 bg-white border border-[var(--color-wa-border)] rounded-xl shadow-xl z-50 py-2 animate-fadeIn">
                  <button 
                    onClick={() => { updateContact(selected.id, { isBlocked: !selected.isBlocked }); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-[13px] flex items-center gap-3 hover:bg-[var(--color-wa-bg)] transition-colors"
                  >
                    {selected.isBlocked ? <UserCheck size={16} className="text-blue-500" /> : <UserX size={16} className="text-red-500" />}
                    <span className={selected.isBlocked ? 'text-blue-500 font-medium' : 'text-red-500 font-medium'}>
                      {selected.isBlocked ? 'Unblock' : 'Block Contact'}
                    </span>
                  </button>
                  <button 
                    onClick={() => { updateContact(selected.id, { isMuted: !selected.isMuted }); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-[13px] flex items-center gap-3 hover:bg-[var(--color-wa-bg)] transition-colors"
                  >
                    <VolumeX size={16} className="text-[var(--color-wa-muted)]" />
                    <span className="text-[var(--color-wa-text)]">{selected.isMuted ? 'Unmute' : 'Mute Notifications'}</span>
                  </button>
                  <button 
                    onClick={() => { updateContact(selected.id, { isArchived: !selected.isArchived }); setShowMenu(false); setSelectedId(null); }}
                    className="w-full px-4 py-2 text-left text-[13px] flex items-center gap-3 hover:bg-[var(--color-wa-bg)] transition-colors"
                  >
                    <Archive size={16} className="text-[var(--color-wa-muted)]" />
                    <span className="text-[var(--color-wa-text)]">{selected.isArchived ? 'Unarchive' : 'Archive Chat'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
            style={{
              backgroundImage: 'radial-gradient(var(--color-wa-border) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              backgroundAttachment: 'local',
            }}
          >
            {messages.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[var(--color-wa-muted)] text-[13px] font-medium">No messages yet. Say hello! 👋</p>
              </div>
            )}
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                <div className={m.direction === 'out' ? 'chat-bubble-out' : 'chat-bubble-in'}>
                  <p className="text-[14px] leading-relaxed">{m.text}</p>
                  <div className={`flex items-center gap-1 mt-1.5 ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                    <span className={`text-[10px] ${m.direction === 'out' ? 'text-[var(--color-wa-teal)]' : 'text-[var(--color-wa-muted)]'}`}>
                      {new Date(m.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {m.direction === 'out' && <MsgStatus status={m.status} />}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 bg-[var(--color-wa-surface)] border-t border-[var(--color-wa-border)] flex-shrink-0">
            {selected.isBlocked ? (
              <div className="flex items-center justify-center gap-2 py-2 bg-red-50 rounded-xl border border-red-100">
                <ShieldAlert size={14} className="text-red-500" />
                <p className="text-[12px] text-red-600 font-medium">You have blocked this contact. Unblock to send messages.</p>
              </div>
            ) : (
              <form onSubmit={handleSend} className="flex items-center gap-1 md:gap-2">
                <button type="button" className="hidden sm:flex p-2 text-[var(--color-wa-muted)] hover:text-[var(--color-wa-text)]"><Smile size={18} /></button>
                <button type="button" className="p-2 text-[var(--color-wa-muted)] hover:text-[var(--color-wa-text)]"><Image size={18} /></button>
                <button type="button" className="hidden sm:flex p-2 text-[var(--color-wa-muted)] hover:text-[var(--color-wa-text)]"><FileText size={18} /></button>
                <input
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1"
                  style={{ background: 'var(--color-wa-bg)', fontSize: 13 }}
                />
                <button
                  type="submit"
                  className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0 hover:bg-[#1ebe5d] transition shadow-md"
                  disabled={!inputText.trim()}
                >
                  <Send size={16} color="#FFFFFF" />
                </button>
              </form>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex items-center justify-center flex-col gap-4 bg-[#F0F2F5]">
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

