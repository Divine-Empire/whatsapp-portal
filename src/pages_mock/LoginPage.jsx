'use client';
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Wifi, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(() => {
      const ok = login(email, password);
      if (!ok) {
        setError('Invalid credentials. Try admin@wabusiness.com / admin123');
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#F0F2F5]">
      {/* Background orbs */}
      <div className="absolute w-[600px] h-[600px] rounded-full opacity-[0.08]"
        style={{ background: 'radial-gradient(circle, #25D366, transparent)', top: '-150px', left: '-150px' }} />
      <div className="absolute w-[500px] h-[500px] rounded-full opacity-[0.08]"
        style={{ background: 'radial-gradient(circle, #128C7E, transparent)', bottom: '-120px', right: '-120px' }} />

      {/* Grid dots */}
      <div className="absolute inset-0 opacity-[0.05]"
        style={{ backgroundImage: 'radial-gradient(#25D366 2px, transparent 2px)', backgroundSize: '40px 40px' }} />

      {/* Card */}
      <div className="relative w-full max-w-md mx-4 animate-fadeIn">
        <div className="glass rounded-3xl p-10 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="w-20 h-20 rounded-2xl bg-[#25D366] flex items-center justify-center mx-auto mb-5 animate-pulse-green shadow-xl shadow-green-500/20">
              <Wifi size={40} color="#FFFFFF" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-extrabold text-[#111B21] tracking-tight">WA Business Portal</h1>
            <p className="text-[14px] text-[#667781] mt-2 font-medium">Elevate your customer communication</p>
          </div>

          {/* Demo creds hint */}
          <div className="mb-8 p-4 rounded-2xl bg-[#F0F2F5] border border-[#E9EDEF]">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-6 h-6 rounded-full bg-[#25D366]/10 flex items-center justify-center text-[#25D366]">
                <AlertCircle size={14} />
              </div>
              <span className="text-[12px] font-bold text-[#111B21] uppercase tracking-wider">Demo Credentials</span>
            </div>
            <p className="text-[13px] text-[#667781] leading-relaxed">
              Email: <strong className="text-[#111B21]">admin@wabusiness.com</strong><br />
              Pass: <strong className="text-[#111B21]">admin123</strong>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[13px] text-[#111B21] mb-2 font-bold uppercase tracking-wide">Business Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@company.com"
                required
                autoComplete="email"
                className="py-3 px-4 text-[15px]"
              />
            </div>

            <div>
              <label className="block text-[13px] text-[#111B21] mb-2 font-bold uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="py-3 px-4 text-[15px]"
                  style={{ paddingRight: '48px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8696A0] hover:text-[#25D366] transition-colors"
                >
                  {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100">
                <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-red-700 font-medium leading-tight">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-green w-full flex items-center justify-center gap-3 mt-4 py-4 text-[16px] rounded-2xl shadow-lg shadow-green-500/30"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin-slow" />
                  Authenticating…
                </>
              ) : 'Access Dashboard'}
            </button>
          </form>

          <p className="text-center text-[12px] text-[#8696A0] mt-8 font-medium">
            © 2025 WA Business Portal. Premium SaaS for Enterprises.
          </p>
        </div>
      </div>
    </div>
  );
}

