import { describe, expect, it } from "vitest";
import { analyze } from "./index";
import {
  changeOneWord,
  fixtureSidecar,
  fixtureText,
  payloadFromSidecar,
  scriptedModel,
  tamperedPayload,
} from "../../tests/support/scripted-model";
import { NOT_STATED_COPY } from "./summary";

const adhesion = fixtureText("adhesion-contract");
const clean = fixtureText("clean-contract");
const sidecar = fixtureSidecar("adhesion-contract");
const cleanSidecar = fixtureSidecar("clean-contract");

// Independent oracle: the fixtures use straight quotes and plain hyphens only.
const collapse = (s: string) => s.replace(/\s+/g, " ").trim();
const inText = (doc: string, sentence: string) => collapse(doc).includes(collapse(sentence));

const run = (doc: string, payload: unknown) => analyze(doc, [], scriptedModel(payload));

describe("analyze: the summary on the fixtures", () => {
  it("the adhesion contract's summary points, all 4 deadlines and both incorporated terms appear verified", async () => {
    const { summary } = await run(adhesion, payloadFromSidecar("adhesion-contract"));

    expect(summary.points.map((p) => p.text)).toEqual(sidecar.summaryPoints.map((p) => p.text));
    for (const point of summary.points) {
      expect(point.sourceSentences.length).toBeGreaterThan(0);
      for (const s of point.sourceSentences) expect(inText(adhesion, s)).toBe(true);
    }

    expect(summary.deadlines.map((d) => d.display)).toEqual([
      "60 days before the renewal date",
      "30 days after receiving written notice of a material breach",
      "30 days after the invoice date",
      "15 days after the invoice date",
    ]);
    for (const [i, d] of summary.deadlines.entries()) {
      expect(d.sourceSentence).toBe(sidecar.deadlines[i].sentence);
      expect(inText(adhesion, d.sourceSentence)).toBe(true);
    }

    expect(summary.incorporatedTerms).toEqual(
      sidecar.incorporatedTerms.map((t) => ({
        description: t.description,
        sourceSentence: t.sentence,
        readByRedline: false,
      })),
    );
    expect(summary.droppedCount).toBe(0);
  });

  it("the clean contract's summary appears, with no incorporated terms", async () => {
    const { summary } = await run(clean, payloadFromSidecar("clean-contract"));

    expect(summary.points.map((p) => p.text)).toEqual(cleanSidecar.summaryPoints.map((p) => p.text));
    expect(summary.deadlines.map((d) => d.display)).toEqual([
      "30 days before Pinecrest ends the agreement",
      "60 days after the agreement ends",
    ]);
    expect(summary.incorporatedTerms).toEqual([]);
    expect(summary.notStated).toEqual([]);
  });
});

describe("analyze: T2 for the summary, every unverified item is dropped", () => {
  it("drops a summary point whose quote is not in the document", async () => {
    const fabricated = "Customer may cancel at any time with a full refund of fees paid in advance.";
    expect(inText(adhesion, fabricated)).toBe(false);
    const payload = tamperedPayload("adhesion-contract", (p) => {
      p.summaryPoints.push({ text: "You can cancel any time and get your money back.", sourceSentences: [fabricated] });
    });

    const { summary } = await run(adhesion, payload);
    expect(summary.points.map((p) => p.text)).not.toContain("You can cancel any time and get your money back.");
    expect(summary.points).toHaveLength(sidecar.summaryPoints.length);
    expect(summary.droppedCount).toBe(1);
  });

  it("drops a summary point when one of its quotes has a changed word, keeping the others", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      const point = p.summaryPoints[0];
      point.sourceSentences[1] = changeOneWord(point.sourceSentences[1], "annually", "monthly");
    });

    const { summary } = await run(adhesion, payload);
    expect(summary.points.map((p) => p.text)).toEqual(sidecar.summaryPoints.slice(1).map((p) => p.text));
  });

  it("drops a deadline whose sentence is not in the document", async () => {
    const fabricated = changeOneWord(sidecar.deadlines[0].sentence, "60", "90");
    expect(inText(adhesion, fabricated)).toBe(false);
    const payload = tamperedPayload("adhesion-contract", (p) => {
      p.deadlines[0] = { days: 90, relation: "before", referencePoint: "the renewal date", sourceSentence: fabricated };
    });

    const { summary } = await run(adhesion, payload);
    expect(summary.deadlines.map((d) => d.display)).not.toContain("90 days before the renewal date");
    expect(summary.deadlines).toHaveLength(3);
    expect(summary.droppedCount).toBe(1);
  });

  it("drops a deadline whose day count is not written in its (real) sentence", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      p.deadlines[2] = { ...p.deadlines[2], days: 45 };
    });

    const { summary } = await run(adhesion, payload);
    expect(summary.deadlines.map((d) => d.display)).toEqual([
      "60 days before the renewal date",
      "30 days after receiving written notice of a material breach",
      "15 days after the invoice date",
    ]);
  });

  it("drops a deadline whose number is in the sentence but doesn't count days", async () => {
    // The renewal sentence says "12 months" and "$9,000"; neither is a day count.
    const payload = tamperedPayload("adhesion-contract", (p) => {
      p.deadlines = [{ ...p.deadlines[0], days: 12 }];
    });

    const { summary } = await run(adhesion, payload);
    expect(summary.deadlines).toEqual([]);
  });

  it("drops an incorporated-term reference whose sentence is not in the document", async () => {
    const fabricated =
      "Customer's use of the Service is subject to Vendor's Service Level Agreement, available at https://www.tallyforge.example/legal/sla.";
    expect(inText(adhesion, fabricated)).toBe(false);
    const payload = tamperedPayload("adhesion-contract", (p) => {
      p.incorporatedTerms.push({ description: "Service Level Agreement", sourceSentence: fabricated });
    });

    const { summary } = await run(adhesion, payload);
    expect(summary.incorporatedTerms.map((t) => t.description)).toEqual(
      sidecar.incorporatedTerms.map((t) => t.description),
    );
    expect(summary.droppedCount).toBe(1);
  });
});

