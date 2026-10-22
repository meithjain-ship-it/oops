import { KEY_PATTERNS } from "./patterns";

export const HIDDEN = "[HIDDEN BY OOPS]";

// "sk-proj-FAKE123..." becomes "sk-pro…[HIDDEN BY OOPS]"
function hideOne(key: string): string {
  return key.slice(0, 6) + "…" + HIDDEN;
}

function globalOf(p: RegExp): RegExp {
  return new RegExp(p.source, p.flags.includes("g") ? p.flags : p.flags + "g");
}

export function maskKeys(text: string): { text: string; count: number } {
  let count = 0;
  let out = text;
  for (const { pattern } of KEY_PATTERNS) {
    out = out.replace(globalOf(pattern), (match) => {
      count++;
      return hideOne(match);
    });
  }
  return { text: out, count };
}

export function containsKey(text: string): boolean {
  return KEY_PATTERNS.some(({ pattern }) => new RegExp(pattern.source, pattern.flags.replace("g", "")).test(text));
}

// Names of the key types found in the text (used for tests and reports).
export function keyTypesIn(text: string): string[] {
  return KEY_PATTERNS.filter(({ pattern }) => new RegExp(pattern.source, pattern.flags.replace("g", "")).test(text)).map((k) => k.name);
}
