import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DEADLINE_RELATIONS, type DeadlineRelation } from "../../lib/analysis/contract";
import type { Severity } from "../../lib/analysis";
import { createVerifier } from "../../lib/analysis/verbatim";

// The label format shared by the eval harness (ticket 12) and the labelled
// fixture set (ticket 13). It is the existing fixture sidecar shape; the eval
// reads only the fields below and ignores the rest (explanation, figures,
// counterOffer and so on, which the scripted test model uses). See
// tests/eval/README.md for the labeller's version of this.

export const SEVERITIES = ["high", "medium", "low"] as const satisfies readonly Severity[];

export type LabelledClause = {
  id: string;
  // Every sentence of the clause, copied word for word from the document.
  sentences: string[];
  expectedSeverity: Severity;
};

export type LabelledDeadline = {
  days: number;
  relation: DeadlineRelation;
  referencePoint: string;
  // Other wordings of the same reference point that count as exact.
  acceptedReferencePoints?: string[];
  sentence: string;
};

export type LabelledIncorporatedTerm = {
  description: string;
  sentence: string;
};

export type LooksRiskyButIsnt = {
  id: string;
  sentences: string[];
  why: string;
};

export type EvalLabels = {
  document: string;
  // True for seed labels written by an agent, not yet checked by a person.
  provisional: boolean;
  clauses: LabelledClause[];
  deadlines: LabelledDeadline[];
  incorporatedTerms: LabelledIncorporatedTerm[];
  looksRiskyButIsnt: LooksRiskyButIsnt[];
};

export type LabelledFixture = {
  name: string;
  documentText: string;
  labels: EvalLabels;
};

// ---------------------------------------------------------------------------
// Validation. Hand-rolled (no schema library), reporting every problem with
// its path, plus a check that every labelled sentence is really in the
// document: a label that can't be matched would silently score as a miss.

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "";
}

function list(o: Obj, key: string, path: string, errors: string[]): unknown[] {
  const v = o[key];
  if (!Array.isArray(v)) {
    errors.push(`${path}.${key} must be a list`);
    return [];
  }
  return v;
}

function text(o: Obj, key: string, path: string, errors: string[]): string {
  const v = o[key];
  if (!nonEmptyString(v)) {
    errors.push(`${path}.${key} must be a non-empty string`);
    return "";
  }
  return v;
}

function sentenceList(o: Obj, key: string, path: string, errors: string[]): string[] {
  const items = list(o, key, path, errors);
  if (Array.isArray(o[key]) && items.length === 0) errors.push(`${path}.${key} must not be empty`);
  return items.filter((s, i) => {
    if (nonEmptyString(s)) return true;
    errors.push(`${path}.${key}[${i}] must be a non-empty string`);
    return false;
  }) as string[];
}

export type ParseResult = { ok: true; labels: EvalLabels } | { ok: false; errors: string[] };

