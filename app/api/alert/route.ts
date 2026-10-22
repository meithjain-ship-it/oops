import { NextResponse } from "next/server";
import { askClaude, cleanAlertResult, prepareAlert } from "@/lib/alert";
import { validateAlert } from "@/lib/validate";

const PLACEHOLDER = "PASTE_YOUR_ANTHROPIC_KEY_HERE";

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
    const n8nUrl = process.env.N8N_ALERT_WEBHOOK_URL;
    let raw: unknown;
    if (n8nUrl) {
      const res = await fetch(n8nUrl, {
        method: "POST",
        headers: { "content-type": "application/json", "x-oops-secret": process.env.N8N_SHARED_SECRET ?? "" },
        body: JSON.stringify({ alert: hidden.text }),
        signal: AbortSignal.timeout(14000),
      });
      if (!res.ok) throw new Error(`n8n said ${res.status}`);
      raw = await res.json();
    } else {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key || key === PLACEHOLDER) {
        return NextResponse.json({ error: "No API key yet. Paste your Anthropic key into the .env.local file and restart the app." }, { status: 503 });
      }
      raw = await askClaude(hidden.text, key);
    }
    const result = cleanAlertResult(raw);
    if (!result) throw new Error("Answer had the wrong shape");
    return NextResponse.json({ result, hiddenKeys: hidden.count });
  } catch {
    return NextResponse.json({ error: "We couldn't get an explanation this time. Please try again." }, { status: 502 });
  }
}
