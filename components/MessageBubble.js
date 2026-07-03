'use client';

import EmotionBadge from './EmotionBadge';

export default function MessageBubble({ role, content, emotion }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-neuron/15 border border-neuron/30 text-slate-100'
              : 'bg-panel border border-white/10 text-slate-200'
          }`}
        >
          {content}
        </div>
        {isUser && emotion && <EmotionBadge emotion={emotion} />}
      </div>
    </div>
  );
}
