// n8n node "Read answer" (Alert Translator flow): checks the AI's answer has the right shape. If not, the website falls back to its own AI call.
const SEVERITIES = ["low", "medium", "high", "critical"];
const VERDICTS = ["Likely genuine", "Possibly phishing", "Can't tell"];

const resp = $input.first().json;
const text = (resp && resp.candidates && resp.candidates[0] && resp.candidates[0].content && resp.candidates[0].content.parts && resp.candidates[0].content.parts[0] && resp.candidates[0].content.parts[0].text) || "";

let r = null;
const start = text.indexOf("{");
const end = text.lastIndexOf("}");
if (start !== -1 && end !== -1) {
  try {
    r = JSON.parse(text.slice(start, end + 1));
  } catch (e) {
    r = null;
  }
}

const real = r && r.is_it_real;
const ok =
  r &&
  typeof r.headline === "string" &&
  typeof r.what_happened === "string" &&
  typeof r.why_it_matters === "string" &&
  SEVERITIES.includes(r.severity) &&
  real &&
  VERDICTS.includes(real.verdict) &&
  typeof real.why === "string" &&
  Array.isArray(r.fix_steps) &&
  r.fix_steps.length > 0;

if (!ok) return [{ json: { error: "The AI answer was not usable" } }];

return [
  {
    json: {
      headline: r.headline,
      severity: r.severity,
      what_happened: r.what_happened,
      is_it_real: { verdict: real.verdict, why: real.why },
      fix_steps: r.fix_steps.filter((s) => typeof s === "string").slice(0, 6),
      why_it_matters: r.why_it_matters,
    },
  },
];
