"use client";

import { useEffect, useState } from "react";

type Me = { enabled: boolean; user: { login: string; name: string | null; avatar: string } | null };

const NOTICES: Record<string, string> = {
  ok: "Signed in with GitHub ✓",
  failed: "Sign in didn't work. Nothing was changed. Please try again.",
  unavailable: "Sign in isn't switched on yet.",
};

// The sign-in button (or the signed-in person) at the right of the top bar. Signing in is always optional.
export default function AccountMenu() {
  const [me, setMe] = useState<Me | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Me) => setMe(d))
      .catch(() => setMe({ enabled: false, user: null }));

    // Show a short message after coming back from GitHub, then tidy the address bar.
    const q = new URLSearchParams(window.location.search).get("login");
    if (q && NOTICES[q]) {
      setNotice(NOTICES[q]);
      window.history.replaceState(null, "", window.location.pathname + window.location.hash);
      const id = setTimeout(() => setNotice(""), 5000);
      return () => clearTimeout(id);
    }
  }, []);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setMe((m) => (m ? { ...m, user: null } : m));
    setNotice("Signed out");
    setTimeout(() => setNotice(""), 3000);
  }

  return (
    <div className="acct">
      {!me ? null : me.user ? (
        <details className="menu">
          <summary aria-label={`Account menu for ${me.user.login}`}>
            {me.user.avatar ? <img className="avatar" src={me.user.avatar} alt="" width={28} height={28} referrerPolicy="no-referrer" /> : <span className="avatar" />}
            <span className="who">@{me.user.login}</span>
          </summary>
          <div className="drop">
            <p className="verified">Verified GitHub account</p>
            <p className="note" style={{ margin: "0 0 12px" }}>{me.user.name ? `${me.user.name} (@${me.user.login})` : `@${me.user.login}`}</p>
            <button className="tiny" onClick={signOut}>Sign out</button>
          </div>
        </details>
      ) : me.enabled ? (
        <a className="btn tiny" href="/api/auth/github">Sign in with GitHub</a>
      ) : (
        <span className="btn tiny soon" title="Sign in is coming soon. Everything works without it." aria-disabled="true">Sign in · soon</span>
      )}
      {notice && (
        <div className="toast" role="status" aria-live="polite">{notice}</div>
      )}
    </div>
  );
}
