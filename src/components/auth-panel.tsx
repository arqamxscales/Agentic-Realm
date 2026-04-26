'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

type SubscriptionPlan = 'silver' | 'gold' | 'premium';

const planCards: Array<{ plan: SubscriptionPlan; label: string; price: string; prompts: string }> = [
  { plan: 'silver', label: 'Silver', price: 'Free', prompts: '2 prompts per field / month' },
  { plan: 'gold', label: 'Gold', price: '$15 / month', prompts: '10 prompts per field / month' },
  { plan: 'premium', label: 'Premium', price: '$40 / month', prompts: '25 prompts per field / month' }
];

const whatsappContact = '+923554776466';

export function AuthPanel() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan>('silver');
  const [updatingPlan, setUpdatingPlan] = useState<SubscriptionPlan | null>(null);

  async function loadSubscriptionPlan() {
    const response = await fetch('/api/subscription', {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as {
      plan?: SubscriptionPlan;
    };

    if (data.plan) {
      setPlan(data.plan);
    }
  }

  useEffect(() => {
    if (!supabase) {
      setStatus('Add Supabase env vars to enable auth.');
      return;
    }

    void supabase.auth.getSession().then((response) => {
      const emailValue = response.data.session?.user.email ?? null;
      setUserEmail(emailValue);

      if (emailValue) {
        void loadSubscriptionPlan();
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUserEmail(session?.user.email ?? null);

      if (session?.user.email) {
        void loadSubscriptionPlan();
      }
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

  async function switchPlan(nextPlan: SubscriptionPlan) {
    if (!userEmail) {
      setStatus('Sign in first to switch plans.');
      return;
    }

    setUpdatingPlan(nextPlan);

    const response = await fetch('/api/subscription', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ plan: nextPlan })
    });

    const data = (await response.json()) as {
      plan?: SubscriptionPlan;
      note?: string;
      error?: string;
    };

    if (!response.ok) {
      setStatus(data.error ?? 'Unable to update subscription plan.');
      setUpdatingPlan(null);
      return;
    }

    setPlan(data.plan ?? nextPlan);
    setStatus(data.note ?? 'Plan updated.');
    setUpdatingPlan(null);
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

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Subscription plans</p>
          <div className="mt-3 space-y-2">
            {planCards.map((item) => (
              <div key={item.plan} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-600">{item.price}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void switchPlan(item.plan);
                    }}
                    disabled={updatingPlan === item.plan || plan === item.plan}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {plan === item.plan ? 'Current' : updatingPlan === item.plan ? 'Saving...' : 'Select'}
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">{item.prompts}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-600">
            Account details: contact WhatsApp directly for quick access{' '}
            <a
              href="https://wa.me/923554776466"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-sky-700 underline-offset-2 hover:underline"
            >
              {whatsappContact}
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
