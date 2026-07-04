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

  const recognitionRef = useRef(null);
  const amplitudeIntervalRef = useRef(null);
  const scrollRef = useRef(null);
  const transcriptRef = useRef('');
  const sendMessageRef = useRef(() => {});
  const voicesRef = useRef([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => window.speechSynthesis.cancel();
  }, []);

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
    const voices = voicesRef.current.length ? voicesRef.current : window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => v.name === 'Google UK English Male') ||
      voices.find((v) => v.name.startsWith('Google UK English')) ||
      voices.find((v) => v.lang === 'en-GB') ||
      null;
    if (preferred) utterance.voice = preferred;
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
    const raf = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(raf);
  }, [messages, sending]);

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
    <div className="flex h-screen flex-col">
      <div className="flex items-center justify-end gap-2 px-8 pt-6">
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
      </div>

      <div className="relative flex h-[48vh] shrink-0 items-center justify-center">
        <Suspense fallback={<div className="h-64 w-64 rounded-full bg-neuron/10" />}>
          <SphereCanvas
            state={sphereState}
            amplitude={amplitude}
            className="aspect-square h-full max-h-[560px] max-w-[560px]"
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
