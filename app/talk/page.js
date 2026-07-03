'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import MessageBubble from '@/components/MessageBubble';
import { emotionColor } from '@/components/EmotionBadge';

const SphereCanvas = dynamic(() => import('@/components/SphereCanvas'), { ssr: false });

const STATUS_TEXT = {
  idle: 'Sphere is calm',
  listening: 'Sphere is listening…',
  thinking: 'Sphere is thinking…',
  speaking: 'Sphere is responding…',
};

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

  const [conversationId, setConversationId] = useState(initialConvId ? Number(initialConvId) : null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sphereState, setSphereState] = useState('idle');
  const [amplitude, setAmplitude] = useState(0);
  const [recording, setRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [lastEmotion, setLastEmotion] = useState(null);

  const recognitionRef = useRef(null);
  const amplitudeIntervalRef = useRef(null);
  const scrollRef = useRef(null);
  const speakingTimeoutRef = useRef(null);
  const transcriptRef = useRef('');
  const sendMessageRef = useRef(() => {});

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
  }, []);

  useEffect(() => {
    if (!initialConvId) return;
    fetch(`/api/conversations/${initialConvId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('not found'))))
      .then((data) => {
        setMessages(data.messages);
        const lastTagged = [...data.messages].reverse().find((m) => m.emotion);
        if (lastTagged) setLastEmotion(lastTagged.emotion);
      })
      .catch(() => setError('Could not load that entry.'));
  }, [initialConvId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  function toggleRecording() {
    if (!speechSupported) return;
    if (recording) {
      // Manual cancel — stop now. onend will fire; if nothing was
      // transcribed yet it just goes back to idle instead of sending.
      recognitionRef.current.stop();
      return;
    }
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
      if (data.emotion) setLastEmotion(data.emotion);

      if (!conversationId) {
        setConversationId(data.conversationId);
        router.replace(`/talk?c=${data.conversationId}`);
      }

      setSphereState('speaking');
      clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = setTimeout(() => setSphereState('idle'), 2200);
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
  const statusColor = recording ? '#34d399' : sphereState === 'idle' ? '#64748b' : '#6ee7ff';

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center justify-end gap-2 px-8 pt-6">
        <div className="glass-panel flex items-center gap-2 rounded-full px-4 py-2 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor }} />
          <span className="text-slate-300">{STATUS_TEXT[sphereState]}</span>
        </div>
        {lastEmotion && (
          <div className="glass-panel flex items-center gap-2 rounded-full px-4 py-2 text-xs">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: emotionColor(lastEmotion) }}
            />
            <span className="capitalize text-slate-300">{lastEmotion}</span>
          </div>
        )}
      </div>

      <div className="relative flex h-64 shrink-0 items-center justify-center md:h-80">
        <Suspense fallback={<div className="h-40 w-40 rounded-full bg-neuron/10" />}>
          <SphereCanvas state={sphereState} amplitude={amplitude} className="h-64 w-64 md:h-80 md:w-80" />
        </Suspense>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden px-4">
        <div ref={scrollRef} className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-1 py-2">
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
                  : 'border-neuron/30 bg-gradient-to-br from-neuron/20 to-neuron2/20 text-neuron shadow-glow hover:from-neuron/30 hover:to-neuron2/30'
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
            className="glass-panel flex-1 resize-none rounded-2xl px-4 py-3 text-sm text-slate-100 outline-none focus:border-neuron/40"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="shrink-0 rounded-full bg-neuron/90 px-5 py-3 text-sm font-medium text-void transition hover:bg-neuron disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
