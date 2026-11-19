import Link from "next/link";
import type { LibraryList } from "../../../lib/library/library";
import { LocalDate } from "../../local-date";

// The library (app shell brief, "Library"): the reader's saved agreements on
// the desk, newest first, each opening its saved report.
export function LibraryView({ list, deleted = false }: { list: LibraryList; deleted?: boolean }) {
  return (
    <section className="app-panel app-panel-wide" aria-labelledby="library-title">
      <h1 id="library-title" className="app-title">
        Your agreements
      </h1>
      {deleted ? (
        <p className="field-note library-notice" role="status">
          Agreement deleted, along with its reports.
        </p>
      ) : null}

      {list.kind === "unavailable" ? (
        <div className="library-state" role="alert">
          <h2 className="app-subtitle">Your library didn&rsquo;t load</h2>
          <p className="app-lede">
            Redline couldn&rsquo;t reach the database, so it can&rsquo;t show your saved agreements. Reload the
            page in a minute.
          </p>
        </div>
      ) : list.documents.length === 0 ? (
        <div className="library-state">
          <h2 className="app-subtitle">No saved agreements yet</h2>
          <p className="app-lede">Check an agreement while you&rsquo;re signed in and it will be saved here with its report.</p>
          <Link href="/analyze" className="cta">
            Check an agreement
          </Link>
        </div>
      ) : (
        <>
          <p className="app-lede">Agreements you check while signed in are saved here with their reports, newest first.</p>
          <ul className="library-list">
            {list.documents.map((doc) => (
              <li key={doc.id} className="library-item">
                <Link href={`/app/documents/${doc.id}`} className="library-name">
                  {doc.name}
                </Link>
                <span className="library-date num">
                  Saved <LocalDate iso={doc.createdAt} />
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
