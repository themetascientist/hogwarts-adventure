"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { MicVAD } from "@ricky0123/vad-web";

type ConvoPhase = "idle" | "listening" | "transcribing" | "thinking" | "speaking";

interface ConversationLoopProps {
  active: boolean;
  onSendMessage: (text: string) => Promise<{ response: string; voiceId: string } | null>;
  onEnd: () => void;
  characterName: string;
  characterEmoji: string;
}

// Convert Float32Array (from VAD) to WAV blob for Whisper
function float32ToWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // WAV header
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);

  // PCM data
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export default function ConversationLoop({
  active,
  onSendMessage,
  onEnd,
  characterName,
  characterEmoji,
}: ConversationLoopProps) {
  const [phase, setPhase] = useState<ConvoPhase>("idle");
  const [micError, setMicError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeRef = useRef(active);
  const vadRef = useRef<MicVAD | null>(null);
  const processingRef = useRef(false); // true while transcribing/thinking/speaking
  const interruptedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { activeRef.current = active; }, [active]);

  // Process a speech segment from VAD
  const processSpeech = useCallback(async (audio: Float32Array) => {
    if (!activeRef.current) return;

    // If we're currently playing TTS, this is an interrupt
    if (processingRef.current && audioRef.current && !audioRef.current.paused) {
      interruptedRef.current = true;
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.src = "";
      // Abort in-flight TTS request if any
      if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    }

    // If already processing a previous utterance (thinking/transcribing), queue this
    // Simple approach: just skip if we're mid-transcribe/think (not mid-speak)
    if (processingRef.current && !interruptedRef.current) return;

    processingRef.current = true;
    interruptedRef.current = false;

    try {
      // Convert to WAV
      const wavBlob = float32ToWav(audio, 16000);
      if (wavBlob.size < 2000) { processingRef.current = false; return; }

      // === TRANSCRIBE ===
      setPhase("transcribing");
      const formData = new FormData();
      formData.append("audio", wavBlob, "recording.wav");
      const res = await fetch("/api/speech-to-text", { method: "POST", body: formData });
      const data = await res.json();

      const transcript = (data.text || "").trim();
      const lower = transcript.toLowerCase().replace(/[.,!?]/g, "");
      const HALLUCINATIONS = new Set([
        "buy", "bye", "you", "the", "a", "i", "hmm", "um", "uh",
        "thank you", "thanks", "okay", "ok", "so", "yeah", "yes",
        "no", "hi", "hey", "oh", "ah", "huh",
        "thanks for watching", "subscribe", "like and subscribe",
        "thank you for watching",
      ]);

      if (!transcript || HALLUCINATIONS.has(lower) || transcript.length < 3) {
        processingRef.current = false;
        setPhase("listening");
        return;
      }

      if (!activeRef.current) { processingRef.current = false; return; }

      // === THINK ===
      setPhase("thinking");
      const result = await onSendMessage(transcript);

      if (!result || !activeRef.current) {
        processingRef.current = false;
        setPhase("listening");
        return;
      }

      // === SPEAK ===
      setPhase("speaking");
      interruptedRef.current = false;
      abortRef.current = new AbortController();

      try {
        const ttsRes = await fetch("/api/text-to-speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: result.response, voiceId: result.voiceId }),
          signal: abortRef.current.signal,
        });

        if (!ttsRes.ok || !activeRef.current) {
          processingRef.current = false;
          setPhase("listening");
          return;
        }

        const audioBlob = await ttsRes.blob();
        const url = URL.createObjectURL(audioBlob);

        await new Promise<void>((resolve) => {
          if (!audioRef.current || !activeRef.current) {
            URL.revokeObjectURL(url);
            resolve();
            return;
          }

          audioRef.current.src = url;
          audioRef.current.onended = () => { URL.revokeObjectURL(url); resolve(); };
          audioRef.current.onerror = () => { URL.revokeObjectURL(url); resolve(); };
          audioRef.current.play().catch(() => { URL.revokeObjectURL(url); resolve(); });
        });

      } catch (err) {
        // AbortError means we interrupted — that's fine
        if (err instanceof DOMException && err.name === "AbortError") {
          // Interrupt handled
        } else {
          console.error("TTS error:", err);
        }
      }

      abortRef.current = null;

    } catch (err) {
      console.error("Conversation error:", err);
    }

    processingRef.current = false;
    if (activeRef.current) setPhase("listening");
  }, [onSendMessage]);

  // Initialize VAD
  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    async function initVAD() {
      try {
        const vad = await MicVAD.new({
          positiveSpeechThreshold: 0.5,
          negativeSpeechThreshold: 0.35,
          redemptionMs: 300,
          minSpeechMs: 100,
          preSpeechPadMs: 200,
          modelURL: "/vad/silero_vad_v5.onnx",
          workletURL: "/vad/vad.worklet.bundle.min.js",
          // Use echo cancellation so TTS doesn't trigger VAD
          stream: await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          }),
          onSpeechEnd: (audio) => {
            if (!cancelled) processSpeech(audio);
          },
        });

        if (cancelled) {
          vad.destroy();
          return;
        }

        vadRef.current = vad;
        vad.start();
        setPhase("listening");
        setMicError(null);
      } catch (err) {
        console.error("VAD init error:", err);
        if (!cancelled) {
          setMicError(
            err instanceof DOMException && err.name === "NotAllowedError"
              ? "Mic access denied — allow it in browser settings"
              : "Voice detection unavailable — use text input"
          );
        }
      }
    }

    initVAD();

    return () => {
      cancelled = true;
      if (vadRef.current) {
        vadRef.current.destroy();
        vadRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      processingRef.current = false;
    };
  }, [active, processSpeech]);

  if (!active) return <audio ref={audioRef} />;

  const phaseInfo: Record<ConvoPhase, { text: string; color: string }> = {
    idle: { text: "Starting voice detection...", color: "text-[var(--text-secondary)]" },
    listening: { text: "Listening...", color: "text-red-400" },
    transcribing: { text: "Processing...", color: "text-yellow-400" },
    thinking: { text: `${characterEmoji} ${characterName} is thinking...`, color: "text-[var(--gold)]" },
    speaking: { text: `${characterEmoji} ${characterName} is speaking...`, color: "text-[var(--gold)]" },
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`text-sm ${phaseInfo[phase].color} ${
          phase === "listening" || phase === "speaking" ? "animate-pulse-recording" : ""
        }`}
      >
        {phaseInfo[phase].text}
      </div>

      {phase === "listening" && (
        <div className="flex items-center gap-1">
          {[4, 6, 8, 6, 4].map((h, i) => (
            <div
              key={i}
              className="w-1.5 bg-red-500 rounded-full animate-bounce"
              style={{ height: `${h * 4}px`, animationDelay: `${i * 75}ms` }}
            />
          ))}
        </div>
      )}

      {phase === "speaking" && (
        <p className="text-xs text-[var(--text-secondary)]">
          Just start talking to interrupt
        </p>
      )}

      <button
        onClick={() => {
          if (vadRef.current) { vadRef.current.destroy(); vadRef.current = null; }
          if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
          processingRef.current = false;
          setPhase("idle");
          onEnd();
        }}
        className="px-4 py-2 text-sm bg-red-900/50 text-red-300 rounded-lg
                   hover:bg-red-800 transition-all cursor-pointer"
      >
        End Conversation
      </button>

      {micError && (
        <div className="text-xs text-red-300 text-center">{micError}</div>
      )}

      <audio ref={audioRef} />
    </div>
  );
}
