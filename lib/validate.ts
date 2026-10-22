// Input rules. Messages are friendly and never repeat what the user typed (it might contain a key).

export function normalizeRepo(input: string): string | null {
  const s = input.trim().replace(/\.git$/, "");
  const url = s.match(/^https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+)/i);
  if (url) return `${url[1]}/${url[2]}`.toLowerCase();
  const short = s.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (short) return s.toLowerCase();
  return null;
}

export function normalizeSite(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return url.origin.toLowerCase();
  } catch {
    return null;
  }
}

export type CheckInput = { ok: true; repo: string; site: string } | { ok: false; message: string };

export function validateCheck(repoIn: unknown, siteIn: unknown, allowedRepo: string, allowedSite: string): CheckInput {
  if (typeof repoIn !== "string" || !repoIn.trim()) return { ok: false, message: "Please enter a GitHub repo link." };
  if (typeof siteIn !== "string" || !siteIn.trim()) return { ok: false, message: "Please enter your site's web address." };
  // ALLOWED_REPO and ALLOWED_SITE can each list several values, separated by commas.
  const allowedRepos = allowedRepo.split(",").map(normalizeRepo).filter((r): r is string => !!r);
  const allowedSites = allowedSite.split(",").map(normalizeSite).filter((s): s is string => !!s);
  if (allowedRepos.length === 0 || allowedSites.length === 0) {
    return { ok: false, message: "The key check isn't switched on yet. Please try again soon." };
  }
  const repo = normalizeRepo(repoIn);
  const site = normalizeSite(siteIn);
  if (!repo || !site || !allowedRepos.includes(repo) || !allowedSites.includes(site)) {
    return { ok: false, message: "For now OOPS can only check our own test repos and test sites. Please use those links." };
  }
  // Keep the full web address (with its folder) for sites that live under a path, like GitHub Pages.
  const fullSite = siteIn.trim().replace(/^(?!https?:\/\/)/i, "https://");
  return { ok: true, repo, site: fullSite };
}

export const MAX_ALERT_LENGTH = 6000;

export type AlertInput = { ok: true; text: string } | { ok: false; message: string };

export function validateAlert(alertIn: unknown): AlertInput {
  if (typeof alertIn !== "string" || !alertIn.trim()) return { ok: false, message: "Please paste an alert first." };
  if (alertIn.length > MAX_ALERT_LENGTH) {
    return { ok: false, message: "That's too long. Paste just the alert text (under 6,000 characters)." };
  }
  return { ok: true, text: alertIn.trim() };
}
