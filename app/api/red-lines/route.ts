import { accountAccess } from "../../../lib/account/access";
import { createRedLineResponse, listRedLinesResponse } from "../../../lib/api/red-lines-api";

// GET /api/red-lines: the signed-in user's red lines, oldest first.
export async function GET() {
  return listRedLinesResponse(await accountAccess());
}

// POST /api/red-lines  { text: string }: adds a red line.
export async function POST(request: Request) {
  return createRedLineResponse(await accountAccess(), request);
}
