import { describe, expect, it } from "vitest";
import { analyze, type Flag, type Report } from "./index";
import type { ModelOutput } from "./contract";
import {
  fixtureSidecar,
  fixtureText,
  payloadFromSidecar,
  scriptedModel,
  tamperedPayload,
} from "../../tests/support/scripted-model";

// Confidence is set by checkable rules, never by the model (ADR 0004, ADR 0006).
// Every test drives `analyze` with a scripted model built from the fixture sidecar.

const adhesion = fixtureText("adhesion-contract");
const sidecar = fixtureSidecar("adhesion-contract");
const planted = sidecar.clauses;
const clause = (id: string) => planted.find((c) => c.id === id)!;
const aupSentence = sidecar.incorporatedTerms[0].sentence;

const run = (payload: ModelOutput = payloadFromSidecar("adhesion-contract"), doc = adhesion) =>
  analyze(doc, [], scriptedModel(payload));

const flagOf = (report: Report, clauseType: Flag["clauseType"]) => {
  const flag = report.flags.find((f) => f.clauseType === clauseType);
  if (!flag) throw new Error(`no ${clauseType} flag in the report`);
  return flag;
};

const candidate = (p: ModelOutput, clauseType: Flag["clauseType"]) =>
  p.candidateFlags.find((f) => f.clauseType === clauseType)!;

describe("analyze: confidence on the planted clauses", () => {
  it.each(planted.map((c) => [c.id, c] as const))("%s gets its expected confidence", async (_id, c) => {
    const report = await run();
    const flag = report.flags.find((f) => f.sourceSentences.join(" ") === c.sentences.join(" "));
    expect(flag).toBeDefined();
    expect(flag!.confidence.level).toBe(c.expectedConfidence);
  });

  it("every label names confidence, and only High comes without a reason", async () => {
    for (const flag of (await run()).flags) {
      expect(flag.confidence.label).toMatch(/^(High|Medium|Low) confidence$/);
      if (flag.confidence.level === "high") expect(flag.confidence.reasonText).toBeNull();
      else expect(flag.confidence.reasonText).toBeTruthy();
    }
  });

  it("the indemnity flag says which term the document never defines", async () => {
    const flag = flagOf(await run(), "indemnity");
    expect(flag.confidence.level).toBe("low");
    expect(flag.confidence.reasons).toEqual([{ kind: "undefined_terms", terms: ["Customer Materials"] }]);
    expect(flag.confidence.reasonText).toBe(
      'The clause uses "Customer Materials", which the document never defines.',
    );
  });

  it("the arbitration flag says which clauses it combines", async () => {
    const flag = (await run()).flags.find((f) => f.sourceSentences.length === 2)!;
    expect(flag.confidence.reasons).toEqual([{ kind: "spans_clauses", clauses: ["9.1", "9.2"] }]);
    expect(flag.confidence.reasonText).toBe("It combines clauses 9.1 and 9.2.");
  });
});

