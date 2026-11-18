"use client";

import Link from "next/link";
import { useState } from "react";
import type { Flag, Report, Severity, Summary } from "../../../lib/analysis/analyze";
import type { AnalyzeResponse } from "../../../lib/api/analyze-contract";
import { CLAUSE_TITLES } from "../../../lib/clause-labels";
import { checkDocumentText } from "../../../lib/document-input";

export type SavingMode =
  | { kind: "signed-in"; email: string }
  | { kind: "anonymous" }
  | { kind: "unavailable" };

type Result = { report: Report; saved: boolean };

const NETWORK_ERROR = "Redline couldn't reach the server. Check your connection and try again.";

function isTextFile(file: File) {
  return file.type === "text/plain" || /\.txt$/i.test(file.name);
}

export function AnalyzeForm({ saving }: { saving: SavingMode }) {
  const [text, setText] = useState("");
  const [name, setName] = useState<string | null>(null);
  const [fileNote, setFileNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setFileNote(null);
    if (!isTextFile(file)) {
      setError("Only .txt files work here for now. Open the file, copy its text and paste it above.");
      return;
    }
    // Read in the browser. The file itself is never uploaded.
    const content = await file.text();
    if (content.includes("\u0000")) {
      setError("That file doesn't read as plain text. Copy the agreement's text and paste it instead.");
      return;
    }
    setText(content);
    setName(file.name);
    setFileNote(`Read ${file.name} in your browser. Its text is below. The file stays on your computer.`);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checked = checkDocumentText(text);
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    setError(null);
    setResult(null);
    setPending(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: checked.text, name: name ?? undefined }),
      });
      const body = (await res.json()) as AnalyzeResponse;
      if ("error" in body) setError(body.error);
      else setResult({ report: body.report, saved: body.saved });
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form className="analyze-form" onSubmit={onSubmit}>
        <label htmlFor="agreement-text" className="field-label">
          Agreement text
        </label>
        <textarea
          id="agreement-text"
          className="paper-input"
          rows={14}
          spellCheck={false}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (name) setName(null);
          }}
        />
        <div className="file-row">
          <label className="file-pick">
            <input type="file" accept=".txt,text/plain" onChange={onFile} className="visually-hidden" />
            <span>Choose a .txt file</span>
          </label>
          {fileNote ? <p className="field-note">{fileNote}</p> : null}
        </div>

        <p className="field-note">
          {saving.kind === "signed-in" ? (
            <>Signed in as {saving.email}. The text and its report are saved to your account.</>
          ) : saving.kind === "anonymous" ? (
            <>
              You&rsquo;re not signed in, so nothing is saved. <Link href="/sign-in?next=/analyze">Sign in</Link>{" "}
              to keep your agreements and reports.
            </>
          ) : (
            <>Nothing you paste here is saved.</>
          )}
        </p>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="cta" disabled={pending}>
          Check this agreement
        </button>
        <p className="field-note" role="status" aria-live="polite">
          {pending ? "Checking the agreement. This usually takes under a minute." : ""}
        </p>
      </form>

      {result ? <ReportView {...result} /> : null}
    </>
  );
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

const SEVERITY_LABEL: Record<Severity, string> = {
  high: "High severity",
  medium: "Medium severity",
  low: "Low severity",
};

