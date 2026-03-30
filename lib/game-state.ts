// Game chapters in order
export type Chapter =
  | "diagon-alley"
  | "hogwarts-express"
  | "sorting"
  | "classes"
  | "mystery";

export const CHAPTER_ORDER: Chapter[] = [
  "diagon-alley",
  "hogwarts-express",
  "sorting",
  "classes",
  "mystery",
];

export const CHAPTER_TITLES: Record<Chapter, string> = {
  "diagon-alley": "Diagon Alley",
  "hogwarts-express": "The Hogwarts Express",
  sorting: "The Sorting Ceremony",
  classes: "First Days at Hogwarts",
  mystery: "The Vanishing Enchantment",
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
      // Can advance once they've talked to at least 2 professors and found at least 1 clue
      const professorsTalkedTo = ["snape", "mcgonagall-prof", "hermione", "hagrid-prof", "dumbledore", "nearly-headless-nick"]
        .filter((id) => (state.chatHistory[id]?.length ?? 0) >= 2);
      return professorsTalkedTo.length >= 2 && state.cluesFound.length >= 1;
    }
    case "mystery":
      return state.cluesFound.length >= 5;
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
      return "great-hall";
    default:
      return "diagon-alley-main";
  }
}

// All mystery clues
export const ALL_CLUES = [
  { id: "clue-portraits", text: "The portraits in the corridors have been going silent — some have emptied completely." },
  { id: "clue-hagrid", text: "Hagrid mentioned the protective wards around the Forbidden Forest are weakening." },
  { id: "clue-library", text: "An old book mentions the Founders placed an enchanted keystone beneath the castle to power its protections." },
  { id: "clue-snape", text: "Snape noticed potion ingredients losing their magical properties — something is draining ambient magic." },
  { id: "clue-ghost", text: "Nearly Headless Nick remembers the keystone being hidden where the four house common rooms converge." },
  { id: "clue-hermione", text: "Hermione found a reference to a ritual that can restore a weakened keystone using combined house magic." },
  { id: "clue-dumbledore", text: "Dumbledore hinted that the castle itself will guide those who are worthy to what needs protecting." },
] as const;

export type ClueId = (typeof ALL_CLUES)[number]["id"];
