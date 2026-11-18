import { describe, expect, it } from "vitest";
import { analyze, ModelOutputError } from "./index";
import {
  SCRIPTED_MODEL_ID,
  changeOneWord,
  fixtureSidecar,
  fixtureText,
  payloadFromSidecar,
  scriptedModel,
  tamperedPayload,
} from "../../tests/support/scripted-model";

const adhesion = fixtureText("adhesion-contract");
const clean = fixtureText("clean-contract");
const planted = fixtureSidecar("adhesion-contract").clauses;

const renewal = planted.find((c) => c.id === "auto-renewal")!;
const indemnity = planted.find((c) => c.id === "customer-indemnity")!;
const terminationFee = planted.find((c) => c.id === "early-termination-fee")!;

// An oracle independent of the code under test: the fixtures use only
// straight quotes and plain hyphens, so collapsing whitespace is enough.
const collapse = (s: string) => s.replace(/\s+/g, " ").trim();
const inText = (doc: string, sentence: string) => collapse(doc).includes(collapse(sentence));

const quotesOf = (report: Awaited<ReturnType<typeof analyze>>) =>
  report.flags.flatMap((f) => f.sourceSentences);

describe("analyze: every shown flag cites its source (ADR 0001)", () => {
  it("T1: every flag passes the verbatim check, and all 7 planted clauses appear", async () => {
    const report = await analyze(adhesion, [], scriptedModel(payloadFromSidecar("adhesion-contract")));

    expect(report.flags).toHaveLength(7);
    for (const flag of report.flags) {
      expect(flag.sourceSentences.length).toBeGreaterThan(0);
      for (const sentence of flag.sourceSentences) expect(inText(adhesion, sentence)).toBe(true);
    }
    for (const clause of planted) {
      const shown = report.flags.find((f) => f.sourceSentences.join(" ") === clause.sentences.join(" "));
      expect(shown, clause.id).toBeDefined();
      expect(shown!.clauseType).toBe(clause.clauseType);
      expect(shown!.explanation).toBe(clause.explanation);
    }
    expect(report.candidateFlagCount).toBe(7);
    expect(report.droppedFlagCount).toBe(0);
  });

  it("records the ID of the model that produced the report", async () => {
    const report = await analyze(adhesion, [], scriptedModel(payloadFromSidecar("adhesion-contract")));
    expect(report.modelId).toBe(SCRIPTED_MODEL_ID);
  });

  it("T2: a flag quoting text that is not in the document is absent", async () => {
    const fabricated = "Customer will pay Vendor a data export fee of $5,000 when this Agreement ends.";
    expect(inText(adhesion, fabricated)).toBe(false);

    const payload = tamperedPayload("adhesion-contract", (p) => {
      p.candidateFlags.push({
        ...p.candidateFlags[0],
        clauseType: "data",
        sourceSentences: [fabricated],
        explanation: "Leaving costs $5,000 to get your data back.",
        figures: [],
      });
    });
    const report = await analyze(adhesion, [], scriptedModel(payload));

    expect(quotesOf(report)).not.toContain(fabricated);
    expect(report.flags.some((f) => f.explanation.includes("$5,000"))).toBe(false);
    expect(report.flags).toHaveLength(7);
    expect(report.candidateFlagCount).toBe(8);
    expect(report.droppedFlagCount).toBe(1);
  });

  it("T2: a planted flag whose quote has one changed word is absent", async () => {
    const altered = changeOneWord(renewal.sentences[0], "60", "90");
    const payload = tamperedPayload("adhesion-contract", (p) => {
      const flag = p.candidateFlags.find((f) => f.clauseType === "auto_renewal")!;
      flag.sourceSentences = [altered];
    });
    const report = await analyze(adhesion, [], scriptedModel(payload));

    expect(report.flags.some((f) => f.clauseType === "auto_renewal")).toBe(false);
    expect(quotesOf(report)).not.toContain(altered);
    expect(report.flags).toHaveLength(6);
    expect(report.droppedFlagCount).toBe(1);
  });

  it("T2: a flag with one real and one fabricated sentence is dropped whole", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      const flag = p.candidateFlags.find((f) => f.clauseType === "indemnity")!;
      flag.sourceSentences.push("Customer's liability under this Section 7.1 is unlimited.");
    });
    const report = await analyze(adhesion, [], scriptedModel(payload));

    expect(report.flags.some((f) => f.clauseType === "indemnity")).toBe(false);
    expect(quotesOf(report)).not.toContain(indemnity.sentences[0]);
  });

  it("T2: a flag whose figure is quoted from a sentence not in the document is dropped", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      const flag = p.candidateFlags.find((f) => f.clauseType === "minimum_commitment")!;
      flag.figures = [
        {
          value: 4500,
          label: "Early termination fee",
          sourceSentence: changeOneWord(terminationFee.sentences[0], "2,250", "4,500"),
        },
      ];
    });
    const report = await analyze(adhesion, [], scriptedModel(payload));

    expect(report.flags.some((f) => f.clauseType === "minimum_commitment")).toBe(false);
    expect(report.droppedFlagCount).toBe(1);
  });

  it("drops a flag that quotes nothing", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      p.candidateFlags[0].sourceSentences = [];
      p.candidateFlags[1].sourceSentences = ["   "];
    });
    const report = await analyze(adhesion, [], scriptedModel(payload));
    expect(report.flags).toHaveLength(5);
  });

  it("a clean contract gives a report with zero flags", async () => {
    const report = await analyze(clean, [], scriptedModel(payloadFromSidecar("clean-contract")));
    expect(report.flags).toEqual([]);
    expect(report.candidateFlagCount).toBe(0);
    expect(report.droppedFlagCount).toBe(0);
  });
});

