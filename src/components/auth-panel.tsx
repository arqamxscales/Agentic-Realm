'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export function AuthPanel() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setStatus('Add Supabase env vars to enable auth.');
      return;
    }

    void supabase.auth.getSession().then((response) => {
      setUserEmail(response.data.session?.user.email ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUserEmail(session?.user.email ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit() {
    if (!supabase) {
      setStatus('Supabase is not configured yet.');
      return;
    }

    if (!email.trim()) {
      setStatus('Enter an email address first.');
      return;
    }

    setLoading(true);
    setStatus('Sending magic link...');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    setLoading(false);
    setStatus(error ? error.message : 'Check your inbox for the sign-in link.');
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setUserEmail(null);
    setStatus('Signed out.');
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-600">Secure Access</p>
          <h2 className="text-lg font-semibold text-slate-900">Supabase auth ready</h2>
        </div>
        <div className="h-11 w-11 rounded-2xl bg-sun-100 text-center text-xl leading-[2.75rem] text-slate-900">◉</div>
      </div>

      <div className="mt-4 space-y-3">
        {userEmail ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Signed in as <span className="font-semibold">{userEmail}</span>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="Enter your email"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Sending...' : 'Send magic link'}
            </button>
          </div>
        )}

        {userEmail ? (
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
          >
            Sign out
          </button>
        ) : null}

        {status ? <p className="text-xs leading-5 text-slate-500">{status}</p> : null}
      </div>
    </div>
  );
}
