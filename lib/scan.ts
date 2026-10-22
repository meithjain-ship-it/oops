import { hideOne, maskKeys } from "./mask";
import { KEY_PATTERNS } from "./patterns";

// Plain code, no AI: finds key-shaped text in files. Output never contains a full key.
export type ScanFile = { path: string; content: string };
export type Finding = {
  file: string;
  line: number;
  type: string;
  hiddenKey: string; // e.g. "sk-pro…[HIDDEN BY OOPS]"
  context: string; // the line the key was on, with keys hidden
};

const ENV_FILE = /(^|\/)\.env(\.[\w.-]+)?$/i;
const ENV_EXAMPLE = /\.(example|sample|template|dist)$/i;

export function scanFiles(files: ScanFile[]): Finding[] {
  const findings: Finding[] = [];
  for (const file of files) {
    // A real .env file in a repo or site is a problem by itself, even before we look inside.
    if (ENV_FILE.test(file.path) && !ENV_EXAMPLE.test(file.path)) {
      findings.push({ file: file.path, line: 1, type: ".env file committed", hiddenKey: "(file contents not shown)", context: "" });
    }
    const lines = file.content.split("\n");
    const taken: [number, number][] = []; // character ranges already reported in this file
    for (const { name, pattern } of KEY_PATTERNS) {
      const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
      for (const m of file.content.matchAll(re)) {
        const start = m.index ?? 0;
        const end = start + m[0].length;
        if (taken.some(([a, b]) => start < b && end > a)) continue; // a more specific pattern already caught it
        taken.push([start, end]);
        const line = file.content.slice(0, start).split("\n").length;
        findings.push({
          file: file.path,
          line,
          type: name,
          hiddenKey: hideOne(m[0]),
          context: maskKeys(lines[line - 1] ?? "").text.trim().slice(0, 160),
        });
      }
    }
  }
  return findings;
}
