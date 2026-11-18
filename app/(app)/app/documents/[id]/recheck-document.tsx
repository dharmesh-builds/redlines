"use client";

import { useState } from "react";

const RECHECK_ERROR = "Redline couldn’t check this agreement again. Try again in a minute.";

// Re-runs the analysis on the stored text with the reader's current red
// lines. The result is saved as a new report; earlier reports stay. Nothing
// triggers this except the reader pressing the button.
export function RecheckDocument({ documentId }: { documentId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function recheck() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(documentId)}/reports`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? RECHECK_ERROR);
        setPending(false);
        return;
      }
      // A full load, so the page shows the new report as saved.
      window.location.assign(`/app/documents/${encodeURIComponent(documentId)}?rechecked=1`);
    } catch {
      setError(RECHECK_ERROR);
      setPending(false);
    }
  }

  return (
    <div className="doc-recheck">
      <button type="button" className="plain-button" onClick={recheck} disabled={pending}>
        Check again with my current red lines
      </button>
      <p className="field-note" role="status" aria-live="polite">
        {pending ? "Checking again. This usually takes under a minute." : "This saves a new report. Earlier reports stay saved."}
      </p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
