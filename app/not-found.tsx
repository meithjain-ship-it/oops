import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export default function NotFound() {
  return (
    <LegalPage title="That page doesn't exist">
      <p className="lead">The link may be old or mistyped. Nothing is wrong with your app.</p>
      <div className="row">
        <Link className="btn primary" href="/">Back to OOPS</Link>
        <Link className="btn" href="/#check">Check my app</Link>
      </div>
    </LegalPage>
  );
}