describe("analyze: deadlines in an agreement that isn't in English", () => {
  const spanish =
    "CONTRATO DE SUSCRIPCIÓN DE SOFTWARE\n\nCuota: 500 euros al mes, facturados mensualmente por adelantado.\n\n" +
    "2. Al finalizar el Plazo inicial, este Contrato se renovará automáticamente por periodos sucesivos de 12 meses, " +
    "salvo que el Cliente notifique por escrito su voluntad de no renovar con al menos 90 días de antelación a la fecha de renovación.";
  const renewal =
    "2. Al finalizar el Plazo inicial, este Contrato se renovará automáticamente por periodos sucesivos de 12 meses, " +
    "salvo que el Cliente notifique por escrito su voluntad de no renovar con al menos 90 días de antelación a la fecha de renovación.";
  const payload = (days: number) => ({
    periodicFee: null,
    summaryPoints: [],
    deadlines: [{ days, relation: "before", referencePoint: "the renewal date", sourceSentence: renewal }],
    incorporatedTerms: [],
    candidateFlags: [],
  });

  it("keeps a day count written as \"90 días\"", async () => {
    const { summary } = await run(spanish, payload(90));
    expect(summary.deadlines.map((d) => d.display)).toEqual(["90 days before the renewal date"]);
  });

  it("still drops a number that counts months (\"12 meses\"), not days", async () => {
    const { summary } = await run(spanish, payload(12));
    expect(summary.deadlines).toEqual([]);
  });
});

describe("analyze: incorporated terms are a summary note, not a flag (ADR 0005)", () => {
  it("they never change a flag's severity or exposure, and never add a flag", async () => {
    const withTerms = await run(adhesion, payloadFromSidecar("adhesion-contract"));
    const withoutTerms = await run(
      adhesion,
      tamperedPayload("adhesion-contract", (p) => {
        p.incorporatedTerms = [];
      }),
    );

    expect(withTerms.summary.incorporatedTerms).toHaveLength(2);
    expect(withoutTerms.summary.incorporatedTerms).toHaveLength(0);
    const shape = (r: typeof withTerms) =>
      r.flags.map((f) => ({ quote: f.sourceSentences.join(" "), severity: f.severity, exposure: f.exposure }));
    expect(shape(withTerms)).toEqual(shape(withoutTerms));
  });

  it("references on the clean contract add no flag", async () => {
    const report = await run(
      clean,
      tamperedPayload("clean-contract", (p) => {
        p.incorporatedTerms.push({
          description: "the agreement",
          sourceSentence: "This agreement runs month to month, starting on the Start Date.",
        });
      }),
    );
    expect(report.flags).toEqual([]);
    expect(report.summary.incorporatedTerms).toHaveLength(1);
  });
});

describe("analyze: the summary says what the document doesn't state", () => {
  it("says the fee isn't stated when the agreement auto-renews and no fee checks out", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      p.periodicFee = null;
    });
    const { summary } = await run(adhesion, payload);
    expect(summary.notStated).toEqual([{ kind: "fee", text: NOT_STATED_COPY.fee }]);
  });

  it("also says so when the model's fee quote fails the verbatim check", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      p.periodicFee!.sourceSentence = changeOneWord(p.periodicFee!.sourceSentence, "annually", "monthly");
    });
    const { summary } = await run(adhesion, payload);
    expect(summary.notStated.map((n) => n.kind)).toEqual(["fee"]);
  });

  it("says nothing about the fee when the document states it", async () => {
    const { summary } = await run(adhesion, payloadFromSidecar("adhesion-contract"));
    expect(summary.notStated).toEqual([]);
  });

  it("says nothing about the fee when nothing renews automatically", async () => {
    const payload = tamperedPayload("clean-contract", (p) => {
      p.periodicFee = null;
    });
    const { summary } = await run(clean, payload);
    expect(summary.notStated).toEqual([]);
  });
});
