import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ALERT_SYSTEM_PROMPT } from "./alert";
import { POST } from "../app/api/alert/route";

// ----- the n8n code steps, run here with a pretend n8n (all values are made up) -----
const read = (f: string) => readFileSync(new URL(`../n8n/code/${f}`, import.meta.url), "utf8");
const run = (code: string, input: unknown, extra = "") => new Function("$input", `return (function(){ ${extra}\n${code} })()`)({ first: () => ({ json: input }) });
const fakeKey = ["sk", "-proj-", "FAKEdemoKEY1234567890abcdefFAKE"].join("");
const checkCode = read("core.js") + "\n" + read("a1-check-input.js").replace("CHANGE_ME", "test-secret");

describe("n8n Alert flow: Check input", () => {
  const call = (secret: string, alert: string) => run(checkCode, { headers: { "x-oops-secret": secret }, body: { alert } });

  it("lets the website in and hides keys again", () => {
    const [out] = call("test-secret", `Found ${fakeKey} in your repo`);
    expect(out.json.alert).toContain("[HIDDEN BY OOPS]");
    expect(out.json.alert).not.toContain("FAKEdemoKEY");
    expect(out.json.hiddenKeys).toBe(1);
  });
  it("turns away a wrong password, an empty alert, and a too-long one", () => {
    expect(() => call("wrong", "hello")).toThrow("Not allowed");
    expect(() => call("test-secret", "   ")).toThrow("Empty alert");
    expect(() => call("test-secret", "a".repeat(6001))).toThrow("too long");
  });
});

describe("n8n Alert flow: AI request and answer", () => {
  it("uses exactly the same instructions as the website's own AI call", () => {
    const [out] = run(read("a2-build-ai-request.js"), { alert: "hello" });
    expect(out.json.request.systemInstruction.parts[0].text).toBe(ALERT_SYSTEM_PROMPT);
    expect(out.json.request.contents[0].parts[0].text).toBe("<alert>\nhello\n</alert>");
  });

  const good = { headline: "A key leaked", severity: "high", what_happened: "x", is_it_real: { verdict: "Likely genuine", why: "y" }, fix_steps: ["Revoke it"], why_it_matters: "z" };
  const asGemini = (text: string) => ({ candidates: [{ content: { parts: [{ text }] } }] });
  it("passes a good answer through and rejects bad ones", () => {
    expect(run(read("a3-read-answer.js"), asGemini(JSON.stringify(good)))[0].json.headline).toBe("A key leaked");
    expect(run(read("a3-read-answer.js"), asGemini("not json"))[0].json.error).toBeTruthy();
    expect(run(read("a3-read-answer.js"), asGemini(JSON.stringify({ ...good, severity: "scary" })))[0].json.error).toBeTruthy();
    expect(run(read("a3-read-answer.js"), { error: { message: "503" } })[0].json.error).toBeTruthy(); // Google was busy
  });
});

// ----- the website route: n8n first, direct AI as the backup -----
const ANSWER = { headline: "A key leaked", severity: "high", what_happened: "x", is_it_real: { verdict: "Likely genuine", why: "y" }, fix_steps: ["Revoke it"], why_it_matters: "z" };
const geminiOk = { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(ANSWER) }] } }] }) };
const post = () => POST(new Request("https://oops.test/api/alert", { method: "POST", body: JSON.stringify({ alert: `GitHub found ${fakeKey} in your repo` }) }));

describe("alert route", () => {
  beforeEach(() => {
    vi.stubEnv("N8N_ALERT_WEBHOOK_URL", "https://n8n.test/webhook/oops-alert");
    vi.stubEnv("N8N_SHARED_SECRET", "test-secret");
    vi.stubEnv("GEMINI_API_KEY", "fake-gemini-key");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses n8n when it answers, and never calls the AI directly", async () => {
    const urls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (u: string, o: RequestInit) => {
      urls.push(u);
      expect(String(o.body)).not.toContain("FAKEdemoKEY"); // a full key never leaves the website
      return { ok: true, status: 200, json: async () => ANSWER };
    }));
    const res = await post();
    expect((await res.json()).result.headline).toBe("A key leaked");
    expect(urls).toEqual(["https://n8n.test/webhook/oops-alert"]);
  });

  it.each([
    ["n8n is down (500)", { ok: false, status: 500, json: async () => ({}) }],
    ["n8n says the AI answer was unusable", { ok: true, status: 200, json: async () => ({ error: "The AI answer was not usable" }) }],
  ])("falls back to the direct AI when %s", async (_name, n8nReply) => {
    const urls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (u: string) => {
      urls.push(u);
      return u.includes("n8n.test") ? n8nReply : geminiOk;
    }));
    const res = await post();
    expect(res.status).toBe(200);
    expect((await res.json()).result.headline).toBe("A key leaked");
    expect(urls[0]).toContain("n8n.test");
    expect(urls[1]).toContain("generativelanguage.googleapis.com");
  });

  it("works with no n8n address set (direct AI only)", async () => {
    vi.stubEnv("N8N_ALERT_WEBHOOK_URL", "");
    const urls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (u: string) => { urls.push(u); return geminiOk; }));
    expect((await post()).status).toBe(200);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain("generativelanguage");
  });

  it("gives a friendly error when n8n fails and there is no backup AI key", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    const res = await post();
    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain("couldn't get an explanation");
  });
});
