import { Chapter } from "./game-state";

export interface Location {
  id: string;
  name: string;
  emoji: string;
  description: string;
  characterIds: string[];
  connectedTo: string[];
  chapter: Chapter;
}

export const locations: Record<string, Location> = {
  // === DIAGON ALLEY ===
  "diagon-alley-main": {
    id: "diagon-alley-main",
    name: "Diagon Alley",
    emoji: "🏘️",
    description:
      "A bustling cobblestone street packed with witches and wizards. Shop signs creak in the breeze, cauldrons are stacked outside the apothecary, and owls hoot from every direction.",
    characterIds: ["hagrid-guide"],
    connectedTo: ["ollivanders", "magical-menagerie", "flourish-and-blotts"],
    chapter: "diagon-alley",
  },
  ollivanders: {
    id: "ollivanders",
    name: "Ollivanders Wand Shop",
    emoji: "🪄",
    description:
      "A narrow, dusty shop crammed floor to ceiling with thousands of narrow boxes. The air hums faintly with magic. A single wand rests on a faded velvet cushion in the window.",
    characterIds: ["ollivander"],
    connectedTo: ["diagon-alley-main"],
    chapter: "diagon-alley",
  },
  "magical-menagerie": {
    id: "magical-menagerie",
    name: "Magical Menagerie",
    emoji: "🦉",
    description:
      "A noisy, colorful shop full of every magical creature imaginable. Owls ruffle their feathers, cats weave between your legs, toads croak from glass tanks, and something furry purrs from a high shelf.",
    characterIds: ["pet-shop-owner"],
    connectedTo: ["diagon-alley-main"],
    chapter: "diagon-alley",
  },
  "flourish-and-blotts": {
    id: "flourish-and-blotts",
    name: "Flourish and Blotts",
    emoji: "📖",
    description:
      "A towering bookshop with shelves that stretch upward forever. Books flutter, whisper, and occasionally snap at passersby. A stack of first-year textbooks sits near the entrance.",
    characterIds: ["bookshop-clerk"],
    connectedTo: ["diagon-alley-main"],
    chapter: "diagon-alley",
  },

  // === HOGWARTS EXPRESS ===
  "train-compartment": {
    id: "train-compartment",
    name: "Train Compartment",
    emoji: "🚂",
    description:
      "A cozy compartment on the Hogwarts Express. Rain streaks across the window as green countryside rolls by. Your trunk is stowed overhead.",
    characterIds: ["train-friend"],
    connectedTo: ["train-corridor"],
    chapter: "hogwarts-express",
  },
  "train-corridor": {
    id: "train-corridor",
    name: "Train Corridor",
    emoji: "🚃",
    description:
      "The narrow corridor sways gently. Students peek out from compartment doors and a delicious smell wafts from up ahead.",
    characterIds: ["trolley-witch"],
    connectedTo: ["train-compartment"],
    chapter: "hogwarts-express",
  },

  // === SORTING ===
  "great-hall-sorting": {
    id: "great-hall-sorting",
    name: "The Great Hall",
    emoji: "🏰",
    description:
      "The enchanted ceiling mirrors a starlit sky. Thousands of floating candles illuminate four long house tables. At the front, a weathered old hat sits on a stool. Every eye in the hall is on the first-years.",
    characterIds: ["sorting-hat", "mcgonagall"],
    connectedTo: [],
    chapter: "sorting",
  },

  // === CLASSES & HOGWARTS ===
  "great-hall": {
    id: "great-hall",
    name: "The Great Hall",
    emoji: "🏰",
    description:
      "The Great Hall buzzes with breakfast chatter. Owls swoop in delivering morning post, plates refill themselves, and house banners hang from the enchanted ceiling.",
    characterIds: ["dumbledore"],
    connectedTo: ["entrance-hall"],
    chapter: "classes",
  },
  "entrance-hall": {
    id: "entrance-hall",
    name: "Entrance Hall",
    emoji: "🚪",
    description:
      "The vast stone entrance hall with its grand marble staircase. Suits of armor line the walls and the hourglasses tracking house points glitter nearby.",
    characterIds: ["nearly-headless-nick"],
    connectedTo: [
      "great-hall",
      "potions-classroom",
      "transfiguration-classroom",
      "library",
      "grounds",
    ],
    chapter: "classes",
  },
  "potions-classroom": {
    id: "potions-classroom",
    name: "Potions Classroom",
    emoji: "⚗️",
    description:
      "A cold, dimly lit dungeon classroom. Jars of pickled creatures line the walls and a faint green haze hangs in the air. Cauldrons sit at every workstation.",
    characterIds: ["snape"],
    connectedTo: ["entrance-hall"],
    chapter: "classes",
  },
  "transfiguration-classroom": {
    id: "transfiguration-classroom",
    name: "Transfiguration Classroom",
    emoji: "🔮",
    description:
      "A bright, orderly classroom with high windows. A cage of mice on the front desk waits to be turned into snuffboxes. Everything is precise and proper.",
    characterIds: ["mcgonagall-prof"],
    connectedTo: ["entrance-hall"],
    chapter: "classes",
  },
  library: {
    id: "library",
    name: "The Library",
    emoji: "📚",
    description:
      "Towering shelves of ancient books stretch into shadow. A few students study quietly, but the Restricted Section draws your eye — a velvet rope and a warning sign mark its entrance.",
    characterIds: ["hermione"],
    connectedTo: ["entrance-hall"],
    chapter: "classes",
  },
  grounds: {
    id: "grounds",
    name: "The Grounds",
    emoji: "🌳",
    description:
      "The sprawling Hogwarts grounds under a grey sky. Hagrid's hut sits at the edge of the Forbidden Forest, smoke curling from its chimney. The Black Lake glitters in the distance.",
    characterIds: ["hagrid-prof"],
    connectedTo: ["entrance-hall"],
    chapter: "classes",
  },

  // === MYSTERY CHAPTER ===
  "entrance-hall-mystery": {
    id: "entrance-hall-mystery",
    name: "Entrance Hall",
    emoji: "🚪",
    description:
      "The entrance hall feels different tonight. The torches flicker weakly, and the suits of armor seem to lean toward a shadowy passage behind the marble staircase you've never noticed before.",
    characterIds: ["nearly-headless-nick-mystery"],
    connectedTo: ["hidden-passage"],
    chapter: "mystery",
  },
  "hidden-passage": {
    id: "hidden-passage",
    name: "The Hidden Passage",
    emoji: "🕳️",
    description:
      "A narrow spiraling staircase descends into darkness beneath the castle. The walls are carved with the symbols of all four Hogwarts houses. The air grows warmer as you go deeper.",
    characterIds: ["dumbledore-mystery"],
    connectedTo: ["entrance-hall-mystery", "keystone-chamber"],
    chapter: "mystery",
  },
  "keystone-chamber": {
    id: "keystone-chamber",
    name: "The Keystone Chamber",
    emoji: "💎",
    description:
      "A vast underground chamber where four stone archways meet, each carved with a house crest. In the center, a cracked crystal keystone pulses with fading golden light. The air hums with ancient, weakening magic.",
    characterIds: ["keystone-guardian"],
    connectedTo: ["hidden-passage"],
    chapter: "mystery",
  },

  // === EPILOGUE ===
  "great-hall-epilogue": {
    id: "great-hall-epilogue",
    name: "The Great Hall",
    emoji: "🏰",
    description:
      "The Great Hall is alive with celebration. The enchanted ceiling blazes with stars, the house banners ripple in a magical breeze, and every portrait on the walls is cheering and applauding.",
    characterIds: ["dumbledore-epilogue"],
    connectedTo: [],
    chapter: "epilogue",
  },
};

export function getLocation(id: string): Location | undefined {
  return locations[id];
}

export function getLocationList(): Location[] {
  return Object.values(locations);
}

export function getLocationsForChapter(chapter: Chapter): Location[] {
  return Object.values(locations).filter((loc) => loc.chapter === chapter);
}
