'use client';

export default function TopicNetwork({ nodes, edges }) {
  if (!nodes || nodes.length === 0) {
    return <p className="text-sm text-slate-500">Topics will appear here as you talk more.</p>;
  }

  const size = 280;
  const center = size / 2;
  const radius = size / 2 - 36;
  const maxCount = Math.max(...nodes.map((n) => n.count));
  const maxWeight = Math.max(1, ...(edges || []).map((e) => e.weight));

  const positions = {};
  nodes.forEach((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    positions[n.tag] = {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  });

  return (
    <svg width="100%" viewBox={`0 0 ${size} ${size}`} className="mx-auto max-w-xs">
      {(edges || []).map((e, i) => {
        const a = positions[e.source];
        const b = positions[e.target];
        if (!a || !b) return null;
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="#6ee7ff"
            strokeOpacity={0.15 + (e.weight / maxWeight) * 0.4}
            strokeWidth={1 + (e.weight / maxWeight) * 2}
          />
        );
      })}
      {nodes.map((n) => {
        const p = positions[n.tag];
        const r = 4 + (n.count / maxCount) * 10;
        return (
          <g key={n.tag}>
            <circle cx={p.x} cy={p.y} r={r} fill="#a78bfa" fillOpacity={0.85} />
            <text
              x={p.x}
              y={p.y - r - 5}
              textAnchor="middle"
              fontSize="9"
              fill="#94a3b8"
              className="capitalize"
            >
              {n.tag}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
