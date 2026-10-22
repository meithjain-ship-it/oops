import { NextResponse } from "next/server";
import { cleanAlertResult, prepareAlert, type AlertResult } from "@/lib/alert";
import { maskKeys } from "@/lib/mask";
import { askAI, pickProvider } from "@/lib/provider";
import { validateAlert } from "@/lib/validate";

const safeMessage = (e: unknown) => maskKeys(e instanceof Error ? e.message : String(e)).text;

// The n8n flow does the work when it is connected. Returns null if it can't (so the backup below runs).
async function askN8n(url: string, hiddenText: string): Promise<AlertResult | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-oops-secret": process.env.N8N_SHARED_SECRET ?? "" },
      body: JSON.stringify({ alert: hiddenText }),
      signal: AbortSignal.timeout(14000),
    });
    if (!res.ok) throw new Error(`n8n said ${res.status}`);
    const result = cleanAlertResult(await res.json());
    if (!result) throw new Error("n8n answer had the wrong shape");
    return result;
  } catch (e) {
    // Logged for us, never shown. The backup below keeps the tool working.
    console.error("alert via n8n failed, trying the direct AI:", safeMessage(e));
    return null;
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const input = validateAlert(body?.alert);
  if (!input.ok) return NextResponse.json({ error: input.message }, { status: 400 });

  // Keys are hidden here, before anything leaves our server.
  let hidden;
  try {
    hidden = prepareAlert(input.text);
  } catch {
    return NextResponse.json({ error: "We couldn't hide a key in that text, so we didn't analyse it. Remove the key and try again." }, { status: 400 });
  }

  try {
    let result: AlertResult | null = null;

    const n8nUrl = process.env.N8N_ALERT_WEBHOOK_URL;
    if (n8nUrl) result = await askN8n(n8nUrl, hidden.text);

    // Backup (or the only path if n8n is not connected): ask the AI directly with the already-hidden text.
    if (!result) {
      if (!pickProvider(process.env)) {
        return NextResponse.json(
          { error: n8nUrl ? "We couldn't get an explanation this time. Please try again." : "No AI key yet. Paste a Gemini or Anthropic key into the .env.local file and restart the app." },
          { status: n8nUrl ? 502 : 503 },
        );
      }
      result = cleanAlertResult(await askAI(hidden.text, process.env));
      if (!result) throw new Error("Answer had the wrong shape");
    }
    return NextResponse.json({ result, hiddenKeys: hidden.count });
  } catch (e) {
    // Log why it failed (with any key-shaped text hidden) so problems can be found. Never shown to the user.
    console.error("alert failed:", safeMessage(e));
    return NextResponse.json({ error: "We couldn't get an explanation this time. Please try again." }, { status: 502 });
  }
}
