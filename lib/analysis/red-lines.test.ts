import { describe, expect, it } from "vitest";
import { analyze, type Report, type Severity } from "./index";
import type { CandidateFlag, ModelOutput } from "./contract";
import {
  fixtureSidecar,
  fixtureText,
  payloadFromSidecar,
  scriptedModel,
  tamperedPayload,
} from "../../tests/support/scripted-model";

// Red lines (ADR 0003, spec T5). The scripted model plays a model that was
// given the red lines: it marks the clauses that go against them and adds
// flags it would only raise because of a red line. Everything after the
// model port is real.

const adhesion = fixtureText("adhesion-contract");
const planted = fixtureSidecar("adhesion-contract").clauses;
const sentenceOf = (id: string) => planted.find((c) => c.id === id)!.sentences;

// Fixture sentences no built-in flag quotes. A model would flag them only
// because a red line asks it to.
const DISPUTE_WINDOW =
  "Customer must notify Vendor in writing of any disputed invoice amount within 15 days of the invoice date, after which the invoice is treated as accepted.";
const ASSIGNMENT =
  "Customer may not assign this Agreement without Vendor's prior written consent, but Vendor may assign it to a successor in a merger or sale of its business.";

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();
const inText = (sentence: string) => collapse(adhesion).includes(collapse(sentence));

function redLineFlag(sentence: string, matchedRedLine: string, clauseType: CandidateFlag["clauseType"] = "other"): CandidateFlag {
  return {
    clauseType,
    sourceSentences: [sentence],
    explanation: "The clause goes against one of your red lines.",
    figures: [],
    costsMoney: false,
    capStated: false,
    undefinedTerms: [],
    refersToOutsideTerms: false,
    matchedRedLine,
    counterOffer: { rewrittenClause: "Both parties need the other's written consent to assign this Agreement.", request: "Could we change this clause so neither of us can assign it without the other's consent?" },
  };
}

// What a model given `lines` adds to its answer. Each red line in the pool
// has its own effect; some are reported with different spacing or case, one
// comes with a fabricated quote, and the model also invents a red line the
// user never wrote. Code must keep only what is supplied and verified.
const POOL = [
  "No automatic renewal",
  "No uncapped indemnity",
  "Vendor can't change the terms without my agreement",
  "Disputes go to court, not arbitration",
  "I need at least 30 days to dispute an invoice",
  "Vendor can't assign the contract without my consent",
  "No early termination fee",
] as const;

function mark(payload: ModelOutput, clauseType: CandidateFlag["clauseType"], reported: string) {
  for (const flag of payload.candidateFlags) if (flag.clauseType === clauseType) flag.matchedRedLine = reported;
}

function withRedLines(base: ModelOutput, lines: readonly string[]): ModelOutput {
  const payload = structuredClone(base);
  for (const line of lines) {
    switch (line) {
      case "No automatic renewal":
        mark(payload, "auto_renewal", "  no AUTOMATIC renewal ");
        break;
      case "No uncapped indemnity":
        mark(payload, "indemnity", line);
        break;
      case "Vendor can't change the terms without my agreement":
        mark(payload, "unilateral_change", line);
        // The model also claims a red line nobody wrote.
        mark(payload, "price_increase", "No price rises, ever");
        break;
      case "Disputes go to court, not arbitration":
        mark(payload, "boilerplate", line);
        break;
      case "I need at least 30 days to dispute an invoice":
        payload.candidateFlags.push(redLineFlag(DISPUTE_WINDOW, line, "payment"));
        // A red-line flag whose quote isn't in the document.
        payload.candidateFlags.push(
          redLineFlag("Customer must dispute an invoice within 5 days of the invoice date.", line, "payment"),
        );
        break;
      case "Vendor can't assign the contract without my consent":
        payload.candidateFlags.push(redLineFlag(ASSIGNMENT, line));
        break;
      case "No early termination fee":
        mark(payload, "minimum_commitment", line.toUpperCase());
        break;
    }
  }
  return payload;
}

