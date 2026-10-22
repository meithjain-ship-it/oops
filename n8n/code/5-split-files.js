// n8n node "One item per file": the next node saves each changed file to the new branch.
const plan = $("Read answer and plan").first().json;
return plan.fixFiles.map((f) => ({
  json: {
    repo: plan.repo,
    branch: plan.branch,
    path: f.path,
    message: "OOPS: remove exposed key from " + f.path,
    contentB64: Buffer.from(f.content, "utf8").toString("base64"),
    sha: f.sha || null,
  },
}));
