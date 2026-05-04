'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { StatusBadge, ProgressBar, RatePill } from '../components/ui/Cards';
import { 
  Search, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, 
  Eye, X, IndianRupee, Save, Loader2, Info
} from 'lucide-react';

const PAGE_SIZES = [10, 15, 25, 50];

export default function TrackerPage() {
  const { data, refreshing, handleRefresh } = useApp();
  const [search,       setSearch]    = useState('');
  const [pageSize,     setPageSize]  = useState(15);
  const [page,         setPage]      = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [sortCol,      setSortCol]   = useState('sent');
  const [sortDir,      setSortDir]   = useState('desc');
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [prices, setPrices] = useState([]);
  const [savingPrices, setSavingPrices] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    try {
      const res = await fetch('/api/pricing');
      const pricingData = await res.json();
      if (pricingData.success) {
        setPrices(pricingData.pricing);
      }
    } catch (err) {
      console.error('Failed to fetch pricing:', err);
    }
  };

  const handleSavePrices = async () => {
    setSavingPrices(true);
    try {
      const updates = prices.map(p => ({
        category: p.category,
        price: p.price_per_conversation
      }));
      
      const res = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      if (res.ok) {
        setIsPricingOpen(false);
        if (handleRefresh) await handleRefresh(); // Refresh tracker to show new costs
      }
    } catch (err) {
      console.error('Failed to save prices:', err);
    } finally {
      setSavingPrices(false);
    }
  };

  const updatePriceValue = (category, value) => {
    setPrices(prev => prev.map(p => 
      p.category === category ? { ...p, price_per_conversation: parseFloat(value) || 0 } : p
    ));
  };

  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    const templates = (data.templates || []).map(t => {
      // Calculate dynamic cost based on fetched prices
      const pricing = prices.find(p => p.category === t.category.toLowerCase());
      const unitPrice = pricing ? pricing.price_per_conversation : 0;
      const cost = (t.sent || 0) * unitPrice;
      
      return { 
        ...t, 
        unitPrice,
        cost: cost > 0 ? cost : (t.cost || 0) // Fallback to provided cost if our calculation is 0
      };
    });

    return templates
      .filter(t => (t.name || '').toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const va = typeof a[sortCol] === 'number' ? a[sortCol] : 0;
        const vb = typeof b[sortCol] === 'number' ? b[sortCol] : 0;
        return sortDir === 'asc' ? va - vb : vb - va;
      });
  }, [data.templates, search, sortCol, sortDir, prices]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated   = filtered.slice((page - 1) * pageSize, page * pageSize);
  const from       = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const to         = Math.min(page * pageSize, filtered.length);

  const stats = useMemo(() => [
    { label: 'Total Templates', value: data.templates?.length || 0, icon: '📋' },
    { label: 'Approved', value: data.templates?.filter(t => t.status?.toUpperCase() === 'APPROVED')?.length || 0, icon: '✅' },
    { label: 'Avg Read Rate', value: `${Math.round((data.templates?.reduce((acc, t) => acc + (t.readRate || 0), 0) || 0) / (data.templates?.length || 1))}%`, icon: '📈' },
  ], [data.templates]);

  if (!mounted) return null;

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ChevronUp size={11} className="opacity-25 ml-0.5" />;
    return sortDir === 'asc'
      ? <ChevronUp   size={11} className="text-[#25D366] ml-0.5" />
      : <ChevronDown size={11} className="text-[#25D366] ml-0.5" />;
  };

  const STH = ({ label, col, w }) => (
    <th
      onClick={() => handleSort(col)}
      className="px-4 py-2.5 text-left text-[11px] font-bold text-[#444] uppercase tracking-wider bg-[#F0F2F5] border-b border-[#E2E5E9] cursor-pointer select-none hover:bg-[#E5E8EC] whitespace-nowrap transition-colors"
      style={w ? { width: w } : {}}
    >
      <span className="inline-flex items-center gap-0.5">{label}<SortIcon col={col} /></span>
    </th>
  );

  const FTH = ({ label, cls = '', w }) => (
    <th 
      className={`px-4 py-2.5 text-left text-[11px] font-bold text-[#444] uppercase tracking-wider bg-[#F0F2F5] border-b border-[#E2E5E9] whitespace-nowrap ${cls}`}
      style={w ? { width: w } : {}}
    >
      {label}
    </th>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden animate-fadeIn bg-[var(--color-wa-bg)]">
      
      {/* Top Stats Strip */}
      <div className="px-4 py-3 grid grid-cols-3 gap-3 border-b border-[var(--color-wa-border)] bg-white/50">
        {stats.map((s, i) => (
          <div key={i} className="bg-white p-2.5 rounded-xl shadow-sm border border-[var(--color-wa-border)] flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--color-wa-bg)] flex items-center justify-center text-sm shrink-0">
              {s.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[9px] text-[var(--color-wa-muted)] font-bold uppercase tracking-tight truncate">{s.label}</p>
              <p className="text-[14px] font-bold text-[var(--color-wa-text)] leading-none mt-0.5 truncate">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-2 flex items-center justify-between bg-[var(--color-wa-bg)]">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-wa-muted)] pointer-events-none" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search templates…"
            className="bg-[var(--color-wa-surface)] border border-[var(--color-wa-border)] rounded-lg !py-1.5 !pl-9 pr-3 text-[13px] w-56 outline-none focus:border-[#25D366] transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsPricingOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[var(--color-wa-border)] rounded-lg text-[11px] font-bold text-[var(--color-wa-muted)] hover:text-[#25D366] hover:border-[#25D366] transition-all shadow-sm"
          >
            <IndianRupee size={12} />
            <span>Pricing Settings</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col overflow-hidden bg-[var(--color-wa-surface)] border-t border-[var(--color-wa-border)]">

          <div className="hidden md:block flex-1 overflow-auto no-scrollbar">
            <table className="w-full min-w-[1100px] border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 shadow-sm">
                <tr>
                  <FTH label="Template" w="180px" />
                  <FTH label="Category" w="110px" />
                  <FTH label="Status" w="100px" />
                  <STH label="Sent"      col="sent" w="80px" />
                  <STH label="Cost"      col="cost" w="120px" />
                  <STH label="Delivered" col="delivered" w="110px" />
                  <STH label="Read"      col="read" w="110px" />
                  <STH label="Replied"   col="replied" w="80px" />
                  <STH label="Failed"    col="failed" w="80px" />
                  <STH label="Dlvry%"   col="deliveryRate" w="80px" />
                  <STH label="Read%"    col="readRate" w="80px" />
                  <STH label="Reply%"   col="replyRate" w="80px" />
                  <FTH label="View" cls="text-center" w="60px" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-wa-border)]">
                {paginated.map(t => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTemplate(t)}
                    className="table-row transition cursor-pointer group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col truncate">
                        <span className="text-[13px] font-semibold text-[var(--color-wa-text)] group-hover:text-[#25D366] transition-colors truncate">
                          {t.name}
                        </span>
                        <span className="text-[10px] text-[var(--color-wa-muted)] font-mono uppercase">{t.language || 'en_US'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold uppercase tracking-wide py-0.5 px-2 rounded-md bg-[var(--color-wa-bg)] text-[var(--color-wa-muted)] border border-[var(--color-wa-border)] whitespace-nowrap">
                        {t.category}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-[var(--color-wa-text)] tabular-nums">
                      {(t.sent || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-[var(--color-wa-green)] tabular-nums">₹{(t.cost || 0).toFixed(2)}</span>
                        <span className="text-[9px] text-[var(--color-wa-muted)] font-normal">₹{(t.unitPrice || 0).toFixed(3)}/msg</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[var(--color-wa-text)] tabular-nums w-8 shrink-0">{t.delivered || 0}</span>
                        <div className="w-14 shrink-0"><ProgressBar value={t.delivered || 0} max={t.sent || 1} color="#25D366" /></div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[var(--color-wa-text)] tabular-nums w-8 shrink-0">{t.read || 0}</span>
                        <div className="w-14 shrink-0"><ProgressBar value={t.read || 0} max={t.sent || 1} color="#3b82f6" /></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-[#8b5cf6] tabular-nums">{t.replied || 0}</td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-red-500 tabular-nums">{t.failed || 0}</td>
                    <td className="px-4 py-3"><RatePill value={t.deliveryRate || 0} /></td>
                    <td className="px-4 py-3"><RatePill value={t.readRate || 0} /></td>
                    <td className="px-4 py-3"><RatePill value={t.replyRate || 0} base={20} /></td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedTemplate(t); }}
                        className="p-1.5 rounded-lg text-[var(--color-wa-muted)] hover:bg-[var(--color-wa-bg)] hover:text-[#25D366] transition-colors"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden flex-1 overflow-auto no-scrollbar bg-[#F8F9FA] p-3 space-y-3">
            {paginated.map(t => (
              <div
                key={t.id}
                onClick={() => setSelectedTemplate(t)}
                className="bg-white rounded-xl border border-[var(--color-wa-border)] p-4 shadow-sm active:bg-[#f0f0f0] transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="text-[14px] font-bold text-[var(--color-wa-text)]">{t.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-wa-muted)] bg-[var(--color-wa-bg)] px-1.5 py-0.5 rounded border border-[var(--color-wa-border)]">
                        {t.category}
                      </span>
                      <span className="text-[10px] text-[var(--color-wa-muted)] font-mono">{t.language || 'en_US'}</span>
                    </div>
                  </div>
                  <StatusBadge status={t.status} />
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-4 border-t border-[var(--color-wa-border)] pt-3">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-[var(--color-wa-muted)] uppercase font-semibold">Sent / Cost</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-bold text-[var(--color-wa-text)]">{(t.sent || 0).toLocaleString()}</p>
                      <p className="text-[13px] font-bold text-[var(--color-wa-green)]">₹{(t.cost || 0).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-[var(--color-wa-muted)] uppercase font-semibold">Delivery %</p>
                    <div className="flex items-center gap-2">
                       <p className="text-[13px] font-bold text-[var(--color-wa-text)]">{t.deliveryRate || 0}%</p>
                       <div className="w-12"><ProgressBar value={t.deliveryRate || 0} max={100} color="#25D366" /></div>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-[var(--color-wa-muted)] uppercase font-semibold">Read %</p>
                    <div className="flex items-center gap-2">
                       <p className="text-[13px] font-bold text-[var(--color-wa-text)]">{t.readRate || 0}%</p>
                       <div className="w-12"><ProgressBar value={t.readRate || 0} max={100} color="#3b82f6" /></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--color-wa-border)] border-dashed">
                  <div className="flex gap-3">
                    <div className="text-center">
                      <p className="text-[9px] text-[var(--color-wa-muted)] uppercase">Read</p>
                      <p className="text-[12px] font-semibold">{t.read || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-[var(--color-wa-muted)] uppercase">Replies</p>
                      <p className="text-[12px] font-semibold text-[#8b5cf6]">{t.replied || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[var(--color-wa-muted)]">
                    <span className="text-[11px] font-medium">Preview</span>
                    <Eye size={14} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {paginated.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-[#8696A0]">No templates match your filters.</p>
            </div>
          )}

          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-3 md:px-4 py-2 bg-[var(--color-wa-surface)] border-t border-[var(--color-wa-border)] text-[11px] md:text-[12px] text-[var(--color-wa-muted)]">
            <span className="whitespace-nowrap">
              Showing&nbsp;<strong className="text-[var(--color-wa-text)] font-semibold">{from}</strong>&nbsp;to&nbsp;
              <strong className="text-[var(--color-wa-text)] font-semibold">{to}</strong>&nbsp;of&nbsp;
              <strong className="text-[var(--color-wa-text)] font-semibold">{filtered.length}</strong>&nbsp;records
            </span>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="w-7 h-7 flex items-center justify-center rounded border border-[var(--color-wa-border)] hover:bg-[var(--color-wa-bg)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                ><ChevronLeft size={13} /></button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  if (pg > totalPages) return null;
                  return (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      className={`w-7 h-7 rounded text-[11px] md:text-[12px] font-semibold border transition-colors
                        ${pg === page ? 'bg-[#25D366] text-white border-[#25D366]' : 'border-[var(--color-wa-border)] text-[var(--color-wa-text)] hover:bg-[var(--color-wa-bg)]'}`}
                    >{pg}</button>
                  );
                })}
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="w-7 h-7 flex items-center justify-center rounded border border-[var(--color-wa-border)] hover:bg-[var(--color-wa-bg)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                ><ChevronRight size={13} /></button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Pricing Settings Modal ── */}
      {isPricingOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slideInRight" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-wa-border)] bg-[var(--color-wa-bg)]/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#25D366]/10 flex items-center justify-center">
                  <IndianRupee size={16} className="text-[#25D366]" />
                </div>
                <div>
                  <h2 className="text-[14px] font-bold text-[var(--color-wa-text)]">Pricing Settings</h2>
                  <p className="text-[10px] text-[var(--color-wa-muted)]">Set conversation rates per category</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPricingOpen(false)} 
                className="p-1.5 rounded-lg text-[var(--color-wa-muted)] hover:bg-[var(--color-wa-bg)] hover:text-red-500 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[400px] overflow-y-auto">
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex gap-3">
                <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  These rates are used to calculate estimated costs for your outbound template messages based on their category.
                </p>
              </div>

              <div className="space-y-3">
                {prices.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-[var(--color-wa-bg)]/30 rounded-xl border border-[var(--color-wa-border)]">
                    <div>
                      <p className="text-[12px] font-bold text-[var(--color-wa-text)] capitalize">{p.category.replace(/_/g, ' ')}</p>
                      <p className="text-[10px] text-[var(--color-wa-muted)] uppercase">Per Conversation</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-[var(--color-wa-muted)]">₹</span>
                      <input
                        type="number"
                        step="0.0001"
                        value={p.price_per_conversation}
                        onChange={(e) => updatePriceValue(p.category, e.target.value)}
                        className="w-24 px-2 py-1.5 bg-white border border-[var(--color-wa-border)] rounded-lg text-xs font-bold focus:border-[#25D366] outline-none transition-all"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-[var(--color-wa-border)] bg-[var(--color-wa-bg)]/50 flex gap-3">
              <button 
                onClick={() => setIsPricingOpen(false)} 
                className="flex-1 px-4 py-2 bg-white border border-[var(--color-wa-border)] text-[13px] font-bold text-[var(--color-wa-text)] rounded-xl hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSavePrices}
                disabled={savingPrices}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#25D366] text-white text-[13px] font-bold rounded-xl hover:bg-[#1ebe5d] transition-all disabled:opacity-50"
              >
                {savingPrices ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                <span>Save Prices</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Preview Modal ── */}
      {mounted && selectedTemplate && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-md shadow-2xl rounded-2xl overflow-hidden animate-slideInRight" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-wa-border)] bg-[var(--color-wa-bg)]/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#25D366]/10 flex items-center justify-center">
                  <Eye size={16} className="text-[#25D366]" />
                </div>
                <div>
                  <h2 className="text-[14px] font-bold text-[var(--color-wa-text)]">Template Preview</h2>
                  <p className="text-[10px] text-[var(--color-wa-muted)]">{selectedTemplate.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="p-1.5 rounded-lg text-[var(--color-wa-muted)] hover:bg-[var(--color-wa-bg)] hover:text-red-500 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
              <div>
                <p className="text-[10px] uppercase font-bold text-[var(--color-wa-muted)] tracking-wider mb-2">Message Body</p>
                <div className="bg-[var(--color-wa-bg)] p-4 rounded-xl border border-[var(--color-wa-border)] border-l-4 border-l-[#25D366]">
                  <p className="text-[13px] text-[var(--color-wa-text)] leading-relaxed italic whitespace-pre-wrap">"{selectedTemplate.body}"</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Category', value: selectedTemplate.category, color: 'var(--color-wa-text)' },
                  { label: 'Status', value: selectedTemplate.status, color: '#25D366' },
                  { label: 'Est. Cost', value: `₹${(selectedTemplate.cost || 0).toFixed(2)}`, color: '#25D366' },
                ].map(m => (
                  <div key={m.label} className="bg-[var(--color-wa-bg)] rounded-xl p-3 border border-[var(--color-wa-border)] text-center">
                    <p className="text-[9px] uppercase font-bold text-[var(--color-wa-muted)] mb-1 truncate">{m.label}</p>
                    <p className="text-[12px] font-bold truncate" style={{ color: m.color }}>{m.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Sent', value: selectedTemplate.sent },
                  { label: 'Delivered', value: selectedTemplate.delivered },
                  { label: 'Read', value: selectedTemplate.read },
                ].map(m => (
                  <div key={m.label} className="bg-[var(--color-wa-bg)] rounded-xl p-3 border border-[var(--color-wa-border)] text-center">
                    <p className="text-[9px] uppercase font-bold text-[var(--color-wa-muted)] mb-1 truncate">{m.label}</p>
                    <p className="text-[16px] font-extrabold text-[var(--color-wa-text)]">{(m.value || 0).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-3 gap-2 pt-2">
                {[
                  { label: 'Dlvry Rate', value: selectedTemplate.deliveryRate, color: '#25D366' },
                  { label: 'Read Rate', value: selectedTemplate.readRate, color: '#3b82f6' },
                  { label: 'Reply Rate', value: selectedTemplate.replyRate, color: '#8b5cf6' },
                ].map(m => (
                  <div key={m.label} className="space-y-1">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[9px] font-bold text-[var(--color-wa-muted)] uppercase">{m.label}</span>
                      <span className="text-[10px] font-bold" style={{ color: m.color }}>{m.value}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[var(--color-wa-bg)] rounded-full overflow-hidden border border-[var(--color-wa-border)]">
                      <div className="h-full transition-all duration-500" style={{ width: `${m.value}%`, backgroundColor: m.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-[var(--color-wa-border)] bg-[var(--color-wa-bg)]/50 flex justify-end">
              <button onClick={() => setSelectedTemplate(null)} className="px-6 py-2 bg-[#25D366] text-white text-[13px] font-bold rounded-xl hover:bg-[#1ebe5d] transition-all">
                Close Preview
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
