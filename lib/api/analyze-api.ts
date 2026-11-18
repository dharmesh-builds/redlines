import { analyze, type ModelPort, type Report } from "../analysis";
import { checkDocumentText } from "../document-input";
import { isDocumentId } from "../library/library";
import { resolveDocumentName } from "../library/naming";
import { toStoredPayload } from "../library/payload";
import type { LibraryRepository } from "../library/repository";
import { redLineTexts, type RedLineRepository } from "../red-lines/red-lines";
import { ANALYZE_ERRORS, type AnalyzeResponse } from "./analyze-contract";
import { DOCUMENTS_ERRORS } from "./documents-api";

// Handlers behind POST /api/analyze and POST /api/documents/[id]/reports.
// They take the resolved account (user + storage) and the model, so the
// route files stay thin and the behaviour can be driven with any storage
// and a scripted model.

export type AnalyzeAccess =
  | { kind: "not-configured" }
  | { kind: "signed-out" }
  | { kind: "ok"; userId: string; library: LibraryRepository; redLines: RedLineRepository };

function json(body: AnalyzeResponse, status = 200) {
  return Response.json(body, { status });
}

function modelFailure(err: unknown) {
  const code = (err as { code?: string }).code;
  console.error("[analyze]", (err as Error).message);
  if (code === "model_not_configured") return json({ error: ANALYZE_ERRORS.notConfigured }, 503);
  if (code === "model_output_invalid") return json({ error: ANALYZE_ERRORS.modelOutput }, 502);
  return json({ error: ANALYZE_ERRORS.modelFailed }, 502);
}

// Analyses the stored text with the user's current red lines and saves the
// result as a new report. Earlier reports on the document are left alone.
async function analyzeAndSave(
  account: Extract<AnalyzeAccess, { kind: "ok" }>,
  documentId: string,
  text: string,
  redLines: string[],
  model: ModelPort,
): Promise<Response> {
  let report: Report;
  try {
    report = await analyze(text, redLines, model);
  } catch (err) {
    return modelFailure(err);
  }
  try {
    await account.library.saveReport(account.userId, {
      documentId,
      payload: toStoredPayload(report),
      modelId: report.modelId,
      redLines: report.redLines,
    });
  } catch (err) {
    console.error("[analyze] report save failed:", (err as Error).message);
    return json({ error: ANALYZE_ERRORS.saveFailed }, 500);
  }
  return json({ report, saved: true, documentId });
}

async function loadRedLinesFor(account: Extract<AnalyzeAccess, { kind: "ok" }>): Promise<string[] | null> {
  try {
    return await redLineTexts(account.redLines, account.userId);
  } catch (err) {
    console.error("[analyze] red lines failed:", (err as Error).message);
    return null;
  }
}

/**
 * POST /api/analyze  { text: string, name?: string }
 * The browser sends only the extracted text, never the file.
 * Signed in: the user's red lines are loaded, the text is stored and read
 * back, analysed against those red lines, and the report is saved with its
 * model ID and red-line snapshot. Otherwise: analysed with no red lines, and
 * nothing is stored.
 */
export async function analyzeResponse(request: Request, account: AnalyzeAccess, model: ModelPort) {
  let body: { text?: unknown; name?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: ANALYZE_ERRORS.badRequest }, 400);
  }
  if (typeof body !== "object" || body === null) return json({ error: ANALYZE_ERRORS.badRequest }, 400);

  const checked = checkDocumentText(body.text);
  if (!checked.ok) return json({ error: checked.message }, 400);

  if (account.kind !== "ok") {
    try {
      return json({ report: await analyze(checked.text, [], model), saved: false });
    } catch (err) {
      return modelFailure(err);
    }
  }

  // Red lines first: if they can't be read, nothing is stored or checked,
  // rather than a report that silently skipped them.
  const redLines = await loadRedLinesFor(account);
  if (!redLines) return json({ error: ANALYZE_ERRORS.redLinesFailed }, 502);

  // The form sends the name it shows; if it's blank, fall back to the text's first line.
  const name = resolveDocumentName(body.name, { text: checked.text });
  let documentId: string;
  let storedText: string | null;
  try {
    documentId = await account.library.createDocument(account.userId, { name, text: checked.text });
    // The analysis runs on the text as stored, not as posted, so every
    // citation is checked against exactly what the library will show later.
    storedText = await account.library.readDocumentText(account.userId, documentId);
  } catch (err) {
    console.error("[analyze] save failed:", (err as Error).message);
    return json({ error: ANALYZE_ERRORS.saveFailed }, 500);
  }
  if (storedText === null) return json({ error: ANALYZE_ERRORS.saveFailed }, 500);

  return analyzeAndSave(account, documentId, storedText, redLines, model);
}

/**
 * POST /api/documents/:id/reports
 * Checks a saved agreement again: its stored text, against the user's
 * current red lines. The result is saved as a new report; the earlier ones
 * stay. Nothing calls this automatically when red lines change.
 */
export async function recheckDocumentResponse(account: AnalyzeAccess, documentId: string, model: ModelPort) {
  if (account.kind === "not-configured") return json({ error: DOCUMENTS_ERRORS.notConfigured }, 503);
  if (account.kind === "signed-out") return json({ error: DOCUMENTS_ERRORS.signedOut }, 401);
  if (!isDocumentId(documentId)) return json({ error: DOCUMENTS_ERRORS.notFound }, 404);

  let text: string | null;
  try {
    text = await account.library.readDocumentText(account.userId, documentId);
  } catch (err) {
    console.error("[recheck] read failed:", (err as Error).message);
    return json({ error: DOCUMENTS_ERRORS.unavailable }, 502);
  }
  if (text === null) return json({ error: DOCUMENTS_ERRORS.notFound }, 404);

  const redLines = await loadRedLinesFor(account);
  if (!redLines) return json({ error: ANALYZE_ERRORS.redLinesFailed }, 502);

  return analyzeAndSave(account, documentId, text, redLines, model);
}
