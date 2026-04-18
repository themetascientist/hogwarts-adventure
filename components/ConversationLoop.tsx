"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { fetchWithTimeout } from "@/lib/utils";

type ConvoPhase = "idle" | "recording" | "transcribing" | "thinking" | "speaking";

interface ConversationLoopProps {
  active: boolean;
  onSendMessage: (text: string) => Promise<{ response: string; voiceId: string } | null>;
  onEnd: () => void;
  characterName: string;
  characterEmoji: string;
}

export default function ConversationLoop({
  active,
  onSendMessage,
  onEnd,
  characterName,
  characterEmoji,
}: ConversationLoopProps) {
  const [phase, setPhase] = useState<ConvoPhase>("idle");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeRef = useRef(active);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const processingRef = useRef(false);

  useEffect(() => { activeRef.current = active; }, [active]);

  // Get mic stream once on mount
  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    }).then((stream) => {
      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = stream;
      setPhase("idle");
    }).catch((err) => {
      console.error("Mic error:", err);
    });

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      processingRef.current = false;
    };
  }, [active]);

  const processAudio = useCallback(async (blob: Blob) => {
    if (!activeRef.current || processingRef.current) return;
    if (blob.size < 2000) return; // too small, skip

    processingRef.current = true;

    try {
      // === TRANSCRIBE ===
      setPhase("transcribing");
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      const res = await fetchWithTimeout(
        "/api/speech-to-text",
        { method: "POST", body: formData },
        20000
      );
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
        setPhase("idle");
        return;
      }

      if (!activeRef.current) { processingRef.current = false; return; }

      // === THINK ===
      setPhase("thinking");
      const result = await onSendMessage(transcript);

      if (!result || !activeRef.current) {
        processingRef.current = false;
        setPhase("idle");
        return;
      }

      // === SPEAK ===
      setPhase("speaking");

      let ttsUrl: string | null = null;
      try {
        const ttsRes = await fetchWithTimeout(
          "/api/text-to-speech",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: result.response, voiceId: result.voiceId }),
          },
          20000
        );

        if (ttsRes.ok && activeRef.current) {
          const audioBlob = await ttsRes.blob();
          ttsUrl = URL.createObjectURL(audioBlob);

          await new Promise<void>((resolve) => {
            const url = ttsUrl!;
            const done = () => {
              URL.revokeObjectURL(url);
              ttsUrl = null;
              resolve();
            };
            if (!audioRef.current || !activeRef.current) {
              done();
              return;
            }
            audioRef.current.src = url;
            audioRef.current.onended = done;
            audioRef.current.onerror = done;
            audioRef.current.play().catch(done);
          });
        } else if (ttsUrl) {
          URL.revokeObjectURL(ttsUrl);
          ttsUrl = null;
        }
      } catch (err) {
        console.error("TTS error:", err);
        if (ttsUrl) URL.revokeObjectURL(ttsUrl);
      }
    } catch (err) {
      console.error("Conversation error:", err);
    }

    processingRef.current = false;
    if (activeRef.current) setPhase("idle");
  }, [onSendMessage]);

  const startRecording = useCallback(() => {
    if (!streamRef.current || processingRef.current) return;
    // Stop any playing audio
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }

    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, {
      mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm",
    });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      processAudio(blob);
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setPhase("recording");
  }, [processAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  if (!active) return <audio ref={audioRef} />;

  const isBusy = phase === "transcribing" || phase === "thinking" || phase === "speaking";

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Status */}
      <div className={`text-sm ${
        phase === "recording" ? "text-red-400 animate-pulse-recording" :
        phase === "speaking" ? "text-[var(--gold)] animate-pulse-recording" :
        isBusy ? "text-[var(--gold)]" :
        "text-[var(--text-secondary)]"
      }`}>
        {phase === "idle" && "Hold the button and speak"}
        {phase === "recording" && "Recording... release when done"}
        {phase === "transcribing" && "Processing..."}
        {phase === "thinking" && `${characterEmoji} ${characterName} is thinking...`}
        {phase === "speaking" && `${characterEmoji} ${characterName} is speaking...`}
      </div>

      {/* Push-to-talk button */}
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          startRecording();
        }}
        onPointerUp={(e) => {
          e.preventDefault();
          stopRecording();
        }}
        onPointerLeave={() => {
          if (phase === "recording") stopRecording();
        }}
        disabled={isBusy}
        className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl
                    transition-all select-none touch-none
                    ${phase === "recording"
                      ? "bg-red-600 scale-110 shadow-lg shadow-red-600/50"
                      : isBusy
                        ? "bg-[var(--bg-secondary)] opacity-40 cursor-not-allowed"
                        : "bg-[var(--gold)] hover:bg-[var(--gold-bright)] cursor-pointer active:scale-110"
                    }`}
      >
        {phase === "recording" ? "🔴" : "🎤"}
      </button>

      {phase === "recording" && (
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

      <button
        onClick={() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
          }
          if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
          }
          processingRef.current = false;
          setPhase("idle");
          onEnd();
        }}
        className="px-4 py-2 text-sm bg-red-900/50 text-red-300 rounded-lg
                   hover:bg-red-800 transition-all cursor-pointer"
      >
        End Conversation
      </button>

      <audio ref={audioRef} />
    </div>
  );
}
