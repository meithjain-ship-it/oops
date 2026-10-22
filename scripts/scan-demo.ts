// Try the scanner on a public GitHub repo and a live site. Run: npx tsx scripts/scan-demo.ts owner/repo https://site
// Only public pages are read. Nothing is sent to any AI and no full key is ever printed.
import { scanFiles, type ScanFile } from "../lib/scan";

const [repo, site] = process.argv.slice(2);
const MAX_BYTES = 200_000;

async function getText(url: string): Promise<string | null> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) return null;
  const text = await res.text();
  return text.length > MAX_BYTES ? null : text;
}

async function repoFiles(repo: string): Promise<ScanFile[]> {
  const treeRes = await fetch(`https://api.github.com/repos/${repo}/git/trees/HEAD?recursive=1`, { signal: AbortSignal.timeout(15000) });
  if (!treeRes.ok) throw new Error(`Could not read repo (${treeRes.status})`);
  const tree = (await treeRes.json()) as { tree: { path: string; type: string }[] };
  const paths = tree.tree.filter((t) => t.type === "blob" && !t.path.includes("node_modules/")).map((t) => t.path);
  const files: ScanFile[] = [];
  for (const path of paths) {
    const content = await getText(`https://raw.githubusercontent.com/${repo}/HEAD/${path}`);
    files.push({ path, content: content ?? "" });
  }
  return files;
}

async function siteFiles(site: string): Promise<ScanFile[]> {
  const origin = new URL(site);
  const html = (await getText(site)) ?? "";
  const files: ScanFile[] = [{ path: `site: ${site}`, content: html }];
  for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) {
    const url = new URL(m[1], site);
    if (url.host !== origin.host) continue; // only the site's own code
    files.push({ path: `site: ${url.href}`, content: (await getText(url.href)) ?? "" });
  }
  return files;
}

async function main() {
  const files = [...(repo ? await repoFiles(repo) : []), ...(site ? await siteFiles(site) : [])];
  const findings = scanFiles(files);
  console.log(`Scanned ${files.length} files (${repo ?? "no repo"} + ${site ?? "no site"})`);
  if (findings.length === 0) console.log("RESULT: no exposed keys found");
  for (const f of findings) console.log(`FOUND  ${f.file}:${f.line}  [${f.type}]  ${f.hiddenKey}\n         ${f.context}`);
  if (findings.length) console.log(`RESULT: ${findings.length} possible exposed key(s)`);
}

main().catch((e) => {
  console.error("Scan failed:", e.message);
  process.exit(1);
});
