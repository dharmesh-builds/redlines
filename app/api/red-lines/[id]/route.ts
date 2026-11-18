import { accountAccess } from "../../../../lib/account/access";
import { deleteRedLineResponse, updateRedLineResponse } from "../../../../lib/api/red-lines-api";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/red-lines/:id  { text: string }: rewrites one red line.
// Saved reports keep the red lines they ran with; nothing is re-run.
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  return updateRedLineResponse(await accountAccess(), id, request);
}

// DELETE /api/red-lines/:id
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  return deleteRedLineResponse(await accountAccess(), id);
}
