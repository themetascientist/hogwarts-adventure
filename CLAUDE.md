# Harry Potter Voice Chat Adventure Game

## Project Overview
Interactive Harry Potter adventure game where players voice-chat with AI characters. Each character has a distinct personality and voice (ElevenLabs TTS). The player and their best friend explore a story arc from Diagon Alley to solving an original mystery at Hogwarts.

## Tech Stack
- **Frontend**: Next.js (App Router), React, TypeScript, Tailwind CSS
- **AI Dialogue**: Claude API (`@anthropic-ai/sdk`) — character personalities via system prompts, model: `claude-sonnet-4-20250514`
- **Speech-to-Text**: OpenAI Whisper API (`whisper-1`)
- **Text-to-Speech**: ElevenLabs API (`eleven_flash_v2_5` model)
- **Styling**: Tailwind CSS with magical dark theme (CSS variables in globals.css)

## API Keys
All three keys are configured in `.env.local`:
- `ANTHROPIC_API_KEY` — Claude for character dialogue
- `OPENAI_API_KEY` — Whisper for speech-to-text
- `ELEVENLABS_API_KEY` — ElevenLabs for character voices (user has ElevenCreative Starter paid plan)

## Story Arc / Chapters
1. **Diagon Alley** — Shop for wand (Ollivander), pet (Magical Menagerie), books (Flourish & Blotts). Hagrid guides.
2. **Hogwarts Express** — Meet Pip Ashworth (train friend), buy food from Trolley Witch.
3. **Sorting Ceremony** — Sorted by the Sorting Hat (detection phrase: "I sort you into [HOUSE]!"). McGonagall oversees.
4. **First Days at Hogwarts** — Classes with Snape, McGonagall, talks with Dumbledore, Hermione, Hagrid, Nick. Discover clues.
5. **The Vanishing Enchantment** — Solve the mystery: the Founders' keystone beneath the castle is weakening, draining Hogwarts' magic. Need 5+ clues to complete.

## Advancement Requirements
- Diagon Alley → Express: wand + pet + books
- Express → Sorting: food + 2 train-friend messages
- Sorting → Classes: house assigned
- Classes → Mystery: 2+ professor chats + 1 clue
- Mystery complete: 5+ clues found

## Characters & Voice IDs (ElevenLabs)
| Character | Voice ID | Chapters |
|-----------|----------|----------|
| Hagrid | VR6AewLTigWG4xSOukaG | Diagon Alley, Hogwarts |
| Ollivander | pNInz6obpgDQGcFmaJgB | Diagon Alley |
| Agnes Flimble (pet shop) | EXAVITQu4vr4xnSDxMaL | Diagon Alley |
| Edgar Flourish (bookshop) | onwK4e9ZLuTAKqWW03F9 | Diagon Alley |
| Pip Ashworth (train friend) | 21m00Tcm4TlvDq8ikWAM | Express |
| Trolley Witch | EXAVITQu4vr4xnSDxMaL | Express |
| Sorting Hat | pNInz6obpgDQGcFmaJgB | Sorting |
| McGonagall | EXAVITQu4vr4xnSDxMaL | Sorting, Classes |
| Dumbledore | pNInz6obpgDQGcFmaJgB | Classes |
| Snape | onwK4e9ZLuTAKqWW03F9 | Classes |
| Hermione | 21m00Tcm4TlvDq8ikWAM | Classes |
| Nearly Headless Nick | pNInz6obpgDQGcFmaJgB | Classes |

## Key Architecture Decisions
- **Voice-first design**: No asterisks or stage directions in AI responses. System prompts include VOICE_INSTRUCTIONS enforcing pure spoken dialogue.
- **Seamless conversation loop** (`ConversationLoop.tsx`): One click to start, natural back-and-forth with auto-listen after silence detection, voice interrupt support (just talk to cut off character), one click to end.
- **Persistent mic stream**: `getUserMedia()` called once, stream reused for all recording cycles (avoids browser throttling).
- **Cycle ID system**: Each `startListening()` call gets a unique cycle ID; stale cycles from interrupted flows are ignored (replaced the old `busyRef` approach that caused deadlocks).
- **Ambient noise calibration**: 300ms baseline sampling before speech detection. Threshold = max(18, baseline + 10).
- **Speaker bleed calibration**: 500ms baseline during playback for interrupt detection. Threshold = max(15, baseline + 12), needs 5 consecutive frames.
- **200ms settling delay after interrupt** before re-listening (prevents speaker bleed from corrupting next calibration).
- **Whisper hallucination filter**: Rejects common false positives ("buy", "bye", "thanks for watching", etc.) and transcripts < 3 chars.
- **Game state saved to localStorage** for persistence across sessions.

## File Structure
```
app/
  page.tsx              — Main game UI, state management, two screens (name entry + game world)
  layout.tsx            — Root layout with dark theme
  globals.css           — Tailwind + magical theme CSS variables
  api/
    chat/route.ts       — Claude API, builds system prompt + game context, detects sorting & clues
    speech-to-text/route.ts — Whisper API, rejects <5KB files
    text-to-speech/route.ts — ElevenLabs API
    features/route.ts   — Feature detection (hasWhisper, hasElevenLabs)
components/
  ConversationLoop.tsx  — Seamless voice loop with interrupt support
  GameWorld.tsx         — Location display + navigation
  CharacterSelect.tsx   — Character selection buttons
  ChatArea.tsx          — Scrollable message history
  VoiceButton.tsx       — Legacy click-to-toggle (fallback)
lib/
  characters.ts         — 13 characters with system prompts and voice IDs
  locations.ts          — Chapter-based locations with connections
  game-state.ts         — GameState type, chapter progression, inventory, clues
```

## Known Issues & Past Fixes
- ElevenLabs requires `eleven_flash_v2_5` model (old `eleven_monolingual_v1` is deprecated)
- ElevenLabs library voices require paid plan (user upgraded to Starter)
- Whisper hallucination on silence → filtered with word list + size checks
- Mic re-acquisition throttled by browser → solved with persistent stream
- Voice interrupt deadlock (busyRef) → solved with cycle ID system
- Preview sandbox blocks getUserMedia → user must open localhost:3000 directly

## Dev Server
`npm run dev` on port 3000. Launch config in `.claude/launch.json`.
