'use client';
import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const TYPE_MAP = {
  success: { icon: CheckCircle, color: '#25D366', bg: '#25D36622' },
  error:   { icon: XCircle,     color: '#ef4444', bg: '#ef444422' },
  warning: { icon: AlertCircle, color: '#eab308', bg: '#eab30822' },
  info:    { icon: Info,        color: '#3b82f6', bg: '#3b82f622' },
};

function Toast({ id, message, type, onClose }) {
  const [leaving, setLeaving] = useState(false);
  const cfg = TYPE_MAP[type] || TYPE_MAP.info;
  const Icon = cfg.icon;

  const close = () => {
    setLeaving(true);
    setTimeout(() => onClose(id), 300);
  };

  return (
    <div
      className={`flex items-start gap-3 p-3 pr-4 rounded-xl border shadow-2xl min-w-[280px] max-w-[340px] bg-[var(--color-wa-surface)]
        ${leaving ? 'animate-toast-out' : 'animate-toast-in'}`}
      style={{ borderColor: cfg.color + '44' }}
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: cfg.bg }}>
        <Icon size={14} style={{ color: cfg.color }} />
      </div>
      <p className="text-[13px] text-[var(--color-wa-text)] flex-1 font-medium leading-snug">{message}</p>
      <button onClick={close} className="text-[var(--color-wa-muted)] hover:text-red-500 mt-0.5 transition-colors">
        <X size={16} />
      </button>
    </div>
  );
}

export default function ToastContainer({ toasts, onClose }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <Toast {...t} onClose={onClose} />
        </div>
      ))}
    </div>
  );
}

