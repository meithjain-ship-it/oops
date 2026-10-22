import { describe, expect, it } from "vitest";
import { isAuthConfigured, randomState, readSession, safeAvatar, signSession, type SessionUser } from "./session";

// Everything here is made up. The secrets are random-looking filler, not real.
const SECRET = "x".repeat(40);
const OTHER = "y".repeat(40);
const USER: SessionUser = { id: 7, login: "octo-student", name: "Octo Student", avatar: "https://avatars.githubusercontent.com/u/7" };

describe("signed sign-in cookie", () => {
  it("gives back the same person that was signed", async () => {
    const token = await signSession(USER, SECRET);
    expect(await readSession(token, SECRET)).toEqual(USER);
  });

  it("rejects a cookie signed with a different secret", async () => {
    const token = await signSession(USER, SECRET);
    expect(await readSession(token, OTHER)).toBeNull();
  });

  it("rejects a cookie whose content was edited", async () => {
    const token = await signSession(USER, SECRET);
    const [, sig] = token.split(".");
    const forged = btoa(JSON.stringify({ u: { ...USER, login: "someone-else" }, exp: 9999999999 })).replace(/=+$/, "");
    expect(await readSession(`${forged}.${sig}`, SECRET)).toBeNull();
  });

  it("rejects an expired cookie", async () => {
    const token = await signSession(USER, SECRET, Date.now() - 8 * 24 * 3600 * 1000);
    expect(await readSession(token, SECRET)).toBeNull();
  });

  it("rejects empty, broken and weak-secret cases", async () => {
    expect(await readSession(undefined, SECRET)).toBeNull();
    expect(await readSession("", SECRET)).toBeNull();
    expect(await readSession("a.b.c", SECRET)).toBeNull();
    expect(await readSession("not-a-token", SECRET)).toBeNull();
    const token = await signSession(USER, SECRET);
    expect(await readSession(token, "short")).toBeNull();
  });
});

describe("helpers", () => {
  it("only trusts avatars that come from GitHub", () => {
    expect(safeAvatar("https://avatars.githubusercontent.com/u/1")).toContain("avatars.githubusercontent.com");
    expect(safeAvatar("https://evil.example.com/me.png")).toBe("");
    expect(safeAvatar("javascript:alert(1)")).toBe("");
    expect(safeAvatar(undefined)).toBe("");
  });

  it("is only switched on when all three settings are filled in", () => {
    expect(isAuthConfigured({})).toBe(false);
    expect(isAuthConfigured({ GITHUB_CLIENT_ID: "a", GITHUB_CLIENT_SECRET: "b" })).toBe(false);
    expect(isAuthConfigured({ GITHUB_CLIENT_ID: "a", GITHUB_CLIENT_SECRET: "b", SESSION_SECRET: "short" })).toBe(false);
    expect(isAuthConfigured({ GITHUB_CLIENT_ID: "a", GITHUB_CLIENT_SECRET: "b", SESSION_SECRET: SECRET })).toBe(true);
  });

  it("makes a different random state each time", () => {
    expect(randomState()).not.toBe(randomState());
    expect(randomState()).toHaveLength(32);
  });
});
