'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import MessageBubble from '@/components/MessageBubble';
import { useSphere } from '@/components/SphereProvider';
import { emotionColor } from '@/components/EmotionBadge';

const SphereCanvas = dynamic(() => import('@/components/SphereCanvas'), { ssr: false });

const STATUS_TEXT = {
  idle: 'Sphere is calm',
  listening: 'Sphere is listening…',
  thinking: 'Sphere is thinking…',
  speaking: 'Sphere is responding…',
};

// Some browsers (notably Android Chrome) leave `voiceURI` blank on every
// voice, which would make every <option> collapse to the same value and
// silently ignore selection changes. name+lang is always populated and
// effectively unique, so it's used as the selection key instead.
function voiceKey(v) {
  return `${v.name}::${v.lang}`;
}

export default function TalkPage() {
  return (
    <Suspense fallback={null}>
      <TalkPageInner />
    </Suspense>
  );
}

function TalkPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialConvId = searchParams.get('c');

  const { sphereState, setSphereState, amplitude, setAmplitude, emotion, setEmotion } = useSphere();

  const [conversationId, setConversationId] = useState(initialConvId ? Number(initialConvId) : null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechSynthesisAvailable, setSpeechSynthesisAvailable] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoiceKey, setSelectedVoiceKey] = useState('');
  const [speechRate, setSpeechRate] = useState(1);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [planUpdateNotice, setPlanUpdateNotice] = useState(false);

  const recognitionRef = useRef(null);
  const amplitudeIntervalRef = useRef(null);
  const scrollRef = useRef(null);
  const transcriptRef = useRef('');
  const sendMessageRef = useRef(() => {});
  const voicesRef = useRef([]);
  const hasScrolledOnceRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    setSpeechSynthesisAvailable(true);
    const savedVoiceKey = localStorage.getItem('controlblock:voiceKey') || '';
    const savedRate = parseFloat(localStorage.getItem('controlblock:speechRate'));
    if (!Number.isNaN(savedRate)) setSpeechRate(savedRate);

    const loadVoices = () => {
      const list = window.speechSynthesis.getVoices();
      voicesRef.current = list;
      setVoices(list);
      setSelectedVoiceKey((current) => {
        if (current && list.some((v) => voiceKey(v) === current)) return current;
        if (savedVoiceKey && list.some((v) => voiceKey(v) === savedVoiceKey)) return savedVoiceKey;
        // Desktop Chrome ships a named "Google UK English Male" voice; Android's
        // TTS engine doesn't label gender the same way, so this falls back
        // through looser en-GB / en matches to find the closest thing available.
        const preferred =
          list.find((v) => v.name === 'Google UK English Male') ||
          list.find((v) => /uk/i.test(v.name) && /male/i.test(v.name)) ||
          list.find((v) => v.lang === 'en-GB' && !/female/i.test(v.name)) ||
          list.find((v) => v.lang?.startsWith('en-GB')) ||
          list.find((v) => v.lang?.startsWith('en')) ||
          list[0];
        return preferred ? voiceKey(preferred) : '';
      });
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => window.speechSynthesis.cancel();
  }, []);

  function handleVoiceChange(e) {
    const next = e.target.value;
    setSelectedVoiceKey(next);
    if (next) localStorage.setItem('controlblock:voiceKey', next);
  }

  function handleRateChange(e) {
    const next = parseFloat(e.target.value);
    setSpeechRate(next);
    localStorage.setItem('controlblock:speechRate', String(next));
  }

  function speak(text) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      // No speech synthesis available — still flash "speaking" briefly so
      // the sphere doesn't stay stuck on "thinking" forever.
      setSphereState('speaking');
      setTimeout(() => setSphereState('idle'), 1800);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const list = voicesRef.current.length ? voicesRef.current : window.speechSynthesis.getVoices();
    const selected = list.find((v) => voiceKey(v) === selectedVoiceKey);
    if (selected) {
      utterance.voice = selected;
      // Some Android TTS bridges honor `lang` more reliably than `voice` —
      // setting both gives the OS the best chance of picking the right one.
      utterance.lang = selected.lang;
    }
    utterance.rate = speechRate;
    utterance.onstart = () => setSphereState('speaking');
    utterance.onend = () => setSphereState('idle');
    utterance.onerror = () => setSphereState('idle');
    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => {
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (SR) {
      setSpeechSupported(true);
      const recognition = new SR();
      // continuous = false lets the browser auto-detect when the user stops
      // talking and end the recognition on its own — that's what makes this
      // "push to talk, then it just sends" instead of "push to talk, then
      // stop, then send."
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        transcriptRef.current = transcript;
        setInput(transcript);
      };
      recognition.onend = () => {
        clearInterval(amplitudeIntervalRef.current);
        setRecording(false);
        setAmplitude(0);
        const finalText = transcriptRef.current.trim();
        transcriptRef.current = '';
        if (finalText) {
          sendMessageRef.current(null, finalText);
        } else {
          setSphereState('idle');
        }
      };
      recognition.onerror = () => {
        clearInterval(amplitudeIntervalRef.current);
        setRecording(false);
        setAmplitude(0);
        setSphereState('idle');
      };
      recognitionRef.current = recognition;
    }
  }, [setAmplitude, setSphereState]);

  useEffect(() => {
    if (!initialConvId) return;
    fetch(`/api/conversations/${initialConvId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('not found'))))
      .then((data) => {
        setMessages(data.messages);
        const lastTagged = [...data.messages].reverse().find((m) => m.emotion);
        if (lastTagged) setEmotion(lastTagged.emotion);
      })
      .catch(() => setError('Could not load that entry.'));
  }, [initialConvId, setEmotion]);

  useEffect(() => {
    // Deferred to the next paint — reading scrollHeight synchronously here
    // can race ahead of the browser laying out a big batch of new message
    // nodes (e.g. loading a long historical conversation all at once),
    // landing the scroll partway through instead of at the true bottom.
    // The very first scroll for a conversation snaps instantly (a smooth
    // animation over a long historical thread can take a visible moment to
    // reach the bottom); every scroll after that — new messages arriving
    // during live chat — animates smoothly.
    if (messages.length === 0) return;
    const behavior = hasScrolledOnceRef.current ? 'smooth' : 'auto';
    const raf = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior });
      hasScrolledOnceRef.current = true;
    });
    return () => cancelAnimationFrame(raf);
  }, [messages, sending]);

  useEffect(() => {
    hasScrolledOnceRef.current = false;
  }, [conversationId]);

  function toggleRecording() {
    if (!speechSupported) return;
    if (recording) {
      // Manual cancel — stop now. onend will fire; if nothing was
      // transcribed yet it just goes back to idle instead of sending.
      recognitionRef.current.stop();
      return;
    }
    window.speechSynthesis?.cancel();
    transcriptRef.current = '';
    setInput('');
    setSphereState('listening');
    setRecording(true);
    recognitionRef.current.start();
    amplitudeIntervalRef.current = setInterval(() => {
      setAmplitude(0.3 + Math.random() * 0.7);
    }, 180);
  }

  async function sendMessage(e, overrideText) {
    e?.preventDefault();
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;

    if (recording) {
      recognitionRef.current?.stop();
      clearInterval(amplitudeIntervalRef.current);
      setRecording(false);
    }

    const now = new Date().toISOString();
    setMessages((prev) => [...prev, { role: 'user', content: text, emotion: null, created_at: now }]);
    setInput('');
    setSending(true);
    setSphereState('thinking');
    setAmplitude(0);
    setError('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, message: text }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Something went wrong');
      const data = await res.json();

      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], emotion: data.emotion };
        next.push({ role: 'assistant', content: data.reply, created_at: new Date().toISOString() });
        return next;
      });
      if (data.emotion) setEmotion(data.emotion);

      if (data.planUpdated) {
        setPlanUpdateNotice(true);
        setTimeout(() => setPlanUpdateNotice(false), 6000);
      }

      if (!conversationId) {
        setConversationId(data.conversationId);
        router.replace(`/talk?c=${data.conversationId}`);
      }

      speak(data.reply);
    } catch (err) {
      setError(err.message);
      setSphereState('idle');
    } finally {
      setSending(false);
    }
  }

  sendMessageRef.current = sendMessage;

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const showEmptyState = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-center gap-2 px-4 pt-4 lg:justify-end lg:px-8 lg:pt-6">
        <div className="glass-panel flex items-center gap-2 rounded-full px-4 py-2 text-xs">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: sphereState === 'idle' ? '#64748b' : '#6ee7ff' }}
          />
          <span className="text-slate-300">{STATUS_TEXT[sphereState]}</span>
        </div>
        {emotion && (
          <div className="glass-panel flex items-center gap-2 rounded-full px-4 py-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: emotionColor(emotion) }} />
            <span className="capitalize text-slate-300">{emotion}</span>
          </div>
        )}
        {planUpdateNotice && (
          <div className="glass-panel flex items-center gap-2 rounded-full border-neuron2/40 px-4 py-2 text-xs text-neuron2">
            <span>✨</span>
            <span>Growth plan updated</span>
          </div>
        )}
        {speechSynthesisAvailable && (
          <button
            type="button"
            onClick={() => setShowVoiceSettings((v) => !v)}
            title="Voice settings"
            className={`glass-panel flex items-center gap-2 rounded-full px-4 py-2 text-xs transition ${
              showVoiceSettings ? 'text-neuron' : 'text-slate-300 hover:text-neuron'
            }`}
          >
            <span>🔊</span>
            <span>Voice</span>
          </button>
        )}
      </div>

      {showVoiceSettings && speechSynthesisAvailable && (
        <div className="px-4 pt-2 lg:flex lg:justify-end lg:px-8">
          <div className="glass-panel mx-auto flex w-full max-w-sm flex-col gap-3 rounded-2xl px-4 py-3 text-xs lg:mx-0">
            <label className="flex flex-col gap-1">
              <span className="text-slate-400">Voice</span>
              <select
                value={selectedVoiceKey}
                onChange={handleVoiceChange}
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
                onChange={handleRateChange}
                className="accent-neuron2"
              />
            </label>
          </div>
        </div>
      )}

      <div className="relative flex h-[42vh] shrink-0 items-center justify-center lg:h-[48vh]">
        <Suspense fallback={<div className="h-64 w-64 rounded-full bg-neuron/10" />}>
          <SphereCanvas
            state={sphereState}
            amplitude={amplitude}
            // Mobile: width-driven and capped so it can never be wider than
            // the viewport (the old height-driven sizing overflowed narrow
            // screens since aspect-square + h-full made width follow the
            // container's vh-based height regardless of how narrow the
            // screen actually was). Desktop (lg:) is untouched — same
            // height-driven sizing, same 560px cap, as before.
            className="aspect-square w-[min(78vw,340px)] lg:h-full lg:w-auto lg:max-h-[560px] lg:max-w-[560px]"
          />
        </Suspense>
      </div>

      <div className="mx-auto flex w-full min-h-0 max-w-3xl flex-1 flex-col px-4">
        <div ref={scrollRef} className="scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-6">
          {showEmptyState && (
            <p className="mt-4 text-center text-sm text-slate-500">
              Talk or type. This is your space — say what's actually going on.
            </p>
          )}
          {messages.map((m, i) => (
            <MessageBubble
              key={i}
              role={m.role}
              content={m.content}
              emotion={m.emotion}
              createdAt={m.created_at}
            />
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="glass-panel rounded-2xl px-4 py-2.5 text-sm text-slate-500">…</div>
            </div>
          )}
        </div>

        {error && <p className="px-1 text-sm text-alert">{error}</p>}

        <form onSubmit={sendMessage} className="flex items-end gap-3 py-6">
          {speechSupported && (
            <button
              type="button"
              onClick={toggleRecording}
              title={recording ? 'Tap to cancel' : 'Tap and talk — sends automatically when you stop'}
              className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border text-xl transition ${
                recording
                  ? 'border-alert/50 bg-alert/10 text-alert shadow-[0_0_25px_rgba(251,113,133,0.35)]'
                  : 'border-neuron2/40 bg-gradient-to-br from-neuron/25 via-neuron2/15 to-neuron2/30 text-neuron shadow-glow hover:from-neuron/35 hover:to-neuron2/40'
              }`}
            >
              {recording ? (
                <span className="flex items-end gap-0.5">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className="w-0.5 animate-pulse rounded-full bg-alert"
                      style={{ height: `${8 + (i % 3) * 5}px`, animationDelay: `${i * 120}ms` }}
                    />
                  ))}
                </span>
              ) : (
                '🎙'
              )}
            </button>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={recording ? 'Listening…' : "What's on your mind..."}
            className="glass-panel flex-1 resize-none rounded-2xl px-4 py-3 text-sm text-slate-100 outline-none focus:border-neuron2/50"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="shrink-0 rounded-full bg-gradient-to-br from-neuron to-neuron2 px-5 py-3 text-sm font-medium text-void transition hover:brightness-110 disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
