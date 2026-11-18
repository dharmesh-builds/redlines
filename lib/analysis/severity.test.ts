import { describe, expect, it } from "vitest";
import { analyze, type Flag, type Report } from "./index";
import {
  fixtureSidecar,
  fixtureText,
  payloadFromSidecar,
  scriptedModel,
  tamperedPayload,
} from "../../tests/support/scripted-model";

// Severity and exposure are computed by code (ADR 0003, ADR 0006). Every test
// drives `analyze` with a scripted model built from the fixture sidecar.

const adhesion = fixtureText("adhesion-contract");
const sidecar = fixtureSidecar("adhesion-contract");
const planted = sidecar.clauses;
const renewal = planted.find((c) => c.id === "auto-renewal")!;
const terminationFee = planted.find((c) => c.id === "early-termination-fee")!;
const feeSentence = sidecar.periodicFee!.sentence;

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();
const inText = (doc: string, sentence: string) => collapse(doc).includes(collapse(sentence));

const run = (payload = payloadFromSidecar("adhesion-contract"), doc = adhesion) =>
  analyze(doc, [], scriptedModel(payload));

const flagOf = (report: Report, clauseType: Flag["clauseType"]) => {
  const flag = report.flags.find((f) => f.clauseType === clauseType);
  if (!flag) throw new Error(`no ${clauseType} flag in the report`);
  return flag;
};

// "$9,000" -> 9000, "5%" -> 5
const numbersIn = (text: string) =>
  [...text.matchAll(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g)].map((m) => Number(m[0].replace(/,/g, "")));

/**
 * T3 oracle: every number in a flag's exposure is quoted in a sentence that is
 * in the document, or is the result of shown arithmetic whose operands are
 * quoted (or are the rule's own 12 months), and the arithmetic is correct.
 */
function expectTraceable(flag: Flag, doc: string) {
  const exposure = flag.exposure;
  const quotes = flag.figures.map((f) => f.sourceSentence);
  if (exposure.kind === "stated" && exposure.twelveMonthFee) quotes.push(exposure.twelveMonthFee.sourceSentence);
  for (const quote of quotes) expect(inText(doc, quote), quote).toBe(true);

  const quoted = new Set(quotes.flatMap(numbersIn));
  const RULE = new Set([12]);
  const sums =
    exposure.kind === "stated"
      ? [exposure.twelveMonthFee?.arithmetic, exposure.arithmetic].filter((a): a is string => !!a)
      : [];

  const derived = new Set<number>();
  for (const sum of sums) {
    const [left, right] = sum.split("=");
    const operands = numbersIn(left);
    const [result] = numbersIn(right);
    for (const n of operands) expect(quoted.has(n) || RULE.has(n) || derived.has(n), `${n} in ${sum}`).toBe(true);
    // percentages multiply as fractions
    const product = left.includes("%")
      ? (operands[0] / 100) * operands.slice(1).reduce((a, b) => a * b, 1)
      : operands.reduce((a, b) => a * b, 1);
    expect(result).toBeCloseTo(product, 2);
    derived.add(result);
  }

  for (const n of numbersIn(exposure.statement)) {
    expect(quoted.has(n) || RULE.has(n) || derived.has(n), `${n} in "${exposure.statement}"`).toBe(true);
  }
  if (exposure.kind === "stated") expect(quoted.has(exposure.amount) || derived.has(exposure.amount)).toBe(true);
  for (const figure of flag.figures) {
    expect(numbersIn(figure.sourceSentence)).toContain(figure.value);
    expect(figure.display).toContain(figure.value.toLocaleString("en-US"));
  }
}

describe("analyze: severity and exposure on the planted clauses", () => {
  it.each(planted.map((c) => [c.id, c] as const))(
    "%s gets its expected severity and exposure",
    async (_id, clause) => {
      const report = await run();
      const flag = report.flags.find((f) => f.sourceSentences.join(" ") === clause.sentences.join(" "));
      expect(flag).toBeDefined();
      expect(flag!.severity).toBe(clause.expectedSeverity);
      expect(flag!.exposure.kind).toBe(clause.expectedExposure);
    },
  );

  it("shows each figure with the sentence it was quoted from", async () => {
    const flag = flagOf(await run(), "auto_renewal");
    expect(flag.figures.map((f) => f.display)).toEqual(["$9,000", "60 days"]);
    for (const figure of flag.figures) expect(figure.sourceSentence).toBe(renewal.sentences[0]);
  });

  it("T3: every exposure number traces to a verified quote or shown arithmetic", async () => {
    const report = await run();
    expect(report.flags).toHaveLength(7);
    for (const flag of report.flags) expectTraceable(flag, adhesion);
  });
});

