import { NextResponse, type NextRequest } from "next/server";
import { isAuthConfigured, safeAvatar, SESSION_COOKIE, SESSION_MAX_AGE, signSession, STATE_COOKIE } from "@/lib/session";

// Step 2: GitHub sends the person back here with a one-time code. We swap it for their public profile,
// remember who they are in a signed cookie, and throw GitHub's token away.
export async function GET(req: NextRequest) {
  const back = (reason: string) => {
    const res = NextResponse.redirect(new URL(`/?login=${reason}`, req.nextUrl.origin));
    res.cookies.delete({ name: STATE_COOKIE, path: "/api/auth" });
    return res;
  };

  if (!isAuthConfigured(process.env)) return back("unavailable");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get(STATE_COOKIE)?.value;
  if (!code || !state || !savedState || state !== savedState) return back("failed");

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID!.trim(),
        client_secret: process.env.GITHUB_CLIENT_SECRET!.trim(),
        code,
        redirect_uri: `${req.nextUrl.origin}/api/auth/callback`,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const token = (await tokenRes.json()) as { access_token?: string };
    if (!token.access_token) throw new Error("GitHub gave no token");

    const userRes = await fetch("https://api.github.com/user", {
      headers: { authorization: `Bearer ${token.access_token}`, accept: "application/vnd.github+json", "user-agent": "oops-login" },
      signal: AbortSignal.timeout(10000),
    });
    if (!userRes.ok) throw new Error(`GitHub profile said ${userRes.status}`);
    const gh = (await userRes.json()) as { id?: number; login?: string; name?: string | null; avatar_url?: string };
    if (typeof gh.id !== "number" || !gh.login) throw new Error("GitHub profile was incomplete");

    const cookie = await signSession({ id: gh.id, login: gh.login, name: gh.name ?? null, avatar: safeAvatar(gh.avatar_url) }, process.env.SESSION_SECRET!);
    const res = NextResponse.redirect(new URL("/?login=ok", req.nextUrl.origin));
    res.cookies.set(SESSION_COOKIE, cookie, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_MAX_AGE });
    res.cookies.delete({ name: STATE_COOKIE, path: "/api/auth" });
    return res;
  } catch (e) {
    // Logged for us, never shown to the person. Nothing secret is in this message.
    console.error("sign-in failed:", e instanceof Error ? e.message : String(e));
    return back("failed");
  }
}
