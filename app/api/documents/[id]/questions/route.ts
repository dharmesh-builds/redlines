import { askDocumentResponse } from "../../../../../lib/api/ask-api";
import { libraryAccess } from "../../../../../lib/library/access";
import { createOpenRouterModel } from "../../../../../lib/model/openrouter";

type Params = { params: Promise<{ id: string }> };

// POST /api/documents/:id/questions  { question: string }
// Answers from the saved text, read under the signed-in user's session.
// The answer is returned, never stored.
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return askDocumentResponse(request, await libraryAccess(), id, createOpenRouterModel());
}
