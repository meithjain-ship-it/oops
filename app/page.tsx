import AlertPanel from "@/components/AlertPanel";
import CheckPanel from "@/components/CheckPanel";
import { Hero, HowItWorks, Liquid, Promises, SiteFooter, SiteNav } from "@/components/SiteChrome";

export default function Home() {
  return (
    <>
      <Liquid />
      <SiteNav />
      <main>
        <div className="wrap">
          <Hero />
          <section className="block" id="check">
            <p className="eyebrow">Tool 1</p>
            <h2>Check my app for exposed keys</h2>
            <CheckPanel repoHint={process.env.ALLOWED_REPO ?? ""} siteHint={process.env.ALLOWED_SITE ?? ""} />
          </section>
          <section className="block" id="alert">
            <p className="eyebrow">Tool 2</p>
            <h2>Explain a security alert</h2>
            <AlertPanel />
          </section>
          <HowItWorks />
          <Promises />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
