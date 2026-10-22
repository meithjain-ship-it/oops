import Link from "next/link";
import AccountMenu from "./AccountMenu";

// Parts of the page that don't need much interaction: background, top bar, "how it works", promises, footer.

export function Liquid() {
  return (
    <div className="liquid" aria-hidden="true">
      <i />
      <i />
      <i />
    </div>
  );
}

export function SiteNav() {
  return (
    <header className="nav">
      <div className="wrap">
        <Link className="brand" href="/" aria-label="OOPS, back to the home page">
          <span className="mark" />
          OOPS
        </Link>
        <nav aria-label="Sections">
          <Link href="/#check">Check my app</Link>
          <Link href="/#alert">Explain an alert</Link>
          <Link className="hide-s" href="/#how">How it works</Link>
        </nav>
        <AccountMenu />
      </div>
    </header>
  );
}

export function Hero() {
  return (
    <section className="hero" id="top">
      <p className="eyebrow">Key check · Alert translator</p>
      <h1>
        Did you leave a <b>secret key</b> in your app?
      </h1>
      <p className="lead">
        OOPS looks through your code and your live site, explains what it finds in plain words, and prepares a fix for you to review. It never changes your code on its own.
      </p>
      <div className="row">
        <a className="btn primary" href="#check">Check my app</a>
        <a className="btn" href="#alert">Explain a security alert</a>
      </div>
      <div className="chips" aria-label="Our promises">
        <span className="chip">Keys are hidden before AI sees anything</span>
        <span className="chip">Nothing you paste is stored</span>
        <span className="chip">OOPS never merges a change for you</span>
      </div>
    </section>
  );
}

const STEPS = [
  { n: "01", t: "You enter two links", d: "Your GitHub repo and your live site. For now, only our own test repo and test site work." },
  { n: "02", t: "A script finds the keys", d: "Plain code, not AI, scans for keys and .env files, then hides every key it finds." },
  { n: "03", t: "AI explains in plain words", d: "Real key or false alarm, how bad it is, and a short replay of how a stranger would use it." },
  { n: "04", t: "You review the fix", d: "OOPS opens a pull request on GitHub. You read it and decide. It is never merged for you." },
];

export function HowItWorks() {
  return (
    <section className="block" id="how">
      <p className="eyebrow">How it works</p>
      <h2>Four steps. Nothing happens behind your back.</h2>
      <div className="grid">
        {STEPS.map((s) => (
          <div className="card" key={s.n}>
            <span className="num">{s.n}</span>
            <h4>{s.t}</h4>
            <p>{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Promises() {
  return (
    <section className="block" id="safety">
      <p className="eyebrow">Safe by design</p>
      <h2>Built so a mistake can&apos;t leak more.</h2>
      <div className="grid">
        <div className="card">
          <h4>Keys are hidden first</h4>
          <p>A key like <code>sk-pro…[HIDDEN BY OOPS]</code> is all the AI ever sees. A full key is never sent to it.</p>
        </div>
        <div className="card">
          <h4>Nothing you paste is stored</h4>
          <p>What you paste is used to answer you and then forgotten. Signing in is optional and never gives OOPS access to your code.</p>
        </div>
        <div className="card">
          <h4>AI can be wrong</h4>
          <p>Every AI answer is labelled. Check it yourself. A clean result is a dated check, never a guarantee.</p>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="cols">
          <p>OOPS is a hackathon prototype. It helps first-time builders catch exposed keys and understand security alerts. It does not replace a security review.</p>
          <p className="links">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <a href="https://github.com/meithjain-ship-it/oops">Source on GitHub</a>
          </p>
        </div>
        <div className="big" aria-hidden="true">OOPS</div>
      </div>
    </footer>
  );
}
