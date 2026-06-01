'use client';
import React from 'react';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/ui/Cards';
import {
  Send, CheckCircle, BookOpen, XCircle, Clock, MessageSquare,
  Activity, MousePointerClick, ListTodo, UserCheck, UserX
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

  return (
    <div className="space-y-4 md:space-y-6 animate-fadeIn py-3">
      {/* Core message delivery cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 md:gap-3">
        <StatCard icon={Send}         label="Total Sent"  value={stats.sent}      color="#3b82f6" pct={100} />
        <StatCard icon={CheckCircle}  label="Delivered"   value={stats.delivered} color="#25D366" pct={deliveryRate} />
        <StatCard icon={BookOpen}     label="Read"        value={stats.read}      color="#128C7E" pct={readRate} />
        <StatCard icon={XCircle}      label="Failed"      value={stats.failed}    color="#ef4444" pct={stats.sent ? Math.round(stats.failed/stats.sent*100) : 0} />
        <StatCard icon={Clock}        label="In Queue"    value={stats.queue}     color="#eab308" />
        <StatCard icon={MessageSquare}label="Replies"     value={stats.replies}   color="#8b5cf6" pct={replyRate} />
      </div>

      {/* Interactive options & sentiment cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 md:gap-3">
        <StatCard icon={Activity}          label="Interactions"       value={stats.totalInteractions} color="#3b82f6" />
        <StatCard icon={MousePointerClick} label="Button Clicks"     value={stats.buttonClicks}      color="#8b5cf6" />
        <StatCard icon={ListTodo}          label="List Selections"    value={stats.listSelections}    color="#6366f1" />
        <StatCard icon={UserCheck}         label="Interested Leads"   value={stats.interestedLeads}   color="#25D366" />
        <StatCard icon={UserX}             label="Not Interested"     value={stats.notInterestedLeads} color="#ef4444" />
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

      {/* KPI row + Recent Interactions Table */}
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

        {/* Recent Interactions Table */}
        <div className="card p-5 lg:col-span-2 overflow-x-auto">
          <h2 className="text-[14px] font-semibold text-[var(--color-wa-text)] mb-4">Recent Interactions</h2>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-wa-border)] text-[var(--color-wa-muted)] font-medium">
                <th className="pb-3 pr-2">Sender Name</th>
                <th className="pb-3 pr-2">Timestamp</th>
                <th className="pb-3 pr-2">Content/Reply Title</th>
                <th className="pb-3 pr-2">Interactive Type</th>
                <th className="pb-3">Lead Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recentInteractions && data.recentInteractions.length > 0 ? (
                data.recentInteractions.map((item) => {
                  let badgeColor = "bg-[var(--color-wa-muted)]/10 text-[var(--color-wa-muted)]";
                  if (item.interest_status === "Interested") {
                    badgeColor = "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
                  } else if (item.interest_status === "Not Interested") {
                    badgeColor = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
                  }

                  let typeBadge = "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
                  if (item.interactive_type === "button_reply" || item.interactive_type === "button") {
                    typeBadge = "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
                  } else if (item.interactive_type === "list_reply") {
                    typeBadge = "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400";
                  } else {
                    typeBadge = "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
                  }

                  return (
                    <tr key={item.id} className="border-b border-[var(--color-wa-border)]/50 last:border-0 hover:bg-[var(--color-wa-bg)]/30 transition-colors">
                      <td className="py-3 pr-2 font-semibold text-[var(--color-wa-text)]">{item.sender_name}</td>
                      <td className="py-3 pr-2 text-[var(--color-wa-muted)] whitespace-nowrap">
                        {new Date(item.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 pr-2 text-[var(--color-wa-text)] max-w-[200px] truncate" title={item.content || item.interactive_title}>
                        {item.content || item.interactive_title || '-'}
                      </td>
                      <td className="py-3 pr-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${typeBadge}`}>
                          {item.interactive_type || 'Text Message'}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${badgeColor}`}>
                          {item.interest_status || 'Other'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[var(--color-wa-muted)] italic">
                    No recent interactions tracked yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

