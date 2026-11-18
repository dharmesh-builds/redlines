import { isSupabaseConfigured } from "../../../lib/supabase/env";
import { getSignedInUser } from "../../../lib/supabase/session";
import { AnalyzeForm, type SavingMode } from "./analyze-form";

// /analyze: paste or pick an agreement and see its verified flags.
// Anyone can open it and paste, but the check itself needs an account
// (ADR 0008): a signed-out reader is asked to sign in, and their text waits.
export default async function AnalyzePage() {
  const session = await getSignedInUser();
  const saving: SavingMode = session
    ? { kind: "signed-in", email: session.user.email ?? "" }
    : isSupabaseConfigured()
      ? { kind: "anonymous" }
      : { kind: "unavailable" };

  return (
    <section className="app-panel app-panel-wide" aria-labelledby="analyze-title">
      <h1 id="analyze-title" className="app-title">
        Check an agreement
      </h1>
      <p className="app-lede">
        Paste the agreement&rsquo;s text, or choose a PDF, Word or text file. Redline reads the file in your browser
        and sends only its text.
      </p>
      <AnalyzeForm saving={saving} />
    </section>
  );
}
