'use client';

import { useState } from 'react';
import { emotionColor } from './EmotionBadge';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function toKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function CalendarView({ calendar }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const { year, month } = cursor;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array(daysInMonth).keys()].map((d) => (d === null ? null : d + 1));

  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  function shift(delta) {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setCursor({ year: y, month: m });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => shift(-1)} className="text-slate-500 hover:text-neuron">
          ‹
        </button>
        <p className="text-sm font-medium text-slate-300">{monthLabel}</p>
        <button onClick={() => shift(1)} className="text-slate-500 hover:text-neuron">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-600">
        {WEEKDAYS.map((w, i) => (
          <div key={i}>{w}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const key = toKey(year, month, d);
          const emotion = calendar?.[key];
          const color = emotion ? emotionColor(emotion) : null;
          return (
            <div
              key={i}
              title={emotion || ''}
              className="flex aspect-square items-center justify-center rounded-md border border-white/5 text-[11px] text-slate-500"
              style={color ? { backgroundColor: `${color}22`, borderColor: `${color}55`, color } : {}}
            >
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}
