// Game chapters in order
export type Chapter =
  | "diagon-alley"
  | "hogwarts-express"
  | "sorting"
  | "classes"
  | "mystery"
  | "epilogue";

export const CHAPTER_ORDER: Chapter[] = [
  "diagon-alley",
  "hogwarts-express",
  "sorting",
  "classes",
  "mystery",
  "epilogue",
];

export const CHAPTER_TITLES: Record<Chapter, string> = {
  "diagon-alley": "Diagon Alley",
  "hogwarts-express": "The Hogwarts Express",
  sorting: "The Sorting Ceremony",
  classes: "First Days at Hogwarts",
  mystery: "The Vanishing Enchantment",
  epilogue: "A New Dawn at Hogwarts",
};

export type House = "gryffindor" | "hufflepuff" | "ravenclaw" | "slytherin";

export interface Inventory {
  wand: string | null; // description of wand, e.g. "Holly, 11 inches, phoenix feather"
  pet: string | null; // description of pet, e.g. "A small tawny owl named Pip"
  books: boolean;
  food: string | null; // what they got from trolley
}

export interface GameState {
  chapter: Chapter;
  locationId: string;
  inventory: Inventory;
  friendInventory: Inventory;
  house: House | null;
  friendHouse: House | null;
  playerName: string;
  friendName: string;
  cluesFound: string[];
  flags: Record<string, boolean>;
  chatHistory: Record<string, Array<{ role: "user" | "assistant"; content: string }>>;
  mysteryComplete: boolean;
}

export function createInitialState(playerName: string, friendName: string): GameState {
  return {
    chapter: "diagon-alley",
    locationId: "diagon-alley-main",
    inventory: {
      wand: null,
      pet: null,
      books: false,
      food: null,
    },
    friendInventory: {
      wand: null,
      pet: null,
      books: false,
      food: null,
    },
    house: null,
    friendHouse: null,
    playerName,
    friendName,
    cluesFound: [],
    flags: {},
    chatHistory: {},
    mysteryComplete: false,
  };
}

// Check if player can advance to next chapter
export function canAdvanceChapter(state: GameState): boolean {
  switch (state.chapter) {
    case "diagon-alley":
      return !!state.inventory.wand && !!state.inventory.pet && state.inventory.books
        && !!state.friendInventory.wand && !!state.friendInventory.pet && state.friendInventory.books;
    case "hogwarts-express":
      // Can advance once they've chatted with the train friend AND got food
      return !!state.inventory.food && (state.chatHistory["train-friend"]?.length ?? 0) >= 2;
    case "sorting":
      return state.house !== null && state.friendHouse !== null;
    case "classes": {
      // Need 3+ clues to begin investigating
      return state.cluesFound.length >= 3;
    }
    case "mystery":
      // Must complete the ritual (talk to the keystone, solve the puzzle)
      return state.mysteryComplete;
    case "epilogue":
      return false; // Final chapter
    default:
      return false;
  }
}

export function advanceChapter(state: GameState): GameState {
  const idx = CHAPTER_ORDER.indexOf(state.chapter);
  if (idx < 0 || idx >= CHAPTER_ORDER.length - 1) return state;

  const nextChapter = CHAPTER_ORDER[idx + 1];
  const nextLocation = getStartingLocation(nextChapter);

  return {
    ...state,
    chapter: nextChapter,
    locationId: nextLocation,
    chatHistory: {}, // fresh conversations for new chapter
  };
}

function getStartingLocation(chapter: Chapter): string {
  switch (chapter) {
    case "diagon-alley":
      return "diagon-alley-main";
    case "hogwarts-express":
      return "train-compartment";
    case "sorting":
      return "great-hall-sorting";
    case "classes":
      return "great-hall";
    case "mystery":
      return "entrance-hall-mystery";
    case "epilogue":
      return "great-hall-epilogue";
    default:
      return "diagon-alley-main";
  }
}

// All mystery clues
export const ALL_CLUES = [
  { id: "clue-portraits", text: "The portraits in the corridors have been going silent — some have emptied completely.", source: "nearly-headless-nick" },
  { id: "clue-wards", text: "The protective wards around the Forbidden Forest are weakening. Creatures wander closer to the castle.", source: "hagrid-prof" },
  { id: "clue-keystone", text: "An old book describes an enchanted keystone placed by the Founders beneath Hogwarts — it powers all the castle's magic.", source: "hermione" },
  { id: "clue-draining", text: "Potion ingredients are losing their magical properties — something is draining ambient magic from the castle.", source: "snape" },
  { id: "clue-convergence", text: "The keystone is hidden where the four house common rooms converge — deep beneath the castle where the foundations meet.", source: "nearly-headless-nick" },
  { id: "clue-ritual", text: "A ritual combining magic from all four houses can restore a weakened keystone.", source: "hermione" },
  { id: "clue-worthy", text: "Dumbledore hinted that the castle itself will guide those who are worthy to what needs protecting.", source: "dumbledore" },
] as const;

export type ClueId = (typeof ALL_CLUES)[number]["id"];
