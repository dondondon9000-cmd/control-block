'use client';

import { useEffect, useRef, useState } from 'react';
import { useSphere } from '@/components/SphereProvider';

// Some browsers (notably Android Chrome) leave `voiceURI` blank on every
// voice, which would make every <option> collapse to the same value and
// silently ignore selection changes. name+lang is always populated and
// effectively unique, so it's used as the selection key instead.
export function voiceKey(v) {
  return `${v.name}::${v.lang}`;
}

// Encapsulates mic input (SpeechRecognition), spoken replies
// (SpeechSynthesis), voice/speed preferences, and hands-free
// conversation mode for the Talk page. The page still owns `input`
// (the textarea also accepts typed text) and what happens with a final
// transcript (sending it as a chat message) — both are threaded in so
// this hook doesn't need to know about the chat API at all.
export default function useVoiceConversation({ setInput, onFinalTranscript }) {
  const { setSphereState, setAmplitude } = useSphere();

  const [recording, setRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechSynthesisAvailable, setSpeechSynthesisAvailable] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoiceKey, setSelectedVoiceKey] = useState('');
  const [speechRate, setSpeechRate] = useState(1);
  const [handsFreeMode, setHandsFreeMode] = useState(false);

  const recognitionRef = useRef(null);
  const amplitudeIntervalRef = useRef(null);
  const transcriptRef = useRef('');
  const voicesRef = useRef([]);
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  onFinalTranscriptRef.current = onFinalTranscript;
  // Mirrors state for use inside SpeechRecognition/SpeechSynthesis callbacks,
  // which close over whichever render was current when they were attached —
  // reading these refs instead of the state directly avoids acting on a
  // stale value from an earlier render.
  const recordingRef = useRef(false);
  const handsFreeRef = useRef(false);
  recordingRef.current = recording;
  handsFreeRef.current = handsFreeMode;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    setSpeechSynthesisAvailable(true);
    const savedVoiceKey = localStorage.getItem('controlblock:voiceKey') || '';
    const savedRate = parseFloat(localStorage.getItem('controlblock:speechRate'));
    if (!Number.isNaN(savedRate)) setSpeechRate(savedRate);
    setHandsFreeMode(localStorage.getItem('controlblock:handsFreeMode') === 'true');

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
    utterance.onend = () => {
      setSphereState('idle');
      // Hands-free mode: pick the mic back up on its own once the reply
      // finishes, so the conversation keeps going without another tap.
      // Not on onerror — that's the path a manual tap-to-interrupt takes
      // (see startListening's cancel() call), which already starts its own
      // fresh listening session; auto-restarting there too would race it.
      if (handsFreeRef.current) startListening();
    };
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
          onFinalTranscriptRef.current?.(finalText);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Function declaration (not const) so it's hoisted — speak()'s onend
  // handler, defined earlier, calls this too.
  function startListening() {
    if (!speechSupported || recordingRef.current) return;
    // Doubles as tap-to-interrupt: if the sphere is mid-reply, this cuts it
    // off immediately and starts listening for what you actually want to say.
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

  function toggleRecording() {
    if (!speechSupported) return;
    if (recording) {
      // Manual cancel — stop now. onend will fire; if nothing was
      // transcribed yet it just goes back to idle instead of sending.
      recognitionRef.current.stop();
      return;
    }
    startListening();
  }

  function toggleHandsFree(sphereState) {
    const next = !handsFreeMode;
    setHandsFreeMode(next);
    localStorage.setItem('controlblock:handsFreeMode', String(next));
    if (next && sphereState === 'idle' && !recording) startListening();
  }

  // Used when a manual text send happens while the mic is still listening —
  // stops it immediately rather than waiting for the async onend event, so
  // the UI reflects "not recording" right away.
  function stopRecordingImmediately() {
    if (!recording) return;
    recognitionRef.current?.stop();
    clearInterval(amplitudeIntervalRef.current);
    setRecording(false);
  }

  return {
    recording,
    speechSupported,
    speechSynthesisAvailable,
    voices,
    selectedVoiceKey,
    speechRate,
    handsFreeMode,
    handleVoiceChange,
    handleRateChange,
    toggleRecording,
    toggleHandsFree,
    speak,
    stopRecordingImmediately,
  };
}
