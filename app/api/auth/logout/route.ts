import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

// POST only, so another website can't sign someone out by embedding a link.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete({ name: SESSION_COOKIE, path: "/" });
  return res;
}
