// n8n node "Check input": only our app may call this, and only for our own test repos and sites.
// EDIT these three lines to match your setup.
const SECRET = "CHANGE_ME"; // the same password as N8N_SHARED_SECRET in .env.local
const ALLOWED_REPOS = ["meithjain-ship-it/oops-test-repo", "meithjain-ship-it/oops-clean-repo"];
const ALLOWED_SITE_ORIGINS = ["https://meithjain-ship-it.github.io"];

const item = $input.first().json;
if (item.headers["x-oops-secret"] !== SECRET) throw new Error("Not allowed");

const body = item.body || {};
const repo = String(body.repo || "").trim().toLowerCase();
if (!ALLOWED_REPOS.includes(repo)) throw new Error("That repo is not allowed");

// n8n's Code box has no URL helper, so read the address with a plain pattern.
const m = /^(https?:\/\/[^\/?#]+)(\/[^?#]*)?/i.exec(String(body.site || "").trim());
if (!m) throw new Error("Bad site address");
const origin = m[1].toLowerCase();
const folder = (m[2] || "/").split("/")[1] || "";
if (!ALLOWED_SITE_ORIGINS.includes(origin)) throw new Error("That site is not allowed");
// The site must belong to the repo: https://<user>.github.io/<repo>/
if (folder.toLowerCase() !== repo.split("/")[1]) throw new Error("Site and repo do not match");

return [{ json: { repo, site: origin + "/" + repo.split("/")[1] + "/" } }];
