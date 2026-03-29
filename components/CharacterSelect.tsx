"use client";

import { Character } from "@/lib/characters";

interface CharacterSelectProps {
  characters: Character[];
  selectedId: string | null;
  onSelect: (characterId: string) => void;
}

export default function CharacterSelect({
  characters,
  selectedId,
  onSelect,
}: CharacterSelectProps) {
  if (characters.length === 0) {
    return (
      <div className="magical-border p-4 bg-[var(--bg-card)] text-center text-[var(--text-secondary)] italic">
        No one seems to be here...
      </div>
    );
  }

  return (
    <div className="magical-border p-4 bg-[var(--bg-card)]">
      <h3 className="text-sm text-[var(--text-secondary)] mb-3">
        Characters present:
      </h3>
      <div className="flex flex-wrap gap-2">
        {characters.map((char) => (
          <button
            key={char.id}
            onClick={() => onSelect(char.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer
              ${
                selectedId === char.id
                  ? "bg-[var(--gold)] text-[var(--bg-primary)] animate-glow"
                  : "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)]"
              } magical-border`}
          >
            <span className="text-xl">{char.emoji}</span>
            <div className="text-left">
              <div className="text-sm font-bold">{char.name}</div>
              <div
                className={`text-xs ${selectedId === char.id ? "text-[var(--bg-secondary)]" : "text-[var(--text-secondary)]"}`}
              >
                {char.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
