'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import MessageBubble from '@/components/MessageBubble';

const SphereCanvas = dynamic(() => import('@/components/SphereCanvas'), { ssr: false });

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

  const recognitionRef = useRef(null);
  const amplitudeIntervalRef = useRef(null);
  const scrollRef = useRef(null);
  const speakingTimeoutRef = useRef(null);

  useEffect(() => {
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (SR) {
      setSpeechSupported(true);
      const recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };
      recognition.onend = () => {
        setRecording(false);
        setSphereState('idle');
      };
      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    if (!initialConvId) return;
    fetch(`/api/conversations/${initialConvId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('not found'))))
      .then((data) => setMessages(data.messages))
      .catch(() => setError('Could not load that entry.'));
  }, [initialConvId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  function toggleRecording() {
    if (!speechSupported) return;
    if (recording) {
      recognitionRef.current.stop();
      clearInterval(amplitudeIntervalRef.current);
      setAmplitude(0);
      return;
    }
    setInput('');
    setSphereState('listening');
    setRecording(true);
    recognitionRef.current.start();
    amplitudeIntervalRef.current = setInterval(() => {
      setAmplitude(0.3 + Math.random() * 0.7);
    }, 180);
  }

  async function sendMessage(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    if (recording) {
      recognitionRef.current?.stop();
      clearInterval(amplitudeIntervalRef.current);
      setRecording(false);
    }

    setMessages((prev) => [...prev, { role: 'user', content: text, emotion: null }]);
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
        next.push({ role: 'assistant', content: data.reply });
        return next;
      });

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

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const showEmptyState = messages.length === 0;

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4">
      <div className="relative flex h-56 items-center justify-center shrink-0">
        <Suspense fallback={<div className="h-40 w-40 rounded-full bg-neuron/10" />}>
          <SphereCanvas state={sphereState} amplitude={amplitude} className="h-56 w-56" />
        </Suspense>
      </div>

      <div ref={scrollRef} className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-1 py-2">
        {showEmptyState && (
          <p className="mt-8 text-center text-sm text-slate-500">
            Talk or type. This is your space — say what's actually going on.
          </p>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} emotion={m.emotion} />
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-white/10 bg-panel px-4 py-2.5 text-sm text-slate-500">
              …
            </div>
          </div>
        )}
      </div>

      {error && <p className="px-1 text-sm text-alert">{error}</p>}

      <form onSubmit={sendMessage} className="flex items-end gap-2 py-4">
        {speechSupported && (
          <button
            type="button"
            onClick={toggleRecording}
            className={`shrink-0 rounded-full border px-4 py-3 text-sm transition ${
              recording
                ? 'border-alert/50 bg-alert/10 text-alert'
                : 'border-white/10 bg-panel text-slate-300 hover:border-neuron/40 hover:text-neuron'
            }`}
          >
            {recording ? 'Stop' : 'Voice'}
          </button>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="What's on your mind..."
          className="flex-1 resize-none rounded-2xl border border-white/10 bg-panel px-4 py-3 text-sm text-slate-100 outline-none focus:border-neuron"
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
  );
}
