'use client';

const EMOTION_COLORS = {
  anxious: '#fbbf24',
  overwhelmed: '#fb7185',
  frustrated: '#fb7185',
  sad: '#818cf8',
  tired: '#94a3b8',
  angry: '#f87171',
  hopeful: '#34d399',
  proud: '#34d399',
  calm: '#6ee7ff',
  happy: '#34d399',
  excited: '#f472b6',
  grateful: '#a78bfa',
  neutral: '#94a3b8',
};

export function emotionColor(emotion) {
  return EMOTION_COLORS[(emotion || '').toLowerCase()] || '#6ee7ff';
}

export default function EmotionBadge({ emotion }) {
  if (!emotion) return null;
  const color = emotionColor(emotion);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs capitalize"
      style={{ borderColor: `${color}55`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {emotion}
    </span>
  );
}
