import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanAlertResult, prepareAlert } from "./alert";
import { askAI } from "./provider";

// Everything here is MADE UP. No real AI is called: fetch is replaced by a pretend server.
const FAKE_AI_KEY = "FAKE-test-key-not-real-0000";
const FAKE_SECRET = "sk-" + "proj-" + "aB3dE5fG7hJ9kL2m".repeat(2);

const ANSWER = {
  headline: "A key was exposed",
  severity: "high",
  what_happened: "A key was found in a public place.",
  is_it_real: { verdict: "Likely genuine", why: "It matches how GitHub words these alerts." },
  fix_steps: ["Revoke the key in the provider's dashboard.", "Create a new key."],
  why_it_matters: "Strangers could use your key and you would pay.",
};

function pretendServer(wrap: (text: string) => unknown) {
  const calls: { url: string; headers: Record<string, string>; body: string }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: { headers: Record<string, string>; body: string }) => {
      calls.push({ url, headers: init.headers, body: init.body });
      return { ok: true, status: 200, json: async () => wrap(JSON.stringify(ANSWER)) };
    }),
  );
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe("Gemini path", () => {
  it("sends only hidden text, uses the key header, and the answer is accepted", async () => {
    const calls = pretendServer((text) => ({ candidates: [{ content: { parts: [{ text }] } }] }));
    const hidden = prepareAlert(`GitHub found ${FAKE_SECRET} in your repo`).text;
    const raw = await askAI(hidden, { GEMINI_API_KEY: FAKE_AI_KEY });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("generativelanguage.googleapis.com");
    expect(calls[0].headers["x-goog-api-key"]).toBe(FAKE_AI_KEY);
    expect(calls[0].body).not.toContain(FAKE_SECRET);
    expect(calls[0].body).toContain("[HIDDEN BY OOPS]");
    expect(cleanAlertResult(raw)?.headline).toBe("A key was exposed");
  });
});

describe("Claude path", () => {
  it("sends only hidden text, uses the key header, and the answer is accepted", async () => {
    const calls = pretendServer((text) => ({ content: [{ text }] }));
    const hidden = prepareAlert(`GitHub found ${FAKE_SECRET} in your repo`).text;
    const raw = await askAI(hidden, { ANTHROPIC_API_KEY: FAKE_AI_KEY });

    expect(calls[0].url).toContain("api.anthropic.com");
    expect(calls[0].headers["x-api-key"]).toBe(FAKE_AI_KEY);
    expect(calls[0].body).not.toContain(FAKE_SECRET);
    expect(cleanAlertResult(raw)?.severity).toBe("high");
  });
});

describe("falling back", () => {
  it("tries Gemini when Claude fails, if both keys are set", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(url);
        if (url.includes("api.anthropic.com")) return { ok: false, status: 500, text: async () => "server error" };
        return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(ANSWER) }] } }] }) };
      }),
    );
    const raw = await askAI("hello", { GEMINI_API_KEY: FAKE_AI_KEY, ANTHROPIC_API_KEY: FAKE_AI_KEY });
    expect(cleanAlertResult(raw)?.headline).toBe("A key was exposed");
    expect(calls[0]).toContain("api.anthropic.com"); // Claude is tried first
    expect(calls[1]).toContain("generativelanguage"); // then Gemini
  });

  it("gives up with an error when the only AI fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, text: async () => "server error" })));
    await expect(askAI("hello", { GEMINI_API_KEY: FAKE_AI_KEY })).rejects.toThrow("Gemini said 500");
  });
});

describe("no key set", () => {
  it("stops without calling any AI", async () => {
    const calls = pretendServer((text) => ({ content: [{ text }] }));
    await expect(askAI("hello", {})).rejects.toThrow("NO_KEY");
    expect(calls).toHaveLength(0);
  });
});
