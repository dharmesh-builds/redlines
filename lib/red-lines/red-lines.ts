import { redLineKey } from "../analysis/red-lines";
import type { RedLineRepository, RedLineRow } from "./repository";

// The red-line list's behaviour, independent of where rows live: validation,
// ordering, duplicates and the count limit. Any storage failure becomes
// "unavailable" so pages and routes show an error state instead of crashing.
// Editing a red line never re-runs a past analysis.

export type { RedLineRepository, RedLineRow } from "./repository";

// A red line is one plain sentence about one term. 300 characters fits a long
// sentence; anything longer is usually several red lines run together.
export const MAX_RED_LINE_CHARS = 300;
// Every red line is sent with every analysis, so the list is kept short
// enough to stay readable in the prompt and on the report.
export const MAX_RED_LINES = 30;

export const RED_LINE_ERRORS = {
  empty: "Write the red line before saving it.",
  tooLong: `Keep a red line under ${MAX_RED_LINE_CHARS} characters. If it covers several terms, split it into separate red lines.`,
  duplicate: "You already have that red line.",
  tooMany: `You can keep up to ${MAX_RED_LINES} red lines. Delete one to add another.`,
} as const;

export type CheckedText = { ok: true; text: string } | { ok: false; message: string };

/** Trims and collapses inner whitespace, then checks the length. */
export function checkRedLineText(value: unknown): CheckedText {
  if (typeof value !== "string") return { ok: false, message: RED_LINE_ERRORS.empty };
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return { ok: false, message: RED_LINE_ERRORS.empty };
  if (text.length > MAX_RED_LINE_CHARS) return { ok: false, message: RED_LINE_ERRORS.tooLong };
  return { ok: true, text };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isRedLineId(id: string): boolean {
  return UUID.test(id);
}

function time(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

/** Oldest first, so a new red line goes to the bottom of the list. */
function inOrder(rows: readonly RedLineRow[]): RedLineRow[] {
  return [...rows].sort((a, b) => time(a.createdAt) - time(b.createdAt));
}

function unavailable(action: string, err: unknown) {
  console.error(`[red-lines] ${action} failed:`, (err as Error).message);
  return { kind: "unavailable" } as const;
}

export type RedLineList = { kind: "ok"; redLines: RedLineRow[] } | { kind: "unavailable" };

export async function loadRedLines(repo: RedLineRepository, userId: string): Promise<RedLineList> {
  try {
    return { kind: "ok", redLines: inOrder(await repo.list(userId)) };
  } catch (err) {
    return unavailable("list", err);
  }
}

/** The texts an analysis runs with, in list order. Throws if storage fails. */
export async function redLineTexts(repo: RedLineRepository, userId: string): Promise<string[]> {
  return inOrder(await repo.list(userId)).map((r) => r.text);
}

export type SaveResult =
  | { kind: "saved"; redLine: RedLineRow }
  | { kind: "invalid"; message: string }
  | { kind: "not-found" }
  | { kind: "unavailable" };

export async function addRedLine(repo: RedLineRepository, userId: string, value: unknown): Promise<SaveResult> {
  const checked = checkRedLineText(value);
  if (!checked.ok) return { kind: "invalid", message: checked.message };
  try {
    const existing = await repo.list(userId);
    if (existing.some((r) => redLineKey(r.text) === redLineKey(checked.text))) {
      return { kind: "invalid", message: RED_LINE_ERRORS.duplicate };
    }
    if (existing.length >= MAX_RED_LINES) return { kind: "invalid", message: RED_LINE_ERRORS.tooMany };
    return { kind: "saved", redLine: await repo.create(userId, checked.text) };
  } catch (err) {
    return unavailable("add", err);
  }
}

export async function editRedLine(
  repo: RedLineRepository,
  userId: string,
  id: string,
  value: unknown,
): Promise<SaveResult> {
  if (!isRedLineId(id)) return { kind: "not-found" };
  const checked = checkRedLineText(value);
  if (!checked.ok) return { kind: "invalid", message: checked.message };
  try {
    const existing = await repo.list(userId);
    if (!existing.some((r) => r.id === id)) return { kind: "not-found" };
    if (existing.some((r) => r.id !== id && redLineKey(r.text) === redLineKey(checked.text))) {
      return { kind: "invalid", message: RED_LINE_ERRORS.duplicate };
    }
    const updated = await repo.update(userId, id, checked.text);
    return updated ? { kind: "saved", redLine: updated } : { kind: "not-found" };
  } catch (err) {
    return unavailable("edit", err);
  }
}

export type RemoveResult = { kind: "deleted" } | { kind: "not-found" } | { kind: "unavailable" };

export async function deleteRedLine(repo: RedLineRepository, userId: string, id: string): Promise<RemoveResult> {
  if (!isRedLineId(id)) return { kind: "not-found" };
  try {
    return (await repo.remove(userId, id)) ? { kind: "deleted" } : { kind: "not-found" };
  } catch (err) {
    return unavailable("delete", err);
  }
}