describe("analyze: normalization never changes a word", () => {
  const scripted = () => scriptedModel(payloadFromSidecar("adhesion-contract"));

  it("passes when the document uses curly quotes and the quote uses straight ones", async () => {
    const curly = adhesion.replace(/'/g, "’").replace(/"([^"]*)"/g, "“$1”");
    expect(curly).not.toBe(adhesion);

    const report = await analyze(curly, [], scripted());
    expect(report.flags).toHaveLength(7);
    // shown as the document has it
    const shown = report.flags.find((f) => f.clauseType === "indemnity")!.sourceSentences[0];
    expect(shown).toContain("attorneys’ fees");
  });

  it("passes when the quote uses curly quotes and the document straight ones", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      const flag = p.candidateFlags.find((f) => f.clauseType === "minimum_commitment")!;
      flag.sourceSentences = flag.sourceSentences.map((s) => s.replace(/'/g, "‘"));
    });
    const report = await analyze(adhesion, [], scriptedModel(payload));
    expect(report.flags.find((f) => f.clauseType === "minimum_commitment")?.sourceSentences).toEqual(
      terminationFee.sentences,
    );
  });

  it("passes across a hyphenated line break, and shows the word rejoined", async () => {
    const broken = adhesion.replace("defend, indemnify and hold", "defend, indem-\nnify and hold");
    expect(broken).not.toBe(adhesion);

    const report = await analyze(broken, [], scripted());
    const flag = report.flags.find((f) => f.clauseType === "indemnity");
    expect(flag?.sourceSentences).toEqual(indemnity.sentences);
  });

  it("passes when the document's whitespace differs (line breaks, runs of spaces)", async () => {
    const spaced = adhesion.replace(/, /g, ",\n    ").replace(/ the /g, "  the\t");
    const report = await analyze(spaced, [], scripted());
    expect(report.flags).toHaveLength(7);
    expect(report.flags.find((f) => f.clauseType === "auto_renewal")?.sourceSentences).toEqual(
      renewal.sentences,
    );
  });

  it("passes when the only difference is a dash variant", async () => {
    const withDash = adhesion.replace("$9,000, payable in advance", "$9,000 — payable in advance");
    expect(withDash).not.toBe(adhesion);
    const payload = tamperedPayload("adhesion-contract", (p) => {
      const flag = p.candidateFlags.find((f) => f.clauseType === "auto_renewal")!;
      flag.sourceSentences = [renewal.sentences[0].replace("$9,000, payable", "$9,000 - payable")];
      flag.figures = [];
    });
    const report = await analyze(withDash, [], scriptedModel(payload));
    expect(report.flags.some((f) => f.clauseType === "auto_renewal")).toBe(true);
  });

  it("fails when a single word in the document differs from the quote", async () => {
    const changedDoc = adhesion.replace(renewal.sentences[0], changeOneWord(renewal.sentences[0], "written", "verbal"));
    expect(changedDoc).not.toBe(adhesion);

    const report = await analyze(changedDoc, [], scripted());
    expect(report.flags.some((f) => f.clauseType === "auto_renewal")).toBe(false);
    expect(report.flags).toHaveLength(6);
  });

  it("fails when only the capitalisation of a word differs", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      const flag = p.candidateFlags.find((f) => f.clauseType === "unilateral_change")!;
      flag.sourceSentences = flag.sourceSentences.map((s) => s.replace("Vendor may", "vendor may"));
    });
    const report = await analyze(adhesion, [], scriptedModel(payload));
    expect(report.flags.some((f) => f.clauseType === "unilateral_change")).toBe(false);
  });
});

describe("analyze: invalid model output", () => {
  it.each([
    ["not an object", "Here is my analysis of the contract."],
    ["missing candidate flags", { summaryPoints: [], deadlines: [], incorporatedTerms: [] }],
    [
      "a flag with an unknown clause type",
      tamperedPayload("adhesion-contract", (p) => {
        (p.candidateFlags[0] as { clauseType: string }).clauseType = "scary";
      }),
    ],
    [
      "a flag with source sentences that are not strings",
      tamperedPayload("adhesion-contract", (p) => {
        (p.candidateFlags[0] as unknown as { sourceSentences: unknown }).sourceSentences = [42];
      }),
    ],
  ])("%s gives a clear error and no report", async (_name, data) => {
    const result = analyze(adhesion, [], scriptedModel(data));
    await expect(result).rejects.toBeInstanceOf(ModelOutputError);
    await expect(result).rejects.toThrow(/did not match the expected shape/);
  });
});
