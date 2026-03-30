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
3. **Sorting Ceremony** — Both players sorted by the Sorting Hat. McGonagall oversees.
4. **First Days at Hogwarts** — Classes with Snape, McGonagall, talks with Dumbledore, Hermione, Hagrid, Nick. Discover clues through conversation.
5. **The Vanishing Enchantment** — Descend through hidden passage to Keystone Chamber. Complete the restoration ritual with the Keystone Guardian.
6. **A New Dawn at Hogwarts** — Epilogue. Dumbledore celebrates, awards house points.

## Advancement Requirements
- Diagon Alley → Express: both players have wand + pet + books
- Express → Sorting: food + 2 train-friend messages
- Sorting → Classes: both players sorted into houses
- Classes → Mystery: 3+ clues discovered
- Mystery → Epilogue: mysteryComplete flag (set by Keystone Guardian after ritual)
- Epilogue: final chapter, no advancement

## Clue System (Content-Driven)
Clues are discovered via `[CLUE:id]` tags that Claude includes in responses when the conversation naturally leads to sharing that knowledge. NOT automatic — players must actually engage with the mystery topic.

| Clue ID | Description | Source Character |
|---------|-------------|-----------------|
| clue-portraits | Portraits going silent/empty | Nearly Headless Nick |
| clue-wards | Forest wards weakening, creatures closer | Hagrid |
| clue-keystone | Founders placed enchanted keystone beneath castle | Hermione |
| clue-draining | Ingredients losing potency, magic being drained | Snape |
| clue-convergence | Keystone where four houses converge beneath castle | Nearly Headless Nick |
| clue-ritual | Four-house ritual can restore keystone | Hermione |
| clue-worthy | Castle guides the worthy to what needs protecting | Dumbledore |

## Characters & Voice IDs (ElevenLabs)
| Character | Voice ID | Chapters |
|-----------|----------|----------|
| Hagrid | VR6AewLTigWG4xSOukaG | Diagon Alley, Classes |
| Ollivander | pNInz6obpgDQGcFmaJgB | Diagon Alley |
| Agnes Flimble (pet shop) | EXAVITQu4vr4xnSDxMaL | Diagon Alley |
| Edgar Flourish (bookshop) | onwK4e9ZLuTAKqWW03F9 | Diagon Alley |
| Pip Ashworth (train friend) | 21m00Tcm4TlvDq8ikWAM | Express |
| Trolley Witch | EXAVITQu4vr4xnSDxMaL | Express |
| Sorting Hat | pNInz6obpgDQGcFmaJgB | Sorting |
| McGonagall | EXAVITQu4vr4xnSDxMaL | Sorting, Classes |
| Dumbledore | pNInz6obpgDQGcFmaJgB | Classes, Mystery, Epilogue |
| Snape | onwK4e9ZLuTAKqWW03F9 | Classes |
| Hermione | 21m00Tcm4TlvDq8ikWAM | Classes |
| Nearly Headless Nick | pNInz6obpgDQGcFmaJgB | Classes, Mystery |
| Keystone Guardian | pNInz6obpgDQGcFmaJgB | Mystery |

