// The name a document is listed under in the library. The user may type one;
// otherwise it is the uploaded file's name, or the first non-empty line of a
// pasted text, trimmed.

export const MAX_DOCUMENT_NAME = 200;
export const UNTITLED_DOCUMENT = "Untitled agreement";

export type NameSource = { fileName?: string | null; text: string };

function clip(name: string): string {
  return name.length > MAX_DOCUMENT_NAME ? name.slice(0, MAX_DOCUMENT_NAME).trimEnd() : name;
}

export function defaultDocumentName({ fileName, text }: NameSource): string {
  const file = fileName?.trim();
  if (file) return clip(file);
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .find((line) => line.length > 0);
  return firstLine ? clip(firstLine) : UNTITLED_DOCUMENT;
}

/** The explicit name wins when it has any non-space text; otherwise the default. */
export function resolveDocumentName(explicit: unknown, source: NameSource): string {
  if (typeof explicit === "string" && explicit.trim()) return clip(explicit.trim());
  return defaultDocumentName(source);
}
