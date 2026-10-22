import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Privacy · OOPS", description: "What OOPS does and does not keep, in plain words." };

export default function Privacy() {
  return (
    <LegalPage title="Privacy, in plain words" updated="22 October 2026">
      <p className="lead">OOPS is a hackathon prototype. Here is exactly what happens to what you give it.</p>

      <h2>What you paste or type</h2>
      <p>Alerts you paste are used to write your answer, then forgotten. OOPS keeps no copy. Before anything goes to an AI, a script hides every key it can find, so the AI only sees something like <code>sk-pro…[HIDDEN BY OOPS]</code>.</p>

      <h2>The key check</h2>
      <p>The repo and site you enter are sent to our automation (n8n) and to GitHub, which read your public files. The automation&apos;s run history may keep the repo name and the <em>hidden</em> findings for a short time. Full keys are never kept or sent to the AI.</p>

      <h2>Which AI</h2>
      <p>Hidden text is sent to an AI provider (Google Gemini, or Anthropic Claude if switched on) to write the explanation. Their own privacy rules apply to that step.</p>

      <h2>Signing in (optional)</h2>
      <p>You can use everything without signing in. If you choose &quot;Sign in with GitHub&quot;, OOPS learns only your public profile: your GitHub username, display name and photo. It gets <strong>no access to your repos</strong>. GitHub&apos;s access token is thrown away right after sign-in. Your name and photo are kept in one secure cookie in your own browser. OOPS has no user database.</p>

      <h2>Cookies and tracking</h2>
      <p>The only cookies are the sign-in cookie (only if you sign in) and a short-lived one that protects the sign-in step. There is no advertising, no analytics and no tracking. The web host keeps ordinary technical request logs.</p>

      <h2>Your choices</h2>
      <p>Sign out any time from the top bar. That deletes the cookie. You can also remove OOPS from your GitHub settings under Applications. Questions? Open an issue on the <a href="https://github.com/meithjain-ship-it/oops">project page</a>.</p>
    </LegalPage>
  );
}
