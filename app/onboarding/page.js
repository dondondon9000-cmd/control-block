'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STEPS = {
  VISION: 'vision',
  OBSTACLES: 'obstacles',
  DONE: 'done',
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(STEPS.VISION);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reflection, setReflection] = useState('');
  const [closingMessage, setClosingMessage] = useState('');
  const [planSteps, setPlanSteps] = useState([]);

  async function submitVision(e) {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'vision', answer: input }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Something went wrong');
      const data = await res.json();
      setReflection(data.reflection);
      setInput('');
      setStep(STEPS.OBSTACLES);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitObstacles(e) {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'obstacles', answer: input }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Something went wrong');
      const data = await res.json();
      setClosingMessage(data.message);
      setPlanSteps(data.steps || []);
      setStep(STEPS.DONE);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div
        className={`mb-8 h-20 w-20 rounded-full bg-gradient-to-br from-neuron to-neuron2 shadow-glow animate-breathe ${
          loading ? 'opacity-100' : 'opacity-70'
        }`}
      />

      <div className="w-full max-w-lg space-y-6">
        {step === STEPS.VISION && (
          <>
            <h1 className="text-center text-2xl font-semibold text-slate-100">
              What should your future look like?
            </h1>
            <p className="text-center text-sm text-slate-500">
              There's no wrong answer. Say whatever comes to mind.
            </p>
            <form onSubmit={submitVision} className="space-y-3">
              <textarea
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={4}
                placeholder="In a few years, I want to..."
                className="w-full rounded-xl border border-white/10 bg-panel px-4 py-3 text-slate-100 outline-none focus:border-neuron"
              />
              {error && <p className="text-sm text-alert">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-neuron/90 px-4 py-3 font-medium text-void transition hover:bg-neuron disabled:opacity-50"
              >
                {loading ? 'Thinking…' : 'Continue'}
              </button>
            </form>
          </>
        )}

        {step === STEPS.OBSTACLES && (
          <>
            <div className="rounded-xl border border-white/10 bg-panel px-5 py-4 text-slate-200">
              {reflection}
            </div>
            <form onSubmit={submitObstacles} className="space-y-3">
              <textarea
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={4}
                placeholder="What's getting in the way..."
                className="w-full rounded-xl border border-white/10 bg-panel px-4 py-3 text-slate-100 outline-none focus:border-neuron"
              />
              {error && <p className="text-sm text-alert">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-neuron/90 px-4 py-3 font-medium text-void transition hover:bg-neuron disabled:opacity-50"
              >
                {loading ? 'Building your plan…' : 'Continue'}
              </button>
            </form>
          </>
        )}

        {step === STEPS.DONE && (
          <>
            <div className="rounded-xl border border-white/10 bg-panel px-5 py-4 text-slate-200">
              {closingMessage}
            </div>
            <div className="rounded-xl border border-neuron/20 bg-panel/60 px-5 py-4">
              <p className="mb-3 text-sm font-medium uppercase tracking-wide text-neuron">Your growth plan</p>
              <ul className="space-y-2">
                {planSteps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-200">
                    <span className="text-neuron">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => router.push('/talk')}
              className="w-full rounded-xl bg-neuron/90 px-4 py-3 font-medium text-void transition hover:bg-neuron"
            >
              Start journaling
            </button>
          </>
        )}
      </div>
    </div>
  );
}