// Several model answers, all derived from the adhesion sidecar.
const VARIANTS: Record<string, ModelOutput> = {
  "every planted clause": payloadFromSidecar("adhesion-contract"),
  "plus a fabricated flag": tamperedPayload("adhesion-contract", (p) => {
    p.candidateFlags.push({
      ...p.candidateFlags[0],
      sourceSentences: ["Vendor may charge Customer any amount at any time."],
      figures: [],
    });
  }),
  "boilerplate only": tamperedPayload("adhesion-contract", (p) => {
    p.candidateFlags = p.candidateFlags.filter((f) => f.clauseType === "boilerplate");
  }),
  "reversed, with a broken figure": tamperedPayload("adhesion-contract", (p) => {
    p.candidateFlags.reverse();
    const fee = p.candidateFlags.find((f) => f.clauseType === "minimum_commitment")!;
    fee.figures[0].sourceSentence = fee.figures[0].sourceSentence.replace("$2,250", "$1,250");
  }),
  "money clauses only": tamperedPayload("adhesion-contract", (p) => {
    p.candidateFlags = p.candidateFlags.filter((f) => f.costsMoney);
  }),
};

const RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2 };
const keyOf = (f: { clauseType: string; sourceSentences: string[] }) =>
  `${f.clauseType}|${f.sourceSentences.map(collapse).join(" || ")}`;

function expectNothingRemovedOrLowered(before: Report, after: Report, label: string) {
  const later = new Map(after.flags.map((f) => [keyOf(f), f]));
  for (const flag of before.flags) {
    const still = later.get(keyOf(flag));
    expect(still, `${label}: ${keyOf(flag)} disappeared`).toBeDefined();
    expect(RANK[still!.severity], `${label}: ${keyOf(flag)} was lowered`).toBeGreaterThanOrEqual(RANK[flag.severity]);
  }
}

async function run(base: ModelOutput, lines: readonly string[]) {
  return analyze(adhesion, lines, scriptedModel(withRedLines(base, lines)));
}

describe("T5: a red line never removes a flag or lowers a severity", () => {
  for (const [name, base] of Object.entries(VARIANTS)) {
    it(`holds for red-line sets of increasing size: ${name}`, async () => {
      for (const pool of [POOL, [...POOL].reverse()]) {
        const none = await run(base, []);
        let previous = none;
        for (let size = 1; size <= pool.length; size++) {
          const lines = pool.slice(0, size);
          const report = await run(base, lines);
          const label = `${name}, ${size} red lines`;
          expectNothingRemovedOrLowered(previous, report, label);
          expectNothingRemovedOrLowered(none, report, label);
          for (const flag of report.flags) {
            // Only a supplied red line is ever shown, and every flag cites the document.
            if (flag.matchedRedLine !== null) expect(lines).toContain(flag.matchedRedLine);
            for (const sentence of flag.sourceSentences) expect(inText(sentence), label).toBe(true);
            expect(RANK[flag.severity]).toBeGreaterThanOrEqual(RANK[flag.builtInSeverity]);
          }
          previous = report;
        }
      }
    });
  }
});

