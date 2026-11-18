import { deleteDocument, formatSavedDate, loadDocument, loadLibrary } from "../library/library";
import type { LibraryAccess } from "../library/access";

// Handlers behind /api/documents and /api/documents/[id]. They take the
// resolved access (user + storage) so the route files stay thin and the
// behaviour can be driven with any storage.

export const DOCUMENTS_ERRORS = {
  notConfigured: "Sign-in isn’t set up here, so there’s no library.",
  signedOut: "Sign in to see your library.",
  notFound: "That agreement isn’t in your library.",
  unavailable: "Redline couldn’t reach your library. Try again in a minute.",
} as const;

type Access = LibraryAccess;

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function denied(access: Exclude<Access, { kind: "ok" }>) {
  return access.kind === "not-configured"
    ? json({ error: DOCUMENTS_ERRORS.notConfigured }, 503)
    : json({ error: DOCUMENTS_ERRORS.signedOut }, 401);
}

export async function listDocumentsResponse(access: Access) {
  if (access.kind !== "ok") return denied(access);
  const list = await loadLibrary(access.repo, access.userId);
  if (list.kind === "unavailable") return json({ error: DOCUMENTS_ERRORS.unavailable }, 502);
  return json({
    documents: list.documents.map((d) => ({ ...d, savedOn: formatSavedDate(d.createdAt) })),
  });
}

export async function documentResponse(access: Access, documentId: string) {
  if (access.kind !== "ok") return denied(access);
  const detail = await loadDocument(access.repo, access.userId, documentId);
  if (detail.kind === "not-found") return json({ error: DOCUMENTS_ERRORS.notFound }, 404);
  if (detail.kind === "unavailable") return json({ error: DOCUMENTS_ERRORS.unavailable }, 502);
  const { document, report } = detail;
  return json({
    document,
    report: report
      ? {
          id: report.meta.id,
          modelId: report.meta.modelId,
          createdAt: report.meta.createdAt,
          outdated: report.content.kind === "outdated",
          report: report.content.kind === "current" ? report.content.report : null,
        }
      : null,
  });
}

export async function deleteDocumentResponse(access: Access, documentId: string) {
  if (access.kind !== "ok") return denied(access);
  const result = await deleteDocument(access.repo, access.userId, documentId);
  if (result.kind === "not-found") return json({ error: DOCUMENTS_ERRORS.notFound }, 404);
  if (result.kind === "unavailable") return json({ error: DOCUMENTS_ERRORS.unavailable }, 502);
  return json({ deleted: true });
}
