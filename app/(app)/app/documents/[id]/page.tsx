import { redirect } from "next/navigation";
import { libraryAccess } from "../../../../../lib/library/access";
import { loadDocument } from "../../../../../lib/library/library";
import { DocumentView } from "./document-view";

type Params = Promise<{ id: string }>;

// /app/documents/:id: one saved agreement and its latest report, as saved.
// Opening it never re-runs the analysis.
export default async function DocumentPage({ params }: { params: Params }) {
  const { id } = await params;
  const access = await libraryAccess();
  if (access.kind !== "ok") redirect(`/sign-in?next=/app/documents/${encodeURIComponent(id)}`);
  const detail = await loadDocument(access.repo, access.userId, id);
  return <DocumentView detail={detail} />;
}
