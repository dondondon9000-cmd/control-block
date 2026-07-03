'use client';

import EmotionBadge from './EmotionBadge';

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function Avatar({ role }) {
  if (role === 'user') return null;
  return (
    <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neuron to-neuron2 shadow-glow">
      <span className="h-2.5 w-2.5 rounded-full bg-void" />
    </span>
  );
}

export default function MessageBubble({ role, content, emotion, createdAt }) {
  const isUser = role === 'user';
  return (
    <div className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <Avatar role={role} />}
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className="flex items-baseline gap-2 px-1">
          <span className="text-xs font-medium text-slate-400">{isUser ? 'You' : 'Sphere'}</span>
          {createdAt && <span className="text-[10px] text-slate-600">{formatTime(createdAt)}</span>}
        </div>
        <div
          className={`glass-panel rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser ? 'text-slate-100' : 'text-slate-200'
          }`}
          style={isUser ? { borderColor: 'rgba(110, 231, 255, 0.25)' } : undefined}
        >
          {content}
        </div>
        {isUser && emotion && <EmotionBadge emotion={emotion} />}
      </div>
    </div>
  );
}