describe("analyze: severity edge cases", () => {
  it("unbounded: a money clause with no cap is High, even with figures", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      p.candidateFlags.find((f) => f.clauseType === "minimum_commitment")!.capStated = false;
    });
    const flag = flagOf(await run(payload), "minimum_commitment");
    expect(flag.exposure.kind).toBe("unbounded");
    expect(flag.severity).toBe("high");
    expect(flag.exposure.statement).toMatch(/No limit/);
  });

  it("exactly 12 months of fees is High, and the arithmetic is shown", async () => {
    const flag = flagOf(await run(), "auto_renewal");
    expect(flag.severity).toBe("high");
    expect(flag.exposure).toMatchObject({
      kind: "stated",
      amount: 9000,
      twelveMonthFee: { amount: 9000, arithmetic: "$750 × 12 = $9,000", sourceSentence: feeSentence },
    });
    expect(flag.exposure.statement).toBe("$9,000. That's at least 12 months of fees ($750 × 12 = $9,000).");
  });

  it("a recurring amount over a quoted term is multiplied out and shown", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      p.candidateFlags.find((f) => f.clauseType === "auto_renewal")!.figures = [
        { value: 750, unit: "money", per: "month", label: "Subscription Fee", sourceSentence: feeSentence },
        { value: 12, unit: "months", per: null, label: "Renewal Term", sourceSentence: renewal.sentences[0] },
      ];
    });
    const flag = flagOf(await run(payload), "auto_renewal");
    expect(flag.severity).toBe("high");
    expect(flag.exposure).toMatchObject({ kind: "stated", amount: 9000, arithmetic: "$750 × 12 = $9,000" });
    expect(flag.figures.map((f) => f.display)).toEqual(["$750 a month", "12 months"]);
    expectTraceable(flag, adhesion);
  });

  it("just below 12 months of fees is Medium", async () => {
    // The renewal fee is $1 short of 12 months: derived from the fixture text.
    const below = renewal.sentences[0].replace("$9,000", "$8,999");
    const doc = adhesion.replace(renewal.sentences[0], below);
    const payload = tamperedPayload("adhesion-contract", (p) => {
      const flag = p.candidateFlags.find((f) => f.clauseType === "auto_renewal")!;
      flag.sourceSentences = [below];
      flag.figures = flag.figures.map((f) => ({
        ...f,
        value: f.value === 9000 ? 8999 : f.value,
        sourceSentence: below,
      }));
    });
    const flag = flagOf(await run(payload, doc), "auto_renewal");
    expect(flag.severity).toBe("medium");
    expect(flag.exposure).toMatchObject({ kind: "stated", amount: 8999 });
    expect(flag.exposure.statement).toBe("$8,999. That's less than 12 months of fees ($750 × 12 = $9,000).");
    expectTraceable(flag, doc);
  });

  it("a stated percentage is worked out against 12 months of fees", async () => {
    // A 5% cap on increases, derived from the fixture's price-increase sentence.
    const priceSentence = planted.find((c) => c.id === "renewal-price-increase")!.sentences[0];
    const capped = priceSentence.replace(
      "will not exceed Vendor's standard list price for the Service at the time of renewal",
      "will not exceed the previous fee by more than 5%",
    );
    const doc = adhesion.replace(priceSentence, capped);
    const payload = tamperedPayload("adhesion-contract", (p) => {
      const flag = p.candidateFlags.find((f) => f.clauseType === "price_increase")!;
      flag.sourceSentences = [capped];
      flag.figures = [{ value: 5, unit: "percent", per: null, label: "Largest increase", sourceSentence: capped }];
    });
    const flag = flagOf(await run(payload, doc), "price_increase");
    expect(flag.severity).toBe("medium");
    expect(flag.exposure).toMatchObject({ kind: "stated", amount: 450, arithmetic: "5% × $9,000 = $450" });
    expectTraceable(flag, doc);
  });

  it("fee not stated: a bounded stated exposure is Medium and says the document doesn't state the fee", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      p.periodicFee = null;
    });
    const report = await run(payload);
    const flag = flagOf(report, "auto_renewal");
    expect(flag.severity).toBe("medium");
    expect(flag.exposure).toMatchObject({ kind: "stated", amount: 9000, twelveMonthFee: null });
    expect(flag.exposure.statement).toContain("The document doesn't state the fee");
    expect(flagOf(report, "minimum_commitment").severity).toBe("medium");
    // unbounded stays High without a fee
    expect(flagOf(report, "indemnity").severity).toBe("high");
    for (const f of report.flags) expectTraceable(f, adhesion);
  });

  it.each([
    ["quoted from a sentence that isn't in the document", { sourceSentence: feeSentence.replace("$750", "$75") }],
    ["whose amount isn't in its sentence", { amount: 900 }],
  ])("a periodic fee %s counts as not stated", async (_name, change) => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      p.periodicFee = { ...p.periodicFee!, ...change };
    });
    const flag = flagOf(await run(payload), "auto_renewal");
    expect(flag.severity).toBe("medium");
    expect(flag.exposure).toMatchObject({ kind: "stated", twelveMonthFee: null });
    expect(flag.exposure.statement).toMatch(/doesn't state the fee/);
  });

  it("unquantified: a capped money clause with no figure is Medium and says so", async () => {
    const flag = flagOf(await run(), "price_increase");
    expect(flag.severity).toBe("medium");
    expect(flag.exposure.kind).toBe("unquantified");
    expect(flag.exposure.statement).toMatch(/doesn't state the fee/);
  });

  it("boilerplate is always Low, even when the model marks it as costing money with no cap", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      for (const f of p.candidateFlags.filter((f) => f.clauseType === "boilerplate")) {
        f.costsMoney = true;
        f.capStated = false;
      }
    });
    const report = await run(payload);
    const boilerplate = report.flags.filter((f) => f.clauseType === "boilerplate");
    expect(boilerplate).toHaveLength(2);
    for (const flag of boilerplate) {
      expect(flag.severity).toBe("low");
      expect(flag.exposure.kind).toBe("none");
    }
  });

  it("a flag whose figure is quoted from a fabricated sentence is dropped", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      p.candidateFlags.find((f) => f.clauseType === "auto_renewal")!.figures[0].sourceSentence =
        "The fee for each Renewal Term is $9,000.";
    });
    const report = await run(payload);
    expect(report.flags.some((f) => f.clauseType === "auto_renewal")).toBe(false);
    expect(report.droppedFlagCount).toBe(1);
  });

  it("a flag whose figure isn't written in its sentence is dropped", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      p.candidateFlags.find((f) => f.clauseType === "auto_renewal")!.figures[0].value = 90000;
    });
    const report = await run(payload);
    expect(report.flags.some((f) => f.clauseType === "auto_renewal")).toBe(false);
    expect(report.flags.some((f) => numbersIn(f.exposure.statement).includes(90000))).toBe(false);
    expect(report.droppedFlagCount).toBe(1);
  });
});

describe("analyze: ranking", () => {
  const order = (report: Report) =>
    report.flags.map((f) => `${f.severity}:${f.exposure.kind}`);

  const expected = [
    "high:unbounded",
    "high:unbounded",
    "high:stated",
    "medium:unquantified",
    "medium:stated",
    "low:none",
    "low:none",
  ];

  it("ranks High, then Medium unquantified, then Medium stated, then Low", async () => {
    expect(order(await run())).toEqual(expected);
  });

  it("gives the same ranking whatever order the model lists the flags in", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => p.candidateFlags.reverse());
    const report = await run(payload);
    expect(order(report)).toEqual(expected);
    expect(report.flags[3].sourceSentences).toEqual(
      planted.find((c) => c.id === "renewal-price-increase")!.sentences,
    );
    expect(report.flags[4].sourceSentences).toEqual(terminationFee.sentences);
  });
});
