'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Could not sign in');
      return;
    }
    router.push(params.get('next') || '/talk');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-panel p-8 shadow-glow">
        <div className="mb-6 flex justify-center">
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-neuron to-neuron2 opacity-80 shadow-glow animate-breathe" />
        </div>
        <h1 className="mb-1 text-center text-lg font-semibold text-slate-100">Control Block</h1>
        <p className="mb-6 text-center text-sm text-slate-500">Private. Yours only.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            autoFocus
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Passcode"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-slate-100 outline-none focus:border-neuron"
          />
          {error && <p className="text-sm text-alert">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-neuron/90 px-4 py-3 font-medium text-void transition hover:bg-neuron disabled:opacity-50"
          >
            {loading ? 'Entering…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
