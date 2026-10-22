import { KEY_PATTERNS } from "./patterns";

export const HIDDEN = "[HIDDEN BY OOPS]";

// "sk-proj-FAKE123..." becomes "sk-pro…[HIDDEN BY OOPS]"
function hideOne(key: string): string {
  return key.slice(0, 6) + "…" + HIDDEN;
}

export function maskKeys(text: string): { text: string; count: number } {
  let count = 0;
  let out = text;
  for (const pattern of KEY_PATTERNS) {
    out = out.replace(new RegExp(pattern.source, "g"), (match) => {
      count++;
      return hideOne(match);
    });
  }
  return { text: out, count };
}

export function containsKey(text: string): boolean {
  return KEY_PATTERNS.some((pattern) => new RegExp(pattern.source).test(text));
}
