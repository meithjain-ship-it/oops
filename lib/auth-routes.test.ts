import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as start } from "../app/api/auth/github/route";
import { GET as callback } from "../app/api/auth/callback/route";
import { GET as me } from "../app/api/auth/me/route";
import { POST as logout } from "../app/api/auth/logout/route";
import { readSession, SESSION_COOKIE, STATE_COOKIE } from "./session";

// A pretend GitHub. Every value here is made up.
const SECRET = "s".repeat(40);
const ORIGIN = "https://oops.test";
const req = (path: string, cookies = "") => new NextRequest(`${ORIGIN}${path}`, { headers: cookies ? { cookie: cookies } : {} });
const cookieOf = (res: Response, name: string) => (res.headers.get("set-cookie") ?? "").match(new RegExp(`${name}=([^;]*)`))?.[1];

beforeEach(() => {
  vi.stubEnv("GITHUB_CLIENT_ID", "fake-client-id");
  vi.stubEnv("GITHUB_CLIENT_SECRET", "fake-client-secret");
  vi.stubEnv("SESSION_SECRET", SECRET);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("sign-in is off until it is set up", () => {
  it("sends people home with a message and says it is disabled", async () => {
    vi.stubEnv("GITHUB_CLIENT_ID", "");
    const res = await start(req("/api/auth/github"));
    expect(res.headers.get("location")).toBe(`${ORIGIN}/?login=unavailable`);
    expect(await (await me(req("/api/auth/me"))).json()).toEqual({ enabled: false, user: null });
  });
});

describe("sign-in flow", () => {
  it("starts by sending the person to GitHub with a random state and no repo permissions", async () => {
    const res = await start(req("/api/auth/github"));
    const to = new URL(res.headers.get("location")!);
    expect(to.origin + to.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(to.searchParams.get("client_id")).toBe("fake-client-id");
    expect(to.searchParams.get("redirect_uri")).toBe(`${ORIGIN}/api/auth/callback`);
    expect(to.searchParams.get("scope")).toBeNull();
    expect(to.searchParams.get("state")).toBe(cookieOf(res, STATE_COOKIE));
    expect(res.headers.get("set-cookie")).toMatch(/HttpOnly/i);
  });

  it("rejects a callback whose state does not match (someone else's link)", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await callback(req("/api/auth/callback?code=abc&state=forged", `${STATE_COOKIE}=real`));
    expect(res.headers.get("location")).toBe(`${ORIGIN}/?login=failed`);
    expect(fetchSpy).not.toHaveBeenCalled(); // GitHub is never even contacted
  });

  it("signs the person in, keeps only their public profile, and never stores GitHub's token", async () => {
    const fetchSpy = vi.fn(async (url: string) => {
      if (url.includes("access_token")) return { json: async () => ({ access_token: "fake-token-123" }) };
      return { ok: true, json: async () => ({ id: 42, login: "octo-student", name: "Octo", avatar_url: "https://avatars.githubusercontent.com/u/42", email: "private@example.com" }) };
    });
    vi.stubGlobal("fetch", fetchSpy);

    const res = await callback(req("/api/auth/callback?code=abc&state=ok-state", `${STATE_COOKIE}=ok-state`));
    expect(res.headers.get("location")).toBe(`${ORIGIN}/?login=ok`);

    const cookie = cookieOf(res, SESSION_COOKIE)!;
    expect(cookie).toBeTruthy();
    expect(res.headers.get("set-cookie")).toMatch(/HttpOnly/i);
    expect(cookie).not.toContain("fake-token-123");
    const user = await readSession(decodeURIComponent(cookie), SECRET);
    expect(user).toEqual({ id: 42, login: "octo-student", name: "Octo", avatar: "https://avatars.githubusercontent.com/u/42" });
    expect(JSON.stringify(user)).not.toContain("private@example.com");

    // The page can now see who is signed in.
    const who = await (await me(req("/api/auth/me", `${SESSION_COOKIE}=${cookie}`))).json();
    expect(who.user.login).toBe("octo-student");
  });

  it("fails politely when GitHub says no", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({ error: "bad_verification_code" }) })));
    const res = await callback(req("/api/auth/callback?code=abc&state=s", `${STATE_COOKIE}=s`));
    expect(res.headers.get("location")).toBe(`${ORIGIN}/?login=failed`);
    expect(res.headers.get("set-cookie") ?? "").not.toContain(`${SESSION_COOKIE}=`);
  });

  it("signs out by clearing the cookie", async () => {
    const res = await logout();
    expect(res.headers.get("set-cookie")).toMatch(new RegExp(`${SESSION_COOKIE}=;`));
  });

  it("ignores a forged sign-in cookie", async () => {
    const who = await (await me(req("/api/auth/me", `${SESSION_COOKIE}=forged.value`))).json();
    expect(who).toEqual({ enabled: true, user: null });
  });
});
