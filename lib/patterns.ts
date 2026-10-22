// Shapes of well-known secret keys. Finding keys is done with these exact patterns, never with AI.
// Specific providers come first; the general rule at the end catches unknown providers.
export const KEY_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "OpenAI / Anthropic", pattern: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/ },
  { name: "Stripe secret", pattern: /(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/ },
  { name: "Stripe webhook", pattern: /whsec_[A-Za-z0-9]{20,}/ },
  { name: "AWS access key", pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { name: "GitHub token", pattern: /gh[pousr]_[A-Za-z0-9]{30,}/ },
  { name: "GitHub fine-grained token", pattern: /github_pat_[A-Za-z0-9_]{40,}/ },
  { name: "GitLab token", pattern: /glpat-[A-Za-z0-9_-]{20,}/ },
  { name: "Google API key", pattern: /AIza[0-9A-Za-z_-]{35}/ },
  { name: "Slack token", pattern: /xox[abprs]-[A-Za-z0-9-]{10,}/ },
  { name: "SendGrid", pattern: /SG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/ },
  { name: "Twilio", pattern: /\bSK[0-9a-f]{32}\b/ },
  { name: "Hugging Face", pattern: /hf_[A-Za-z0-9]{30,}/ },
  { name: "Groq", pattern: /gsk_[A-Za-z0-9]{40,}/ },
  { name: "Replicate", pattern: /r8_[A-Za-z0-9]{30,}/ },
  { name: "npm token", pattern: /npm_[A-Za-z0-9]{36}/ },
  { name: "Telegram bot", pattern: /\b\d{8,10}:[A-Za-z0-9_-]{35}\b/ },
  { name: "JWT (Supabase, Firebase, etc.)", pattern: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: "Private key", pattern: /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z]+ )?PRIVATE KEY-----/ },
  { name: "Database URL with password", pattern: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s:@/]+:[^\s@/]+@\S+/ },
  {
    name: "General: api_key = \"long random text\"",
    pattern: /(?<=(?:api[_-]?key|secret|token|passwd|password|auth)[\w-]*["']?\s*[:=]\s*["'])(?=[A-Za-z_\-+/=.]*\d)[A-Za-z0-9_\-+/=.]{16,}(?=["'])/i,
  },
];
