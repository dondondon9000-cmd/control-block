'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function TrendChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-slate-500">No entries yet to chart.</p>;
  }

  const recent = data.slice(-30);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={recent} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#64748b', fontSize: 11 }}
          tickFormatter={(d) => d.slice(5)}
          minTickGap={20}
        />
        <YAxis domain={[-1, 1]} tick={{ fill: '#64748b', fontSize: 11 }} width={30} />
        <Tooltip
          contentStyle={{ background: '#0d0f18', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
          labelStyle={{ color: '#94a3b8' }}
          formatter={(value, name) => [value, name === 'avgSentiment' ? 'Sentiment' : name]}
        />
        <Line type="monotone" dataKey="avgSentiment" stroke="#6ee7ff" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
