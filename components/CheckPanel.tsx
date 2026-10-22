"use client";

import { useEffect, useState } from "react";
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

// Shown while the check runs, so people can see it is working (it takes up to about 30 seconds).
const STAGES = ["Reading your code…", "Looking at your live site…", "Hiding any keys it finds…", "Asking the AI to explain…", "Preparing the fix…"];

const firstOf = (list: string) => list.split(",")[0].trim();

export default function CheckPanel({ repoHint, siteHint }: { repoHint: string; siteHint: string }) {
  const [repo, setRepo] = useState("");
  const [site, setSite] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);

  useEffect(() => {
    if (!busy) return;
    setStage(0);
    const id = setInterval(() => setStage((n) => Math.min(n + 1, STAGES.length - 1)), 4500);
    return () => clearInterval(id);
  }, [busy]);

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

  // One click fills in the test repo and its test site.
  function useExample() {
    const r = firstOf(repoHint);
    let s = firstOf(siteHint);
    if (r && s && !/^https?:\/\/[^/]+\/./i.test(s)) s = `${s.replace(/\/$/, "")}/${r.split("/").pop()}/`;
    if (r) setRepo(r);
    if (s) setSite(s);
  }

  const findings = result?.findings ?? [];
  const real = findings.filter((f) => f.verdict !== "false_alarm");
  const falseAlarms = findings.filter((f) => f.verdict === "false_alarm");
  // n8n may already explain why no pull request opened; don't say it twice.
  const prNoteGiven = (result?.notes ?? []).some((n) => /pull request/i.test(n));
  const sev = (s?: string) => (s && ["low", "medium", "high", "critical"].includes(s) ? s : "medium");

  const card = (f: Finding) => {
    return (
      <>
        <p>
          Found in <code>{f.file}</code>: <code>{f.hiddenKey}</code>
        </p>
        {f.severity && <span className={`badge ${sev(f.severity)}`}>{f.severity}</span>}
        <div className="ai">Written by AI. Check it yourself.</div>
        <p>{f.explanation}</p>
        {f.reason && <p className="note">{f.reason}</p>}
      </>
    );
  };

  return (
    <section className="panel" aria-labelledby="check-title">
      <h2 id="check-title" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Check my app</h2>
      <p className="note" style={{ marginTop: 0 }}>
        OOPS reads your GitHub code and your live site. For now it only works on our own test repo and test site.
      </p>

      <div className="step-label"><span className="n">1</span><label htmlFor="repo">Your GitHub repo</label></div>
      <input id="repo" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder={firstOf(repoHint) || "owner/repo"} autoComplete="off" spellCheck={false} />
      <p className="hint">The link to your code on GitHub, or just owner/name.</p>

      <div className="step-label"><span className="n">2</span><label htmlFor="site">Your live site</label></div>
      <input id="site" value={site} onChange={(e) => setSite(e.target.value)} placeholder={firstOf(siteHint) || "https://your-site.vercel.app"} autoComplete="off" spellCheck={false} />
      <p className="hint">The web address people visit.</p>

      <div className="row">
        <button className="primary" onClick={check} disabled={busy}>
          {busy ? "Checking…" : "Check"}
        </button>
        <button className="ghost tiny" type="button" onClick={useExample} disabled={busy || !repoHint}>
          Use the test example
        </button>
        {busy && <span className="status" role="status" aria-live="polite">{STAGES[stage]}</span>}
      </div>
      {error && <p className="error" role="alert">{error}</p>}

      {result && (
        <div className="result">
          {result.clean && findings.length === 0 ? (
            <>
              <div className="checked">Checked by OOPS on {result.checkedOn ?? new Date().toLocaleDateString()}</div>
              <p className="note" style={{ marginTop: 12 }}>No exposed keys were found on this date. This is a dated check, not a guarantee.</p>
            </>
          ) : (
            <>
              <div className="summary">
                <div className="stat bad"><b>{real.length}</b><span>look like real exposed keys</span></div>
                <div className="stat good"><b>{falseAlarms.length}</b><span>false alarms</span></div>
              </div>
              {real.map((f, i) => (
                <div className="finding" key={`r${i}`}>
                  <strong>Looks like a real exposed key</strong>
                  {card(f)}
                </div>
              ))}
              {falseAlarms.map((f, i) => (
                <details className="finding" key={`f${i}`}>
                  <summary>AI marked this as a false alarm. Here&apos;s why.</summary>
                  {card(f)}
                </details>
              ))}
              {result.replaySteps && result.replaySteps.length > 0 && <HackerReplay steps={result.replaySteps} />}
              {result.prUrl ? (
                <div className="pr-card">
                  <p>A fix is ready on GitHub. Review it before you merge. OOPS never merges for you.</p>
                  <a className="btn primary" href={result.prUrl} target="_blank" rel="noreferrer">Open the pull request</a>
                </div>
              ) : (
                !prNoteGiven && <p className="note" style={{ marginTop: 14 }}>We couldn&apos;t open a fix pull request this time.</p>
              )}
            </>
          )}
          {(result.notes ?? []).map((n, i) => (
            <p className="note" key={i} style={{ marginTop: 10 }}>
              {n}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
