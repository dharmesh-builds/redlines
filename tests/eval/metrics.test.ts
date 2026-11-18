import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { DeadlineShown, Flag, IncorporatedTermShown, Report, Severity } from "../../lib/analysis";
import { changeOneWord } from "../support/scripted-model";
import { loadLabelledFixtures, parseLabels, LabelError } from "./labels";
import {
  citationFailures,
  formatEvalReport,
  normalizeReferencePoint,
  scoreDocument,
  totalScores,
} from "./metrics";

// The eval's metric functions, driven with hand-built Reports whose quotes
// come from the fixture sidecars. The runner (run.eval.ts) calls the real
// model and is never part of this suite.

const FIXTURES = fileURLToPath(new URL("../fixtures/", import.meta.url));
const fixtures = loadLabelledFixtures(FIXTURES);
const fixture = (name: string) => {
  const found = fixtures.find((f) => f.name === name);
  if (!found) throw new Error(`no labelled fixture ${name}`);
  return found;
};

const adhesion = fixture("adhesion-contract");
const clean = fixture("clean-contract");
const orderForm = fixture("order-form-contract");

const clause = (id: string) => {
  const found = adhesion.labels.clauses.find((c) => c.id === id);
  if (!found) throw new Error(`no clause ${id}`);
  return found.sentences;
};
const decoy = (id: string) => {
  const found = adhesion.labels.looksRiskyButIsnt.find((l) => l.id === id);
  if (!found) throw new Error(`no decoy ${id}`);
  return found.sentences;
};

function flag(sentences: string[], severity: Severity, figureSentences: string[] = []): Flag {
  return {
    clauseType: "other",
    severity,
    builtInSeverity: severity,
    matchedRedLine: null,
    exposure: { kind: "unbounded", statement: "No cap is stated." },
    confidence: { level: "high", label: "High confidence", reasons: [], reasonText: null },
    figures: figureSentences.map((s) => ({
      label: "figure",
      value: 1,
      unit: "money",
      per: null,
      display: "$1",
      sourceSentence: s,
    })),
    sourceSentences: sentences,
    explanation: "Hand-built flag.",
    counterOffer: { drafted: true, replaces: sentences, rewrittenClause: "Rewritten.", request: "Could we change it?" },
  };
}

function report(parts: { flags?: Flag[]; deadlines?: DeadlineShown[]; incorporatedTerms?: IncorporatedTermShown[] }): Report {
  const flags = parts.flags ?? [];
  return {
    modelId: "hand-built/report",
    redLines: [],
    summary: {
      points: [],
      deadlines: parts.deadlines ?? [],
      incorporatedTerms: parts.incorporatedTerms ?? [],
      notStated: [],
      candidateCount: 0,
      droppedCount: 0,
    },
    verdict: { present: false },
    flags,
    candidateFlagCount: flags.length,
    droppedFlagCount: 0,
  };
}

function deadline(days: number, relation: "before" | "after", referencePoint: string, sourceSentence: string): DeadlineShown {
  return { days, relation, referencePoint, display: `${days} days ${relation} ${referencePoint}`, sourceSentence };
}

const allHighFlags = () => [
  flag(clause("auto-renewal"), "high"),
  flag(clause("customer-indemnity"), "high"),
  flag(clause("unilateral-change"), "high"),
];

describe("labelled fixtures", () => {
  it("loads the seed set, every fixture marked provisional", () => {
    expect(fixtures.map((f) => f.name)).toEqual(["adhesion-contract", "clean-contract", "order-form-contract"]);
    expect(fixtures.every((f) => f.labels.provisional)).toBe(true);
    expect(adhesion.labels.clauses.filter((c) => c.expectedSeverity === "high")).toHaveLength(3);
    expect(orderForm.labels.incorporatedTerms).toHaveLength(2);
  });

  it("rejects a label whose sentence is not in the document word for word", () => {
    const raw = {
      document: "adhesion-contract.txt",
      clauses: [{ id: "x", sentences: [changeOneWord(clause("customer-indemnity")[0], "Customer", "Vendor")], expectedSeverity: "high" }],
      deadlines: [],
      incorporatedTerms: [],
      looksRiskyButIsnt: [],
    };
    const parsed = parseLabels(raw, adhesion.documentText);
    expect(parsed).toEqual({ ok: false, errors: ["labels.clauses[0].sentences[0] is not in the document word for word"] });
  });

  it("rejects a label with a bad severity or a missing false-alarm list", () => {
    const parsed = parseLabels(
      { document: "a.txt", clauses: [{ id: "x", sentences: clause("auto-renewal"), expectedSeverity: "severe" }], deadlines: [], incorporatedTerms: [] },
      adhesion.documentText,
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.errors).toContain("labels.clauses[0].expectedSeverity must be one of: high, medium, low");
      expect(parsed.errors).toContain("labels.looksRiskyButIsnt must be a list");
    }
  });

  it("refuses to load a folder with no labelled fixtures", () => {
    expect(() => loadLabelledFixtures(fileURLToPath(new URL("../fixtures/files/", import.meta.url)))).toThrow(LabelError);
  });
});

