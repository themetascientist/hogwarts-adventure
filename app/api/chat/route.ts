import Anthropic from "@anthropic-ai/sdk";
import { getCharacter } from "@/lib/characters";
import { getLocation } from "@/lib/locations";
import { NextRequest, NextResponse } from "next/server";
import { GameState, ALL_CLUES } from "@/lib/game-state";

const anthropic = new Anthropic();

const VOICE_INSTRUCTIONS = `CRITICAL RULES:
- You are having a SPOKEN conversation. Your words will be read aloud by text-to-speech.
- Write ONLY the words you would say out loud. Nothing else.
- NEVER use asterisks, stage directions, action descriptions, or narration.
- NEVER describe your body language, facial expressions, or actions.
- NEVER use quotation marks, parenthetical asides, or em-dashes for narration.
- Just speak naturally, as if face to face with someone.
- Keep responses to 1 sentence. Maximum 2 if absolutely necessary. NEVER 3.
- Be concise. Don't repeat what the player said. Don't over-explain.
- React naturally. Ask a short follow-up question when appropriate.`;

function buildGameContext(gameState: GameState): string {
  const parts: string[] = [];

  parts.push(`The student's name is ${gameState.playerName}. They are with their friend ${gameState.friendName}. They are both first-year students.`);

  // Player inventory
  if (gameState.inventory.wand) {
    parts.push(`${gameState.playerName} already has their wand: ${gameState.inventory.wand}.`);
  }
  if (gameState.inventory.pet) {
    parts.push(`${gameState.playerName} already has a pet: ${gameState.inventory.pet}.`);
  }
  if (gameState.inventory.books) {
    parts.push(`${gameState.playerName} already has their textbooks.`);
  }
  if (gameState.inventory.food) {
    parts.push(`On the train, ${gameState.playerName} got: ${gameState.inventory.food}.`);
  }

  // Friend inventory
  const fi = gameState.friendInventory || { wand: null, pet: null, books: false, food: null };
  if (fi.wand) {
    parts.push(`${gameState.friendName} already has their wand: ${fi.wand}.`);
  } else if (gameState.inventory.wand) {
    parts.push(`${gameState.friendName} still needs a wand — offer to help them next.`);
  }
  if (fi.pet) {
    parts.push(`${gameState.friendName} already has a pet: ${fi.pet}.`);
  } else if (gameState.inventory.pet) {
    parts.push(`${gameState.friendName} still needs a pet — offer to help them choose one.`);
  }
  if (fi.books) {
    parts.push(`${gameState.friendName} already has their textbooks.`);
  } else if (gameState.inventory.books) {
    parts.push(`${gameState.friendName} still needs textbooks — get them a set too.`);
  }
  if (fi.food) {
    parts.push(`On the train, ${gameState.friendName} got: ${fi.food}.`);
  } else if (gameState.inventory.food) {
    parts.push(`${gameState.friendName} hasn't gotten any treats yet — offer them some too.`);
  }
  if (gameState.house) {
    parts.push(`${gameState.playerName} was sorted into ${gameState.house.charAt(0).toUpperCase() + gameState.house.slice(1)}.`);
  } else {
    parts.push(`${gameState.playerName} has not been sorted yet.`);
  }
  if (gameState.friendHouse) {
    parts.push(`${gameState.friendName} was sorted into ${gameState.friendHouse.charAt(0).toUpperCase() + gameState.friendHouse.slice(1)}.`);
  } else if (gameState.house) {
    parts.push(`${gameState.friendName} has not been sorted yet — sort them next.`);
  }
  if (gameState.cluesFound.length > 0) {
    const clueTexts = gameState.cluesFound
      .map((id) => ALL_CLUES.find((c) => c.id === id)?.text)
      .filter(Boolean);
    if (clueTexts.length > 0) {
      parts.push(`The student has discovered these clues about what's happening at Hogwarts: ${clueTexts.join(" ")}`);
    }
  }

  return parts.join(" ");
}