/** Checks `raw` (a parsed sidecar) against the label format and against `documentText`. */
export function parseLabels(raw: unknown, documentText: string): ParseResult {
  const errors: string[] = [];
  if (!isObj(raw)) return { ok: false, errors: ["labels must be a JSON object"] };

  const document = text(raw, "document", "labels", errors);
  if (raw.provisional !== undefined && typeof raw.provisional !== "boolean") {
    errors.push("labels.provisional must be true or false");
  }

  const clauses = list(raw, "clauses", "labels", errors).map((c, i): LabelledClause => {
    const path = `labels.clauses[${i}]`;
    if (!isObj(c)) {
      errors.push(`${path} must be an object`);
      return { id: "", sentences: [], expectedSeverity: "low" };
    }
    const severity = c.expectedSeverity;
    if (!SEVERITIES.includes(severity as Severity)) {
      errors.push(`${path}.expectedSeverity must be one of: ${SEVERITIES.join(", ")}`);
    }
    return {
      id: text(c, "id", path, errors),
      sentences: sentenceList(c, "sentences", path, errors),
      expectedSeverity: severity as Severity,
    };
  });

  const deadlines = list(raw, "deadlines", "labels", errors).map((d, i): LabelledDeadline => {
    const path = `labels.deadlines[${i}]`;
    if (!isObj(d)) {
      errors.push(`${path} must be an object`);
      return { days: 0, relation: "before", referencePoint: "", sentence: "" };
    }
    if (typeof d.days !== "number" || !Number.isInteger(d.days) || d.days <= 0) {
      errors.push(`${path}.days must be a positive whole number`);
    }
    if (!DEADLINE_RELATIONS.includes(d.relation as DeadlineRelation)) {
      errors.push(`${path}.relation must be one of: ${DEADLINE_RELATIONS.join(", ")}`);
    }
    let accepted: string[] | undefined;
    if (d.acceptedReferencePoints !== undefined) {
      accepted = sentenceList(d, "acceptedReferencePoints", path, errors);
    }
    return {
      days: d.days as number,
      relation: d.relation as DeadlineRelation,
      referencePoint: text(d, "referencePoint", path, errors),
      ...(accepted ? { acceptedReferencePoints: accepted } : {}),
      sentence: text(d, "sentence", path, errors),
    };
  });

  const incorporatedTerms = list(raw, "incorporatedTerms", "labels", errors).map(
    (t, i): LabelledIncorporatedTerm => {
      const path = `labels.incorporatedTerms[${i}]`;
      if (!isObj(t)) {
        errors.push(`${path} must be an object`);
        return { description: "", sentence: "" };
      }
      return { description: text(t, "description", path, errors), sentence: text(t, "sentence", path, errors) };
    },
  );

  const looksRiskyButIsnt = list(raw, "looksRiskyButIsnt", "labels", errors).map((l, i): LooksRiskyButIsnt => {
    const path = `labels.looksRiskyButIsnt[${i}]`;
    if (!isObj(l)) {
      errors.push(`${path} must be an object`);
      return { id: "", sentences: [], why: "" };
    }
    return {
      id: text(l, "id", path, errors),
      sentences: sentenceList(l, "sentences", path, errors),
      why: text(l, "why", path, errors),
    };
  });

  const ids = [...clauses.map((c) => c.id), ...looksRiskyButIsnt.map((l) => l.id)].filter(Boolean);
  for (const id of new Set(ids)) {
    if (ids.filter((x) => x === id).length > 1) errors.push(`id "${id}" is used more than once`);
  }

  // Every labelled sentence must be in the document word for word, using the
  // same normalization the product's verbatim check uses.
  const verifier = createVerifier(documentText);
  const quoted: [string, string][] = [
    ...clauses.flatMap((c, i) => c.sentences.map((s, j): [string, string] => [`labels.clauses[${i}].sentences[${j}]`, s])),
    ...deadlines.map((d, i): [string, string] => [`labels.deadlines[${i}].sentence`, d.sentence]),
    ...incorporatedTerms.map((t, i): [string, string] => [`labels.incorporatedTerms[${i}].sentence`, t.sentence]),
    ...looksRiskyButIsnt.flatMap((l, i) =>
      l.sentences.map((s, j): [string, string] => [`labels.looksRiskyButIsnt[${i}].sentences[${j}]`, s]),
    ),
  ];
  for (const [path, sentence] of quoted) {
    if (sentence && verifier.find(sentence) === null) errors.push(`${path} is not in the document word for word`);
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    labels: {
      document,
      provisional: raw.provisional === true,
      clauses,
      deadlines,
      incorporatedTerms,
      looksRiskyButIsnt,
    },
  };
}

export class LabelError extends Error {
  constructor(readonly problems: string[]) {
    super(`The labelled fixtures have problems:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    this.name = "LabelError";
  }
}

/**
 * Loads every labelled fixture in `dir`: each `*.json` file with the document
 * it names beside it. Throws a LabelError listing every problem, so a bad
 * label stops the eval before any model call is paid for.
 */
export function loadLabelledFixtures(dir: string): LabelledFixture[] {
  const problems: string[] = [];
  const fixtures: LabelledFixture[] = [];
  const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();

  for (const file of files) {
    const name = file.replace(/\.json$/, "");
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(join(dir, file), "utf8"));
    } catch (err) {
      problems.push(`${file}: not valid JSON (${(err as Error).message})`);
      continue;
    }
    const document = isObj(raw) ? raw.document : undefined;
    if (!nonEmptyString(document) || !existsSync(join(dir, document))) {
      problems.push(`${file}: "document" must name a text file in the same folder`);
      continue;
    }
    const documentText = readFileSync(join(dir, document), "utf8");
    const parsed = parseLabels(raw, documentText);
    if (parsed.ok) fixtures.push({ name, documentText, labels: parsed.labels });
    else problems.push(...parsed.errors.map((e) => `${file}: ${e}`));
  }

  if (fixtures.length === 0 && problems.length === 0) problems.push(`no labelled fixtures (*.json) in ${dir}`);
  if (problems.length > 0) throw new LabelError(problems);
  return fixtures;
}