// The summary, its deadlines and the outside documents it pulls in. Every item
// quotes the sentence it rests on, checked word for word (ADR 0001).
function SummaryView({ summary }: { summary: Summary }) {
  const { points, deadlines, incorporatedTerms, notStated, droppedCount } = summary;
  return (
    <div className="summary">
      <section className="summary-sheet" aria-labelledby="summary-title">
        <h2 id="summary-title" className="summary-heading">
          What this agreement says
        </h2>
        {points.length === 0 ? (
          <p className="summary-empty">Redline couldn&rsquo;t match any summary point to your text, so there&rsquo;s no summary.</p>
        ) : (
          <ul className="summary-list">
            {points.map((point, i) => (
              <li key={i}>
                <p className="summary-text">{point.text}</p>
                {point.sourceSentences.map((sentence, j) => (
                  <blockquote key={j} className="slip-quote summary-quote">
                    {sentence}
                  </blockquote>
                ))}
              </li>
            ))}
          </ul>
        )}
        {notStated.map((note) => (
          <p key={note.kind} className="summary-not-stated">
            {note.text}
          </p>
        ))}
        {droppedCount > 0 ? (
          <p className="summary-dropped">
            {droppedCount === 1
              ? "1 more summary item was left out because its quoted sentence isn't in your text."
              : `${droppedCount} more summary items were left out because their quoted sentences aren't in your text.`}
          </p>
        ) : null}
      </section>

      <section className="summary-sheet" aria-labelledby="deadlines-title">
        <h2 id="deadlines-title" className="summary-heading">
          Deadlines
        </h2>
        {deadlines.length === 0 ? (
          <p className="summary-empty">The document doesn&rsquo;t give any deadline in days.</p>
        ) : (
          <ul className="summary-list">
            {deadlines.map((deadline, i) => (
              <li key={i}>
                <p className="summary-text num">{deadline.display}</p>
                <blockquote className="slip-quote summary-quote">{deadline.sourceSentence}</blockquote>
              </li>
            ))}
          </ul>
        )}
      </section>

      {incorporatedTerms.length > 0 ? (
        <section className="summary-sheet" aria-labelledby="incorporated-title">
          <h2 id="incorporated-title" className="summary-heading">
            Other documents it pulls in
          </h2>
          <p className="summary-lead">
            The agreement makes these documents part of its terms. Redline read only the text you gave it.
          </p>
          <ul className="summary-list">
            {incorporatedTerms.map((term, i) => (
              <li key={i}>
                <p className="summary-text">{term.description}</p>
                <p className="summary-unread">Redline hasn&rsquo;t read this document</p>
                <blockquote className="slip-quote summary-quote">{term.sourceSentence}</blockquote>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="note-verified summary-verified">
        <svg className="check" aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
          <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Quoted word for word from your text
      </p>
    </div>
  );
}

export function ReportView({ report, saved }: Result) {
  const { flags, droppedFlagCount, verdict } = report;
  const dropped =
    droppedFlagCount > 0 ? (
      <p className="report-dropped">
        {droppedFlagCount} more {droppedFlagCount === 1 ? "was" : "were"} dropped because{" "}
        {droppedFlagCount === 1 ? "its quoted sentence isn't" : "their quoted sentences aren't"} in your text.
      </p>
    ) : null;
  const savedNote = saved ? <p className="field-note">Saved to your account.</p> : null;
  const list = (
    <ol className="flag-list">
      {flags.map((flag, i) => (
        <FlagItem key={i} flag={flag} id={`flag-${i}`} />
      ))}
    </ol>
  );

  // No High or Medium flag: the verdict leads, and any Low flags are folded
  // under it, still one keypress away (ADR 0005).
  if (verdict.present) {
    return (
      <section className="report" aria-label="Report">
        <div className="verdict-sheet report-verdict">
          <p className="verdict">{verdict.text}</p>
        </div>
        {flags.length > 0 ? (
          <details className="low-fold">
            <summary className="folded">{plural(flags.length, "low-severity flag", "low-severity flags")}</summary>
            <p className="app-subtitle report-flags-title">
              Each quotes the sentence it comes from, checked word for word against your text.
            </p>
            {list}
          </details>
        ) : null}
        {dropped}
        {savedNote}
        <SummaryView summary={report.summary} />
      </section>
    );
  }

  return (
    <section className="report" aria-label="Report">
      <SummaryView summary={report.summary} />

      <h2 id="report-title" className="app-subtitle report-flags-title">
        {flags.length === 0
          ? "Redline found no clause to flag in this text."
          : `${plural(flags.length, "flag", "flags")}, most costly first. Each quotes the sentence it comes from, checked word for word against your text.`}
      </h2>
      {dropped}
      {savedNote}
      {list}
    </section>
  );
}

function FlagItem({ flag, id }: { flag: Flag; id: string }) {
  const [open, setOpen] = useState(true);
  const { severity, exposure } = flag;
  // A figure's sentence is quoted again only when the flag doesn't already show it.
  const ownQuote = (sentence: string) => flag.sourceSentences.includes(sentence);

  return (
    <li className="flag-item">
      <button
        type="button"
        className={`tab tab-${severity} flag-tab`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        {SEVERITY_LABEL[severity]}
      </button>
      <div id={id} className={`note note-${severity} flag-note`} hidden={!open}>
        <h3 className="note-title">{CLAUSE_TITLES[flag.clauseType]}</h3>
        <p className="note-says">{flag.explanation}</p>
        {flag.sourceSentences.map((sentence, j) => (
          <blockquote key={j} className="slip-quote">
            <mark className={open ? "on" : undefined}>{sentence}</mark>
          </blockquote>
        ))}
        <dl className="note-facts">
          <div>
            <dt>Exposure</dt>
            <dd>{exposure.statement}</dd>
          </div>
          {flag.figures.length > 0 ? (
            <div>
              <dt>Figures</dt>
              <dd>
                <ul className="figure-list">
                  {flag.figures.map((figure, j) => (
                    <li key={j}>
                      <span className="num">{figure.display}</span> <span className="reason">{figure.label}</span>
                      {ownQuote(figure.sourceSentence) ? null : (
                        <span className="figure-source">
                          <span className="reason">Quoted from:</span> <q>{figure.sourceSentence}</q>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
          {exposure.kind === "stated" && exposure.twelveMonthFee ? (
            <div>
              <dt>12 months of fees</dt>
              <dd>
                <span className="num">{exposure.twelveMonthFee.arithmetic ?? exposure.twelveMonthFee.display}</span>
                <span className="figure-source">
                  <span className="reason">Quoted from:</span> <q>{exposure.twelveMonthFee.sourceSentence}</q>
                </span>
              </dd>
            </div>
          ) : null}
          <div>
            <dt>Confidence</dt>
            <dd>
              <span className="confidence-level">{flag.confidence.label}</span>
              {flag.confidence.reasonText ? (
                <>
                  {" "}
                  <span className="reason">{flag.confidence.reasonText}</span>
                </>
              ) : null}
            </dd>
          </div>
        </dl>
        <p className="note-verified">
          <svg className="check" aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
            <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Quoted word for word from your text
        </p>
      </div>
    </li>
  );
}
