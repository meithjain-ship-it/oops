// "Sign in with GitHub" support, with no database and no extra packages.
// The signed-in person is remembered in one HttpOnly cookie that only our server can create (HMAC-SHA256 signature).
// We keep only their public GitHub name and photo. GitHub's access token is thrown away right after sign-in.

export type SessionUser = { id: number; login: string; name: string | null; avatar: string };

export const SESSION_COOKIE = "oops_session";
export const STATE_COOKIE = "oops_state";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
export const MIN_SECRET_LENGTH = 32;

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(text: string): Uint8Array | null {
  try {
    const s = text.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (text.length % 4)) % 4);
    return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

function hmacKey(secret: string, usage: "sign" | "verify") {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}

// Only ever show a picture that really comes from GitHub.
export function safeAvatar(url: unknown): string {
  return typeof url === "string" && /^https:\/\/avatars\.githubusercontent\.com\//.test(url) ? url : "";
}

export function isAuthConfigured(env: Record<string, string | undefined>): boolean {
  return !!env.GITHUB_CLIENT_ID?.trim() && !!env.GITHUB_CLIENT_SECRET?.trim() && (env.SESSION_SECRET?.length ?? 0) >= MIN_SECRET_LENGTH;
}

export async function signSession(user: SessionUser, secret: string, now = Date.now()): Promise<string> {
  const body = toB64url(enc.encode(JSON.stringify({ u: user, exp: Math.floor(now / 1000) + SESSION_MAX_AGE })));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret, "sign"), enc.encode(body));
  return `${body}.${toB64url(new Uint8Array(sig))}`;
}

export async function readSession(token: string | undefined, secret: string, now = Date.now()): Promise<SessionUser | null> {
  if (!token || secret.length < MIN_SECRET_LENGTH) return null;
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined) return null;
  const sigBytes = fromB64url(sig);
  if (!sigBytes) return null;
  // crypto.subtle.verify compares in constant time.
  const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret, "verify"), sigBytes as BufferSource, enc.encode(body));
  if (!ok) return null;
  const raw = fromB64url(body);
  if (!raw) return null;
  try {
    const data = JSON.parse(dec.decode(raw)) as { u?: Partial<SessionUser>; exp?: number };
    if (typeof data.exp !== "number" || data.exp * 1000 < now) return null;
    const u = data.u;
    if (!u || typeof u.id !== "number" || typeof u.login !== "string" || !u.login) return null;
    return { id: u.id, login: u.login, name: typeof u.name === "string" ? u.name : null, avatar: safeAvatar(u.avatar) };
  } catch {
    return null;
  }
}

export function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
