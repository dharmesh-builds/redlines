import { deleteDocumentResponse, documentResponse } from "../../../../lib/api/documents-api";
import { libraryAccess } from "../../../../lib/library/access";

type Params = { params: Promise<{ id: string }> };

// GET /api/documents/:id: the document and its latest saved report (no re-run).
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  return documentResponse(await libraryAccess(), id);
}

// DELETE /api/documents/:id: removes the document and all its reports.
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  return deleteDocumentResponse(await libraryAccess(), id);
}
