"use client";

import { useState } from "react";
import HackerReplay from "./HackerReplay";

type Finding = {
  file: string;
  hiddenKey: string;
  verdict: "real" | "false_alarm";
  severity?: string;
  explanation: string;
  reason?: string;
};
type CheckResult = {
  clean?: boolean;
  checkedOn?: string;
  findings?: Finding[];
  replaySteps?: string[];
  prUrl?: string | null;
  notes?: string[];
};

export default function CheckPanel({ repoHint, siteHint }: { repoHint: string; siteHint: string }) {
  const [repo, setRepo] = useState("");
  const [site, setSite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);

  async function check() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repo, site }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong. Please try again.");
      else setResult(data);
    } catch {
      setError("Couldn't reach OOPS. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const findings = result?.findings ?? [];
  // The allowed lists can hold several entries; show just the first one as the example.
  const firstOf = (list: string) => list.split(",")[0].trim();
  // n8n may already explain why no pull request opened; don't say it twice.
  const prNoteGiven = (result?.notes ?? []).some((n) => /pull request/i.test(n));

  return (
    <section className="panel">
      <h2>Check my app</h2>
      <p className="note">Looks for secret keys in your GitHub code and your live site. For now it only works on our own test repo and test site.</p>
      <label htmlFor="repo">GitHub repo</label>
      <input id="repo" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder={firstOf(repoHint) || "owner/repo"} />
      <label htmlFor="site">Live site</label>
      <input id="site" value={site} onChange={(e) => setSite(e.target.value)} placeholder={firstOf(siteHint) || "https://your-site.vercel.app"} />
      <div className="row">
        <button className="primary" onClick={check} disabled={busy}>
          {busy ? "Checking…" : "Check"}
        </button>
      </div>
      {error && <p className="error">{error}</p>}

      {result && (
        <div className="result">
          {result.clean && findings.length === 0 ? (
            <>
              <div className="checked">Checked by OOPS on {result.checkedOn ?? new Date().toLocaleDateString()}</div>
              <p className="note">No exposed keys were found on this date. This is a dated check, not a guarantee.</p>
            </>
          ) : (
            <>
              {findings.map((f, i) => {
                const body = (
                  <>
                    <p>
                      Found in <code>{f.file}</code>: <code>{f.hiddenKey}</code>
                    </p>
                    {f.severity && <span className={`badge ${["low", "medium", "high", "critical"].includes(f.severity) ? f.severity : "medium"}`}>{f.severity}</span>}
                    <div className="ai">Written by AI. Check it yourself.</div>
                    <p>{f.explanation}</p>
                    {f.reason && <p className="note">{f.reason}</p>}
                  </>
                );
                return f.verdict === "false_alarm" ? (
                  <details className="finding" key={i}>
                    <summary>AI marked this as a false alarm. Here's why.</summary>
                    {body}
                  </details>
                ) : (
                  <div className="finding" key={i}>
                    <strong>Looks like a real exposed key</strong>
                    {body}
                  </div>
                );
              })}
              {result.replaySteps && result.replaySteps.length > 0 && <HackerReplay steps={result.replaySteps} />}
              {result.prUrl ? (
                <p>
                  A fix is ready on GitHub: <a href={result.prUrl}>open the pull request</a>. Review it before you merge. OOPS never merges for you.
                </p>
              ) : (
                !prNoteGiven && <p className="note">We couldn't open a fix pull request this time.</p>
              )}
            </>
          )}
          {(result.notes ?? []).map((n, i) => (
            <p className="note" key={i}>
              {n}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
