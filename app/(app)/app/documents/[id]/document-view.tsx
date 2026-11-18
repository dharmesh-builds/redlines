import Link from "next/link";
import { formatSavedDate, type DocumentDetail } from "../../../../../lib/library/library";
import { redLineKey } from "../../../../../lib/analysis/red-lines";
import { ReportView } from "../../../analyze/analyze-form";
import { QuestionBox } from "../../../analyze/question-box";
import { DeleteDocument } from "./delete-document";
import { RecheckDocument } from "./recheck-document";

function sameRedLines(a: readonly string[], b: readonly string[]): boolean {
  const keys = (lines: readonly string[]) => [...new Set(lines.map(redLineKey))].sort().join("\n");
  return keys(a) === keys(b);
}

// One saved agreement: its latest report exactly as saved, the model it was
// produced with, the red lines it ran with, a way to check it again with the
// current red lines, and a way to delete it.
export function DocumentView({
  detail,
  currentRedLines = null,
  rechecked = false,
}: {
  detail: DocumentDetail;
  // The reader's red lines now, or null if they couldn't be read.
  currentRedLines?: readonly string[] | null;
  rechecked?: boolean;
}) {
  const back = (
    <p className="field-note doc-back">
      <Link href="/app">Back to your library</Link>
    </p>
  );

  if (detail.kind === "not-found") {
    return (
      <section className="app-panel" aria-labelledby="doc-title">
        {back}
        <h1 id="doc-title" className="app-title">
          This agreement isn&rsquo;t in your library
        </h1>
        <p className="app-lede">It may have been deleted.</p>
      </section>
    );
  }

  if (detail.kind === "unavailable") {
    return (
      <section className="app-panel" aria-labelledby="doc-title">
        {back}
        <h1 id="doc-title" className="app-title">
          This agreement didn&rsquo;t load
        </h1>
        <p className="app-lede" role="alert">
          Redline couldn&rsquo;t reach the database. Reload the page in a minute.
        </p>
      </section>
    );
  }

  const { document, report } = detail;
  const current = report?.content.kind === "current" ? report.content.report : null;
  const outOfDate = current !== null && currentRedLines !== null && !sameRedLines(current.redLines, currentRedLines);
  return (
    <section className="app-panel app-panel-wide" aria-labelledby="doc-title">
      {back}
      <h1 id="doc-title" className="app-title doc-name">
        {document.name}
      </h1>
      {report ? (
        <p className="field-note doc-meta">
          Checked on <time dateTime={report.meta.createdAt}>{formatSavedDate(report.meta.createdAt)}</time> with
          the model <code className="model-id">{report.meta.modelId}</code>.
        </p>
      ) : null}
      {rechecked ? (
        <p className="field-note library-notice" role="status">
          Checked again with your current red lines. Earlier reports are still saved.
        </p>
      ) : null}
      {outOfDate ? <p className="field-note red-line-stale">Your red lines have changed since this check.</p> : null}
      <RecheckDocument documentId={document.id} />

      {!report ? (
        <div className="library-state">
          <h2 className="app-subtitle">No report saved for this agreement</h2>
          <p className="app-lede">
            The text was saved, but the check didn&rsquo;t finish, so there&rsquo;s no report. To get one, paste the
            text into <Link href="/analyze">Check an agreement</Link> again.
          </p>
        </div>
      ) : report.content.kind === "outdated" ? (
        <div className="library-state">
          <h2 className="app-subtitle">This report was made by an older version of Redline</h2>
          <p className="app-lede">
            It lacks parts this version adds, such as confidence labels and counter-offers, so Redline won&rsquo;t
            show it. <Link href="/analyze">Check the agreement again</Link> to get a full report.
          </p>
        </div>
      ) : (
        <ReportView report={report.content.report} saved={false} showRedLines />
      )}

      {/* Questions read the saved text, so they work even without a current report. */}
      <QuestionBox target={{ kind: "document", documentId: document.id }} />

      <DeleteDocument documentId={document.id} name={document.name} />
    </section>
  );
}
