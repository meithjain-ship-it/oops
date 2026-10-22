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

export default function AlertPanel() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AlertResult | null>(null);
  const [hiddenKeys, setHiddenKeys] = useState(0);
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

  return (
    <section className="panel">
      <h2>Alert Translator</h2>
      <p className="note">Paste a confusing security alert email. Any keys in it are hidden before it is analysed, and nothing you paste is stored.</p>
      <textarea value={text} onChange={(e) => setMasked(e.target.value)} placeholder="Paste the alert here…" />
      {hiddenInBox > 0 && (
        <p className="note">We hid {hiddenInBox} key{hiddenInBox > 1 ? "s" : ""} in the box. If it was a real key, replace it.</p>
      )}
      <div className="row">
        <button className="primary" onClick={explain} disabled={busy}>
          {busy ? "Reading…" : "Explain this alert"}
        </button>
        <button onClick={() => setMasked(SAMPLES.github)}>Try fake GitHub alert</button>
        <button onClick={() => setMasked(SAMPLES.vercel)}>Try fake Vercel alert</button>
      </div>
      {error && <p className="error">{error}</p>}
      {result && (
        <div className="result">
          {hiddenKeys > 0 && (
            <p className="note">We hid {hiddenKeys} key{hiddenKeys > 1 ? "s" : ""} before analysing. If it was a real key, replace it.</p>
          )}
          <span className={`badge ${result.severity}`}>{result.severity}</span> <span className="note">AI estimate</span>
          <h2>{result.headline}</h2>
          <div className="ai">Written by AI. Check it yourself.</div>
          <h3>What happened</h3>
          <p>{result.what_happened}</p>
          <h3>Does it look real?</h3>
          <p>
            <strong>{result.is_it_real.verdict}</strong>. {result.is_it_real.why}
          </p>
          <h3>What to do</h3>
          <ol>
            {result.fix_steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <h3>Why it matters</h3>
          <p>{result.why_it_matters}</p>
          <div className="warn">Don't click links in the email. Log in to the provider's website directly to confirm.</div>
        </div>
      )}
    </section>
  );
}
