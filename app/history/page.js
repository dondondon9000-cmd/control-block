'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function HistoryPage() {
  const [conversations, setConversations] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (q) => {
    setLoading(true);
    const url = q ? `/api/conversations?q=${encodeURIComponent(q)}` : '/api/conversations';
    const res = await fetch(url);
    const data = await res.json();
    setConversations(data.conversations || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load('');
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(query), 300);
    return () => clearTimeout(t);
  }, [query, load]);

  async function handleDelete(id, e) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this entry permanently?')) return;
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold text-slate-100">Conversation History</h1>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search your entries..."
        className="mb-6 w-full rounded-xl border border-white/10 bg-panel px-4 py-3 text-sm text-slate-100 outline-none focus:border-neuron"
      />

      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && conversations.length === 0 && (
        <p className="text-sm text-slate-500">No entries yet. Start a conversation on the Talk page.</p>
      )}

      <div className="space-y-2">
        {conversations.map((c) => (
          <Link
            key={c.id}
            href={`/talk?c=${c.id}`}
            className="group flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-panel px-4 py-3 transition hover:border-neuron/30"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-200">{c.title}</p>
              {c.preview && <p className="mt-1 truncate text-xs text-slate-500">{c.preview}</p>}
              <p className="mt-1 text-xs text-slate-600">{formatDate(c.updated_at)}</p>
            </div>
            <button
              onClick={(e) => handleDelete(c.id, e)}
              className="shrink-0 text-xs text-slate-600 opacity-0 transition hover:text-alert group-hover:opacity-100"
            >
              Delete
            </button>
          </Link>
        ))}
      </div>
    </div>
  );
}
