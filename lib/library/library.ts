import { readStoredPayload, type ReadPayload } from "./payload";
import type { DocumentRow, LibraryRepository, ReportMeta } from "./repository";

// The library's behaviour, independent of where rows live: ordering, which
// report a document shows, how old payloads are handled, and deletion.
// Any storage failure becomes "unavailable" so pages show an error state
// instead of crashing.

export type { DocumentRow, LibraryRepository, ReportMeta } from "./repository";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isDocumentId(id: string): boolean {
  return UUID.test(id);
}

function time(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

function newestFirst<T extends { createdAt: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => time(b.createdAt) - time(a.createdAt));
}

export type LibraryList = { kind: "ok"; documents: DocumentRow[] } | { kind: "unavailable" };

export async function loadLibrary(repo: LibraryRepository, userId: string): Promise<LibraryList> {
  try {
    return { kind: "ok", documents: newestFirst(await repo.listDocuments(userId)) };
  } catch (err) {
    console.error("[library] list failed:", (err as Error).message);
    return { kind: "unavailable" };
  }
}

export type SavedReport = { meta: ReportMeta; content: ReadPayload };

export type DocumentDetail =
  | {
      kind: "ok";
      document: DocumentRow;
      report: SavedReport | null;
      // Every report on this document, newest first, so earlier ones can be opened.
      reports: ReportMeta[];
    }
  | { kind: "not-found" }
  | { kind: "unavailable" };

/**
 * One document and one of its saved reports: `reportId` if it is one of this
 * document's reports, otherwise the most recent. A report ID from another
 * document or user is never read. Never re-runs the analysis.
 */
export async function loadDocument(
  repo: LibraryRepository,
  userId: string,
  documentId: string,
  reportId?: string,
): Promise<DocumentDetail> {
  if (!isDocumentId(documentId)) return { kind: "not-found" };
  try {
    const document = await repo.findDocument(userId, documentId);
    if (!document) return { kind: "not-found" };
    const reports = newestFirst(await repo.listReports(userId, documentId));
    const chosen = reports.find((r) => r.id === reportId) ?? reports[0];
    if (!chosen) return { kind: "ok", document, report: null, reports };
    const row = await repo.readReport(userId, chosen.id);
    if (!row) return { kind: "ok", document, report: null, reports };
    const { payload: _payload, ...meta } = row;
    return { kind: "ok", document, report: { meta, content: readStoredPayload(row.payload) }, reports };
  } catch (err) {
    console.error("[library] read failed:", (err as Error).message);
    return { kind: "unavailable" };
  }
}

export type DeleteResult = { kind: "deleted" } | { kind: "not-found" } | { kind: "unavailable" };

/**
 * Deletes a document and every report on it. The reports are deleted
 * explicitly first; the foreign key's cascade is a second guarantee, not the
 * only one.
 */
export async function deleteDocument(
  repo: LibraryRepository,
  userId: string,
  documentId: string,
): Promise<DeleteResult> {
  if (!isDocumentId(documentId)) return { kind: "not-found" };
  try {
    const document = await repo.findDocument(userId, documentId);
    if (!document) return { kind: "not-found" };
    await repo.deleteReports(userId, documentId);
    const deleted = await repo.deleteDocument(userId, documentId);
    return deleted ? { kind: "deleted" } : { kind: "not-found" };
  } catch (err) {
    console.error("[library] delete failed:", (err as Error).message);
    return { kind: "unavailable" };
  }
}

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "18 Nov 2026". Dates are shown in UTC so server and browser agree. */
export function formatSavedDate(iso: string): string {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? "" : DATE.format(t);
}
