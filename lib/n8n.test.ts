import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "vitest";
import { KEY_PATTERNS } from "./patterns";

const require = createRequire(import.meta.url);
const core = require("../n8n/code/core.js") as {
  PATTERNS: { name: string; re: RegExp }[];
  maskKeys: (t: string) => { text: string; count: number };
  scanRaw: (f: { path: string; content: string }[]) => { id: string; file: string; line: number; raw: string }[];
  toSafe: (r: unknown[], f: { path: string; content: string }[]) => { id: string; hiddenKey: string; context: string }[];
  planFixes: (f: { path: string; content: string }[], ids: string[], browser: string[]) => { path: string; content: string }[];
  planGitignore: (existing: string | null) => string | null;
};

const FAKE = "sk-" + "proj-" + "FAKEdemoKEY1234567890abcdefFAKE"; // made up

describe("n8n shared logic", () => {
  it("uses exactly the same key patterns as the app", () => {
    expect(core.PATTERNS.map((p) => [p.name, p.re.source, p.re.flags])).toEqual(KEY_PATTERNS.map((p) => [p.name, p.pattern.source, p.pattern.flags]));
  });

  it("the safe findings never contain a full key", () => {
    const files = [{ path: "src/lib/ai.js", content: `// x\nconst apiKey = "${FAKE}";\n` }];
    const raw = core.scanRaw(files);
    expect(raw).toHaveLength(1);
    expect(raw[0]).toMatchObject({ file: "src/lib/ai.js", line: 2 });
    const safe = JSON.stringify(core.toSafe(raw, files));
    expect(safe).not.toContain(FAKE);
    expect(safe).toContain("sk-pro…[HIDDEN BY OOPS]");
  });
});

describe("writing the fix", () => {
  const server = { path: "src/lib/ai.js", content: `const apiKey = "${FAKE}";\n` };
  const idOf = (f: { path: string; content: string }) => core.scanRaw([f])[0].id;

  it("moves a server-side key into a hidden setting and removes the key", () => {
    const [fixed] = core.planFixes([server], [idOf(server)], []);
    expect(fixed.content).toBe("const apiKey = process.env.OPENAI_API_KEY;\n");
    expect(fixed.content).not.toContain(FAKE);
  });

  it("keeps an existing UPPER_CASE name for the setting", () => {
    const f = { path: "a.js", content: `const MY_AI_KEY = "${FAKE}";` };
    expect(core.planFixes([f], [idOf(f)], [])[0].content).toBe("const MY_AI_KEY = process.env.MY_AI_KEY;");
  });

  it("does not use process.env in browser code, and leaves a clear note", () => {
    const f = { path: "app.js", content: `const OPENAI_API_KEY = "${FAKE}";` };
    const [fixed] = core.planFixes([f], [idOf(f)], ["app.js"]);
    expect(fixed.content).not.toContain(FAKE);
    expect(fixed.content).not.toContain("process.env");
    expect(fixed.content).toContain("move this call to your server");
  });

  it("leaves a false alarm untouched", () => {
    expect(core.planFixes([server], [], [])).toEqual([]);
  });

  it("the fixed files contain no detectable key", () => {
    const fixed = core.planFixes([server], [idOf(server)], []);
    expect(core.maskKeys(fixed[0].content).count).toBe(0);
  });

  it("adds .env to .gitignore only when missing", () => {
    expect(core.planGitignore(null)).toBe(".env\n.env.local\n");
    expect(core.planGitignore("node_modules/")).toBe("node_modules/\n.env\n.env.local\n");
    expect(core.planGitignore(".env\n.env.local\n")).toBeNull();
  });
});

describe("the n8n flow file", () => {
  type Node = { name: string; type: string; parameters: { jsCode?: string } };
  let flow: { nodes: Node[]; connections: Record<string, { main: { node: string }[][] }> };

  beforeAll(() => {
    execFileSync("node", ["scripts/build-n8n.mjs"]);
    flow = JSON.parse(readFileSync("n8n/oops-check.workflow.json", "utf8"));
  });

  it("every script in it is valid JavaScript", () => {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    for (const n of flow.nodes.filter((n) => n.type === "n8n-nodes-base.code")) {
      expect(() => new AsyncFunction(n.parameters.jsCode!), n.name).not.toThrow();
    }
  });

  it("every connection points at a node that exists", () => {
    const names = new Set(flow.nodes.map((n) => n.name));
    for (const [from, c] of Object.entries(flow.connections)) {
      expect(names.has(from), from).toBe(true);
      for (const to of c.main.flat()) expect(names.has(to.node), to.node).toBe(true);
    }
  });

  it("contains no key and no credential", () => {
    const text = readFileSync("n8n/oops-check.workflow.json", "utf8");
    expect(core.maskKeys(text).count).toBe(0);
    expect(text).not.toMatch(/"credentials"/);
  });

  it("never merges: no merge call anywhere", () => {
    expect(readFileSync("n8n/oops-check.workflow.json", "utf8")).not.toMatch(/\/merge|"merge"/i);
  });
});