describe("Q1: High clauses flagged High", () => {
  it("counts a High clause as found when a High flag quotes it, whole or in part", () => {
    const partial = clause("customer-indemnity")[0].slice(0, 120).replace(/\s\S*$/, "");
    const score = scoreDocument("adhesion", adhesion.documentText, adhesion.labels, report({
      flags: [flag(clause("auto-renewal"), "high"), flag([partial], "high"), flag(clause("unilateral-change"), "high")],
    }));
    expect(score.q1).toEqual({ labelled: 3, found: 3, missed: [] });
  });

  it("counts a High clause as missed when it isn't flagged, or is flagged below High", () => {
    const score = scoreDocument("adhesion", adhesion.documentText, adhesion.labels, report({
      flags: [flag(clause("auto-renewal"), "high"), flag(clause("customer-indemnity"), "medium")],
    }));
    expect(score.q1).toEqual({
      labelled: 3,
      found: 1,
      missed: [
        { id: "customer-indemnity", reason: "flagged medium" },
        { id: "unilateral-change", reason: "not flagged" },
      ],
    });
    expect(score.failures).toContain("Q1: 2 High clause(s) not flagged High");
  });
});

describe("Q2: deadlines exact", () => {
  const [renewal, breach, pay, dispute] = adhesion.labels.deadlines;

  it("matches days, side and reference point, ignoring case and articles", () => {
    const score = scoreDocument("adhesion", adhesion.documentText, adhesion.labels, report({
      flags: allHighFlags(),
      deadlines: [
        deadline(60, "before", "Renewal date", renewal.sentence),
        deadline(30, "after", "receipt of written notice of the breach", breach.sentence),
        deadline(30, "after", "the invoice date", pay.sentence),
        deadline(15, "after", "the Invoice Date.", dispute.sentence),
      ],
    }));
    expect(score.q2).toEqual({ labelled: 4, exact: 4, inexact: [] });
  });

  it("marks a wrong day count, wrong side, other reference point or missing deadline inexact", () => {
    const score = scoreDocument("adhesion", adhesion.documentText, adhesion.labels, report({
      flags: allHighFlags(),
      deadlines: [
        deadline(30, "before", "the renewal date", renewal.sentence),
        deadline(30, "before", "the invoice date", pay.sentence),
        deadline(15, "after", "the date of the invoice", dispute.sentence),
      ],
    }));
    expect(score.q2.exact).toBe(0);
    expect(score.q2.inexact).toEqual([
      { label: "60 days before the renewal date", got: ["30 days before the renewal date"] },
      { label: "30 days after receiving written notice of a material breach", got: [] },
      { label: "30 days after the invoice date", got: ["30 days before the invoice date"] },
      { label: "15 days after the invoice date", got: ["15 days after the date of the invoice"] },
    ]);
    expect(score.failures).toContain("Q2: 4 deadline(s) not stated exactly");
  });

  it("does not count the right figures cited to a different sentence", () => {
    const score = scoreDocument("adhesion", adhesion.documentText, adhesion.labels, report({
      deadlines: [deadline(15, "after", "the invoice date", pay.sentence)],
    }));
    expect(score.q2.inexact.map((m) => m.label)).toContain("15 days after the invoice date");
  });

  it("normalizes reference points without changing their words", () => {
    expect(normalizeReferencePoint("The  Renewal-Date.")).toBe("renewal-date");
    expect(normalizeReferencePoint("an invoice’s date")).toBe("invoice's date");
  });
});

describe("Q3: false alarms", () => {
  it("counts flags that match no labelled clause, naming those on looks-risky-but-isn't items", () => {
    const suspension =
      "Vendor may suspend access to the Service if an undisputed invoice remains unpaid after its due date, and will restore access promptly once the invoice is paid.";
    const score = scoreDocument("adhesion", adhesion.documentText, adhesion.labels, report({
      flags: [
        ...allHighFlags(),
        flag(clause("governing-law-venue"), "low"),
        flag([suspension], "medium"),
        flag(decoy("force-majeure"), "low"),
      ],
    }));
    expect(score.q3.shown).toBe(6);
    expect(score.q3.falseAlarms).toEqual([
      { flag: 5, kind: "unlabelled", id: null, sentence: suspension },
      { flag: 6, kind: "looks risky but isn't", id: "force-majeure", sentence: decoy("force-majeure")[0] },
    ]);
    expect(score.q3.rate).toBeCloseTo(2 / 6);
    // tracked, never a failure on its own
    expect(score.failures.filter((f) => f.startsWith("Q3") || f.startsWith("Q1"))).toEqual([]);
  });

  it("gives no rate when nothing is shown, and totals across documents by flags shown", () => {
    const empty = scoreDocument("clean", clean.documentText, clean.labels, report({}));
    expect(empty.q3).toEqual({ shown: 0, falseAlarms: [], rate: null });

    const noisy = scoreDocument("clean", clean.documentText, clean.labels, report({
      flags: [flag(clean.labels.looksRiskyButIsnt[0].sentences, "medium")],
    }));
    const tidy = scoreDocument("adhesion", adhesion.documentText, adhesion.labels, report({ flags: allHighFlags() }));
    const totals = totalScores([noisy, tidy]);
    expect(totals.q3).toEqual({ shown: 4, falseAlarms: 1, rate: 0.25 });
  });
});

