import { ALERT_SYSTEM_PROMPT, askClaude, parseJsonObject } from "./alert";
import { maskKeys } from "./mask";

export type Provider = "claude" | "gemini";
type Choice = { provider: Provider; key: string };

const PLACEHOLDERS = ["", "PASTE_YOUR_ANTHROPIC_KEY_HERE", "PASTE_YOUR_GEMINI_KEY_HERE"];
const isSet = (v: string | undefined) => !!v && !PLACEHOLDERS.includes(v.trim());

// The AIs to try, in order. AI_PROVIDER can force one; otherwise every key that is filled in is used (Claude first).
export function providerOrder(env: Record<string, string | undefined>): Choice[] {
  const claude: Choice[] = isSet(env.ANTHROPIC_API_KEY) ? [{ provider: "claude", key: env.ANTHROPIC_API_KEY!.trim() }] : [];
  const gemini: Choice[] = isSet(env.GEMINI_API_KEY) ? [{ provider: "gemini", key: env.GEMINI_API_KEY!.trim() }] : [];
  const forced = env.AI_PROVIDER?.toLowerCase();
  if (forced === "claude") return claude;
  if (forced === "gemini") return gemini;
  return [...claude, ...gemini];
}

export function pickProvider(env: Record<string, string | undefined>): Choice | null {
  return providerOrder(env)[0] ?? null;
}

export async function askGemini(maskedText: string, apiKey: string, model: string): Promise<unknown> {
  const startedAt = Date.now();
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: ALERT_SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: `<alert>\n${maskedText}\n</alert>` }] }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 2048 },
    }),
    signal: AbortSignal.timeout(10000),
  });
  console.error(`gemini (${model}) answered in ${((Date.now() - startedAt) / 1000).toFixed(1)}s with status ${res.status}`);
  if (!res.ok) throw new Error(`Gemini said ${res.status}: ${maskKeys((await res.text()).slice(0, 300)).text}`);
  const data = await res.json();
  return parseJsonObject(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
}

// Tries each AI that has a key, and moves on to the next one if one fails.
export async function askAI(maskedText: string, env: Record<string, string | undefined>): Promise<unknown> {
  const order = providerOrder(env);
  if (order.length === 0) throw new Error("NO_KEY");
  let lastError: unknown;
  for (const { provider, key } of order) {
    try {
      if (provider === "gemini") {
        // Google's models are sometimes overloaded (503), so other models are tried one after another before giving up.
        const models = [env.GEMINI_MODEL || "gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.6-flash"].filter((m, i, all) => all.indexOf(m) === i);
        let geminiError: unknown;
        for (const model of models) {
          try {
            return await askGemini(maskedText, key, model);
          } catch (e) {
            geminiError = e;
            console.error(`gemini (${model}) failed, trying the next model if there is one`);
          }
        }
        throw geminiError;
      }
      return await askClaude(maskedText, key);
    } catch (e) {
      lastError = e;
      console.error(`${provider} failed, trying the next AI if there is one:`, maskKeys(e instanceof Error ? e.message : String(e)).text);
    }
  }
  throw lastError;
}
