import { describe, expect, it } from "vitest";
import { analyze } from "./index";
import type { ModelOutput } from "./contract";
import {
  changeOneWord,
  fixtureSidecar,
  fixtureText,
  payloadFromSidecar,
  scriptedModel,
  tamperedPayload,
} from "../../tests/support/scripted-model";

// Q4: the verdict line is present iff no flag is High or Medium after
// verification, and names every verified incorporated-term reference.
// Each case trims the adhesion contract's scripted payload.

const adhesion = fixtureText("adhesion-contract");
const sidecar = fixtureSidecar("adhesion-contract");
const CLEAN_LINE = "Nothing in this document costs you money beyond what you agreed to.";

type Band = "high" | "medium" | "low";

/** The adhesion payload keeping only flags whose expected severity is in `bands`. */
function keepBands(bands: Band[], { keepTerms }: { keepTerms: boolean }): ModelOutput {
  return tamperedPayload("adhesion-contract", (p) => {
    p.candidateFlags = p.candidateFlags.filter((_, i) => bands.includes(sidecar.clauses[i].expectedSeverity));
    if (!keepTerms) p.incorporatedTerms = [];
  });
}

const run = (doc: string, payload: unknown) => analyze(doc, [], scriptedModel(payload));

describe("analyze: the verdict line (Q4)", () => {
  it("no flags at all (clean contract): present, with no unread terms", async () => {
    const report = await run(fixtureText("clean-contract"), payloadFromSidecar("clean-contract"));
    expect(report.flags).toHaveLength(0);
    expect(report.verdict).toEqual({ present: true, unreadTerms: [], text: CLEAN_LINE });
  });

  it("Low flags only: present", async () => {
    const report = await run(adhesion, keepBands(["low"], { keepTerms: false }));
    expect(report.flags.length).toBeGreaterThan(0);
    expect(report.flags.every((f) => f.severity === "low")).toBe(true);
    expect(report.verdict).toEqual({ present: true, unreadTerms: [], text: CLEAN_LINE });
  });

  it("any Medium flag: absent", async () => {
    const report = await run(adhesion, keepBands(["low", "medium"], { keepTerms: true }));
    expect(report.flags.some((f) => f.severity === "medium")).toBe(true);
    expect(report.flags.some((f) => f.severity === "high")).toBe(false);
    expect(report.verdict).toEqual({ present: false });
  });

  it("any High flag: absent", async () => {
    const report = await run(adhesion, keepBands(["low", "high"], { keepTerms: true }));
    expect(report.flags.some((f) => f.severity === "high")).toBe(true);
    expect(report.flags.some((f) => f.severity === "medium")).toBe(false);
    expect(report.verdict).toEqual({ present: false });
  });

  it("the full adhesion contract: absent", async () => {
    const report = await run(adhesion, payloadFromSidecar("adhesion-contract"));
    expect(report.verdict.present).toBe(false);
  });

  it("Low only plus incorporated terms: present, and names both terms as unread", async () => {
    const report = await run(adhesion, keepBands(["low"], { keepTerms: true }));
    const [aup, dpa] = sidecar.incorporatedTerms.map((t) => t.description);
    expect(report.verdict).toEqual({
      present: true,
      unreadTerms: [aup, dpa],
      text: `${CLEAN_LINE} It also refers to ${aup} and ${dpa}. Redline hasn't read them.`,
    });
  });

  it("one incorporated term: names it in a single sentence", async () => {
    const payload = keepBands(["low"], { keepTerms: true });
    payload.incorporatedTerms = payload.incorporatedTerms.slice(0, 1);
    const report = await run(adhesion, payload);
    const aup = sidecar.incorporatedTerms[0].description;
    expect(report.verdict).toMatchObject({ present: true, text: `${CLEAN_LINE} It also refers to ${aup}, which Redline hasn't read.` });
  });

  it("a Medium flag whose quote fails verification doesn't block the verdict", async () => {
    const payload = keepBands(["low", "medium"], { keepTerms: false });
    for (const flag of payload.candidateFlags) {
      const i = sidecar.clauses.findIndex((c) => c.clauseType === flag.clauseType);
      if (sidecar.clauses[i].expectedSeverity !== "medium") continue;
      flag.sourceSentences[0] = changeOneWord(flag.sourceSentences[0], "the", "a");
    }
    const report = await run(adhesion, payload);
    expect(report.flags.every((f) => f.severity === "low")).toBe(true);
    expect(report.droppedFlagCount).toBeGreaterThan(0);
    expect(report.verdict.present).toBe(true);
  });

  it("an incorporated term whose quote fails verification is not named", async () => {
    const payload = keepBands(["low"], { keepTerms: true });
    const [aupTerm] = payload.incorporatedTerms;
    aupTerm.sourceSentence = changeOneWord(aupTerm.sourceSentence, "comply", "agree");
    const report = await run(adhesion, payload);
    const [aup, dpa] = sidecar.incorporatedTerms.map((t) => t.description);
    expect(report.verdict).toMatchObject({ present: true, unreadTerms: [dpa] });
    if (report.verdict.present) expect(report.verdict.text).not.toContain(aup);
  });
});
