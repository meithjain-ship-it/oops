import { NextResponse, type NextRequest } from "next/server";
import { isAuthConfigured, readSession, SESSION_COOKIE } from "@/lib/session";

// Tells the page whether sign-in is switched on, and who (if anyone) is signed in.
export async function GET(req: NextRequest) {
  const enabled = isAuthConfigured(process.env);
  const user = enabled ? await readSession(req.cookies.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET!) : null;
  return NextResponse.json({ enabled, user }, { headers: { "cache-control": "no-store" } });
}