describe("Q5: incorporated terms", () => {
  it("finds a labelled term by its source sentence and lists the ones missed", () => {
    const [msa, sla] = orderForm.labels.incorporatedTerms;
    const score = scoreDocument("order-form", orderForm.documentText, orderForm.labels, report({
      incorporatedTerms: [{ description: "The MSA", sourceSentence: msa.sentence, readByRedline: false }],
    }));
    expect(score.q5).toEqual({ labelled: 2, found: 1, missing: [sla.description] });
    expect(score.failures).toContain("Q5: 1 incorporated term(s) not found");
  });
});

describe("T1: every citation verified", () => {
  it("passes a report whose quotes are all in the document", () => {
    const r = report({ flags: [flag(clause("auto-renewal"), "high", clause("auto-renewal"))] });
    expect(citationFailures(adhesion.documentText, r)).toEqual([]);
  });

  it("fails a tampered flag sentence even though analyze would never return one", () => {
    const tampered = changeOneWord(clause("customer-indemnity")[0], "Customer", "Vendor");
    const score = scoreDocument("adhesion", adhesion.documentText, adhesion.labels, report({
      flags: [flag(clause("auto-renewal"), "high"), flag([tampered], "high"), flag(clause("unilateral-change"), "high")],
    }));
    expect(score.t1.failures).toEqual([
      { where: "flag 2 source sentence 1", quote: tampered },
      { where: "flag 2 counter-offer replaces 1", quote: tampered },
    ]);
    expect(score.failures[0]).toBe("T1: 2 citation(s) not in the document word for word");

    const totals = totalScores([score]);
    expect(totals.passed).toBe(false);
    expect(totals.t1Failures).toBe(2);
  });

  it("fails a tampered figure sentence and a flag with no source sentence", () => {
    const tamperedFigure = changeOneWord(clause("early-termination-fee")[0], "Customer", "Vendor");
    const r = report({ flags: [flag(clause("early-termination-fee"), "medium", [tamperedFigure]), flag([], "low")] });
    expect(citationFailures(adhesion.documentText, r)).toEqual([
      { where: "flag 1 figure 1", quote: tamperedFigure },
      { where: "flag 2: no source sentence", quote: "" },
    ]);
  });
});

describe("totals and the printed report", () => {
  it("passes only when every document passes and none errored", () => {
    const good = scoreDocument("adhesion", adhesion.documentText, adhesion.labels, report({
      flags: allHighFlags(),
      deadlines: adhesion.labels.deadlines.map((d) => deadline(d.days, d.relation, d.referencePoint, d.sentence)),
      incorporatedTerms: adhesion.labels.incorporatedTerms.map((t) => ({ description: t.description, sourceSentence: t.sentence, readByRedline: false })),
    }));
    expect(good.failures).toEqual([]);
    expect(totalScores([good]).passed).toBe(true);
    expect(totalScores([good], [{ document: "clean-contract", error: "OpenRouter returned 500" }]).passed).toBe(false);
    expect(totalScores([]).passed).toBe(false);
  });

  it("prints the model, each metric per document and in total", () => {
    const score = scoreDocument("adhesion-contract", adhesion.documentText, adhesion.labels, report({
      flags: [flag(clause("auto-renewal"), "high")],
    }));
    const text = formatEvalReport("vendor/some-model", [score], [], totalScores([score]));
    expect(text).toContain("Model (OPENROUTER_MODEL): vendor/some-model");
    expect(text).toContain("Answered by: hand-built/report");
    expect(text).toContain("== adhesion-contract (provisional labels)");
    expect(text).toContain("Q1 High clauses flagged High: 1/3 (33%)");
    expect(text).toContain("x unilateral-change: not flagged");
    expect(text).toContain("Q2 deadlines exact: 0/4 (0%)");
    expect(text).toContain("Q3 false alarms: 0/1 flags (0%)");
    expect(text).toContain("Q5 incorporated terms found: 0/2 (0%)");
    expect(text).toContain("Result: FAIL");
  });
});
