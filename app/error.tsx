"use client";

// Shown if something unexpected breaks while a page is loading. Plain words, and a way to try again.
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main>
      <div className="wrap legal" style={{ paddingTop: 96 }}>
        <p className="eyebrow">Something went wrong</p>
        <h1 style={{ fontSize: "clamp(34px, 5.5vw, 56px)" }}>OOPS had a hiccup</h1>
        <p className="lead">It is not your fault, and nothing was changed in your code. Please try again.</p>
        <div className="row">
          <button className="primary" onClick={() => retry()}>Try again</button>
          <a className="btn" href="/">Back to the home page</a>
        </div>
      </div>
    </main>
  );
}
