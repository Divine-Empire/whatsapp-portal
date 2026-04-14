'use client';
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/ui/Cards';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_OPTS = ['all', 'sent', 'delivered', 'read', 'failed', 'queue'];
const PAGE_SIZES  = [15, 25, 50];

export default function LogsPage() {
  const { data } = useApp();
  const [search,     setSearch]     = useState('');
  const [statusFilt, setStatusFilt] = useState('all');
  const [page,       setPage]       = useState(1);
  const [pageSize,   setPageSize]   = useState(25);

  const filtered = useMemo(() => {
    return data.messages.filter(m => {
      const matchSearch = m.contactName.toLowerCase().includes(search.toLowerCase()) ||
                          m.templateName.toLowerCase().includes(search.toLowerCase()) ||
                          m.contactPhone.includes(search);
      const matchStatus = statusFilt === 'all' || m.status === statusFilt;
      return matchSearch && matchStatus;
    });
  }, [data.messages, search, statusFilt]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged      = filtered.slice((page - 1) * pageSize, page * pageSize);
  const from       = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const to         = Math.min(page * pageSize, filtered.length);

  const handleSearch = (v) => { setSearch(v); setPage(1); };
  const handleStatus = (v) => { setStatusFilt(v); setPage(1); };

  return (
    <div className="h-full flex flex-col overflow-hidden animate-fadeIn bg-[var(--color-wa-bg)]">
      {/* Filters Area */}
      <div className="px-3 md:px-4 py-2 space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-wa-muted)]" />
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search logs…"
              className="w-full bg-[var(--color-wa-surface)] border border-[var(--color-wa-border)] rounded-lg py-1.5 pl-8 pr-3 text-[13px] outline-none focus:border-[#25D366] transition-all"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={13} color="#8696A0" />
            {STATUS_OPTS.map(s => (
              <button
                key={s}
                onClick={() => handleStatus(s)}
                className={`px-2.5 py-1 rounded-lg text-[10px] md:text-[11px] font-bold capitalize transition shadow-sm
                  ${statusFilt === s ? 'bg-[#25D366] text-white' : 'border border-[var(--color-wa-border)] text-[var(--color-wa-muted)] hover:border-[#25D366] hover:text-[var(--color-wa-text)]'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col overflow-hidden bg-[var(--color-wa-surface)] border-t-2 border-t-[#25D366] border-x border-b border-[var(--color-wa-border)]">

          {/* scrollable body */}
          {/* Desktop View (Table) */}
          <div className="hidden md:block flex-1 overflow-auto no-scrollbar">
            <table className="w-full min-w-[700px] border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 shadow-sm">
                <tr>
                  {['Timestamp','Contact','Phone','Template','Status','Cost','Type'].map(h => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-[11px] font-bold text-[#444] uppercase tracking-wider bg-[#F0F2F5] border-b border-[#E2E5E9] whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-wa-border)]">
                {paged.map(m => (
                  <tr key={m.id} className="table-row transition">
                    <td className="px-4 py-3 text-[11px] text-[var(--color-wa-muted)] whitespace-nowrap">
                      {new Date(m.timestamp).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[12px] font-medium text-[var(--color-wa-text)]">{m.contactName}</p>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-[var(--color-wa-muted)]">{m.contactPhone}</td>
                    <td className="px-4 py-3 text-[12px] text-[var(--color-wa-text)]">{m.templateName}</td>
                    <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                    <td className="px-4 py-3 text-[12px] font-bold text-[var(--color-wa-green)]">₹{m.cost?.toFixed(2)}</td>
                    <td className="px-4 py-3 capitalize text-[11px] text-[var(--color-wa-muted)]">{m.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View (Card List) */}
          <div className="md:hidden flex-1 overflow-auto no-scrollbar bg-[#F8F9FA] p-3 space-y-3">
            {paged.map(m => (
              <div
                key={m.id}
                className="bg-white rounded-xl border border-[var(--color-wa-border)] p-4 shadow-sm"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="text-[13px] font-bold text-[var(--color-wa-text)]">{m.contactName}</h4>
                    <p className="text-[11px] text-[var(--color-wa-muted)]">{m.contactPhone}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-[var(--color-wa-border)] pt-3">
                  <div>
                    <p className="text-[10px] text-[var(--color-wa-muted)] uppercase font-semibold">Template</p>
                    <p className="text-[12px] font-medium text-[var(--color-wa-text)] truncate">{m.templateName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[var(--color-wa-muted)] uppercase font-semibold">Cost</p>
                    <p className="text-[12px] font-bold text-[var(--color-wa-green)]">₹{m.cost?.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--color-wa-border)] border-dashed">
                  <span className="text-[10px] text-[var(--color-wa-muted)] font-medium bg-[var(--color-wa-bg)] px-2 py-0.5 rounded-full capitalize">
                    {m.type}
                  </span>
                  <span className="text-[11px] text-[var(--color-wa-muted)]">
                    {new Date(m.timestamp).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {paged.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-[#8696A0]">No logs match your filters.</p>
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
    </div>
  );
}

