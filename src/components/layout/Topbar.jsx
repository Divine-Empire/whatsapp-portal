'use client';
import React from 'react';
import { useApp } from '../../context/AppContext';
import { Menu, RefreshCw, Zap, LogOut, Bell, Settings } from 'lucide-react';
import Link from 'next/link';

const PAGE_TITLES = {
  overview:  'Overview',
  tracker:   'Message Tracker',
  inbox:     'Chat Inbox',
  health:    'Phone Health',
  logs:      'Logs',
};

export default function Topbar() {
  const { activePage, setSidebarOpen, lastSync, refreshing, handleRefresh, session, logout, addToast } = useApp();

  const syncStr = lastSync.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const handleMatchReplies = async () => {
    addToast('Matching incoming replies with contacts…', 'info');
    try {
      const res = await fetch('/api/match-replies', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        addToast(`Success: Reconciled ${data.stats.updatedConversations} chats and ${data.stats.updatedMessages} messages.`, 'success');
        handleRefresh();
      } else {
        addToast(`Error: ${data.error || 'Failed to reconcile data'}`, 'error');
      }
    } catch (err) {
      addToast('Error: Failed to connect to reconciliation service', 'error');
    }
  };

  return (
    <header className="h-14 md:h-16 flex items-center justify-between px-3 md:px-4 bg-[var(--color-wa-card)] border-b border-[var(--color-wa-border)] flex-shrink-0 z-20">
      {/* Left */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <button
          className="md:hidden p-2 rounded-lg text-[var(--color-wa-muted)] hover:text-[var(--color-wa-text)] hover:bg-[var(--color-wa-bg)] transition flex-shrink-0"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="text-[14px] md:text-[15px] font-semibold text-[var(--color-wa-text)] truncate">{PAGE_TITLES[activePage]}</h1>
          <p suppressHydrationWarning className="text-[10px] md:text-[11px] text-[var(--color-wa-muted)] hidden sm:block">Last sync: {syncStr}</p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
        {/* Refresh */}
        <button
          onClick={handleRefresh}
          className="p-2 rounded-lg text-[var(--color-wa-muted)] hover:text-[#25D366] hover:bg-[var(--color-wa-bg)] transition"
          title="Refresh data"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin-slow' : ''} />
        </button>

        {/* Match Replies — hidden per user request */}
        {/* <button
          onClick={handleMatchReplies}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-wa-border)] text-[var(--color-wa-text)] text-[12px] font-medium hover:border-[#25D366] hover:text-[#25D366] transition"
        >
          <Zap size={13} />
          Match Replies
        </button> */}

        {/* Bell */}
        <button className="p-2 rounded-lg text-[var(--color-wa-muted)] hover:text-[var(--color-wa-text)] hover:bg-[var(--color-wa-bg)] transition relative">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#25D366] rounded-full shadow-[0_0_0_2px_var(--color-wa-surface)]"></span>
        </button>

        {/* User */}
        <div className="flex items-center gap-1.5 md:gap-2 pl-2 border-l border-[var(--color-wa-border)]">
          <Link 
            href="/onboarding"
            className="w-7 h-7 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] transition-all flex items-center justify-center text-white text-[11px] font-bold shadow-sm"
            title="Meta configuration & webhooks"
          >
            {session?.name?.[0] || 'A'}
          </Link>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-[var(--color-wa-muted)] hover:text-red-500 hover:bg-[var(--color-wa-bg)] transition"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
