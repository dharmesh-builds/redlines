// Limits on pasted or uploaded agreement text, shared by the page (to answer
// at once) and the API route (which is the real check).

// About two or three sentences. Less than this can't hold a clause worth
// flagging with its full source sentence.
export const MIN_DOCUMENT_CHARS = 200;
// Roughly 60 pages. Keeps one request to one agreement and bounds model cost.
export const MAX_DOCUMENT_CHARS = 200_000;

export const DOCUMENT_TEXT_MESSAGES = {
  empty: "Paste the text of the agreement, or choose a file.",
  tooShort: (chars: number) =>
    `That's only ${chars.toLocaleString("en-US")} characters. Redline needs at least ${MIN_DOCUMENT_CHARS} to find a clause and quote it, so paste the whole agreement.`,
  tooLong: `That's more than ${MAX_DOCUMENT_CHARS.toLocaleString("en-US")} characters. Paste one agreement at a time.`,
} as const;

export type DocumentTextCheck = { ok: true; text: string } | { ok: false; message: string };

export function checkDocumentText(input: unknown): DocumentTextCheck {
  const text = typeof input === "string" ? input : "";
  const chars = text.trim().length;
  if (chars === 0) return { ok: false, message: DOCUMENT_TEXT_MESSAGES.empty };
  if (chars < MIN_DOCUMENT_CHARS) return { ok: false, message: DOCUMENT_TEXT_MESSAGES.tooShort(chars) };
  if (text.length > MAX_DOCUMENT_CHARS) return { ok: false, message: DOCUMENT_TEXT_MESSAGES.tooLong };
  return { ok: true, text };
}
