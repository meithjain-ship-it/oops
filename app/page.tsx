import AlertPanel from "@/components/AlertPanel";
import CheckPanel from "@/components/CheckPanel";

export default function Home() {
  return (
    <main>
      <h1>OOPS</h1>
      <p className="sub">Find secret keys you left exposed, and understand scary security alerts, in plain words.</p>
      <CheckPanel repoHint={process.env.ALLOWED_REPO ?? ""} siteHint={process.env.ALLOWED_SITE ?? ""} />
      <AlertPanel />
    </main>
  );
}
