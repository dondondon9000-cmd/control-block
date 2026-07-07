'use client';

import { voiceKey } from '@/hooks/useVoiceConversation';

export default function VoiceSettingsPanel({ voices, selectedVoiceKey, onVoiceChange, speechRate, onRateChange }) {
  return (
    <div className="px-4 pt-2 lg:flex lg:justify-end lg:px-8">
      <div className="glass-panel mx-auto flex w-full max-w-sm flex-col gap-3 rounded-2xl px-4 py-3 text-xs lg:mx-0">
        <label className="flex flex-col gap-1">
          <span className="text-slate-400">Voice</span>
          <select
            value={selectedVoiceKey}
            onChange={onVoiceChange}
            className="rounded-lg border border-white/10 bg-panel/80 px-2 py-1.5 text-slate-200 outline-none focus:border-neuron2/50"
          >
            {voices.map((v) => (
              <option key={voiceKey(v)} value={voiceKey(v)}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-slate-400">Speed — {speechRate.toFixed(2)}x</span>
          <input
            type="range"
            min="0.5"
            max="1.75"
            step="0.05"
            value={speechRate}
            onChange={onRateChange}
            className="accent-neuron2"
          />
        </label>
      </div>
    </div>
  );
}
