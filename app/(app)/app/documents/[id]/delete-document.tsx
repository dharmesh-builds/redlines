"use client";

import { useEffect, useRef, useState } from "react";

const DELETE_ERROR = "Redline couldn’t delete this agreement. Try again.";

// Delete with an in-page confirmation (no window.confirm). On success the
// reader goes back to the library, which says the agreement was deleted.
export function DeleteDocument({ documentId, name }: { documentId: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
  }, [confirming]);

  async function remove() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(documentId)}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? DELETE_ERROR);
        setPending(false);
        return;
      }
      // A full load, so the library is fetched fresh without the deleted row.
      window.location.assign("/app?deleted=1");
    } catch {
      setError(DELETE_ERROR);
      setPending(false);
    }
  }

  return (
    <div className="doc-delete">
      {!confirming ? (
        <button type="button" className="text-button" onClick={() => setConfirming(true)}>
          Delete this agreement
        </button>
      ) : (
        <div className="delete-confirm" role="group" aria-labelledby="delete-question">
          <p id="delete-question" className="delete-question">
            Delete &ldquo;{name}&rdquo; and all its reports? You can&rsquo;t undo this.
          </p>
          <div className="delete-actions">
            <button type="button" className="plain-button" onClick={remove} disabled={pending}>
              {pending ? "Deleting…" : "Yes, delete it"}
            </button>
            <button
              ref={cancelRef}
              type="button"
              className="text-button"
              onClick={() => {
                setConfirming(false);
                setError(null);
              }}
              disabled={pending}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
