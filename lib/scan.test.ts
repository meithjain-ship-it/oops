import { describe, expect, it } from "vitest";
import { scanFiles } from "./scan";

const FAKE = "sk-" + "proj-" + "FAKEdemoKEY1234567890abcdefFAKE";

describe("scanning files", () => {
  it("finds a fake key, reports file and line, and never shows the full key", () => {
    const f = scanFiles([{ path: "src/lib/ai.js", content: `// helper\nconst apiKey = "${FAKE}";\n` }]);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ file: "src/lib/ai.js", line: 2, type: "OpenAI / Anthropic" });
    expect(JSON.stringify(f)).not.toContain(FAKE);
    expect(f[0].hiddenKey).toBe("sk-pro…[HIDDEN BY OOPS]");
  });

  it("reports one finding, not two, when two patterns match the same key", () => {
    expect(scanFiles([{ path: "a.js", content: `const apiKey = "${FAKE}";` }])).toHaveLength(1);
  });

  it("finds nothing in a clean file", () => {
    expect(scanFiles([{ path: "app.js", content: "fetch('/api/ask');" }])).toEqual([]);
  });

  it("flags a committed .env file but not .env.example", () => {
    const f = scanFiles([
      { path: ".env", content: "HELLO=world" },
      { path: ".env.example", content: "HELLO=world" },
    ]);
    expect(f.map((x) => x.file)).toEqual([".env"]);
  });
});
