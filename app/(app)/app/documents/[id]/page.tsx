import { redirect } from "next/navigation";
import { accountAccess } from "../../../../../lib/account/access";
import { loadDocument } from "../../../../../lib/library/library";
import { loadRedLines } from "../../../../../lib/red-lines/red-lines";
import { DocumentView } from "./document-view";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// /app/documents/:id: one saved agreement and its latest report, as saved.
// Opening it never re-runs the analysis. The user's current red lines are
// read only to say whether the report's snapshot is out of date.
export default async function DocumentPage({ params, searchParams }: { params: Params; searchParams?: SearchParams }) {
  const { id } = await params;
  const access = await accountAccess();
  if (access.kind !== "ok") redirect(`/sign-in?next=/app/documents/${encodeURIComponent(id)}`);
  const query = searchParams ? await searchParams : {};
  // ?report=<id> opens an earlier report; anything else shows the latest.
  const reportId = typeof query.report === "string" ? query.report : undefined;
  const detail = await loadDocument(access.library, access.userId, id, reportId);
  const current = detail.kind === "ok" ? await loadRedLines(access.redLines, access.userId) : null;
  return (
    <DocumentView
      detail={detail}
      currentRedLines={current?.kind === "ok" ? current.redLines.map((r) => r.text) : null}
      rechecked={query.rechecked === "1"}
    />
  );
}
