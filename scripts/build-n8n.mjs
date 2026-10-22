// Builds n8n/oops-check.workflow.json from the scripts in n8n/code/. Run: node scripts/build-n8n.mjs
// The file it writes contains no secrets: you pick the credentials inside n8n.
import { readFileSync, writeFileSync } from "node:fs";

const dir = new URL("../n8n/code/", import.meta.url);
const read = (f) => readFileSync(new URL(f, dir), "utf8");
const core = read("core.js");
const withCore = (f) => core + "\n// ---- this node ----\n" + read(f);

const GITHUB_HEADERS = {
  parameters: [
    { name: "Accept", value: "application/vnd.github+json" },
    { name: "User-Agent", value: "oops-check" },
    { name: "X-GitHub-Api-Version", value: "2022-11-28" },
  ],
};
// Google's models are sometimes overloaded (503). The model is picked at random on every try, so a retry
// usually lands on a free one. (An "=" at the start tells n8n this is an expression.)
const GEMINI_URL = "=https://generativelanguage.googleapis.com/v1beta/models/{{ ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.5-flash'][Math.floor(Math.random() * 3)] }}:generateContent";
const PLAN = "$('Read answer and plan').first().json";

const code = (name, jsCode, position) => ({
  parameters: { jsCode },
  name,
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position,
});

const ifNode = (name, left, position) => ({
  parameters: {
    conditions: {
      options: { caseSensitive: true, leftValue: "", typeValidation: "strict" },
      conditions: [{ id: name.toLowerCase().replace(/\W+/g, "-"), leftValue: left, rightValue: 0, operator: { type: "number", operation: "gt" } }],
      combinator: "and",
    },
    options: {},
  },
  name,
  type: "n8n-nodes-base.if",
  typeVersion: 2,
  position,
});

const github = (name, method, url, body, position, { batch, ...extra } = {}) => ({
  parameters: {
    method,
    url,
    authentication: "genericCredentialType",
    genericAuthType: "httpHeaderAuth", // pick your "GitHub token" credential here inside n8n
    sendHeaders: true,
    headerParameters: GITHUB_HEADERS,
    ...(body ? { sendBody: true, specifyBody: "json", jsonBody: body } : {}),
    options: { timeout: 15000, ...(batch ? { batching: { batch } } : {}) },
  },
  name,
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 4.2,
  position,
  onError: "continueRegularOutput",
  ...extra,
});

const respond = (name, position) => ({
  parameters: { respondWith: "firstIncomingItem", options: {} },
  name,
  type: "n8n-nodes-base.respondToWebhook",
  typeVersion: 1.1,
  position,
});

const nodes = [
  { parameters: { httpMethod: "POST", path: "oops-check", responseMode: "responseNode", options: {} }, name: "Webhook", type: "n8n-nodes-base.webhook", typeVersion: 2, position: [0, 0] },
  code("Check input", read("1-check-input.js"), [220, 0]),
  github("Get repo files", "GET", "=https://api.github.com/repos/{{ $json.repo }}/git/trees/HEAD?recursive=1", null, [440, 0]),
  code("Fetch and scan", withCore("2-fetch-and-scan.js"), [660, 0]),
  ifNode("Any keys found?", "={{ $json.findings.length }}", [880, 0]),

  code("Build AI request", read("3-build-ai-request.js"), [1100, -120]),
  {
    parameters: {
      method: "POST",
      url: GEMINI_URL,
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth", // pick your "Gemini key" credential here inside n8n (header name: x-goog-api-key)
      sendBody: true,
      specifyBody: "json",
      jsonBody: "={{ JSON.stringify($json.request) }}",
      options: { timeout: 13000 },
    },
    name: "Ask Gemini",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [1320, -120],
    // Google's answer is sometimes slow: give up after 13s and try once more, so the whole check stays under about 30s.
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 500,
    onError: "continueRegularOutput",
  },
  code("Read answer and plan", withCore("4-read-answer-and-plan.js"), [1540, -120]),
  ifNode("Anything to fix?", "={{ $json.fixFiles.length }}", [1760, -120]),

  github("Get main branch", "GET", `=https://api.github.com/repos/{{ ${PLAN}.repo }}/git/ref/heads/main`, null, [1980, -240]),
  github(
    "Create branch",
    "POST",
    `=https://api.github.com/repos/{{ ${PLAN}.repo }}/git/refs`,
    `={{ JSON.stringify({ ref: 'refs/heads/' + ${PLAN}.branch, sha: $json.object.sha }) }}`,
    [2200, -240],
  ),
  code("One item per file", read("5-split-files.js"), [2420, -240]),
  github(
    "Save file",
    "PUT",
    "=https://api.github.com/repos/{{ $json.repo }}/contents/{{ $json.path }}",
    "={{ JSON.stringify({ message: $json.message, content: $json.contentB64, branch: $json.branch, sha: $json.sha || undefined }) }}",
    [2640, -240],
    // GitHub takes one commit per branch at a time, so save the files one by one (parallel saves failed with 409).
    { batch: { batchSize: 1, batchInterval: 1000 } },
  ),
  github(
    "Open pull request",
    "POST",
    `=https://api.github.com/repos/{{ ${PLAN}.repo }}/pulls`,
    `={{ JSON.stringify({ title: ${PLAN}.prTitle, head: ${PLAN}.branch, base: 'main', body: ${PLAN}.prBody }) }}`,
    [2860, -240],
    { executeOnce: true },
  ),
  code("Format result", read("6-format-result.js"), [3080, -120]),
  respond("Reply", [3300, -120]),

  code("Clean result", read("7-clean-result.js"), [1100, 140]),
  respond("Reply (clean)", [1320, 140]),
];

