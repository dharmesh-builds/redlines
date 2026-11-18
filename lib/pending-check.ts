import type { ExtractedFormat } from "./extraction";

// A signed-out reader who presses "Check" is asked to sign in first. Their
// text waits in this browser's localStorage while they do, because the email
// link usually opens in a new tab, which sessionStorage wouldn't reach.
// Only the extracted text is kept, never the file, and only on this device.
// It is handed back once and then deleted, and it expires with the sign-in
// link (Supabase's default link lifetime is one hour).

export const PENDING_CHECK_KEY = "redline-pending-check";
export const PENDING_CHECK_MAX_AGE_MS = 60 * 60 * 1000;

export type PendingCheck = {
  text: string;
  fileName: string | null;
  source: { fileName: string; format: ExtractedFormat } | null;
};

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const FORMATS: readonly string[] = ["pdf", "docx", "txt"] satisfies ExtractedFormat[];

/** Keeps the text for after sign-in. False if the browser won't store it. */
export function keepPendingCheck(store: Store, check: PendingCheck, now = Date.now()): boolean {
  try {
    store.setItem(PENDING_CHECK_KEY, JSON.stringify({ ...check, savedAt: now }));
    return true;
  } catch {
    return false;
  }
}

/** Deletes any kept text, e.g. once the reader changes what's on screen. */
export function forgetPendingCheck(store: Store): void {
  try {
    store.removeItem(PENDING_CHECK_KEY);
  } catch {
    // Nothing stored that we can reach, so nothing to delete.
  }
}

/** Returns the kept text once, if it is still fresh, and deletes it either way. */
export function takePendingCheck(store: Store, now = Date.now()): PendingCheck | null {
  let raw: string | null;
  try {
    raw = store.getItem(PENDING_CHECK_KEY);
    store.removeItem(PENDING_CHECK_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const { text, fileName, source, savedAt } = value as Record<string, unknown>;

  if (typeof text !== "string" || !text) return null;
  if (typeof savedAt !== "number" || now - savedAt < 0 || now - savedAt > PENDING_CHECK_MAX_AGE_MS) return null;
  if (fileName !== null && typeof fileName !== "string") return null;
  if (source !== null) {
    const s = source as Record<string, unknown> | undefined;
    if (typeof s !== "object" || typeof s.fileName !== "string" || !FORMATS.includes(s.format as string)) return null;
  }
  return {
    text,
    fileName: fileName as string | null,
    source: source as PendingCheck["source"],
  };
}
