import { askTextResponse } from "../../../lib/api/ask-api";
import { createOpenRouterModel } from "../../../lib/model/openrouter";

// POST /api/ask  { text: string, question: string }
// For the /analyze page when nothing is stored: answers from the text just
// analysed. Needs no account. The answer is returned, never stored.
export async function POST(request: Request) {
  return askTextResponse(request, createOpenRouterModel());
}
