'use client';

import { useEffect, useState } from 'react';
import ReflectionSummary from '@/components/ReflectionSummary';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function MonthlyPage() {
  const [data, setData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  function load() {
    fetch('/api/reflections/monthly')
      .then((r) => r.json())
      .then(setData);
  }

  useEffect(load, []);

  async function generate() {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/reflections/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not generate summary');
      setData((prev) => ({ ...prev, current: json }));
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  if (!data) return <div className="px-4 py-8 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-100">Monthly Reflection</h1>
        <button
          onClick={generate}
          disabled={generating}
          className="rounded-lg bg-neuron/90 px-4 py-2 text-sm font-medium text-void transition hover:bg-neuron disabled:opacity-50"
        >
          {generating ? 'Generating…' : data.current ? 'Regenerate' : 'Generate this month'}
        </button>
      </div>

      <p className="text-sm text-slate-500">
        {MONTH_NAMES[data.month - 1]} {data.year}
      </p>
      {error && <p className="text-sm text-alert">{error}</p>}

      {data.current ? (
        <div className="rounded-2xl border border-white/10 bg-panel p-5">
          <ReflectionSummary content={data.current.content} kind="monthly" />
        </div>
      ) : (
        <p className="text-sm text-slate-500">No summary yet for this month. Generate one above.</p>
      )}

      {data.history?.length > 1 && (
        <div>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">Past months</h2>
          <div className="space-y-4">
            {data.history
              .filter((h) => !(h.year === data.year && h.month === data.month))
              .map((h) => (
                <details key={`${h.year}-${h.month}`} className="rounded-xl border border-white/10 bg-panel/60 p-4">
                  <summary className="cursor-pointer text-sm text-slate-300">
                    {MONTH_NAMES[h.month - 1]} {h.year}
                  </summary>
                  <div className="mt-3">
                    <ReflectionSummary content={h.content} kind="monthly" />
                  </div>
                </details>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
