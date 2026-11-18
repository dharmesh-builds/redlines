import { analyze } from "../../../lib/analysis";
import { ANALYZE_ERRORS, type AnalyzeResponse } from "../../../lib/api/analyze-contract";
import { checkDocumentText } from "../../../lib/document-input";
import { createOpenRouterModel } from "../../../lib/model/openrouter";
import { readDocumentText, saveDocument, saveReport } from "../../../lib/storage/documents";
import { getSignedInUser } from "../../../lib/supabase/session";

// POST /api/analyze  { text: string, name?: string }
// The browser sends only the extracted text, never the file. Signed in (and
// Supabase configured): the text is stored first, read back, and analysed;
// the report is saved with its model ID. Otherwise: analysed, nothing stored.

const DEFAULT_NAME = "Pasted agreement";

function json(body: AnalyzeResponse, status = 200) {
  return Response.json(body, { status });
}

export async function POST(request: Request) {
  let body: { text?: unknown; name?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: ANALYZE_ERRORS.badRequest }, 400);
  }
  if (typeof body !== "object" || body === null) return json({ error: ANALYZE_ERRORS.badRequest }, 400);

  const checked = checkDocumentText(body.text);
  if (!checked.ok) return json({ error: checked.message }, 400);
  const name =
    typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 200) : DEFAULT_NAME;

  const model = createOpenRouterModel();
  const session = await getSignedInUser();

  try {
    if (!session) {
      const report = await analyze(checked.text, [], model);
      return json({ report, saved: false });
    }

    let documentId: string;
    let storedText: string;
    try {
      documentId = await saveDocument(session.supabase, session.user.id, { name, text: checked.text });
      storedText = await readDocumentText(session.supabase, documentId);
    } catch (err) {
      console.error("[analyze] save failed:", (err as Error).message);
      return json({ error: ANALYZE_ERRORS.saveFailed }, 500);
    }

    const redLines: string[] = [];
    const report = await analyze(storedText, redLines, model);
    try {
      await saveReport(session.supabase, session.user.id, documentId, report, redLines);
    } catch (err) {
      console.error("[analyze] report save failed:", (err as Error).message);
      return json({ error: ANALYZE_ERRORS.saveFailed }, 500);
    }
    return json({ report, saved: true, documentId });
  } catch (err) {
    const code = (err as { code?: string }).code;
    console.error("[analyze]", (err as Error).message);
    if (code === "model_not_configured") return json({ error: ANALYZE_ERRORS.notConfigured }, 503);
    if (code === "model_output_invalid") return json({ error: ANALYZE_ERRORS.modelOutput }, 502);
    return json({ error: ANALYZE_ERRORS.modelFailed }, 502);
  }
}
