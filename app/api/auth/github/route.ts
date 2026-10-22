import { NextResponse, type NextRequest } from "next/server";
import { isAuthConfigured, randomState, STATE_COOKIE } from "@/lib/session";

// Step 1 of "Sign in with GitHub": send the person to GitHub, with a random "state" we check when they come back.
export async function GET(req: NextRequest) {
  if (!isAuthConfigured(process.env)) return NextResponse.redirect(new URL("/?login=unavailable", req.nextUrl.origin));

  const state = randomState();
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID!.trim());
  url.searchParams.set("redirect_uri", `${req.nextUrl.origin}/api/auth/callback`);
  url.searchParams.set("state", state);
  // No scopes: OOPS only learns the public profile (name and photo). It gets no access to any repo.

  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/auth", maxAge: 600 });
  return res;
}
