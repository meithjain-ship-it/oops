// n8n node "Clean result": no keys found. The badge is a fixed rule, never AI. It shows the date and never says "safe".
const ctx = $("Fetch and scan").first().json;
const notes = [...ctx.notes];

// If we could not read the repo or the site, we did not really check, so no badge.
if (!ctx.scanOk) {
  notes.push("We couldn't read everything we needed, so no badge was given. Please try again.");
  return [{ json: { clean: false, findings: [], notes } }];
}
return [{ json: { clean: true, checkedOn: new Date().toISOString().slice(0, 10), findings: [], notes } }];
