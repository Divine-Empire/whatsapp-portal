'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, MessageCircle, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-wa-bg)]">
      <div className="w-full max-w-md px-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-[var(--color-wa-green)] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-[var(--color-wa-green)]/20">
            <MessageCircle size={32} className="text-white fill-white/10" />
          </div>
          <h1 className="text-[28px] font-bold text-[var(--color-wa-text)] tracking-tight">
            WhatsDash
          </h1>
          <p className="text-[var(--color-wa-muted)] text-sm mt-1 font-medium">Business Messaging Dashboard</p>
        </div>

        {success ? (
          <div className="bg-[var(--color-wa-surface)] border border-[var(--color-wa-border)] rounded-2xl p-8 text-center shadow-sm">
            <div className="w-12 h-12 bg-[var(--color-wa-green)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle size={24} className="text-[var(--color-wa-teal)]" />
            </div>
            <h2 className="text-xl text-[var(--color-wa-text)] font-semibold mb-2">Check your email</h2>
            <p className="text-[var(--color-wa-muted)] text-sm mb-6 font-medium">
              We&apos;ve sent a confirmation link to <strong className="text-[var(--color-wa-text)]">{email}</strong>.
              Click the link to activate your account.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-[var(--color-wa-green)] text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#1ebe5d] transition-colors shadow-sm"
            >
              Go to Login <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSignup} className="bg-[var(--color-wa-surface)] border border-[var(--color-wa-border)] rounded-2xl p-8 shadow-sm">
            <h2 className="text-xl text-[var(--color-wa-text)] font-semibold mb-6 text-center">
              Create your account
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-lg mb-4 font-medium">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[var(--color-wa-muted)] text-xs mb-1.5 uppercase tracking-wider font-semibold">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@business.com"
                  className="w-full bg-white text-[var(--color-wa-text)] border border-[var(--color-wa-border)] px-4 py-3 rounded-lg text-sm outline-none focus:border-[var(--color-wa-green)] focus:ring-2 focus:ring-[var(--color-wa-green)]/15 placeholder:text-[var(--color-wa-muted)]/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-[var(--color-wa-muted)] text-xs mb-1.5 uppercase tracking-wider font-semibold">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Min 6 characters"
                    className="w-full bg-white text-[var(--color-wa-text)] border border-[var(--color-wa-border)] px-4 py-3 rounded-lg text-sm outline-none focus:border-[var(--color-wa-green)] focus:ring-2 focus:ring-[var(--color-wa-green)]/15 placeholder:text-[var(--color-wa-muted)]/50 pr-12 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-wa-muted)] hover:text-[var(--color-wa-text)]"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[var(--color-wa-muted)] text-xs mb-1.5 uppercase tracking-wider font-semibold">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter password"
                  className="w-full bg-white text-[var(--color-wa-text)] border border-[var(--color-wa-border)] px-4 py-3 rounded-lg text-sm outline-none focus:border-[var(--color-wa-green)] focus:ring-2 focus:ring-[var(--color-wa-green)]/15 placeholder:text-[var(--color-wa-muted)]/50 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-[var(--color-wa-green)] text-white py-3 rounded-lg font-bold text-sm hover:bg-[#1ebe5d] hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>

            <p className="text-center text-[var(--color-wa-muted)] text-sm mt-5 font-medium">
              Already have an account?{' '}
              <Link href="/login" className="text-[var(--color-wa-teal)] hover:underline font-bold">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
