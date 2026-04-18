/**
 * Map a pet description string to an emoji. Used in header and inventory panel.
 */
export function petEmoji(pet: string | null): string {
  if (!pet) return "🦉";
  const p = pet.toLowerCase();
  if (p.includes("cat") || p.includes("kitten")) return "🐈";
  if (p.includes("toad") || p.includes("frog")) return "🐸";
  if (p.includes("rat") || p.includes("mouse")) return "🐀";
  if (p.includes("snake") || p.includes("serpent")) return "🐍";
  if (p.includes("rabbit") || p.includes("bunny")) return "🐇";
  return "🦉";
}

/**
 * Sanitize user-provided names before interpolating into system prompts.
 * Prevents players from injecting tag syntax ([ITEM:..], [SORT:..], [CLUE:..])
 * that Claude would emit and cause state corruption.
 */
export function sanitizeName(name: string): string {
  return name.replace(/[\[\]]/g, "").trim().substring(0, 40) || "player";
}

/**
 * Fetch with an abort-controller timeout. Returns the Response or throws.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}
