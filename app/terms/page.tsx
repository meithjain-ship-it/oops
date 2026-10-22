import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Terms · OOPS", description: "The simple rules for using OOPS." };

export default function Terms() {
  return (
    <LegalPage title="Terms, in plain words" updated="22 October 2026">
      <p className="lead">OOPS is a hackathon prototype. Please read these short rules before you rely on it.</p>

      <h2>It is a helper, not a guarantee</h2>
      <p>OOPS can miss keys, and the AI can be wrong. A &quot;Checked by OOPS&quot; badge means no key was found on that date. It does not mean your app is safe. Always check the results yourself.</p>

      <h2>Only your own test projects</h2>
      <p>For now OOPS only checks the test repos and test sites it was set up for. Do not point it at code that is not yours.</p>

      <h2>You stay in control</h2>
      <p>OOPS can open a pull request with a suggested fix. It never merges one. Read it and test your app first. If a real key was ever public, replace it in the provider&apos;s dashboard. Removing it from the code is not enough.</p>

      <h2>Never paste real secrets on purpose</h2>
      <p>OOPS hides keys it recognises, but treat any key you paste as possibly exposed and replace it.</p>

      <h2>No warranty</h2>
      <p>OOPS is provided as is, without promises of accuracy or uptime. Use it at your own risk. The team is not liable for losses from using it.</p>
    </LegalPage>
  );
}
