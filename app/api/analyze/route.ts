import { accountAccess } from "../../../lib/account/access";
import { analyzeResponse } from "../../../lib/api/analyze-api";
import { createOpenRouterModel } from "../../../lib/model/openrouter";

// POST /api/analyze  { text: string, name?: string }
// Signed in: analysed against the user's red lines, then saved with them.
// Signed out or Supabase not configured: analysed with no red lines, nothing stored.
export async function POST(request: Request) {
  return analyzeResponse(request, await accountAccess(), createOpenRouterModel());
}
