import { describe, expect, it } from "vitest";
import { pickProvider } from "./provider";

describe("choosing the AI", () => {
  it("uses Gemini when only a Gemini key is set", () => {
    expect(pickProvider({ GEMINI_API_KEY: "g-test-key" })?.provider).toBe("gemini");
  });

  it("uses Claude when only an Anthropic key is set", () => {
    expect(pickProvider({ ANTHROPIC_API_KEY: "a-test-key" })?.provider).toBe("claude");
  });

  it("prefers Claude when both are set, unless AI_PROVIDER says otherwise", () => {
    const env = { ANTHROPIC_API_KEY: "a-test-key", GEMINI_API_KEY: "g-test-key" };
    expect(pickProvider(env)?.provider).toBe("claude");
    expect(pickProvider({ ...env, AI_PROVIDER: "gemini" })?.provider).toBe("gemini");
  });

  it("ignores placeholders and empty values", () => {
    expect(pickProvider({ ANTHROPIC_API_KEY: "PASTE_YOUR_ANTHROPIC_KEY_HERE", GEMINI_API_KEY: "" })).toBeNull();
    expect(pickProvider({})).toBeNull();
  });

  it("returns nothing if the forced AI has no key", () => {
    expect(pickProvider({ AI_PROVIDER: "claude", GEMINI_API_KEY: "g-test-key" })).toBeNull();
  });
});
