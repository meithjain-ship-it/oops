// n8n node "Check input" (Alert Translator flow): only our app may call this, and keys are hidden again as a second safety check.
// EDIT this line: the same password as N8N_SHARED_SECRET in .env.local (type it between the quotes, don't press Enter).
const SECRET = "CHANGE_ME";

const item = $input.first().json;
if (item.headers["x-oops-secret"] !== SECRET) throw new Error("Not allowed");

const text = String((item.body || {}).alert || "").trim();
if (!text) throw new Error("Empty alert");
if (text.length > 6000) throw new Error("Alert too long");

// The app already hid keys. Hide again (it changes nothing if they are hidden) and refuse if anything key-shaped is left.
const masked = maskKeys(text);
if (PATTERNS.some((p) => p.re.test(masked.text))) throw new Error("A key could not be hidden");

return [{ json: { alert: masked.text, hiddenKeys: masked.count } }];
