'use client';
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { StatusBadge, ProgressBar, RatePill } from '../components/ui/Cards';
import { Search, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Eye, X } from 'lucide-react';

const PAGE_SIZES = [10, 15, 25, 50];
let PAGE_SIZE = 15;

export default function TrackerPage() {
  const { data } = useApp();
  const [search,       setSearch]   = useState('');
  const [pageSize,     setPageSize] = useState(15);
  const [sortCol,      setSortCol]  = useState('sent');
  const [sortDir,      setSortDir]  = useState('desc');
  const [page,         setPage]     = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState(null);


  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
    setPage(1);
  };

  const filtered = useMemo(() => data.templates
    .filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const va = typeof a[sortCol] === 'number' ? a[sortCol] : 0;
      const vb = typeof b[sortCol] === 'number' ? b[sortCol] : 0;
      return sortDir === 'asc' ? va - vb : vb - va;
    }),
  [data.templates, search, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged      = filtered.slice((page - 1) * pageSize, page * pageSize);
  const from       = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const to         = Math.min(page * pageSize, filtered.length);

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ChevronUp size={11} className="opacity-25 ml-0.5" />;
    return sortDir === 'asc'
      ? <ChevronUp   size={11} className="text-[#25D366] ml-0.5" />
      : <ChevronDown size={11} className="text-[#25D366] ml-0.5" />;
  };

  /* sortable th — gray header */
  const STH = ({ label, col }) => (
    <th
      onClick={() => handleSort(col)}
      className="px-4 py-2.5 text-left text-[11px] font-bold text-[#444] uppercase tracking-wider bg-[#F0F2F5] border-b border-[#E2E5E9] cursor-pointer select-none hover:bg-[#E5E8EC] whitespace-nowrap transition-colors"
    >
      <span className="inline-flex items-center gap-0.5">{label}<SortIcon col={col} /></span>
    </th>
  );

  /* fixed th — gray header */
  const FTH = ({ label, cls = '' }) => (
    <th className={`px-4 py-2.5 text-left text-[11px] font-bold text-[#444] uppercase tracking-wider bg-[#F0F2F5] border-b border-[#E2E5E9] whitespace-nowrap ${cls}`}>
      {label}
    </th>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden animate-fadeIn bg-[var(--color-wa-bg)]">

      {/* ── Filter Bar ── */}
      <div className="px-4 py-1.5 flex items-center bg-[var(--color-wa-bg)]">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-wa-muted)] pointer-events-none" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search templates…"
            className="bg-[var(--color-wa-surface)] border border-[var(--color-wa-border)] rounded-lg py-1.5 pl-8 pr-3 text-[13px] w-56 outline-none focus:border-[#25D366] transition-all"
          />
        </div>
      </div>

      {/* ── Table Area ── */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col overflow-hidden bg-[var(--color-wa-surface)] border-t-2 border-t-[#25D366] border-x border-b border-[var(--color-wa-border)]">

          {/* scrollable body */}
          {/* Desktop View (Table) */}
          <div className="hidden md:block flex-1 overflow-auto no-scrollbar">
            <table className="w-full min-w-[1000px] border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 shadow-sm">
                <tr>
                  <FTH label="Template" />
                  <FTH label="Category" />
                  <FTH label="Status" />
                  <STH label="Sent"      col="sent" />
                  <STH label="Cost"      col="cost" />
                  <STH label="Delivered" col="delivered" />
                  <STH label="Read"      col="read" />
                  <STH label="Replied"   col="replied" />
                  <STH label="Failed"    col="failed" />
                  <STH label="Dlvry%"   col="deliveryRate" />
                  <STH label="Read%"    col="readRate" />
                  <STH label="Reply%"   col="replyRate" />
                  <FTH label="View" cls="text-center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-wa-border)]">
                {paged.map(t => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTemplate(t)}
                    className="table-row transition cursor-pointer group"
                  >
                    {/* Template */}
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-semibold text-[var(--color-wa-text)] group-hover:text-[#25D366] transition-colors whitespace-nowrap">
                        {t.name}
                      </p>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold uppercase tracking-wide py-0.5 px-2 rounded-md bg-[var(--color-wa-bg)] text-[var(--color-wa-muted)] border border-[var(--color-wa-border)] whitespace-nowrap">
                        {t.category}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>

                    {/* Sent */}
                    <td className="px-4 py-3 text-[13px] font-semibold text-[var(--color-wa-text)] tabular-nums whitespace-nowrap">
                      {t.sent.toLocaleString()}
                    </td>

                    {/* Cost */}
                    <td className="px-4 py-3 text-[13px] font-bold text-[var(--color-wa-green)] tabular-nums whitespace-nowrap">
                      ₹{t.cost?.toFixed(2)}
                    </td>

                    {/* Delivered */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[var(--color-wa-text)] tabular-nums w-8 shrink-0">{t.delivered}</span>
                        <div className="w-14 shrink-0"><ProgressBar value={t.delivered} max={t.sent} color="#25D366" /></div>
                      </div>
                    </td>

                    {/* Read */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[var(--color-wa-text)] tabular-nums w-8 shrink-0">{t.read}</span>
                        <div className="w-14 shrink-0"><ProgressBar value={t.read} max={t.sent} color="#3b82f6" /></div>
                      </div>
                    </td>

                    {/* Replied */}
                    <td className="px-4 py-3 text-[13px] font-semibold text-[#8b5cf6] tabular-nums">{t.replied}</td>

                    {/* Failed */}
                    <td className="px-4 py-3 text-[13px] font-semibold text-red-500 tabular-nums">{t.failed}</td>

                    {/* Rate pills */}
                    <td className="px-4 py-3"><RatePill value={t.deliveryRate} /></td>
                    <td className="px-4 py-3"><RatePill value={t.readRate} /></td>
                    <td className="px-4 py-3"><RatePill value={t.replyRate} base={20} /></td>

                    {/* View */}
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

          {/* Mobile View (Card List) */}
          <div className="md:hidden flex-1 overflow-auto no-scrollbar bg-[#F8F9FA] p-3 space-y-3">
            {paged.map(t => (
              <div
                key={t.id}
                onClick={() => setSelectedTemplate(t)}
                className="bg-white rounded-xl border border-[var(--color-wa-border)] p-4 shadow-sm active:bg-[#f0f0f0] transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="text-[14px] font-bold text-[var(--color-wa-text)]">{t.name}</h4>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-wa-muted)] bg-[var(--color-wa-bg)] px-1.5 py-0.5 rounded border border-[var(--color-wa-border)] inline-block mt-1">
                      {t.category}
                    </span>
                  </div>
                  <StatusBadge status={t.status} />
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-4 border-t border-[var(--color-wa-border)] pt-3">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-[var(--color-wa-muted)] uppercase font-semibold">Sent</p>
                    <p className="text-[13px] font-bold text-[var(--color-wa-text)]">{t.sent.toLocaleString()}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-[var(--color-wa-muted)] uppercase font-semibold">Cost</p>
                    <p className="text-[13px] font-bold text-[var(--color-wa-green)]">₹{t.cost?.toFixed(2)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-[var(--color-wa-muted)] uppercase font-semibold">Delivery %</p>
                    <div className="flex items-center gap-2">
                       <p className="text-[13px] font-bold text-[var(--color-wa-text)]">{t.deliveryRate}%</p>
                       <div className="w-12"><ProgressBar value={t.deliveryRate} max={100} color="#25D366" /></div>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-[var(--color-wa-muted)] uppercase font-semibold">Read %</p>
                    <div className="flex items-center gap-2">
                       <p className="text-[13px] font-bold text-[var(--color-wa-text)]">{t.readRate}%</p>
                       <div className="w-12"><ProgressBar value={t.readRate} max={100} color="#3b82f6" /></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--color-wa-border)] border-dashed">
                  <div className="flex gap-3">
                    <div className="text-center">
                      <p className="text-[9px] text-[var(--color-wa-muted)] uppercase">Read</p>
                      <p className="text-[12px] font-semibold">{t.read}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-[var(--color-wa-muted)] uppercase">Replies</p>
                      <p className="text-[12px] font-semibold text-[#8b5cf6]">{t.replied}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-[var(--color-wa-muted)] uppercase">Failed</p>
                      <p className="text-[12px] font-semibold text-red-500">{t.failed}</p>
                    </div>
                  </div>
                  <Eye size={16} className="text-[var(--color-wa-muted)] opacity-50" />
                </div>
              </div>
            ))}
          </div>

          {paged.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-[#8696A0]">No templates match your filters.</p>
            </div>
          )}

          {/* ── Fixed Footer inside card ── */}
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-3 md:px-4 py-2 bg-[var(--color-wa-surface)] border-t border-[var(--color-wa-border)] text-[11px] md:text-[12px] text-[var(--color-wa-muted)]">
            <span className="whitespace-nowrap">
              Showing&nbsp;<strong className="text-[var(--color-wa-text)] font-semibold">{from}</strong>&nbsp;to&nbsp;
              <strong className="text-[var(--color-wa-text)] font-semibold">{to}</strong>&nbsp;of&nbsp;
              <strong className="text-[var(--color-wa-text)] font-semibold">{filtered.length}</strong>&nbsp;records
            </span>
            <div className="flex items-center gap-2 md:gap-3">
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="hidden sm:inline">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="border border-[var(--color-wa-border)] rounded px-1.5 py-0.5 text-[11px] md:text-[12px] text-[var(--color-wa-text)] bg-[var(--color-wa-surface)] outline-none focus:border-[#25D366]"
                >
                  {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </span>
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

      {/* ── Preview Modal ── */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="card w-full max-w-md shadow-2xl overflow-hidden animate-slideInRight">

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
            <div className="p-5 space-y-4">
              <div>
                <p className="text-[10px] uppercase font-bold text-[var(--color-wa-muted)] tracking-wider mb-2">Message Body</p>
                <div className="bg-[var(--color-wa-bg)] p-4 rounded-xl border border-[var(--color-wa-border)] border-l-4 border-l-[#25D366]">
                  <p className="text-[13px] text-[var(--color-wa-text)] leading-relaxed italic whitespace-pre-wrap">"{selectedTemplate.body}"</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Category', value: selectedTemplate.category,              color: 'var(--color-wa-text)' },
                  { label: 'Status',   value: selectedTemplate.status,                color: '#25D366'              },
                  { label: 'Est. Cost',value: `₹${selectedTemplate.cost?.toFixed(2)}`,color: '#25D366'              },
                ].map(m => (
                  <div key={m.label} className="bg-[var(--color-wa-bg)] rounded-xl p-3 border border-[var(--color-wa-border)] text-center">
                    <p className="text-[9px] uppercase font-bold text-[var(--color-wa-muted)] mb-1">{m.label}</p>
                    <p className="text-[12px] font-bold truncate" style={{ color: m.color }}>{m.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Sent',      value: selectedTemplate.sent      },
                  { label: 'Delivered', value: selectedTemplate.delivered },
                  { label: 'Read',      value: selectedTemplate.read      },
                ].map(m => (
                  <div key={m.label} className="bg-[var(--color-wa-bg)] rounded-xl p-3 border border-[var(--color-wa-border)] text-center">
                    <p className="text-[9px] uppercase font-bold text-[var(--color-wa-muted)] mb-1">{m.label}</p>
                    <p className="text-[16px] font-extrabold text-[var(--color-wa-text)]">{m.value?.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-[var(--color-wa-border)] bg-[var(--color-wa-bg)]/50 flex justify-end">
              <button onClick={() => setSelectedTemplate(null)} className="btn-green px-6 text-[13px]">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

