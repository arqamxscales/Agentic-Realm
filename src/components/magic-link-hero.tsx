'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

const dynamicHighlights = ['Cloud threads', 'Secure sign-in', 'Zero-password access', '1-click login'];

const starterEmails = ['founder@company.com', 'ops@company.com', 'team@agency.com'];

export function MagicLinkHero() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setHighlightIndex((current) => (current + 1) % dynamicHighlights.length);
    }, 1800);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  async function sendMagicLink() {
    if (!supabase) {
      setStatus('Supabase env vars are missing.');
      return;
    }

    if (!email.trim()) {
      setStatus('Enter your email first.');
      return;
    }

    setLoading(true);
    setStatus('Sending secure magic link...');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    setLoading(false);
    setStatus(error ? error.message : 'Magic link sent. Check your inbox.');
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-white p-4 shadow-sm">
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 animate-pulse rounded-full bg-sky-200/40 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-28 w-28 animate-pulse rounded-full bg-sun-200/50 blur-2xl" />

      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-600">Instant access</p>
          <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 transition">
            {dynamicHighlights[highlightIndex]}
          </span>
        </div>
        <h3 className="mt-1 text-lg font-semibold text-slate-900">Start with a magic link</h3>
        <p className="mt-1 text-sm text-slate-600">Sign in fast to unlock cloud threads and persistent conversation history.</p>

        <div className="mt-2 flex flex-wrap gap-2">
          {starterEmails.map((candidate) => (
            <button
              key={candidate}
              type="button"
              onClick={() => setEmail(candidate)}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
            >
              {candidate}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="name@company.com"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
          />
          <button
            type="button"
            onClick={() => {
              void sendMagicLink();
            }}
            disabled={loading}
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Sending...' : 'Send link'}
          </button>
        </div>

        {status ? <p className="mt-2 text-xs text-slate-500">{status}</p> : null}
      </div>
    </div>
  );
}
