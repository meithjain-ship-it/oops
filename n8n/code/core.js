// Plain code shared by the n8n nodes: find keys, hide them, and plan the fix.
// No AI in here. The build script pastes this file at the top of each n8n Code node.

const PATTERNS = [
  { name: "OpenAI / Anthropic", re: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/ },
  { name: "Stripe secret", re: /(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/ },
  { name: "Stripe webhook", re: /whsec_[A-Za-z0-9]{20,}/ },
  { name: "AWS access key", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { name: "GitHub token", re: /gh[pousr]_[A-Za-z0-9]{30,}/ },
  { name: "GitHub fine-grained token", re: /github_pat_[A-Za-z0-9_]{40,}/ },
  { name: "GitLab token", re: /glpat-[A-Za-z0-9_-]{20,}/ },
  { name: "Google API key", re: /AIza[0-9A-Za-z_-]{35}/ },
  { name: "Slack token", re: /xox[abprs]-[A-Za-z0-9-]{10,}/ },
  { name: "SendGrid", re: /SG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/ },
  { name: "Twilio", re: /\bSK[0-9a-f]{32}\b/ },
  { name: "Hugging Face", re: /hf_[A-Za-z0-9]{30,}/ },
  { name: "Groq", re: /gsk_[A-Za-z0-9]{40,}/ },
  { name: "Replicate", re: /r8_[A-Za-z0-9]{30,}/ },
  { name: "npm token", re: /npm_[A-Za-z0-9]{36}/ },
  { name: "Telegram bot", re: /\b\d{8,10}:[A-Za-z0-9_-]{35}\b/ },
  { name: "JWT (Supabase, Firebase, etc.)", re: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: "Private key", re: /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z]+ )?PRIVATE KEY-----/ },
  { name: "Database URL with password", re: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s:@/]+:[^\s@/]+@\S+/ },
  {
    name: 'General: api_key = "long random text"',
    re: /(?<=(?:api[_-]?key|secret|token|passwd|password|auth)[\w-]*["']?\s*[:=]\s*["'])(?=[A-Za-z_\-+/=.]*\d)[A-Za-z0-9_\-+/=.]{16,}(?=["'])/i,
  },
];

function globalRe(re) {
  return new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
}

// "sk-proj-FAKE123..." becomes "sk-pro…[HIDDEN BY OOPS]"
function hideOne(key) {
  return key.slice(0, 6) + "…[HIDDEN BY OOPS]";
}

function maskKeys(text) {
  let out = text;
  let count = 0;
  for (const p of PATTERNS) {
    out = out.replace(globalRe(p.re), (m) => {
      count++;
      return hideOne(m);
    });
  }
  return { text: out, count };
}

const ENV_FILE = /(^|\/)\.env(\.[\w.-]+)?$/i;
const ENV_EXAMPLE = /\.(example|sample|template|dist)$/i;

// Finds keys. The result still holds the full key (raw), so it must NEVER be sent to AI. Use toSafe() for that.
function scanRaw(files) {
  const out = [];
  for (const f of files) {
    if (ENV_FILE.test(f.path) && !ENV_EXAMPLE.test(f.path)) {
      out.push({ file: f.path, line: 1, type: ".env file committed", start: -1, end: -1, raw: "", id: f.path + ":1:.env file committed" });
    }
    const taken = [];
    for (const p of PATTERNS) {
      for (const m of f.content.matchAll(globalRe(p.re))) {
        const start = m.index;
        const end = start + m[0].length;
        if (taken.some(([a, b]) => start < b && end > a)) continue; // a more specific pattern already caught it
        taken.push([start, end]);
        const line = f.content.slice(0, start).split("\n").length;
        out.push({ file: f.path, line, type: p.name, start, end, raw: m[0], id: f.path + ":" + line + ":" + p.name });
      }
    }
  }
  return out;
}

// The version that is safe to show and to send to AI: no full key anywhere.
function toSafe(raw, files) {
  const byPath = {};
  files.forEach((f) => (byPath[f.path] = f.content));
  return raw.map((r) => ({
    id: r.id,
    file: r.file,
    line: r.line,
    type: r.type,
    hiddenKey: r.raw ? hideOne(r.raw) : "(file contents not shown)",
    context: r.raw ? maskKeys((byPath[r.file] || "").split("\n")[r.line - 1] || "").text.trim().slice(0, 160) : "",
  }));
}

const TYPE_ENV = {
  "OpenAI / Anthropic": "OPENAI_API_KEY",
  "Stripe secret": "STRIPE_SECRET_KEY",
  "Stripe webhook": "STRIPE_WEBHOOK_SECRET",
  "AWS access key": "AWS_ACCESS_KEY_ID",
  "GitHub token": "GITHUB_TOKEN",
  "GitHub fine-grained token": "GITHUB_TOKEN",
  "GitLab token": "GITLAB_TOKEN",
  "Google API key": "GOOGLE_API_KEY",
  "Slack token": "SLACK_TOKEN",
  SendGrid: "SENDGRID_API_KEY",
  Twilio: "TWILIO_API_KEY",
  "Hugging Face": "HF_TOKEN",
  Groq: "GROQ_API_KEY",
  Replicate: "REPLICATE_API_TOKEN",
  "npm token": "NPM_TOKEN",
  "Telegram bot": "TELEGRAM_BOT_TOKEN",
};

function envVarName(varName, type) {
  if (varName && /^[A-Z][A-Z0-9_]{2,}$/.test(varName)) return varName;
  return TYPE_ENV[type] || "SECRET_KEY";
}

const CODE_EXT = /\.(js|jsx|mjs|cjs|ts|tsx)$/i;

// Writes the fix. A script does this, not AI. Returns [{ path, content }] for files that changed.
function planFixes(files, realIds, browserPaths) {
  const raw = scanRaw(files).filter((r) => r.start >= 0 && realIds.includes(r.id));
  const changed = [];
  for (const f of files) {
    const mine = raw.filter((r) => r.file === f.path).sort((a, b) => b.start - a.start);
    if (!mine.length) continue;
    let c = f.content;
    const inBrowser = browserPaths.includes(f.path);
    for (const r of mine) {
      let s = r.start;
      let e = r.end;
      const q = c[s - 1];
      if ((q === '"' || q === "'" || q === "`") && c[e] === q) {
        s--;
        e++;
      }
      const lineStart = c.lastIndexOf("\n", s - 1) + 1;
      const nm = c.slice(lineStart, s).match(/([A-Za-z_$][\w$]*)["']?\s*[:=]\s*$/);
      const name = envVarName(nm && nm[1], r.type);
      let rep;
      if (!CODE_EXT.test(f.path)) rep = "YOUR_KEY_GOES_IN_A_HIDDEN_SETTING";
      else if (inBrowser) rep = '"" /* OOPS: move this call to your server and read the key from the environment variable ' + name + ". Never put a key in browser code. */";
      else rep = "process.env." + name;
      c = c.slice(0, s) + rep + c.slice(e);
    }
    changed.push({ path: f.path, content: c });
  }
  return changed;
}

// Makes sure .env files are ignored by git. Returns the new file text, or null if nothing to change.
function planGitignore(existing) {
  const have = (existing || "").split(/\r?\n/).map((l) => l.trim());
  const need = [".env", ".env.local"].filter((x) => !have.includes(x));
  if (!need.length) return null;
  const base = existing ? existing.replace(/\s*$/, "\n") : "";
  return base + need.join("\n") + "\n";
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { PATTERNS, hideOne, maskKeys, scanRaw, toSafe, envVarName, planFixes, planGitignore };
}
