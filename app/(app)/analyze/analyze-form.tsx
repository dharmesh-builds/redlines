"use client";

import Link from "next/link";
import { useState } from "react";
import type { Report } from "../../../lib/analysis/analyze";
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

function ReportView({ report, saved }: Result) {
  const { flags, droppedFlagCount } = report;
  return (
    <section className="report" aria-labelledby="report-title">
      <h2 id="report-title" className="app-subtitle">
        {flags.length === 0
          ? "Redline found no clause to flag in this text."
          : `${plural(flags.length, "flag", "flags")}. Each quotes the sentence it comes from, checked word for word against your text.`}
      </h2>
      {droppedFlagCount > 0 ? (
        <p className="report-dropped">
          {droppedFlagCount} more {droppedFlagCount === 1 ? "was" : "were"} dropped because{" "}
          {droppedFlagCount === 1 ? "its quoted sentence isn't" : "their quoted sentences aren't"} in your text.
        </p>
      ) : null}
      {saved ? <p className="field-note">Saved to your account.</p> : null}

      <ol className="flag-list">
        {flags.map((flag, i) => (
          <li key={i} className="slip flag-slip">
            <h3 className="note-title">{CLAUSE_TITLES[flag.clauseType]}</h3>
            <p className="flag-explanation">{flag.explanation}</p>
            {flag.sourceSentences.map((sentence, j) => (
              <blockquote key={j} className="slip-quote">
                <mark className="on">{sentence}</mark>
              </blockquote>
            ))}
            <p className="note-verified">
              <svg className="check" aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
                <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Quoted word for word from your text
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