## Key Architecture Decisions
- **Voice-first design**: No asterisks or stage directions in AI responses. System prompts include VOICE_INSTRUCTIONS enforcing pure spoken dialogue.
- **VAD-based voice detection** (`@ricky0123/vad-web`): Uses Silero VAD v5 neural network for speech detection instead of manual amplitude thresholds. Config: `baseAssetPath: "/vad/"`, `onnxWASMBasePath: "/vad/"`, `model: "v5"`, `getStream` (not `stream`).
- **Seamless conversation loop** (`ConversationLoop.tsx`): One click to start, natural back-and-forth via VAD `onSpeechEnd` callback, voice interrupt support (just talk to cut off character), one click to end.
- **Voice interrupt**: If user speaks while TTS is playing, audio is paused, in-flight TTS aborted via `AbortController`, and new speech is processed.
- **Whisper hallucination filter**: Rejects common false positives ("buy", "bye", "thanks for watching", etc.), transcripts < 3 chars, and WAV blobs < 2000 bytes.
- **Character greetings**: First time selecting a character, `[GREETING]` tag is sent (filtered from history, converted to "Hello!" for Claude). TTS greeting plays via standalone `Audio` object.
- **Dual inventory**: Both player and friend have separate inventories (wand, pet, books, food). Items assigned by recipient name in `[ITEM:type:recipient:desc]` tag.
- **Dual sorting**: Both players sorted into houses via `[SORT:recipient:house]` tags. Both must be sorted to advance.
- **Content-driven clues**: Characters include `[CLUE:id]` tags when sharing mystery knowledge. Not automatic — requires engaging conversation. Server strips tags before TTS.
- **Mystery resolution**: Keystone Chamber ritual with Founders' voice. `[MYSTERY_COMPLETE]` tag signals completion.
- **Epilogue**: Celebratory feast with Dumbledore awarding house points.
- **Game state saved to localStorage** for persistence across sessions (save/load/clear).
- **Text input always available** alongside voice mode.

## File Structure
```
app/
  page.tsx              — Main game UI, state management, save/load, title screen + game world
  layout.tsx            — Root layout with dark theme
  globals.css           — Tailwind + magical theme CSS variables
  api/
    chat/route.ts       — Claude API, builds system prompt + game context, detects sorting & clues
    speech-to-text/route.ts — Whisper API, rejects <5KB files
    text-to-speech/route.ts — ElevenLabs API
    features/route.ts   — Feature detection (hasWhisper, hasElevenLabs)
components/
  ConversationLoop.tsx  — VAD-based voice loop with interrupt support
  GameWorld.tsx         — Location display + navigation
  CharacterSelect.tsx   — Character selection buttons
  ChatArea.tsx          — Scrollable message history (filters [GREETING] messages)
  InventoryPanel.tsx    — Modal showing both players' items + discovered clues
  VoiceButton.tsx       — Legacy click-to-toggle (fallback)
lib/
  characters.ts         — 16 characters with system prompts, voice IDs, and clue tags
  locations.ts          — 16 locations across 6 chapters (includes mystery chamber + epilogue)
  game-state.ts         — GameState type, 6 chapters, dual inventory/houses, 7 clues, mysteryComplete flag
public/
  vad/                  — VAD assets: silero_vad_v5.onnx, worklet JS, ONNX runtime WASM + MJS files
```

## Known Issues & Past Fixes
- ElevenLabs requires `eleven_flash_v2_5` model (old `eleven_monolingual_v1` is deprecated)
- ElevenLabs library voices require paid plan (user upgraded to Starter)
- Whisper hallucination on silence → filtered with word list + size checks
- Voice interrupt deadlock (busyRef) → replaced entire approach with `@ricky0123/vad-web` library
- VAD `modelURL`/`workletURL` don't exist in current API → use `baseAssetPath` + `onnxWASMBasePath` + `model`
- VAD `stream` option doesn't exist → use `getStream` (async function returning MediaStream)
- ONNX runtime needs `.mjs` files in public/vad/ alongside `.wasm` files (404 without them)
- Preview sandbox blocks getUserMedia → user must open localhost:3000 directly
- Next.js 16 requires `turbopack: {}` in next.config.ts (not webpack config)

## Deployment
- **GitHub**: https://github.com/themetascientist/hogwarts-adventure (user: themetascientist)
- **Vercel**: https://hogwarts-adventure.vercel.app/ — auto-deploys on push to main
- **Env vars**: Must be set in Vercel project settings (ANTHROPIC_API_KEY, OPENAI_API_KEY, ELEVENLABS_API_KEY)
- To force redeploy: Vercel dashboard → Deployments → ... menu → Redeploy

## Dev Server
`npm run dev` on port 3000. Launch config in `.claude/launch.json`.
