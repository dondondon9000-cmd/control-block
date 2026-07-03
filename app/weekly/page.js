'use client';

import { useEffect, useState } from 'react';
import ReflectionSummary from '@/components/ReflectionSummary';

export default function WeeklyPage() {
  const [data, setData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  function load() {
    fetch('/api/reflections/weekly')
      .then((r) => r.json())
      .then(setData);
  }

  useEffect(load, []);

  async function generate() {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/reflections/weekly', {
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
        <h1 className="text-xl font-semibold text-slate-100">Weekly Reflection</h1>
        <button
          onClick={generate}
          disabled={generating}
          className="rounded-lg bg-neuron/90 px-4 py-2 text-sm font-medium text-void transition hover:bg-neuron disabled:opacity-50"
        >
          {generating ? 'Generating…' : data.current ? 'Regenerate' : 'Generate this week'}
        </button>
      </div>

      <p className="text-sm text-slate-500">Week of {data.weekStart}</p>
      {error && <p className="text-sm text-alert">{error}</p>}

      {data.current ? (
        <div className="rounded-2xl border border-white/10 bg-panel p-5">
          <ReflectionSummary content={data.current.content} kind="weekly" />
        </div>
      ) : (
        <p className="text-sm text-slate-500">No summary yet for this week. Generate one above.</p>
      )}

      {data.history?.length > 1 && (
        <div>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">Past weeks</h2>
          <div className="space-y-4">
            {data.history
              .filter((h) => h.week_start !== data.weekStart)
              .map((h) => (
                <details key={h.week_start} className="rounded-xl border border-white/10 bg-panel/60 p-4">
                  <summary className="cursor-pointer text-sm text-slate-300">
                    Week of {h.week_start}
                  </summary>
                  <div className="mt-3">
                    <ReflectionSummary content={h.content} kind="weekly" />
                  </div>
                </details>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
