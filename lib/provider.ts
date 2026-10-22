import { ALERT_SYSTEM_PROMPT, askClaude, parseJsonObject } from "./alert";

export type Provider = "claude" | "gemini";

const PLACEHOLDERS = ["", "PASTE_YOUR_ANTHROPIC_KEY_HERE", "PASTE_YOUR_GEMINI_KEY_HERE"];
const isSet = (v: string | undefined) => !!v && !PLACEHOLDERS.includes(v.trim());

// Picks which AI to use. AI_PROVIDER can force one; otherwise the first key that is filled in wins (Claude first).
export function pickProvider(env: Record<string, string | undefined>): { provider: Provider; key: string } | null {
  const forced = env.AI_PROVIDER?.toLowerCase();
  const claude = env.ANTHROPIC_API_KEY;
  const gemini = env.GEMINI_API_KEY;
  if (forced === "gemini" && isSet(gemini)) return { provider: "gemini", key: gemini!.trim() };
  if (forced === "claude" && isSet(claude)) return { provider: "claude", key: claude!.trim() };
  if (forced) return null;
  if (isSet(claude)) return { provider: "claude", key: claude!.trim() };
  if (isSet(gemini)) return { provider: "gemini", key: gemini!.trim() };
  return null;
}

export async function askGemini(maskedText: string, apiKey: string, model: string): Promise<unknown> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: ALERT_SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: `<alert>\n${maskedText}\n</alert>` }] }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 2048 },
    }),
    signal: AbortSignal.timeout(14000),
  });
  if (!res.ok) throw new Error(`Gemini said ${res.status}`);
  const data = await res.json();
  return parseJsonObject(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
}

export async function askAI(maskedText: string, env: Record<string, string | undefined>): Promise<unknown> {
  const chosen = pickProvider(env);
  if (!chosen) throw new Error("NO_KEY");
  if (chosen.provider === "gemini") return askGemini(maskedText, chosen.key, env.GEMINI_MODEL || "gemini-2.5-flash");
  return askClaude(maskedText, chosen.key);
}
