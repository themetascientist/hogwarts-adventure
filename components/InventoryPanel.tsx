"use client";

import { GameState, ALL_CLUES } from "@/lib/game-state";

function petEmoji(pet: string | null): string {
  if (!pet) return "🦉";
  const p = pet.toLowerCase();
  if (p.includes("cat") || p.includes("kitten")) return "🐈";
  if (p.includes("toad") || p.includes("frog")) return "🐸";
  if (p.includes("rat") || p.includes("mouse")) return "🐀";
  if (p.includes("snake") || p.includes("serpent")) return "🐍";
  if (p.includes("rabbit") || p.includes("bunny")) return "🐇";
  return "🦉";
}

interface InventoryPanelProps {
  gameState: GameState;
  onClose: () => void;
}

export default function InventoryPanel({ gameState, onClose }: InventoryPanelProps) {
  const { inventory, friendInventory, playerName, friendName, cluesFound, house, friendHouse } = gameState;

  const formatHouse = (h: string) => h.charAt(0).toUpperCase() + h.slice(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-primary)] magical-border rounded-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[var(--gold)]">Inventory</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--gold)] text-lg cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Player inventory */}
        <div className="mb-4">
          <h3 className="text-sm font-bold text-[var(--gold)] mb-2">
            {playerName}
            {house && <span className="ml-2 text-xs font-normal text-[var(--text-secondary)]">({formatHouse(house)})</span>}
          </h3>
          <div className="space-y-2">
            <InventoryItem emoji="🪄" label="Wand" value={inventory.wand} />
            <InventoryItem emoji={petEmoji(inventory.pet)} label="Pet" value={inventory.pet} />
            <InventoryItem emoji="📚" label="Books" value={inventory.books ? "Standard first-year textbooks" : null} />
            <InventoryItem emoji="🍬" label="Treats" value={inventory.food} />
          </div>
        </div>

        {/* Friend inventory */}
        <div className="mb-4">
          <h3 className="text-sm font-bold text-[var(--gold)] mb-2">
            {friendName}
            {friendHouse && <span className="ml-2 text-xs font-normal text-[var(--text-secondary)]">({formatHouse(friendHouse)})</span>}
          </h3>
          <div className="space-y-2">
            <InventoryItem emoji="🪄" label="Wand" value={friendInventory.wand} />
            <InventoryItem emoji={petEmoji(friendInventory.pet)} label="Pet" value={friendInventory.pet} />
            <InventoryItem emoji="📚" label="Books" value={friendInventory.books ? "Standard first-year textbooks" : null} />
            <InventoryItem emoji="🍬" label="Treats" value={friendInventory.food} />
          </div>
        </div>

        {/* Clues */}
        {cluesFound.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-[var(--gold)] mb-2">
              🔍 Clues ({cluesFound.length}/7)
            </h3>
            <div className="space-y-2">
              {cluesFound.map((clueId) => {
                const clue = ALL_CLUES.find((c) => c.id === clueId);
                if (!clue) return null;
                return (
                  <div
                    key={clueId}
                    className="px-3 py-2 bg-[var(--bg-secondary)] rounded-lg text-sm text-[var(--text-primary)] leading-relaxed"
                  >
                    {clue.text}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {cluesFound.length === 0 && (
          <p className="text-xs text-[var(--text-secondary)] italic">
            No clues discovered yet. Talk to characters at Hogwarts to uncover the mystery.
          </p>
        )}
      </div>
    </div>
  );
}

function InventoryItem({ emoji, label, value }: { emoji: string; label: string; value: string | null | boolean }) {
  const hasItem = !!value;
  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg ${hasItem ? "bg-[var(--bg-secondary)]" : "bg-[var(--bg-secondary)]/30"}`}>
      <span className={hasItem ? "opacity-100" : "opacity-30"}>{emoji}</span>
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${hasItem ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
          {label}
        </span>
        {hasItem && typeof value === "string" && (
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-snug">{value}</p>
        )}
        {!hasItem && (
          <p className="text-xs text-[var(--text-secondary)]/50 mt-0.5 italic">Not yet acquired</p>
        )}
      </div>
    </div>
  );
}
