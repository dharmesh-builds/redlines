// A re-check runs on the server and keeps running if the reader reloads the
// page, but "Checking again" lived only in the open page, so a reload showed
// the old report as if nothing were running (finding 4). This note, kept in
// the browser's localStorage, remembers that a re-check started and which
// report was showing then. Nothing is stored on the server.
//
// The check is over when a different report is showing, or after
// RECHECK_MAX_AGE_MS, whichever comes first. Comparing report IDs rather than
// times keeps a wrong computer clock from mattering.

export const RECHECK_KEY_PREFIX = "redline-recheck:";
// A check "usually takes under a minute"; three covers a slow one.
export const RECHECK_MAX_AGE_MS = 3 * 60 * 1000;

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type Marker = { startedAt: number; reportId: string | null };

const keyFor = (documentId: string) => `${RECHECK_KEY_PREFIX}${documentId}`;

/** Notes that a re-check started while `reportId` was showing. */
export function markRecheckStarted(store: Store, documentId: string, reportId: string | null, now = Date.now()): void {
  try {
    store.setItem(keyFor(documentId), JSON.stringify({ startedAt: now, reportId } satisfies Marker));
  } catch {
    // Storage is blocked; the page still works, it just can't survive a reload.
  }
}

/** Forgets the note, once the re-check has finished or failed. */
export function clearRecheck(store: Store, documentId: string): void {
  try {
    store.removeItem(keyFor(documentId));
  } catch {
    // Nothing we can reach, so nothing to clear.
  }
}

export type RecheckState = "none" | "running" | "timed-out";

/**
 * Whether a re-check started from this browser is still running, given the
 * report showing now. "running" only while the same report is showing and
 * the note is younger than RECHECK_MAX_AGE_MS. A finished or stale note is
 * cleared; a stale one reports "timed-out" once so the page can say so.
 */
export function recheckState(store: Store, documentId: string, reportId: string | null, now = Date.now()): RecheckState {
  let marker: Marker | null = null;
  try {
    const raw = store.getItem(keyFor(documentId));
    if (raw) marker = parseMarker(JSON.parse(raw));
  } catch {
    marker = null;
  }
  if (!marker) {
    clearRecheck(store, documentId);
    return "none";
  }
  if (marker.reportId !== reportId) {
    clearRecheck(store, documentId);
    return "none";
  }
  const age = now - marker.startedAt;
  if (age < 0 || age >= RECHECK_MAX_AGE_MS) {
    clearRecheck(store, documentId);
    return "timed-out";
  }
  return "running";
}

function parseMarker(value: unknown): Marker | null {
  if (typeof value !== "object" || value === null) return null;
  const { startedAt, reportId } = value as Record<string, unknown>;
  if (typeof startedAt !== "number" || !Number.isFinite(startedAt)) return null;
  if (reportId !== null && typeof reportId !== "string") return null;
  return { startedAt, reportId };
}
