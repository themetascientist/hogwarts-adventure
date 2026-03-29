"use client";

import { useState, useRef, useCallback } from "react";

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  disabled: boolean;
}

export default function VoiceButton({
  onTranscript,
  disabled,
}: VoiceButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(async () => {
    // If already recording, stop
    if (isRecording) {
      stopRecording();
      return;
    }

    // Check if getUserMedia is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicError(
        "Microphone not supported in this browser. Open http://localhost:3000 directly in Chrome or Safari."
      );
      setTimeout(() => setMicError(null), 5000);
      return;
    }

    setMicError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (chunksRef.current.length === 0) return;

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });

        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");

          const res = await fetch("/api/speech-to-text", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `API error ${res.status}`);
          }

          const data = await res.json();
          if (data.text) onTranscript(data.text);
        } catch (err) {
          setMicError(
            `Transcription failed: ${err instanceof Error ? err.message : "unknown error"}`
          );
          setTimeout(() => setMicError(null), 5000);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      let message: string;
      if (err instanceof DOMException) {
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          message =
            "Mic permission denied. Click the lock/camera icon in your browser's address bar to allow microphone access, then try again.";
        } else if (err.name === "NotFoundError") {
          message = "No microphone found. Please connect a microphone.";
        } else {
          message = `Mic error: ${err.message}`;
        }
      } else {
        message = "Mic unavailable — use text input instead";
      }
      setMicError(message);
      setTimeout(() => setMicError(null), 6000);
    }
  }, [isRecording, stopRecording, onTranscript]);

  return (
    <div className="relative">
      <button
        onClick={toggleRecording}
        disabled={disabled || isTranscribing}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer
          ${
            isRecording
              ? "bg-red-600 animate-pulse-recording scale-110"
              : isTranscribing
                ? "bg-[var(--accent)] opacity-50"
                : micError
                  ? "bg-red-800"
                  : "bg-[var(--gold)] hover:bg-[var(--gold-bright)]"
          }
          ${disabled ? "opacity-30 cursor-not-allowed" : ""}
          text-[var(--bg-primary)] text-2xl`}
        title={
          isRecording
            ? "Click to stop recording"
            : "Click to start recording"
        }
      >
        {isTranscribing ? "..." : isRecording ? "⏹" : micError ? "!" : "🎤"}
      </button>
      {micError && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 text-center
                      text-xs text-red-300 bg-red-900/90 px-3 py-2 rounded-lg whitespace-normal"
        >
          {micError}
        </div>
      )}
      {isRecording && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 text-center text-xs text-red-400 whitespace-nowrap">
          Recording... click to stop
        </div>
      )}
    </div>
  );
}
