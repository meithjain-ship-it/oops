// Shapes of well-known secret keys. Finding keys is done with these exact patterns, never with AI.
export const KEY_PATTERNS: RegExp[] = [
  /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g, // OpenAI and Anthropic style
  /sk_(?:live|test)_[A-Za-z0-9]{16,}/g, // Stripe
  /AKIA[0-9A-Z]{16}/g, // AWS access key
  /gh[pousr]_[A-Za-z0-9]{30,}/g, // GitHub tokens
  /github_pat_[A-Za-z0-9_]{40,}/g, // GitHub fine-grained tokens
  /AIza[0-9A-Za-z_-]{35}/g, // Google API key
];
