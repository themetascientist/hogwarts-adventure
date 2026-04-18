"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { characters } from "@/lib/characters";
import { locations } from "@/lib/locations";
import {
  GameState,
  createInitialState,
  canAdvanceChapter,
  advanceChapter,
  CHAPTER_TITLES,
  House,
} from "@/lib/game-state";
import GameWorld from "@/components/GameWorld";
import CharacterSelect from "@/components/CharacterSelect";
import ChatArea, { ChatMessage } from "@/components/ChatArea";
import ConversationLoop from "@/components/ConversationLoop";
import InventoryPanel from "@/components/InventoryPanel";
import { petEmoji, fetchWithTimeout } from "@/lib/utils";

const SAVE_KEY = "hogwarts-adventure-save";

function saveGame(state: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {}
}

function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Basic validation — must have chapter and playerName
    if (parsed && parsed.chapter && parsed.playerName) {
      return parsed as GameState;
    }
    return null;
  } catch {
    return null;
  }
}

function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {}
}

export default function Home() {
  // Game state
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [setupStep, setSetupStep] = useState<"name" | "friend" | "done">("name");
  const [nameInput, setNameInput] = useState("");
  const [friendInput, setFriendInput] = useState("");
  const [hasSavedGame, setHasSavedGame] = useState(false);

  // UI state
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [features, setFeatures] = useState({ hasWhisper: false, hasElevenLabs: false });
  const [notification, setNotification] = useState<string | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const gameStateRef = useRef<GameState | null>(null);
  const selectedCharIdRef = useRef<string | null>(null);

  // Check for saved game on mount
  useEffect(() => {
    const saved = loadGame();
    if (saved) {
      setHasSavedGame(true);
    }
  }, []);

  useEffect(() => {
    fetch("/api/features").then((r) => r.json()).then(setFeatures).catch(() => {});
  }, []);

  // Auto-save whenever gameState changes
  useEffect(() => {
    if (gameState) {
      saveGame(gameState);
    }
  }, [gameState]);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { selectedCharIdRef.current = selectedCharId; }, [selectedCharId]);

  // Derived state
  const location = gameState ? locations[gameState.locationId] : null;
  const presentCharacters = location
    ? location.characterIds.map((id) => characters[id]).filter(Boolean)
    : [];
  const selectedCharacter = selectedCharId ? characters[selectedCharId] : null;
  const currentMessages =
    gameState && selectedCharId ? gameState.chatHistory[selectedCharId] || [] : [];

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Continue from saved game
  const handleContinue = () => {
    const saved = loadGame();
    if (saved) {
      setGameState(saved);
      setSetupStep("done");
    }
  };

  // Start new game (clears save)
  const handleNewGame = () => {
    clearSave();
    setHasSavedGame(false);
    setSetupStep("name");
  };

  // Reset to title screen
  const handleReturnToTitle = () => {
    setVoiceMode(false);
    setSelectedCharId(null);
    setGameState(null);
    setSetupStep("name");
    setNameInput("");
    setFriendInput("");
    // Re-check if there's a save
    const saved = loadGame();
    setHasSavedGame(!!saved);
  };

  // Core message handler — used by both text input and ConversationLoop
  const processMessage = useCallback(
    async (
      text: string
    ): Promise<{ response: string; voiceId: string } | null> => {
      const gs = gameStateRef.current;
      const charId = selectedCharIdRef.current;
      if (!charId || !text.trim() || !gs) return null;

      const userMessage: ChatMessage = { role: "user", content: text.trim() };
      const prevMessages = gs.chatHistory[charId] || [];
      const updatedMessages = [...prevMessages, userMessage];

      setGameState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          chatHistory: { ...prev.chatHistory, [charId]: updatedMessages },
        };
      });
      setIsLoading(true);

      try {
        const res = await fetchWithTimeout(
          "/api/chat",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: text.trim(),
              characterId: charId,
              locationId: gs.locationId,
              history: prevMessages,
              gameState: gs,
            }),
          },
          30000
        );
        const data = await res.json();

        if (data.error) {
          console.error("Chat error:", data.error);
          return null;
        }

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: data.response,
          characterId: charId,
        };
        const messagesWithResponse = [...updatedMessages, assistantMessage];

        // Apply state updates
        setGameState((prev) => {
          if (!prev) return prev;
          let updated = {
            ...prev,
            chatHistory: { ...prev.chatHistory, [charId]: messagesWithResponse },
          };

          if (data.stateUpdates) {
            if (data.stateUpdates.house) {
              const house = data.stateUpdates.house as House;
              const recipient = (data.stateUpdates.sortRecipient as string || "").toLowerCase();
              const isFriend = recipient.includes(prev.friendName.toLowerCase());
              const capHouse = house.charAt(0).toUpperCase() + house.slice(1);

              if (isFriend && !prev.friendHouse) {
                updated = { ...updated, friendHouse: house };
                showNotification(`${prev.friendName} was sorted into ${capHouse}!`);
              } else if (!isFriend && !prev.house) {
                updated = { ...updated, house };
                showNotification(`${prev.playerName} was sorted into ${capHouse}!`);
              }
            }
            // Handle clue discoveries (content-driven, may be multiple)
            if (data.stateUpdates.newClues && Array.isArray(data.stateUpdates.newClues)) {
              const fresh = (data.stateUpdates.newClues as string[]).filter(
                (c: string) => !updated.cluesFound.includes(c)
              );
              if (fresh.length > 0) {
                updated = {
                  ...updated,
                  cluesFound: [...updated.cluesFound, ...fresh],
                };
                showNotification(
                  fresh.length === 1 ? "You discovered a new clue!" : `You discovered ${fresh.length} new clues!`
                );
              }
            }
            // Handle mystery completion
            if (data.stateUpdates.mysteryComplete) {
              updated = { ...updated, mysteryComplete: true };
              showNotification("The Keystone is restored! Hogwarts is saved!");
            }
          }

          // Inventory detection — server returns itemType + itemRecipient + itemDescription
          if (data.stateUpdates?.itemType) {
            const itemType = data.stateUpdates.itemType as "wand" | "pet" | "books" | "food";
            const recipient = (data.stateUpdates.itemRecipient as string).toLowerCase();
            const desc = data.stateUpdates.itemDescription as string;
            const invValue = itemType === "books" ? true : desc;
            const labels: Record<string, string> = { wand: "wand", pet: "pet", books: "textbooks", food: "treats" };

            // Match recipient name to player or friend
            const isFriend = recipient.includes(prev.friendName.toLowerCase());
            const isPlayer = recipient.includes(prev.playerName.toLowerCase());

            if (isFriend && !updated.friendInventory[itemType]) {
              updated = { ...updated, friendInventory: { ...updated.friendInventory, [itemType]: invValue } };
              showNotification(`${prev.friendName} got their ${labels[itemType]}!`);
            } else if ((isPlayer || !isFriend) && !prev.inventory[itemType]) {
              updated = { ...updated, inventory: { ...updated.inventory, [itemType]: invValue } };
              showNotification(`${prev.playerName} got their ${labels[itemType]}!`);
            }
          }

          return updated;
        });

        const character = characters[charId];
        return { response: data.response, voiceId: character?.voiceId || "" };
      } catch (err) {
        console.error("Chat error:", err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Text-only send (no voice return)
  const sendTextMessage = useCallback(
    async (text: string) => {
      await processMessage(text);
    },
    [processMessage]
  );

  // Ref to track if a greeting is currently playing
  const greetingAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleCharacterSelect = async (charId: string) => {
    if (selectedCharId === charId && voiceMode) {
      setVoiceMode(false);
      setSelectedCharId(null);
      return;
    }

    // Stop any playing greeting
    if (greetingAudioRef.current) {
      greetingAudioRef.current.pause();
      greetingAudioRef.current.src = "";
      greetingAudioRef.current = null;
    }

    setSelectedCharId(charId);
    selectedCharIdRef.current = charId;

    // If first time talking to this character, have them greet first
    const gs = gameStateRef.current;
    const hasHistory = gs && gs.chatHistory[charId] && gs.chatHistory[charId].length > 0;

    if (!hasHistory) {
      // Send greeting prompt — processMessage stores it in history
      const result = await processMessage("[GREETING]");

      if (result) {
        // Try to play greeting via TTS
        let url: string | null = null;
        try {
          const audioRes = await fetchWithTimeout(
            "/api/text-to-speech",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: result.response, voiceId: result.voiceId }),
            },
            20000
          );
          if (audioRes.ok) {
            const blob = await audioRes.blob();
            url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            greetingAudioRef.current = audio;
            const cleanup = () => {
              if (url) URL.revokeObjectURL(url);
              url = null;
              greetingAudioRef.current = null;
              if (features.hasWhisper) setVoiceMode(true);
            };
            audio.onended = cleanup;
            audio.onerror = cleanup;
            await audio.play().catch(cleanup);
            return; // Wait for greeting to finish before voice mode
          } else {
            // TTS request returned error — revoke any URL we made
            if (url) URL.revokeObjectURL(url);
          }
        } catch (err) {
          console.error("Greeting TTS error:", err);
          if (url) URL.revokeObjectURL(url);
        }
        // TTS failed — fall through to voice mode
      }
    }

    if (features.hasWhisper) {
      setVoiceMode(true);
    }
  };

  const handleEndConversation = () => {
    setVoiceMode(false);
    setSelectedCharId(null);
  };

  const handleNavigate = (newLocId: string) => {
    setVoiceMode(false);
    setSelectedCharId(null);
    setGameState((prev) => (prev ? { ...prev, locationId: newLocId } : prev));
  };

  const handleAdvanceChapter = () => {
    setVoiceMode(false);
    setSelectedCharId(null);
    setGameState((prev) => {
      if (!prev) return prev;
      const next = advanceChapter(prev);
      showNotification(`Chapter: ${CHAPTER_TITLES[next.chapter]}`);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      sendTextMessage(textInput);
      setTextInput("");
    }
  };

  // === TITLE / NAME ENTRY SCREEN ===
  if (!gameState) {
    return (
      <main className="h-screen flex flex-col items-center justify-center p-4 max-w-lg mx-auto gap-6">
        <h1 className="text-4xl font-bold text-[var(--gold)] tracking-wide text-center">
          Hogwarts Adventure
        </h1>
        <p className="text-[var(--text-secondary)] text-center">
          A tale of two young wizards discovering the secrets of Hogwarts
        </p>

        {/* Continue / New Game buttons on initial screen */}
        {setupStep === "name" && hasSavedGame && (
          <div className="w-full flex flex-col gap-3">
            <button
              onClick={handleContinue}
              className="w-full px-6 py-4 bg-[var(--gold)] text-[var(--bg-primary)] font-bold
                         rounded-lg hover:bg-[var(--gold-bright)] transition-all cursor-pointer text-lg"
            >
              Continue Adventure
            </button>
            <button
              onClick={handleNewGame}
              className="w-full px-6 py-3 bg-[var(--bg-secondary)] text-[var(--text-secondary)]
                         magical-border hover:text-[var(--gold)] hover:border-[var(--gold)]
                         transition-all cursor-pointer"
            >
              New Game
            </button>
          </div>
        )}

        {setupStep === "name" && !hasSavedGame && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (nameInput.trim()) setSetupStep("friend");
            }}
            className="w-full flex flex-col gap-4"
          >
            <label className="text-[var(--gold)] text-sm">What is your name, young wizard?</label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Enter your name..."
              autoFocus
              className="w-full px-4 py-3 bg-[var(--bg-secondary)] text-[var(--text-primary)]
                         magical-border outline-none focus:border-[var(--gold)]
                         placeholder:text-[var(--text-secondary)]"
            />
            <button
              type="submit"
              disabled={!nameInput.trim()}
              className="px-6 py-3 bg-[var(--gold)] text-[var(--bg-primary)] font-bold
                         rounded-lg hover:bg-[var(--gold-bright)] transition-all
                         disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              Continue
            </button>
          </form>
        )}

        {setupStep === "friend" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (friendInput.trim()) {
                const newState = createInitialState(nameInput.trim(), friendInput.trim());
                setGameState(newState);
                setSetupStep("done");
              }
            }}
            className="w-full flex flex-col gap-4"
          >
            <label className="text-[var(--gold)] text-sm">
              And your best friend who&apos;s joining you?
            </label>
            <input
              type="text"
              value={friendInput}
              onChange={(e) => setFriendInput(e.target.value)}
              placeholder="Enter your friend's name..."
              autoFocus
              className="w-full px-4 py-3 bg-[var(--bg-secondary)] text-[var(--text-primary)]
                         magical-border outline-none focus:border-[var(--gold)]
                         placeholder:text-[var(--text-secondary)]"
            />
            <button
              type="submit"
              disabled={!friendInput.trim()}
              className="px-6 py-3 bg-[var(--gold)] text-[var(--bg-primary)] font-bold
                         rounded-lg hover:bg-[var(--gold-bright)] transition-all
                         disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              Begin Your Adventure
            </button>
          </form>
        )}
      </main>
    );
  }

  // === MAIN GAME ===
  const ready = canAdvanceChapter(gameState);

  return (
    <main className="h-screen flex flex-col p-4 max-w-4xl mx-auto gap-3">
      {/* Header */}
      <header className="flex items-center justify-between py-2">
        <div>
          <h1 className="text-2xl font-bold text-[var(--gold)] tracking-wide">
            {CHAPTER_TITLES[gameState.chapter]}
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            {gameState.playerName} &amp; {gameState.friendName}
            {gameState.house && (
              <span className="ml-2 text-[var(--gold)]">
                — {gameState.house.charAt(0).toUpperCase() + gameState.house.slice(1)}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInventory(true)}
            className="flex flex-col gap-0.5 text-sm cursor-pointer hover:opacity-80 transition-opacity"
            title="View inventory"
          >
            <div className="flex items-center gap-1">
              <span className="text-xs text-[var(--text-secondary)] w-12 truncate">{gameState.playerName}</span>
              <span className={gameState.inventory.wand ? "opacity-100" : "opacity-20"}>🪄</span>
              <span className={gameState.inventory.pet ? "opacity-100" : "opacity-20"}>{petEmoji(gameState.inventory.pet)}</span>
              <span className={gameState.inventory.books ? "opacity-100" : "opacity-20"}>📚</span>
              {gameState.inventory.food && <span>🍬</span>}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-[var(--text-secondary)] w-12 truncate">{gameState.friendName}</span>
              <span className={gameState.friendInventory.wand ? "opacity-100" : "opacity-20"}>🪄</span>
              <span className={gameState.friendInventory.pet ? "opacity-100" : "opacity-20"}>{petEmoji(gameState.friendInventory.pet)}</span>
              <span className={gameState.friendInventory.books ? "opacity-100" : "opacity-20"}>📚</span>
              {gameState.friendInventory.food && <span>🍬</span>}
            </div>
          </button>
          {gameState.cluesFound.length > 0 && (
            <button
              onClick={() => setShowInventory(true)}
              className="text-lg cursor-pointer hover:opacity-80 transition-opacity"
              title="View clues"
            >
              🔍 {gameState.cluesFound.length}
            </button>
          )}
          <button
            onClick={handleReturnToTitle}
            className="ml-3 px-3 py-1 text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)]
                       rounded hover:text-[var(--gold)] transition-all cursor-pointer magical-border"
            title="Return to title screen"
          >
            Menu
          </button>
        </div>
      </header>

      {/* Inventory panel */}
      {showInventory && (
        <InventoryPanel gameState={gameState} onClose={() => setShowInventory(false)} />
      )}

      {/* Notification */}
      {notification && (
        <div className="text-center py-2 px-4 bg-[var(--gold)]/20 text-[var(--gold)] rounded-lg text-sm animate-pulse-recording">
          {notification}
        </div>
      )}

      {/* Advance chapter */}
      {ready && !voiceMode && (
        <button
          onClick={handleAdvanceChapter}
          className="w-full py-3 bg-[var(--gold)] text-[var(--bg-primary)] font-bold
                     rounded-lg hover:bg-[var(--gold-bright)] transition-all cursor-pointer animate-glow"
        >
          {gameState.chapter === "diagon-alley" && "Head to King\u2019s Cross \u2014 Board the Hogwarts Express \u2192"}
          {gameState.chapter === "hogwarts-express" && "The train has arrived \u2014 Enter Hogwarts \u2192"}
          {gameState.chapter === "sorting" && "Join your house table \u2014 Begin your studies \u2192"}
          {gameState.chapter === "classes" && `You have ${gameState.cluesFound.length} clues \u2014 Something is wrong with the castle. Investigate \u2192`}
          {gameState.chapter === "mystery" && "The Keystone is restored \u2014 Return to the Great Hall \u2192"}
          {gameState.chapter === "epilogue" && "\u2728 The End \u2014 Thank you for playing! \u2728"}
        </button>
      )}

      {/* Location & Characters (hide navigation during voice mode) */}
      {location && !voiceMode && (
        <>
          <GameWorld location={location} onNavigate={handleNavigate} />
          <CharacterSelect
            characters={presentCharacters}
            selectedId={selectedCharId}
            onSelect={handleCharacterSelect}
          />
        </>
      )}

      {/* Active voice conversation banner */}
      {voiceMode && selectedCharacter && (
        <div className="magical-border p-4 bg-[var(--bg-card)] text-center">
          <p className="text-lg text-[var(--gold)]">
            {selectedCharacter.emoji} Speaking with {selectedCharacter.name}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Just talk naturally. The conversation will flow back and forth.
          </p>
        </div>
      )}

      {/* Chat history */}
      <ChatArea
        messages={currentMessages}
        character={selectedCharacter}
        isLoading={isLoading}
      />

      {/* Voice conversation loop (shown when active) */}
      {voiceMode && selectedCharacter && (
        <ConversationLoop
          active={voiceMode}
          onSendMessage={processMessage}
          onEnd={handleEndConversation}
          characterName={selectedCharacter.name}
          characterEmoji={selectedCharacter.emoji}
        />
      )}

      {/* Text input — always visible */}
      <div className="flex items-center gap-3">
        {features.hasWhisper && selectedCharId && !voiceMode && (
          <button
            onClick={() => setVoiceMode(true)}
            className="w-12 h-12 rounded-full flex items-center justify-center
                       bg-[var(--gold)] hover:bg-[var(--gold-bright)] transition-all
                       text-[var(--bg-primary)] text-xl cursor-pointer"
            title="Start voice conversation"
          >
            🎤
          </button>
        )}
        <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={
              selectedCharacter
                ? `Type to ${selectedCharacter.name}...`
                : "Click a character to start talking..."
            }
            disabled={!selectedCharId || isLoading}
            className="flex-1 px-4 py-3 bg-[var(--bg-secondary)] text-[var(--text-primary)]
                       magical-border outline-none focus:border-[var(--gold)]
                       placeholder:text-[var(--text-secondary)] disabled:opacity-30"
          />
          <button
            type="submit"
            disabled={!selectedCharId || !textInput.trim() || isLoading}
            className="px-6 py-3 bg-[var(--gold)] text-[var(--bg-primary)] font-bold
                       rounded-lg hover:bg-[var(--gold-bright)] transition-all
                       disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}
