// n8n node "Read answer and plan": checks the AI's answer, then a script (not AI) writes the fix.
const ctx = $("Fetch and scan").first().json;
const notes = [...ctx.notes];

let ai = null;
try {
  const text = $input.first().json.candidates[0].content.parts[0].text;
  ai = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
} catch (e) {
  notes.push("The AI explanation was unavailable this time, so every finding is treated as real. Check them yourself.");
}

const clean = (s, max) => (typeof s === "string" ? maskKeys(s).text.slice(0, max) : undefined);
const byId = {};
if (ai && Array.isArray(ai.findings)) for (const f of ai.findings) if (f && typeof f.id === "string") byId[f.id] = f;

// Anything the AI skipped or got wrong is treated as real: we never hide a finding because of AI.
const findings = ctx.findings.map((f) => {
  const a = byId[f.id] || {};
  return {
    ...f,
    verdict: a.verdict === "false_alarm" ? "false_alarm" : "real",
    severity: ["low", "medium", "high", "critical"].includes(a.severity) ? a.severity : undefined,
    explanation: clean(a.explanation, 400) || "No explanation is available for this one. Treat it as a real key until you check.",
    reason: clean(a.reason, 300),
  };
});

const realIds = findings.filter((f) => f.verdict === "real").map((f) => f.id);
const repoFiles = ctx.files;
const fixFiles = planFixes(repoFiles, realIds, ctx.browserPaths).map((c) => ({
  path: c.path,
  content: c.content,
  sha: (repoFiles.find((f) => f.path === c.path) || {}).sha || null,
}));

if (fixFiles.length) {
  const gi = repoFiles.find((f) => f.path === ".gitignore");
  const newGi = planGitignore(gi ? gi.content : null);
  if (newGi !== null) fixFiles.push({ path: ".gitignore", content: newGi, sha: gi ? gi.sha : null });
}

const steps = ai && Array.isArray(ai.replay_steps) ? ai.replay_steps.filter((s) => typeof s === "string").slice(0, 6).map((s) => clean(s, 220)) : [];
const standardNote =
  "\n\n**Important:** this pull request only changes your code. A key that was already pushed stays in your git history, so revoke or replace it in the provider's dashboard. Review this change and test your app before you merge. OOPS never merges for you.";

return [
  {
    json: {
      repo: ctx.repo,
      site: ctx.site,
      branch: "oops-fix-" + Date.now(),
      findings,
      replaySteps: steps,
      prTitle: clean(ai && ai.pr_title, 100) || "OOPS: remove exposed key from code",
      prBody: (clean(ai && ai.pr_body, 1500) || "OOPS found a secret key written into your code and moved it out.") + standardNote,
      fixFiles,
      notes,
    },
  },
];
