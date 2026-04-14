'use client';
import React from 'react';
import { useApp } from '../context/AppContext';
import { Heart, Award, Smartphone, TrendingUp, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

function ScoreRing({ score }) {
  const color = score >= 80 ? '#25D366' : score >= 50 ? '#eab308' : '#ef4444';
  const r = 48, circ = 2 * Math.PI * r;
  const dashoffset = circ - (score / 100) * circ;
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg width="112" height="112" className="-rotate-90">
        <circle cx="56" cy="56" r={r} fill="none" stroke="var(--color-wa-border)" strokeWidth="8" />
        <circle
          cx="56" cy="56" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dashoffset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-xl font-extrabold" style={{ color }}>{score}</div>
        <div className="text-[9px] text-[var(--color-wa-muted)]">/ 100</div>
      </div>
    </div>
  );
}

export default function HealthPage() {
  const { stats } = useApp();

  const deliveryRate = stats.sent ? (stats.delivered / stats.sent) * 100 : 0;
  const readRate     = stats.sent ? (stats.read     / stats.sent) * 100 : 0;
  const failRate     = stats.sent ? (stats.failed   / stats.sent) * 100 : 0;

  const score = Math.max(0, Math.min(100,
    Math.round((deliveryRate * 0.4) + (readRate * 0.4) + ((1 - failRate / 100) * 20))
  ));

  const quality = score >= 80 ? 'green' : score >= 50 ? 'yellow' : 'red';
  const tier = score >= 80 ? { label: 'Tier 1', color: '#25D366', limit: '10,000 msgs/day' }
             : score >= 50 ? { label: 'Tier 2', color: '#eab308', limit: '1,000 msgs/day' }
             :               { label: 'Tier 3', color: '#ef4444', limit: '250 msgs/day' };

  const qualityLabel = quality === 'green' ? 'Excellent' : quality === 'yellow' ? 'Fair' : 'Poor';
  const qualityColor = quality === 'green' ? '#25D366' : quality === 'yellow' ? '#eab308' : '#ef4444';

  const suggestions = [
    { ok: deliveryRate >= 85, text: `Delivery rate is ${deliveryRate.toFixed(1)}% (target ≥ 85%)`, fix: 'Improve contact list quality and template relevance.' },
    { ok: readRate >= 40,     text: `Read rate is ${readRate.toFixed(1)}% (target ≥ 40%)`,         fix: 'Use personalized messages and send at peak hours.' },
    { ok: failRate <= 5,      text: `Failure rate is ${failRate.toFixed(1)}% (target ≤ 5%)`,        fix: 'Verify phone numbers and check template approval status.' },
    { ok: true,               text: 'Templates are regularly monitored',                              fix: '' },
    { ok: quality !== 'red',  text: 'Phone quality rating is acceptable',                            fix: 'Maintain consistent delivery rates to improve tier.' },
  ];

  const metrics = [
    { label: 'Delivery Rate', value: `${deliveryRate.toFixed(1)}%`, color: '#25D366' },
    { label: 'Read Rate',     value: `${readRate.toFixed(1)}%`,     color: '#3b82f6' },
    { label: 'Fail Rate',     value: `${failRate.toFixed(1)}%`,     color: '#ef4444' },
    { label: 'Total Sent',    value: stats.sent.toLocaleString(),   color: 'var(--color-wa-text)' },
  ];

  return (
    <div className="space-y-3 animate-fadeIn py-2 max-w-[1200px] mx-auto">
      {/* Top row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
        {/* Score card */}
        <div className="card p-3 md:p-4 flex flex-col items-center gap-3">
          <Heart size={16} color={qualityColor} />
          <ScoreRing score={score} />
          <div className="text-center">
            <p className="text-[14px] font-bold" style={{ color: qualityColor }}>{qualityLabel} Quality</p>
            <p className="text-[11px] text-[var(--color-wa-muted)] mt-0.5">Phone Health Score</p>
          </div>
        </div>

        {/* Tier card */}
        <div className="card p-3 md:p-4 flex flex-col items-center justify-center gap-3 text-center">
          <Award size={24} style={{ color: tier.color }} />
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-2" style={{ background: tier.color + '15', border: `1px solid ${tier.color}33` }}>
              <span className="text-[14px] font-bold" style={{ color: tier.color }}>{tier.label}</span>
            </div>
            <p className="text-[12px] text-[var(--color-wa-muted)]">Messaging Tier</p>
            <p className="text-[11px] mt-1 font-semibold" style={{ color: tier.color }}>Limit: {tier.limit}</p>
          </div>
        </div>

        {/* Metrics */}
        <div className="card p-3 md:p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} color="#25D366" />
            <h3 className="text-[12px] font-semibold text-[var(--color-wa-text)]">Key Metrics</h3>
          </div>
          <div className="space-y-2.5">
            {metrics.map(m => (
              <div key={m.label} className="flex justify-between items-center">
                <span className="text-[11px] text-[var(--color-wa-muted)]">{m.label}</span>
                <span className="text-[13px] font-bold" style={{ color: m.color }}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-3">
        {/* Growth tips */}
        <div className="card p-3 md:p-4">
          <div className="flex items-center gap-2 mb-3">
            <Smartphone size={14} color="#25D366" />
            <h3 className="text-[12px] font-semibold text-[var(--color-wa-text)]">Health Suggestions</h3>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {suggestions.map((s, i) => (
              <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-xl ${s.ok ? 'bg-[#25D36610]' : 'bg-red-500/5'}`}>
                {s.ok
                  ? <CheckCircle size={14} color="#25D366" className="flex-shrink-0 mt-0.5" />
                  : <AlertTriangle size={14} color="#ef4444" className="flex-shrink-0 mt-0.5" />}
                <div>
                  <p className="text-[12px] font-medium text-[var(--color-wa-text)]">{s.text}</p>
                  {!s.ok && s.fix && <p className="text-[10px] text-[var(--color-wa-muted)] mt-0.5 leading-tight">{s.fix}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tier comparison */}
        <div className="card p-3 md:p-4">
          <h3 className="text-[12px] font-semibold text-[var(--color-wa-text)] mb-3">Tier Comparison</h3>
          <div className="space-y-2">
            {[
              { tier: 'Tier 1', color: '#25D366', limit: '10,000/day', req: 'Quality ≥ 80', active: score >= 80 },
              { tier: 'Tier 2', color: '#eab308', limit: '1,000/day',  req: 'Quality ≥ 50', active: score >= 50 && score < 80 },
              { tier: 'Tier 3', color: '#ef4444', limit: '250/day',    req: 'Quality < 50', active: score < 50 },
            ].map(t => (
              <div key={t.tier} className={`flex items-center justify-between p-3 rounded-xl border transition ${t.active ? 'bg-[var(--color-wa-bg)] border-current shadow-sm' : 'border-[var(--color-wa-border)]'}`} style={{ borderColor: t.active ? t.color : undefined }}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-8 rounded-full`} style={{ background: t.color }}></div>
                  <div>
                    <p className="text-[13px] font-bold text-[var(--color-wa-text)]">{t.tier}</p>
                    <p className="text-[10px] text-[var(--color-wa-muted)]">{t.req}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[12px] font-bold text-[var(--color-wa-text)]">{t.limit}</p>
                  {t.active && <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: t.color }}>Active</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

