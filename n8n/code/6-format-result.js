// n8n node "Format result": what the OOPS screen receives when keys were found.
const plan = $("Read answer and plan").first().json;
const notes = [...plan.notes];

let prUrl = null;
try {
  const pr = $("Open pull request").first().json;
  if (pr && pr.html_url) prUrl = pr.html_url;
} catch (e) {
  // the pull request step did not run
}
if (plan.fixFiles.length && !prUrl) notes.push("We couldn't open the fix pull request this time.");
if (!plan.fixFiles.length) notes.push("No code changes were made, because nothing needed fixing.");

return [{ json: { clean: false, findings: plan.findings, replaySteps: plan.replaySteps, prUrl, notes } }];