describe("analyze: each confidence rule on its own", () => {
  it("an undefined term that the document uses makes the flag Low; without it the flag is High", async () => {
    const withTerm = flagOf(await run(), "indemnity");
    expect(withTerm.exposure.kind).toBe("unbounded");
    expect(withTerm.confidence.level).toBe("low");

    const without = tamperedPayload("adhesion-contract", (p) => {
      candidate(p, "indemnity").undefinedTerms = [];
    });
    expect(flagOf(await run(without), "indemnity").confidence.level).toBe("high");
  });

  it("the term is shown as the document writes it, whatever case the model used", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      candidate(p, "indemnity").undefinedTerms = ["customer materials", "Customer Materials"];
    });
    expect(flagOf(await run(payload), "indemnity").confidence.reasons).toEqual([
      { kind: "undefined_terms", terms: ["Customer Materials"] },
    ]);
  });

  it("a term the document defines does not lower confidence, even when the model calls it undefined", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      // "Renewal Term" means ... (1.5); "Users" means ... (1.3, used here as "User");
      // "Effective Date: December 1, 2026" is set on the order form.
      candidate(p, "auto_renewal").undefinedTerms = ["Renewal Term", "Initial Term", "User", "Effective Date"];
      candidate(p, "price_increase").undefinedTerms = ["Subscription Fee", "Service"];
    });
    const report = await run(payload);
    expect(flagOf(report, "auto_renewal").confidence.level).toBe("high");
    expect(flagOf(report, "price_increase").confidence.level).toBe("medium");
  });

  it("a term that isn't in the document at all is ignored", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      candidate(p, "auto_renewal").undefinedTerms = ["Platform Credits"];
    });
    expect(flagOf(await run(payload), "auto_renewal").confidence.level).toBe("high");
  });

  it("a reference to outside terms makes the flag Low and says so", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      candidate(p, "auto_renewal").refersToOutsideTerms = true;
    });
    const flag = flagOf(await run(payload), "auto_renewal");
    expect(flag.confidence.level).toBe("low");
    expect(flag.confidence.reasons).toEqual([{ kind: "outside_terms" }]);
    expect(flag.confidence.reasonText).toBe("It depends on another document that Redline hasn't read.");
  });

  it("a flag quoting an incorporated-term sentence is Low even if the model says it refers to nothing outside", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      p.candidateFlags.push({
        ...structuredClone(candidate(p, "unilateral_change")),
        clauseType: "other",
        sourceSentences: [aupSentence],
        figures: [],
        costsMoney: false,
        undefinedTerms: [],
        refersToOutsideTerms: false,
      });
    });
    const flag = flagOf(await run(payload), "other");
    expect(flag.confidence.level).toBe("low");
    expect(flag.confidence.reasons).toEqual([{ kind: "outside_terms" }]);
  });

  it("sentences from two numbered clauses make the flag Low and name both", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      candidate(p, "auto_renewal").sourceSentences.push(clause("renewal-price-increase").sentences[0]);
    });
    const flag = flagOf(await run(payload), "auto_renewal");
    expect(flag.confidence.level).toBe("low");
    expect(flag.confidence.reasons).toEqual([{ kind: "spans_clauses", clauses: ["3.2", "3.3"] }]);
  });

  it("the same two sentences inside one clause do not span clauses", async () => {
    // The fixture with 3.3 run on into 3.2, so both sentences sit in one clause.
    const merged = adhesion.replace(/\n\s*\n3\.3 /, " ");
    expect(merged).not.toBe(adhesion);
    const payload = tamperedPayload("adhesion-contract", (p) => {
      candidate(p, "auto_renewal").sourceSentences.push(clause("renewal-price-increase").sentences[0]);
    });
    expect(flagOf(await run(payload, merged), "auto_renewal").confidence.level).toBe("high");
  });

  it("the arbitration flag cut to one sentence no longer spans clauses", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      const arbitration = p.candidateFlags.find((f) => f.sourceSentences.length === 2)!;
      arbitration.sourceSentences = arbitration.sourceSentences.slice(0, 1);
    });
    const flag = (await run(payload)).flags.find(
      (f) => f.sourceSentences[0] === clause("arbitration-class-waiver").sentences[0],
    )!;
    expect(flag.confidence.level).toBe("high");
  });

  it("an order-form line plus a numbered clause span clauses", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      candidate(p, "auto_renewal").sourceSentences.unshift(sidecar.periodicFee!.sentence);
    });
    const flag = flagOf(await run(payload), "auto_renewal");
    expect(flag.confidence.reasons).toEqual([{ kind: "spans_clauses", clauses: [] }]);
    expect(flag.confidence.reasonText).toBe("It combines more than one clause.");
  });

  it("unquantified exposure is Medium, with the reason", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      candidate(p, "minimum_commitment").figures = [];
    });
    const flag = flagOf(await run(payload), "minimum_commitment");
    expect(flag.exposure.kind).toBe("unquantified");
    expect(flag.confidence.level).toBe("medium");
    expect(flag.confidence.reasonText).toBe("The document doesn't state an amount for this clause.");
  });

  it("a Low reason outranks unquantified exposure", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      candidate(p, "price_increase").refersToOutsideTerms = true;
    });
    expect(flagOf(await run(payload), "price_increase").confidence.level).toBe("low");
  });

  it("otherwise High: stated, unbounded and no-cost exposure with no Low reason", async () => {
    const report = await run();
    for (const type of ["auto_renewal", "unilateral_change", "minimum_commitment"] as const) {
      expect(flagOf(report, type).confidence).toMatchObject({ level: "high", label: "High confidence", reasons: [] });
    }
  });
});

describe("Q7: the same scripted output always gives the same labels", () => {
  const labels = (report: Report) =>
    Object.fromEntries(report.flags.map((f) => [f.sourceSentences.join(" "), f.confidence]));

  it("analysing the same output twice gives identical labels", async () => {
    const first = await run();
    const second = await run();
    expect(labels(second)).toEqual(labels(first));
    expect(second.flags.map((f) => f.confidence)).toEqual(first.flags.map((f) => f.confidence));
  });

  it("shuffling the model's flag order does not change any label", async () => {
    const base = labels(await run());
    for (const order of [
      (n: number) => [...Array(n).keys()].reverse(),
      (n: number) => [...Array(n).keys()].map((i) => (i * 3) % n),
    ]) {
      const payload = tamperedPayload("adhesion-contract", (p) => {
        const flags = p.candidateFlags;
        p.candidateFlags = order(flags.length).map((i) => flags[i]);
      });
      expect(labels(await run(payload))).toEqual(base);
    }
  });
});
