'use client';
import React from 'react';

export function StatCard({ icon: Icon, label, value, sub, color = '#25D366', trend, pct }) {
  return (
    <div className="stat-card animate-fadeIn">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '22' }}>
          <Icon size={18} style={{ color }} />
        </div>
        {pct !== undefined && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: color + '22', color }}>
            {pct}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-[var(--color-wa-text)] mb-0.5">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className="text-[12px] text-[var(--color-wa-muted)]">{label}</div>
      {sub && <div className="text-[11px] mt-1" style={{ color }}>{sub}</div>}
    </div>
  );
}

export function ProgressBar({ value, max, color = '#25D366', height = 6, showLabel = false }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      {showLabel && (
        <div className="flex justify-between text-[11px] text-[var(--color-wa-muted)] mb-1">
          <span>{value.toLocaleString()}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div className="progress-bar" style={{ height }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    approved: { cls: 'badge-green', label: 'Approved' },
    pending:  { cls: 'badge-yellow', label: 'Pending' },
    failed:   { cls: 'badge-red', label: 'Failed' },
    sent:     { cls: 'badge-blue', label: 'Sent' },
    delivered:{ cls: 'badge-green', label: 'Delivered' },
    read:     { cls: 'badge-green', label: 'Read' },
    queue:    { cls: 'badge-gray', label: 'Queue' },
    sending:  { cls: 'badge-yellow', label: 'Sending…' },
    green:    { cls: 'badge-green', label: 'Excellent' },
    yellow:   { cls: 'badge-yellow', label: 'Fair' },
    red:      { cls: 'badge-red', label: 'Poor' },
  };
  const s = map[status] || { cls: 'badge-gray', label: status };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export function RatePill({ value, base = 90 }) {
  const color = value >= base ? '#25D366' : value >= 60 ? '#eab308' : '#ef4444';
  return (
    <span className="text-[12px] font-semibold" style={{ color }}>
      {value}%
    </span>
  );
}