const link = (to) => [[{ node: to, type: "main", index: 0 }]];
const connections = {
  Webhook: { main: link("Check input") },
  "Check input": { main: link("Get repo files") },
  "Get repo files": { main: link("Fetch and scan") },
  "Fetch and scan": { main: link("Any keys found?") },
  "Any keys found?": { main: [[{ node: "Build AI request", type: "main", index: 0 }], [{ node: "Clean result", type: "main", index: 0 }]] },
  "Build AI request": { main: link("Ask Gemini") },
  "Ask Gemini": { main: link("Read answer and plan") },
  "Read answer and plan": { main: link("Anything to fix?") },
  "Anything to fix?": { main: [[{ node: "Get main branch", type: "main", index: 0 }], [{ node: "Format result", type: "main", index: 0 }]] },
  "Get main branch": { main: link("Create branch") },
  "Create branch": { main: link("One item per file") },
  "One item per file": { main: link("Save file") },
  "Save file": { main: link("Open pull request") },
  "Open pull request": { main: link("Format result") },
  "Format result": { main: link("Reply") },
  "Clean result": { main: link("Reply (clean)") },
};

const workflow = { name: "OOPS Key Check", nodes, connections, settings: {} };
writeFileSync(new URL("../n8n/oops-check.workflow.json", import.meta.url), JSON.stringify(workflow, null, 2) + "\n");
console.log(`Wrote n8n/oops-check.workflow.json with ${nodes.length} nodes`);

// ---------------------------------------------------------------------------
// The Alert Translator flow: n8n/oops-alert.workflow.json
// ---------------------------------------------------------------------------
const alertNodes = [
  { parameters: { httpMethod: "POST", path: "oops-alert", responseMode: "responseNode", options: {} }, name: "Webhook", type: "n8n-nodes-base.webhook", typeVersion: 2, position: [0, 0] },
  code("Check input", withCore("a1-check-input.js"), [220, 0]),
  code("Build AI request", read("a2-build-ai-request.js"), [440, 0]),
  {
    parameters: {
      method: "POST",
      url: GEMINI_URL,
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth", // pick your "Gemini key" credential here inside n8n (header name: x-goog-api-key)
      sendBody: true,
      specifyBody: "json",
      jsonBody: "={{ JSON.stringify($json.request) }}",
      options: { timeout: 12000 },
    },
    name: "Ask Gemini",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [660, 0],
    // If Google is busy, try once more. If it still fails, the website uses its own AI call as a backup.
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 500,
    onError: "continueRegularOutput",
  },
  code("Read answer", read("a3-read-answer.js"), [880, 0]),
  respond("Reply", [1100, 0]),
];
const alertConnections = {
  Webhook: { main: link("Check input") },
  "Check input": { main: link("Build AI request") },
  "Build AI request": { main: link("Ask Gemini") },
  "Ask Gemini": { main: link("Read answer") },
  "Read answer": { main: link("Reply") },
};
const alertWorkflow = { name: "OOPS Alert Translator", nodes: alertNodes, connections: alertConnections, settings: {} };
writeFileSync(new URL("../n8n/oops-alert.workflow.json", import.meta.url), JSON.stringify(alertWorkflow, null, 2) + "\n");
console.log(`Wrote n8n/oops-alert.workflow.json with ${alertNodes.length} nodes`);