export async function POST(request: NextRequest) {
  const { message, characterId, locationId, history, gameState } = await request.json();

  const character = getCharacter(characterId);
  if (!character) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  const location = getLocation(locationId);
  const locationContext = location
    ? `You are currently in: ${location.name}. ${location.description}`
    : "";

  const gameContext = gameState ? buildGameContext(gameState) : "";

  const systemPrompt = `${character.systemPrompt}

${locationContext}

${gameContext}

IMPORTANT: Two players (${gameState?.playerName || "player"} and ${gameState?.friendName || "friend"}) are playing together. When you give a student an item, include the item tag at the END of your response. The tag will be stripped before speaking. You MUST specify which student receives the item by name.
Format: [ITEM:type:recipient:description]
- [ITEM:wand:${gameState?.playerName || "player"}:Holly and phoenix feather, 11 inches]
- [ITEM:pet:${gameState?.friendName || "friend"}:Snowy owl named Artemis]
- [ITEM:books:${gameState?.playerName || "player"}:Standard first-year textbooks]
- [ITEM:food:${gameState?.friendName || "friend"}:Chocolate frogs and pumpkin pasties]
Only include the tag when the item is actually being given/sold/chosen, not when just discussing it. Pay attention to which student is speaking or being addressed.

When sorting a student into a house, include: [SORT:recipient:house] e.g. [SORT:${gameState?.playerName || "player"}:Gryffindor]
Sort each student individually based on the conversation. Both students must be sorted.

${VOICE_INSTRUCTIONS}`;

  // Filter out [GREETING] tags from history so Claude doesn't see them
  const cleanHistory = (history || [])
    .filter((msg: { role: string; content: string }) => msg.content !== "[GREETING]")
    .map((msg: { role: string; content: string }) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

  // Replace [GREETING] with a natural prompt
  const userMessage = message === "[GREETING]"
    ? "Hello!"
    : message;

  const messages = [
    ...cleanHistory,
    { role: "user" as const, content: userMessage },
  ];

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      system: systemPrompt,
      messages,
    });

    const textContent = response.content.find((block) => block.type === "text");
    let text = textContent ? textContent.text : "";

    // Detect game-state changes from the response
    const stateUpdates: Record<string, unknown> = {};

    // Extract item tags: [ITEM:type:recipient:description]
    const itemMatch = text.match(/\[ITEM:(wand|pet|books|food):([^:]+):([^\]]+)\]/);
    if (itemMatch) {
      stateUpdates.itemType = itemMatch[1];
      stateUpdates.itemRecipient = itemMatch[2].trim();
      stateUpdates.itemDescription = itemMatch[3].trim();
      // Strip the tag from spoken text
      text = text.replace(/\[ITEM:[^\]]+\]/, "").trim();
    }

    // Detect sorting: [SORT:recipient:house]
    const sortTagMatch = text.match(/\[SORT:([^:]+):(\w+)\]/);
    if (sortTagMatch) {
      const recipient = sortTagMatch[1].trim();
      const house = sortTagMatch[2].toLowerCase();
      if (["gryffindor", "hufflepuff", "ravenclaw", "slytherin"].includes(house)) {
        stateUpdates.sortRecipient = recipient;
        stateUpdates.house = house;
      }
      text = text.replace(/\[SORT:[^\]]+\]/, "").trim();
    } else {
      // Fallback: detect from spoken text
      const sortMatch = text.match(/I sort you into (\w+)!/i);
      if (sortMatch) {
        const house = sortMatch[1].toLowerCase();
        if (["gryffindor", "hufflepuff", "ravenclaw", "slytherin"].includes(house)) {
          stateUpdates.house = house;
        }
      }
    }

    // Detect clues based on character
    const clueMap: Record<string, string> = {
      "nearly-headless-nick": "clue-ghost",
      snape: "clue-snape",
      hermione: "clue-hermione",
      "hagrid-prof": "clue-hagrid",
      dumbledore: "clue-dumbledore",
      "bookshop-clerk": "clue-library",
      "train-friend": "clue-portraits",
    };
    if (clueMap[characterId] && history && history.length >= 2) {
      stateUpdates.newClue = clueMap[characterId];
    }

    return NextResponse.json({ response: text, characterId, stateUpdates });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
