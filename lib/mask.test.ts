import { describe, expect, it } from "vitest";
import { prepareAlert } from "./alert";
import { containsKey, maskKeys } from "./mask";
import { validateAlert, validateCheck } from "./validate";

const FAKE_KEY = "sk-proj-FAKE1234567890abcdefFAKE";

describe("hiding keys", () => {
  it("shows the first 6 characters then the hidden label", () => {
    expect(maskKeys(`key is ${FAKE_KEY}`).text).toBe("key is sk-pro…[HIDDEN BY OOPS]");
  });

  it("never leaves a full key behind, for several key types", () => {
    const text = `${FAKE_KEY} AKIAABCDEFGHIJKLMNOP ghp_${"a".repeat(36)} sk_live_${"b".repeat(24)}`;
    const out = maskKeys(text);
    expect(out.count).toBe(4);
    expect(containsKey(out.text)).toBe(false);
  });

  it("leaves normal text alone", () => {
    expect(maskKeys("Your deployment finished.")).toEqual({ text: "Your deployment finished.", count: 0 });
  });

  it("the text sent onward never contains the full key", () => {
    const sent = prepareAlert(`GitHub found ${FAKE_KEY} in your repo`).text;
    expect(sent).not.toContain(FAKE_KEY);
    expect(sent).toContain("[HIDDEN BY OOPS]");
  });
});

describe("input rules", () => {
  it("rejects an empty alert", () => {
    expect(validateAlert("   ").ok).toBe(false);
  });

  it("rejects an empty repo or site", () => {
    expect(validateCheck("", "https://x.com", "me/test", "https://x.com").ok).toBe(false);
    expect(validateCheck("me/test", "", "me/test", "https://x.com").ok).toBe(false);
  });

  it("rejects a repo or site that is not the test one", () => {
    expect(validateCheck("me/other", "https://x.com", "me/test", "https://x.com").ok).toBe(false);
    expect(validateCheck("me/test", "https://evil.com", "me/test", "https://x.com").ok).toBe(false);
  });

  it("accepts the test repo and site written in different ways", () => {
    const r = validateCheck("https://github.com/Me/Test.git", "x.com/", "me/test", "https://x.com");
    expect(r.ok).toBe(true);
  });

  it("never repeats what the user typed", () => {
    const r = validateCheck(FAKE_KEY, "https://x.com", "me/test", "https://x.com");
    expect(JSON.stringify(r)).not.toContain(FAKE_KEY);
  });
});
