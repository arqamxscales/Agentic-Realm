'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Finalizing sign-in...');

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const code = new URLSearchParams(window.location.search).get('code');

    async function finishAuth() {
      if (!supabase) {
        setStatus('Supabase env vars are missing.');
        return;
      }

      if (!code) {
        setStatus('Missing auth code.');
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        setStatus(error.message);
        return;
      }

      router.replace('/');
    }

    void finishAuth();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-slate-900">
      <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-glow">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-2xl text-sky-600">↻</div>
        <h1 className="text-2xl font-semibold">Authenticating</h1>
        <p className="mt-2 text-sm text-slate-600">{status}</p>
      </div>
    </main>
  );
}
