"use client";

import { useState } from "react";
import type { Answer } from "../../../lib/analysis/ask";
import type { AskResponse } from "../../../lib/api/ask-contract";
import { MAX_QUESTION_CHARS, checkQuestion } from "../../../lib/question-input";

// Where the question box sends its questions. A saved agreement is asked by
// its id, so the server reads the stored text; on /analyze when nothing was
// saved, the page sends the text it just had analysed. The browser never
// calls the model.
export type QuestionTarget = { kind: "document"; documentId: string } | { kind: "text"; text: string };

export type AskedQuestion = { question: string; answer: Answer };

const NETWORK_ERROR = "Redline couldn't reach the server. Check your connection and try again.";

function endpoint(target: QuestionTarget) {
  return target.kind === "document" ? `/api/documents/${encodeURIComponent(target.documentId)}/questions` : "/api/ask";
}

export function QuestionBox({ target, initial = [] }: { target: QuestionTarget; initial?: AskedQuestion[] }) {
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Earlier answers stay on the page for this visit only. Nothing is saved.
  const [asked, setAsked] = useState<AskedQuestion[]>(initial);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checked = checkQuestion(question);
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    setError(null);
    setPending(true);
    try {
      const res = await fetch(endpoint(target), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          target.kind === "text" ? { text: target.text, question: checked.question } : { question: checked.question },
        ),
      });
      const body = (await res.json()) as AskResponse;
      if ("error" in body) setError(body.error);
      else {
        setAsked((list) => [{ question: checked.question, answer: body.answer }, ...list]);
        setQuestion("");
      }
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="question-box" aria-labelledby="question-title">
      <h2 id="question-title" className="app-subtitle">
        Ask about this agreement
      </h2>
      <p className="field-note">
        Redline answers only from the text of this agreement and quotes the sentences it used. It won&rsquo;t say
        whether a clause is legal or usual.
      </p>
      <form className="question-form" onSubmit={onSubmit}>
        <label htmlFor="question-input" className="field-label">
          Your question
        </label>
        <div className="question-row">
          <input
            id="question-input"
            type="text"
            className="text-input question-input"
            maxLength={MAX_QUESTION_CHARS}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" className="plain-button question-submit" disabled={pending}>
            Ask
          </button>
        </div>
        <p className="field-note" role="status" aria-live="polite">
          {pending ? "Looking for the answer in the agreement." : ""}
        </p>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      {asked.length > 0 ? (
        <>
          <ol className="answer-list" aria-label="Answers">
            {asked.map((item, i) => (
              <li key={asked.length - i} className="summary-sheet answer-sheet">
                <AnswerView {...item} />
              </li>
            ))}
          </ol>
          <p className="field-note">Answers stay on this page until you leave it. They aren&rsquo;t saved.</p>
        </>
      ) : null}
    </section>
  );
}

export function AnswerView({ question, answer }: AskedQuestion) {
  return (
    <>
      <p className="answer-question">{question}</p>
      {answer.kind === "answered" ? (
        <>
          <p className="answer-text">{answer.text}</p>
          {answer.sources.map((sentence, j) => (
            <blockquote key={j} className="slip-quote answer-quote">
              <mark className="on">{sentence}</mark>
            </blockquote>
          ))}
          <p className="note-verified answer-verified">
            <svg className="check" aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
              <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Quoted word for word from your text
          </p>
        </>
      ) : (
        <>
          <p className="answer-text answer-none">The document doesn&rsquo;t say.</p>
          <p className="answer-none-note">Nothing in this agreement answers that question.</p>
        </>
      )}
    </>
  );
}
