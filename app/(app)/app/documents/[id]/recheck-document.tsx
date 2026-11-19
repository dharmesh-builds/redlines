"use client";

import { useEffect, useState } from "react";
import { clearRecheck, markRecheckStarted, recheckState } from "../../../../../lib/recheck-marker";

const RECHECK_ERROR = "Redline couldn’t check this agreement again. Try again in a minute.";
const STILL_CHECKING = "Still checking this agreement. The new report will show here when it’s saved.";
const DIDNT_FINISH = "The last check didn’t finish, so there’s no new report. Try again.";
// How often to look for the new report after a reload.
const POLL_MS = 5_000;

function browserStore(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// Re-runs the analysis on the stored text with the reader's current red
// lines. The result is saved as a new report; earlier reports stay. Nothing
// triggers this except the reader pressing the button.
//
// The check runs on the server and keeps going if the page is reloaded, so
// this browser notes that it started (lib/recheck-marker.ts). After a reload
// the page says it's still checking and looks for the new report, instead of
// showing the old report as if nothing were running.
export function RecheckDocument({ documentId, reportId }: { documentId: string; reportId: string | null }) {
  const [pending, setPending] = useState(false);
  // True when a check started before this page loaded is still running.
  const [resumed, setResumed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const store = browserStore();
    if (!store) return;
    const check = () => {
      const state = recheckState(store, documentId, reportId);
      setResumed(state === "running");
      if (state === "timed-out") setError(DIDNT_FINISH);
      return state;
    };
    if (check() !== "running") return;
    // Ask for the latest saved report until it's a new one, then reload the
    // page once to show it. Stops when the note times out.
    const timer = window.setInterval(async () => {
      if (check() !== "running") {
        window.clearInterval(timer);
        return;
      }
      try {
        const res = await fetch(`/api/documents/${encodeURIComponent(documentId)}`, { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as { report?: { id?: string } | null };
        const latest = body.report?.id ?? null;
        if (latest !== null && latest !== reportId) {
          window.clearInterval(timer);
          clearRecheck(store, documentId);
          window.location.reload();
        }
      } catch {
        // Try again on the next tick.
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [documentId, reportId]);

  async function recheck() {
    const store = browserStore();
    setPending(true);
    setError(null);
    if (store) markRecheckStarted(store, documentId, reportId);
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(documentId)}/reports`, { method: "POST" });
      if (store) clearRecheck(store, documentId);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? RECHECK_ERROR);
        setPending(false);
        return;
      }
      // A full load, so the page shows the new report as saved.
      window.location.assign(`/app/documents/${encodeURIComponent(documentId)}?rechecked=1`);
    } catch {
      if (store) clearRecheck(store, documentId);
      setError(RECHECK_ERROR);
      setPending(false);
    }
  }

  const busy = pending || resumed;
  return (
    <div className="doc-recheck">
      <button type="button" className="plain-button" onClick={recheck} disabled={busy}>
        Check again with my current red lines
      </button>
      <p className="field-note" role="status" aria-live="polite">
        {pending
          ? "Checking again. This usually takes under a minute."
          : resumed
            ? STILL_CHECKING
            : "This saves a new report. Earlier reports stay saved."}
      </p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
