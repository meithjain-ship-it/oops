"use client";

import { useState } from "react";
import type { AlertResult } from "@/lib/alert";
import { maskKeys } from "@/lib/mask";

// Both samples are FAKE. The key below is made up.
const SAMPLES = {
  github:
    "Subject: [GitHub] Secret detected in acme/my-first-app\n\nGitHub found an OpenAI API key (sk-proj-FAKE1234567890abcdefFAKE) in a commit pushed to acme/my-first-app. The key is publicly visible. Please revoke it and create a new one.",
  vercel:
    "Subject: [Vercel] Action required on your deployment\n\nWe noticed unusual activity on your project 'my-store'. A new environment variable was added from an unknown location. If this wasn't you, click here to secure your account: http://vercel-secure-login.example.com/verify",
};

const verdictClass = (v: string) => (/phish/i.test(v) ? "phishing" : /genuine/i.test(v) ? "real" : "unsure");

export default function AlertPanel() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AlertResult | null>(null);
  const [hiddenKeys, setHiddenKeys] = useState(0);
  const [copied, setCopied] = useState(false);

  // Count what is really in the box, so the number always matches what the user sees.
  const hiddenInBox = (text.match(/\[HIDDEN BY OOPS\]/g) ?? []).length;

  // Keys are hidden the moment they land in the box, so a full key never stays on screen or leaves the browser.
  function setMasked(raw: string) {
    setText(maskKeys(raw).text);
  }

  async function explain() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/alert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ alert: text }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong. Please try again.");
      else {
        setResult(data.result);
        setHiddenKeys(data.hiddenKeys ?? 0);
      }
    } catch {
      setError("Couldn't reach OOPS. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copySteps() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.fix_steps.map((s, i) => `${i + 1}. ${s}`).join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // copying is only a convenience
    }
  }

  return (
    <section className="panel" aria-labelledby="alert-title">
      <h2 id="alert-title" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Alert Translator</h2>
      <p className="note" style={{ marginTop: 0 }}>
        Paste a confusing security alert email. Any keys in it are hidden before it is analysed, and nothing you paste is stored.
      </p>
      <div className="step-label"><span className="n">1</span><label htmlFor="alert-text">Paste the alert here</label></div>
      <textarea id="alert-text" value={text} onChange={(e) => setMasked(e.target.value)} placeholder="Paste the alert here…" spellCheck={false} />
      {hiddenInBox > 0 && (
        <p className="hint">We hid {hiddenInBox} key{hiddenInBox > 1 ? "s" : ""} in the box. If it was a real key, replace it.</p>
      )}
      <div className="row">
        <button className="primary" onClick={explain} disabled={busy}>
          {busy ? "Reading…" : "Explain this alert"}
        </button>
        <button className="ghost tiny" onClick={() => setMasked(SAMPLES.github)}>Try fake GitHub alert</button>
        <button className="ghost tiny" onClick={() => setMasked(SAMPLES.vercel)}>Try fake Vercel alert</button>
        {busy && <span className="status" role="status" aria-live="polite">Reading your alert…</span>}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {result && (
        <div className="result">
          {hiddenKeys > 0 && (
            <p className="note">We hid {hiddenKeys} key{hiddenKeys > 1 ? "s" : ""} before analysing. If it was a real key, replace it.</p>
          )}
          <p style={{ marginBottom: 6 }}>
            <span className={`badge ${result.severity}`}>{result.severity}</span>
            <span className="note">AI estimate</span>
          </p>
          <h2 style={{ fontSize: "clamp(24px, 3.4vw, 32px)" }}>{result.headline}</h2>
          <div className="ai">Written by AI. Check it yourself.</div>
          <h3>What happened</h3>
          <p>{result.what_happened}</p>
          <h3>Does it look real?</h3>
          <p>
            <span className={`verdict ${verdictClass(result.is_it_real.verdict)}`}>{result.is_it_real.verdict}</span> {result.is_it_real.why}
          </p>
          <h3>What to do</h3>
          <ol>
            {result.fix_steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="tiny" onClick={copySteps}>{copied ? "Copied ✓" : "Copy the steps"}</button>
          </div>
          <h3>Why it matters</h3>
          <p>{result.why_it_matters}</p>
          <div className="warn">Don&apos;t click links in the email. Log in to the provider&apos;s website directly to confirm.</div>
        </div>
      )}
    </section>
  );
}
