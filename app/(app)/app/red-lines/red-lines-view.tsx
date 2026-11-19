"use client";

import { useEffect, useRef, useState } from "react";
import {
  MAX_RED_LINE_CHARS,
  MAX_RED_LINES,
  checkRedLineText,
  type RedLineList,
  type RedLineRow,
} from "../../../../lib/red-lines/red-lines";

const NETWORK_ERROR = "Redline couldn’t reach the server. Check your connection and try again.";
const RECHECK_LABEL = "Check again with my current red lines";

type Reply = { redLine?: RedLineRow; deleted?: boolean; error?: string };

async function send(url: string, method: string, body?: unknown): Promise<{ ok: boolean; reply: Reply }> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const reply = (await res.json().catch(() => ({}))) as Reply;
  return { ok: res.ok, reply };
}

// The red-line editor (app shell brief, "Red lines"): an editable list of the
// reader's own deal-breakers. Edits change future checks only; saved reports
// keep the red lines they ran with.
export function RedLinesView({ list }: { list: RedLineList }) {
  return (
    <section className="app-panel app-panel-wide" aria-labelledby="red-lines-title">
      <h1 id="red-lines-title" className="app-title">
        Your red lines
      </h1>
      <p className="app-lede">
        List the terms you won&rsquo;t accept, in your own words. When you&rsquo;re signed in, Redline checks each
        agreement against this list. A clause that goes against one of them is marked High severity, even if
        Redline would otherwise rate it lower. Red lines can raise a flag&rsquo;s severity but can&rsquo;t lower it
        or hide a flag.
      </p>
      <p className="field-note">
        Changing this list doesn&rsquo;t change reports you&rsquo;ve already saved. To check a saved agreement
        against your current list, open it and choose &ldquo;{RECHECK_LABEL}&rdquo;.
      </p>

      {list.kind === "unavailable" ? (
        <div className="library-state" role="alert">
          <h2 className="app-subtitle">Your red lines didn&rsquo;t load</h2>
          <p className="app-lede">Redline couldn&rsquo;t reach the database. Reload the page in a minute.</p>
        </div>
      ) : (
        <RedLineEditor initial={list.redLines} />
      )}
    </section>
  );
}

function RedLineEditor({ initial }: { initial: RedLineRow[] }) {
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const full = rows.length >= MAX_RED_LINES;

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checked = checkRedLineText(draft);
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { ok, reply } = await send("/api/red-lines", "POST", { text: checked.text });
      if (!ok || !reply.redLine) setError(reply.error ?? NETWORK_ERROR);
      else {
        setRows((r) => [...r, reply.redLine!]);
        setDraft("");
      }
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {rows.length === 0 ? (
        <div className="library-state">
          <h2 className="app-subtitle">No red lines yet</h2>
          <p className="app-lede">
            With no red lines, Redline ranks clauses by what they could cost you. Add the terms you won&rsquo;t sign
            and Redline will flag them as High.
          </p>
        </div>
      ) : (
        <ol className="library-list red-line-list">
          {rows.map((row) => (
            <RedLineItem
              key={row.id}
              row={row}
              onSaved={(updated) => setRows((r) => r.map((x) => (x.id === updated.id ? updated : x)))}
              onDeleted={() => setRows((r) => r.filter((x) => x.id !== row.id))}
            />
          ))}
        </ol>
      )}

      <form className="red-line-add" onSubmit={add}>
        <label htmlFor="new-red-line" className="field-label">
          Add a red line
        </label>
        <input
          id="new-red-line"
          type="text"
          className="text-input red-line-input"
          maxLength={MAX_RED_LINE_CHARS}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            // An error about the old text no longer applies once it changes.
            setError(null);
          }}
          aria-describedby="new-red-line-note"
          disabled={full}
        />
        <p id="new-red-line-note" className="field-note">
          One term per red line, for example &ldquo;No automatic renewal&rdquo; or &ldquo;No uncapped
          indemnity&rdquo;. Up to {MAX_RED_LINE_CHARS} characters.{" "}
          <span className="num">
            {rows.length} of {MAX_RED_LINES}
          </span>{" "}
          used.
        </p>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="plain-button" disabled={pending || full}>
          {pending ? "Adding…" : "Add red line"}
        </button>
      </form>
    </>
  );
}

function RedLineItem({
  row,
  onSaved,
  onDeleted,
}: {
  row: RedLineRow;
  onSaved: (row: RedLineRow) => void;
  onDeleted: () => void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "confirm-delete">("view");
  const [text, setText] = useState(row.text);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const inputId = `red-line-${row.id}`;
  const url = `/api/red-lines/${encodeURIComponent(row.id)}`;

  useEffect(() => {
    if (mode === "edit") inputRef.current?.focus();
    if (mode === "confirm-delete") cancelRef.current?.focus();
  }, [mode]);

  function reset() {
    setMode("view");
    setText(row.text);
    setError(null);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checked = checkRedLineText(text);
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { ok, reply } = await send(url, "PATCH", { text: checked.text });
      if (!ok || !reply.redLine) setError(reply.error ?? NETWORK_ERROR);
      else {
        onSaved(reply.redLine);
        setText(reply.redLine.text);
        setMode("view");
      }
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    setError(null);
    try {
      const { ok, reply } = await send(url, "DELETE");
      if (!ok) {
        setError(reply.error ?? NETWORK_ERROR);
        setPending(false);
      } else onDeleted();
    } catch {
      setError(NETWORK_ERROR);
      setPending(false);
    }
  }

  return (
    <li className="library-item red-line-item">
      {mode === "edit" ? (
        <form className="red-line-edit" onSubmit={save}>
          <label htmlFor={inputId} className="visually-hidden">
            Edit red line
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            className="text-input red-line-input"
            maxLength={MAX_RED_LINE_CHARS}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError(null);
            }}
          />
          <div className="delete-actions">
            <button type="submit" className="plain-button" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </button>
            <button type="button" className="text-button" onClick={reset} disabled={pending}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="red-line-text">{row.text}</p>
          {mode === "view" ? (
            <div className="red-line-actions">
              <button type="button" className="text-button" onClick={() => setMode("edit")}>
                Edit<span className="visually-hidden"> red line: {row.text}</span>
              </button>
              <button type="button" className="text-button" onClick={() => setMode("confirm-delete")}>
                Delete<span className="visually-hidden"> red line: {row.text}</span>
              </button>
            </div>
          ) : (
            <div className="delete-confirm red-line-confirm" role="group" aria-label="Confirm delete">
              <p className="delete-question">Delete this red line? Reports you&rsquo;ve saved keep it.</p>
              <div className="delete-actions">
                <button type="button" className="plain-button" onClick={remove} disabled={pending}>
                  {pending ? "Deleting…" : "Yes, delete it"}
                </button>
                <button ref={cancelRef} type="button" className="text-button" onClick={reset} disabled={pending}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {error ? (
        <p className="form-error red-line-error" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}
