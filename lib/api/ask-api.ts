import { ask, type ModelPort } from "../analysis";
import { checkDocumentText } from "../document-input";
import type { LibraryAccess } from "../library/access";
import { isDocumentId } from "../library/library";
import { checkQuestion } from "../question-input";
import { ASK_ERRORS, type AskResponse } from "./ask-contract";
import { DOCUMENTS_ERRORS } from "./documents-api";

// Handlers behind POST /api/ask and POST /api/documents/[id]/questions.
// They take the resolved access and the model so the route files stay thin and
// the behaviour can be driven with any storage and a scripted model.
// Answers are returned, never stored.

function json(body: AskResponse, status = 200) {
  return Response.json(body, { status });
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = (await request.json()) as unknown;
    return typeof body === "object" && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function answer(text: string, question: string, model: ModelPort): Promise<Response> {
  try {
    return json({ answer: await ask(text, question, model) });
  } catch (err) {
    const code = (err as { code?: string }).code;
    console.error("[ask]", (err as Error).message);
    if (code === "model_not_configured") return json({ error: ASK_ERRORS.notConfigured }, 503);
    if (code === "model_output_invalid") return json({ error: ASK_ERRORS.modelOutput }, 502);
    return json({ error: ASK_ERRORS.modelFailed }, 502);
  }
}

/**
 * POST /api/ask  { text: string, question: string }
 * The /analyze flow when nothing is stored: the page sends the same text it
 * just had analysed. Same text limits as POST /api/analyze. Like analysis,
 * it refuses a signed-out reader; it only runs without an account where
 * Supabase isn't configured, so nobody could sign in.
 */
export async function askTextResponse(request: Request, access: Pick<LibraryAccess, "kind">, model: ModelPort) {
  if (access.kind === "signed-out") return json({ error: ASK_ERRORS.signedOut }, 401);

  const body = await readBody(request);
  if (!body) return json({ error: ASK_ERRORS.badRequest }, 400);

  const question = checkQuestion(body.question);
  if (!question.ok) return json({ error: question.message }, 400);
  const text = checkDocumentText(body.text);
  if (!text.ok) return json({ error: text.message }, 400);

  return answer(text.text, question.question, model);
}

/**
 * POST /api/documents/:id/questions  { question: string }
 * A saved agreement: the text is read from storage under the user's session,
 * so only the owner's stored text is ever sent to the model.
 */
export async function askDocumentResponse(
  request: Request,
  access: LibraryAccess,
  documentId: string,
  model: ModelPort,
) {
  if (access.kind === "not-configured") return json({ error: DOCUMENTS_ERRORS.notConfigured }, 503);
  if (access.kind === "signed-out") return json({ error: DOCUMENTS_ERRORS.signedOut }, 401);
  if (!isDocumentId(documentId)) return json({ error: DOCUMENTS_ERRORS.notFound }, 404);

  const body = await readBody(request);
  if (!body) return json({ error: ASK_ERRORS.badRequest }, 400);
  const question = checkQuestion(body.question);
  if (!question.ok) return json({ error: question.message }, 400);

  let text: string | null;
  try {
    text = await access.repo.readDocumentText(access.userId, documentId);
  } catch (err) {
    console.error("[ask] read failed:", (err as Error).message);
    return json({ error: DOCUMENTS_ERRORS.unavailable }, 502);
  }
  if (text === null) return json({ error: DOCUMENTS_ERRORS.notFound }, 404);

  return answer(text, question.question, model);
}
