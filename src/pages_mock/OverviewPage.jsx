'use client';
import React from 'react';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/ui/Cards';
import {
  Send, CheckCircle, BookOpen, XCircle, Clock, MessageSquare
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--color-wa-surface)] border border-[var(--color-wa-border)] rounded-xl p-3 text-[12px] shadow-lg">
      <p className="text-[var(--color-wa-muted)] mb-2 font-medium">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[var(--color-wa-text)]">{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
};

export default function OverviewPage() {
  const { stats, data } = useApp();

  const deliveryRate = stats.sent ? Math.round((stats.delivered / stats.sent) * 100) : 0;
  const readRate     = stats.sent ? Math.round((stats.read     / stats.sent) * 100) : 0;
  const replyRate    = stats.sent ? Math.round((stats.replies  / stats.sent) * 100) : 0;

  const funnelData = [
    { name: 'Sent',      value: stats.sent,      fill: '#3b82f6' },
    { name: 'Delivered', value: stats.delivered, fill: '#25D366' },
    { name: 'Read',      value: stats.read,      fill: '#128C7E' },
    { name: 'Replied',   value: stats.replies,   fill: '#8b5cf6' },
    { name: 'Failed',    value: stats.failed,    fill: '#ef4444' },
  ];

  const hourlyData = data.hourly.filter((_, i) => i % 2 === 0); // every 2 hours for readability

  const recentReplies = data.messages.filter(m => m.hasReply).slice(0, 8);

  return (
    <div className="space-y-4 md:space-y-6 animate-fadeIn py-3">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 md:gap-3">
        <StatCard icon={Send}         label="Total Sent"  value={stats.sent}      color="#3b82f6" pct={100} />
        <StatCard icon={CheckCircle}  label="Delivered"   value={stats.delivered} color="#25D366" pct={deliveryRate} />
        <StatCard icon={BookOpen}     label="Read"        value={stats.read}      color="#128C7E" pct={readRate} />
        <StatCard icon={XCircle}      label="Failed"      value={stats.failed}    color="#ef4444" pct={stats.sent ? Math.round(stats.failed/stats.sent*100) : 0} />
        <StatCard icon={Clock}        label="In Queue"    value={stats.queue}     color="#eab308" />
        <StatCard icon={MessageSquare}label="Replies"     value={stats.replies}   color="#8b5cf6" pct={replyRate} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Delivery funnel */}
        <div className="card p-5">
          <h2 className="text-[14px] font-semibold text-[var(--color-wa-text)] mb-4">Delivery Funnel</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={funnelData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-wa-border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--color-wa-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--color-wa-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[6,6,0,0]}>
                {funnelData.map((e, i) => (
                  <rect key={i} fill={e.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly activity */}
        <div className="card p-5">
          <h2 className="text-[14px] font-semibold text-[var(--color-wa-text)] mb-4">Hourly Activity</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={hourlyData}>
              <defs>
                <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#25D366" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#25D366" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gRead" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-wa-border)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fill: 'var(--color-wa-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--color-wa-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--color-wa-muted)' }} />
              <Area type="monotone" dataKey="sent"      name="Sent"      stroke="#25D366" fill="url(#gSent)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="delivered" name="Delivered" stroke="#3b82f6" fill="url(#gRead)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* KPI row + Recent replies */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* KPI cards */}
        <div className="space-y-3">
          {[
            { label: 'Delivery Rate', value: deliveryRate, color: '#25D366' },
            { label: 'Read Rate',     value: readRate,     color: '#3b82f6' },
            { label: 'Reply Rate',    value: replyRate,    color: '#8b5cf6' },
          ].map(k => (
            <div key={k.label} className="card p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[13px] text-[var(--color-wa-muted)]">{k.label}</span>
                <span className="text-[16px] font-bold" style={{ color: k.color }}>{k.value}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${k.value}%`, background: k.color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Recent replies */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-[14px] font-semibold text-[var(--color-wa-text)] mb-4">Recent Replies</h2>
          <div className="space-y-2">
            {recentReplies.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[var(--color-wa-bg)] transition-all duration-200 border border-transparent hover:border-[var(--color-wa-border)]">
                <div className="w-10 h-10 rounded-full bg-[var(--color-wa-green)] flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0 shadow-sm">
                  {m.contactName?.[0] || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <p className="text-[13px] text-[var(--color-wa-text)] font-bold truncate">{m.contactName}</p>
                    <span className="text-[10px] text-[var(--color-wa-muted)] font-medium">
                      {new Date(m.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[12px] text-[var(--color-wa-muted)] truncate italic">"{m.replyText}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

