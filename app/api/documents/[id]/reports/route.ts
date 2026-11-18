import { accountAccess } from "../../../../../lib/account/access";
import { recheckDocumentResponse } from "../../../../../lib/api/analyze-api";
import { createOpenRouterModel } from "../../../../../lib/model/openrouter";

type Params = { params: Promise<{ id: string }> };

// POST /api/documents/:id/reports: checks the saved text again with the
// user's current red lines and saves a new report. Earlier reports stay.
export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  return recheckDocumentResponse(await accountAccess(), id, createOpenRouterModel());
}
