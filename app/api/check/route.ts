import { NextResponse } from "next/server";
import { maskKeys } from "@/lib/mask";
import { validateCheck } from "@/lib/validate";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const input = validateCheck(body?.repo, body?.site, process.env.ALLOWED_REPO ?? "", process.env.ALLOWED_SITE ?? "");
  if (!input.ok) return NextResponse.json({ error: input.message }, { status: 400 });

  const n8nUrl = process.env.N8N_CHECK_WEBHOOK_URL;
  if (!n8nUrl) {
    return NextResponse.json({ error: "The key check isn't connected yet. It needs the n8n flow, which is the next step." }, { status: 503 });
  }

  try {
    const res = await fetch(n8nUrl, {
      method: "POST",
      headers: { "content-type": "application/json", "x-oops-secret": process.env.N8N_SHARED_SECRET ?? "" },
      body: JSON.stringify({ repo: input.repo, site: input.site }),
      signal: AbortSignal.timeout(32000),
    });
    // Last safety net: hide any key-shaped text in the answer before it reaches the screen.
    const safeText = maskKeys(await res.text()).text;
    if (!res.ok) throw new Error(`n8n said ${res.status}: ${safeText.slice(0, 300)}`);
    return NextResponse.json(JSON.parse(safeText));
  } catch (e) {
    // Log why it failed (never shown to the user, and key-shaped text is hidden).
    console.error("check failed:", maskKeys(e instanceof Error ? e.message : String(e)).text);
    return NextResponse.json({ error: "OOPS is having trouble running the check. Please try again." }, { status: 502 });
  }
}
