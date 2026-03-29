"use client";

import { Character } from "@/lib/characters";
import { useEffect, useRef } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  characterId?: string;
}

interface ChatAreaProps {
  messages: ChatMessage[];
  character: Character | null;
  isLoading: boolean;
}

export default function ChatArea({
  messages,
  character,
  isLoading,
}: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (!character) {
    return (
      <div className="flex-1 magical-border bg-[var(--bg-card)] flex items-center justify-center">
        <p className="text-[var(--text-secondary)] italic text-center px-4">
          Select a character to begin your conversation...
          <br />
          <span className="text-xs mt-2 block">
            Use the microphone or type a message below
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 magical-border bg-[var(--bg-card)] flex flex-col overflow-hidden">
      <div className="p-3 border-b border-[rgba(201,169,78,0.2)] flex items-center gap-2">
        <span className="text-xl">{character.emoji}</span>
        <span className="font-bold text-[var(--gold)]">{character.name}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {messages.filter((msg) => !(msg.role === "user" && msg.content === "[GREETING]")).map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-lg text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-[var(--accent)] text-white rounded-br-none"
                  : "bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-bl-none magical-border"
              }`}
            >
              {msg.role === "assistant" && (
                <span className="text-xs text-[var(--gold)] block mb-1">
                  {character.emoji} {character.name}
                </span>
              )}
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[var(--bg-secondary)] magical-border px-4 py-2 rounded-lg rounded-bl-none">
              <span className="text-xs text-[var(--gold)] block mb-1">
                {character.emoji} {character.name}
              </span>
              <span className="text-[var(--text-secondary)] italic text-sm">
                Thinking...
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
