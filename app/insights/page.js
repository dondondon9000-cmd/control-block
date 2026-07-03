'use client';

import { useEffect, useState } from 'react';
import TrendChart from '@/components/TrendChart';
import CalendarView from '@/components/CalendarView';
import TagFrequencyList from '@/components/TagFrequencyList';
import TopicNetwork from '@/components/TopicNetwork';

function Card({ title, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-panel p-5">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-400">{title}</h2>
      {children}
    </div>
  );
}

export default function InsightsPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/insights')
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return <div className="px-4 py-8 text-sm text-slate-500">Loading insights…</div>;
  }

  if (data.totalEntries === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-sm text-slate-500">
        Your dashboard fills in as you talk. Head to the Talk page to log your first entry.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-100">Insights</h1>

      <Card title="Emotional trend">
        <TrendChart data={data.trend} />
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Calendar">
          <CalendarView calendar={data.calendar} />
        </Card>

        <Card title="Linked topics">
          <TopicNetwork nodes={data.topicNetwork.nodes} edges={data.topicNetwork.edges} />
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card title="Most repeated worries">
          <TagFrequencyList items={data.topWorries} accent="#fbbf24" />
        </Card>
        <Card title="Most repeated goals">
          <TagFrequencyList items={data.topGoals} accent="#34d399" />
        </Card>
        <Card title="Relationship themes">
          <TagFrequencyList items={data.topRelationships} accent="#a78bfa" />
        </Card>
      </div>

      <Card title="Progress toward your future vision">
        {data.profile?.futureVision ? (
          <div className="space-y-4">
            <p className="text-sm italic text-slate-300">"{data.profile.futureVision}"</p>
            <ul className="space-y-2">
              {(data.profile.growthPlan || []).map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-300">
                  <span className="text-neuron">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Complete onboarding to set a future vision.</p>
        )}
      </Card>
    </div>
  );
}
