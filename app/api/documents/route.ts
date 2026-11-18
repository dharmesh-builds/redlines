import { listDocumentsResponse } from "../../../lib/api/documents-api";
import { libraryAccess } from "../../../lib/library/access";

// GET /api/documents: the signed-in user's documents, newest first.
export async function GET() {
  return listDocumentsResponse(await libraryAccess());
}
