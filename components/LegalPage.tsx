import type { ReactNode } from "react";
import { Liquid, SiteFooter, SiteNav } from "./SiteChrome";

// Shared frame for the short plain-words pages (Privacy, Terms) and the error pages.
export default function LegalPage({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <>
      <Liquid />
      <SiteNav />
      <main>
        <div className="wrap legal">
          <p className="eyebrow">{updated ? `Updated ${updated}` : "OOPS"}</p>
          <h1 style={{ fontSize: "clamp(34px, 5.5vw, 56px)" }}>{title}</h1>
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
