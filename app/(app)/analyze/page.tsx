import { isSupabaseConfigured } from "../../../lib/supabase/env";
import { getSignedInUser } from "../../../lib/supabase/session";
import { AnalyzeForm, type SavingMode } from "./analyze-form";

// /analyze: paste or pick a .txt agreement and see its verified flags.
// Public on purpose: checking an agreement doesn't need an account.
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
        Paste the agreement&rsquo;s text, or choose a .txt file. Redline reads the file in your browser
        and sends only its text.
      </p>
      <AnalyzeForm saving={saving} />
    </section>
  );
}
