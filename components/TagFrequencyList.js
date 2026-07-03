'use client';

export default function TagFrequencyList({ items, accent = '#6ee7ff' }) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-slate-500">Nothing tracked yet.</p>;
  }
  const max = Math.max(...items.map((i) => i.count));

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.tag} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-xs capitalize text-slate-300">{item.tag}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full"
              style={{ width: `${(item.count / max) * 100}%`, backgroundColor: accent }}
            />
          </div>
          <span className="w-5 shrink-0 text-right text-xs text-slate-500">{item.count}</span>
        </li>
      ))}
    </ul>
  );
}
