import { describe, expect, it } from "vitest";
import { containsKey, keyTypesIn, maskKeys } from "./mask";

// Every key below is MADE UP and built from pieces, so no real-looking key sits in the code.
const fill = (n: number, chars = "aB3dE5fG7hJ9kL2m") => chars.repeat(Math.ceil(n / chars.length)).slice(0, n);

const FAKES: Record<string, string> = {
  "OpenAI / Anthropic": "sk-" + "proj-" + fill(30),
  "Stripe secret": "sk_" + "live_" + fill(24, "aB3dE5fG7hJ9"),
  "Stripe webhook": "whsec" + "_" + fill(32),
  "AWS access key": "AKI" + "A" + fill(16, "ABCDEFGH23456789"),
  "GitHub token": "gh" + "p_" + fill(36),
  "GitHub fine-grained token": "github_" + "pat_" + fill(50),
  "GitLab token": "glpat" + "-" + fill(24),
  "Google API key": "AI" + "za" + fill(35),
  "Slack token": "xo" + "xb-" + fill(24, "1234567890"),
  SendGrid: "S" + "G." + fill(22) + "." + fill(30),
  Twilio: "S" + "K" + fill(32, "0123456789abcdef"),
  "Hugging Face": "hf" + "_" + fill(34),
  Groq: "gs" + "k_" + fill(52),
  Replicate: "r8" + "_" + fill(36),
  "npm token": "npm" + "_" + fill(36),
  "Telegram bot": "1234567890" + ":" + fill(35),
  "JWT (Supabase, Firebase, etc.)": "ey" + "J" + fill(20) + "." + "ey" + "J" + fill(30) + "." + fill(30),
  "Private key": "-----BEGIN " + "PRIVATE KEY-----\n" + fill(60) + "\n-----END " + "PRIVATE KEY-----",
  "Database URL with password": "postgres" + "://admin:" + fill(14) + "@db.example.com:5432/app",
};

describe("detects many key types", () => {
  for (const [type, key] of Object.entries(FAKES)) {
    it(`finds and hides: ${type}`, () => {
      const text = `config value is ${key} end`;
      expect(keyTypesIn(text)).toContain(type);
      const out = maskKeys(text);
      expect(out.count).toBeGreaterThan(0);
      expect(out.text).not.toContain(key);
      expect(containsKey(out.text)).toBe(false);
    });
  }
});

describe("general rule for unknown providers", () => {
  it("hides a long random value assigned to an api_key", () => {
    const value = fill(32, "Zx9Qm4Rt7Wk2");
    const out = maskKeys(`const apiKey = "${value}";`);
    expect(out.text).not.toContain(value);
    expect(out.text).toContain("apiKey");
    expect(out.count).toBe(1);
  });

  it("works for secrets and passwords too", () => {
    const out = maskKeys(`SECRET_TOKEN: '${fill(24, "Zx9Qm4Rt7Wk2")}'`);
    expect(containsKey(out.text)).toBe(false);
    expect(out.count).toBe(1);
  });
});

describe("does not cry wolf on normal text", () => {
  it("leaves everyday sentences alone", () => {
    const text = "Your token expires soon. Please reset your password. The API is fast.";
    expect(maskKeys(text)).toEqual({ text, count: 0 });
  });

  it("leaves short values alone", () => {
    const text = `const apiKey = "abc123";`;
    expect(maskKeys(text).count).toBe(0);
  });
});
