// n8n node "Fetch and scan": reads the repo's files and the site's page code, then finds keys (plain code, no AI).
const input = $("Check input").first().json;
const repo = input.repo;
const site = input.site;
const tree = $input.first().json; // the GitHub file list from the previous node
const notes = [];

const MAX_BYTES = 200000;
const MAX_FILES = 60;
const BINARY = /\.(png|jpe?g|gif|webp|ico|svg|woff2?|ttf|eot|pdf|zip|gz|mp4|mp3|lock)$/i;

const get = async (url) => {
  try {
    const t = await this.helpers.httpRequest({ method: "GET", url, json: false, headers: { "User-Agent": "oops-check" } });
    return typeof t === "string" ? t : JSON.stringify(t);
  } catch (e) {
    return null;
  }
};

// 1) The repo's files
const blobs = (tree.tree || [])
  .filter((t) => t.type === "blob" && !t.path.includes("node_modules/") && !BINARY.test(t.path) && (t.size || 0) <= MAX_BYTES)
  .slice(0, MAX_FILES);
if (!tree.tree) notes.push("We couldn't read the repo this time.");
const files = (
  await Promise.all(
    blobs.map(async (b) => {
      const content = await get("https://raw.githubusercontent.com/" + repo + "/HEAD/" + b.path);
      return content === null ? null : { path: b.path, content, sha: b.sha };
    }),
  )
).filter(Boolean);

// 2) The live site: its page and the scripts it loads from its own address
const siteFiles = [];
const browserPaths = [];
const html = await get(site);
if (html === null) notes.push("We couldn't open the site this time.");
else {
  siteFiles.push({ path: "site: " + site, content: html });
  // No URL helper in n8n's Code box: a script is read if it starts with "/" or with this site's own address, or is relative.
  const origin = /^https?:\/\/[^\/]+/i.exec(site)[0];
  for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) {
    const src = m[1].split(/[?#]/)[0];
    let href;
    if (/^https?:\/\//i.test(src)) href = src;
    else if (src.startsWith("//")) continue;
    else if (src.startsWith("/")) href = origin + src;
    else href = site + src.replace(/^\.\//, "");
    if (!href.toLowerCase().startsWith(origin.toLowerCase() + "/")) continue;
    const content = await get(href);
    if (content === null) continue;
    siteFiles.push({ path: "site: " + href, content });
    const rel = href.slice(site.length);
    if (files.some((f) => f.path === rel)) browserPaths.push(rel);
  }
}

// 3) Find keys. "findings" is safe to show and to send to AI. Full keys never leave this node.
const all = [...files, ...siteFiles];
const findings = toSafe(scanRaw(all), all);
const scanOk = files.length > 0 && html !== null;

return [{ json: { repo, site, files, browserPaths, findings, notes, scanOk } }];