describe("matching a red line", () => {
  const base = payloadFromSidecar("adhesion-contract");
  const flagFor = (report: Report, id: string) =>
    report.flags.find((f) => keyOf(f) === keyOf({ clauseType: planted.find((c) => c.id === id)!.clauseType, sourceSentences: sentenceOf(id) }))!;

  it("counts only a red line the user supplied, after trimming and case-folding", async () => {
    const payload = structuredClone(base);
    const fee = payload.candidateFlags.find((f) => f.clauseType === "minimum_commitment")!;
    const law = payload.candidateFlags.find((f) => f.clauseType === "boilerplate")!;
    fee.matchedRedLine = "No early-termination fees"; // a paraphrase of the supplied line
    law.matchedRedLine = "Never sign anything governed by Oregon law"; // made up

    const report = await analyze(adhesion, ["No early termination fee"], scriptedModel(payload));
    const shownFee = flagFor(report, "early-termination-fee");
    expect(shownFee.matchedRedLine).toBeNull();
    expect(shownFee.severity).toBe("medium");
    expect(report.flags.every((f) => f.matchedRedLine === null)).toBe(true);
    expect(JSON.stringify(report)).not.toContain("Never sign anything");

    fee.matchedRedLine = "  no EARLY termination FEE  ";
    const matched = await analyze(adhesion, ["No early termination fee"], scriptedModel(payload));
    expect(flagFor(matched, "early-termination-fee").matchedRedLine).toBe("No early termination fee");
  });

  it("ignores any reported match when the user has no red lines", async () => {
    const payload = withRedLines(base, POOL);
    const report = await analyze(adhesion, [], scriptedModel(payload));
    expect(report.flags.every((f) => f.matchedRedLine === null && f.severity === f.builtInSeverity)).toBe(true);
    expect(report.redLines).toEqual([]);
  });

  it("raises a Medium or Low flag to High and says which red line it matched", async () => {
    const lines = ["No early termination fee", "Disputes go to court, not arbitration"];
    const report = await run(base, lines);

    const fee = flagFor(report, "early-termination-fee");
    expect(fee).toMatchObject({ severity: "high", builtInSeverity: "medium", matchedRedLine: "No early termination fee" });
    const arbitration = flagFor(report, "arbitration-class-waiver");
    expect(arbitration).toMatchObject({
      severity: "high",
      builtInSeverity: "low",
      matchedRedLine: "Disputes go to court, not arbitration",
    });
    // Exposure stays what the document supports; only severity moves.
    expect(fee.exposure.kind).toBe("stated");
    expect(arbitration.exposure.kind).toBe("none");
    // A High flag now exists, so the "nothing costs you money" verdict is gone.
    expect(report.verdict.present).toBe(false);
  });

  it("leaves an already-High flag High and still shows the red line", async () => {
    const report = await run(base, ["No uncapped indemnity"]);
    expect(flagFor(report, "customer-indemnity")).toMatchObject({
      severity: "high",
      builtInSeverity: "high",
      matchedRedLine: "No uncapped indemnity",
    });
  });

  it("adds a flag that exists only because of a red line, with its verified quote", async () => {
    const line = "Vendor can't assign the contract without my consent";
    const without = await analyze(adhesion, [], scriptedModel(base));
    expect(without.flags.some((f) => f.sourceSentences.includes(ASSIGNMENT))).toBe(false);

    const report = await run(base, [line]);
    const added = report.flags.find((f) => f.sourceSentences.includes(ASSIGNMENT))!;
    expect(added).toMatchObject({ severity: "high", builtInSeverity: "low", matchedRedLine: line });
    expect(inText(added.sourceSentences[0])).toBe(true);
    expect(report.flags).toHaveLength(without.flags.length + 1);
    // Ranked with the other High flags, ahead of every Medium one.
    const firstMedium = report.flags.findIndex((f) => f.severity === "medium");
    expect(report.flags.indexOf(added)).toBeLessThan(firstMedium);
  });

  it("drops a red-line flag whose quote is not in the document", async () => {
    const line = "I need at least 30 days to dispute an invoice";
    const report = await run(base, [line]);
    const redLineFlags = report.flags.filter((f) => f.matchedRedLine === line);
    expect(redLineFlags.map((f) => f.sourceSentences)).toEqual([[DISPUTE_WINDOW]]);
    expect(JSON.stringify(report)).not.toContain("within 5 days of the invoice date");
    expect(report.candidateFlagCount).toBe(base.candidateFlags.length + 2);
    expect(report.droppedFlagCount).toBe(1);
  });

  it("sends the red lines to the model and records the cleaned list as the report's snapshot", async () => {
    const model = scriptedModel(base);
    const report = await analyze(adhesion, ["  No automatic renewal ", "", "no automatic renewal", "No uncapped indemnity"], model);
    expect(report.redLines).toEqual(["No automatic renewal", "No uncapped indemnity"]);
    for (const line of report.redLines) expect(model.requests[0].prompt).toContain(line);
  });
});
