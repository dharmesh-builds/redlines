import { askTextResponse } from "../../../lib/api/ask-api";
import { libraryAccess } from "../../../lib/library/access";
import { createOpenRouterModel } from "../../../lib/model/openrouter";

// POST /api/ask  { text: string, question: string }
// For the /analyze page when nothing is stored: answers from the text just
// analysed. Refuses a signed-out reader. The answer is returned, never stored.
export async function POST(request: Request) {
  return askTextResponse(request, await libraryAccess(), createOpenRouterModel());
}
