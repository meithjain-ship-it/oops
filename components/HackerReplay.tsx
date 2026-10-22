"use client";

import { useEffect, useState } from "react";

export default function HackerReplay({ steps }: { steps: string[] }) {
  const [shown, setShown] = useState(0);
  const [run, setRun] = useState(0);

  useEffect(() => {
    setShown(0);
    const id = setInterval(() => {
      setShown((n) => {
        if (n >= steps.length) {
          clearInterval(id);
          return n;
        }
        return n + 1;
      });
    }, 1600);
    return () => clearInterval(id);
  }, [steps, run]);

  return (
    <div className="replay">
      <h3>Hacker Replay: how a stranger would use this key</h3>
      <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={shown}>
        <div style={{ width: `${(shown / Math.max(steps.length, 1)) * 100}%` }} />
      </div>
      {steps.map((s, i) => (
        <div key={i} className={`step ${i < shown ? "on" : ""}`}>
          <strong>{i === steps.length - 1 ? "FIX" : `0${i + 1}`}</strong>
          <span>{s}</span>
        </div>
      ))}
      <div className="ai">AI-written walkthrough, shown with a fake key. Check it yourself.</div>
      <div>
        <button className="tiny" onClick={() => setRun((n) => n + 1)}>Replay again</button>
      </div>
    </div>
  );
}
