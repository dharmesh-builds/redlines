import { describe, expect, it } from "vitest";
import { analyze, ModelOutputError, type Flag, type Report } from "./index";
import type { ModelOutput } from "./contract";
import {
  fixtureSidecar,
  fixtureText,
  payloadFromSidecar,
  scriptedModel,
  tamperedPayload,
} from "../../tests/support/scripted-model";

// Q6: every displayed flag carries a counter-offer that quotes the clause it
// replaces, changes only that clause, and asks the vendor for that change.
// Every test drives `analyze` with a scripted model built from the fixture sidecar.

const adhesion = fixtureText("adhesion-contract");
const planted = fixtureSidecar("adhesion-contract").clauses;
const clause = (id: string) => planted.find((c) => c.id === id)!;

const run = (payload: ModelOutput = payloadFromSidecar("adhesion-contract")) =>
  analyze(adhesion, [], scriptedModel(payload));

const flagOf = (report: Report, clauseType: Flag["clauseType"]) => {
  const flag = report.flags.find((f) => f.clauseType === clauseType);
  if (!flag) throw new Error(`no ${clauseType} flag in the report`);
  return flag;
};

const candidate = (p: ModelOutput, clauseType: Flag["clauseType"]) =>
  p.candidateFlags.find((f) => f.clauseType === clauseType)!;

describe("analyze: counter-offers on the planted clauses (Q6)", () => {
  it("gives every displayed flag a counter-offer that replaces its verified sentences", async () => {
    const report = await run();
    expect(report.flags).toHaveLength(planted.length);
    for (const flag of report.flags) {
      const offer = flag.counterOffer;
      if (!offer.drafted) throw new Error(`${flag.clauseType} has no counter-offer: ${offer.reason}`);
      expect(offer.replaces).toEqual(flag.sourceSentences);
      expect(offer.rewrittenClause.trim()).not.toBe("");
      expect(offer.rewrittenClause).not.toBe(flag.sourceSentences.join(" "));
      expect(offer.request).toMatch(/\?/);
    }
  });

  it.each(planted.map((c) => [c.id, c] as const))("%s carries its drafted rewrite and request", async (_id, c) => {
    const report = await run();
    const flag = report.flags.find((f) => f.sourceSentences.join(" ") === c.sentences.join(" "));
    expect(flag?.counterOffer).toEqual({
      drafted: true,
      replaces: c.sentences,
      rewrittenClause: c.counterOffer.rewrittenClause,
      request: c.counterOffer.request,
    });
  });

  it("quotes both sentences of a flag that spans two clauses", async () => {
    const offer = flagOf(await run(), "boilerplate");
    const arbitration = clause("arbitration-class-waiver");
    expect(offer.counterOffer.drafted && offer.counterOffer.replaces).toEqual(arbitration.sentences);
  });
});

describe("analyze: a counter-offer that fails the checks", () => {
  // Chosen behaviour: the flag stays, with no counter-offer. Only a failed
  // citation drops a flag (ADR 0001).
  async function withDraft(change: (offer: ModelOutput["candidateFlags"][number]["counterOffer"]) => void) {
    const report = await run(tamperedPayload("adhesion-contract", (p) => change(candidate(p, "auto_renewal").counterOffer)));
    return { report, flag: flagOf(report, "auto_renewal") };
  }

  it("keeps the flag and drops a counter-offer whose request is empty", async () => {
    const { report, flag } = await withDraft((o) => (o.request = "   "));
    expect(flag.counterOffer).toEqual({ drafted: false, reason: "empty_request" });
    expect(flag.sourceSentences).toEqual(clause("auto-renewal").sentences);
    expect(report.flags).toHaveLength(planted.length);
    expect(report.droppedFlagCount).toBe(0);
  });

  it("drops a counter-offer whose request asks for nothing", async () => {
    const { flag } = await withDraft(
      (o) => (o.request = "Section 3.2 renews the agreement for 12 months at $9,000 unless cancelled 60 days ahead."),
    );
    expect(flag.counterOffer).toEqual({ drafted: false, reason: "no_ask" });
  });

  it("drops a counter-offer whose rewrite is empty", async () => {
    const { flag } = await withDraft((o) => (o.rewrittenClause = ""));
    expect(flag.counterOffer).toEqual({ drafted: false, reason: "empty_rewrite" });
  });

  it("drops a rewrite that only repeats the original clause", async () => {
    const original = clause("auto-renewal").sentences[0];
    const { flag } = await withDraft((o) => (o.rewrittenClause = `  ${original.replace(/ /g, "\n")} `));
    expect(flag.counterOffer).toEqual({ drafted: false, reason: "rewrite_unchanged" });
  });

  it("drops a rewrite that carries another flag's sentence along", async () => {
    const otherClause = clause("renewal-price-increase").sentences[0];
    const { report, flag } = await withDraft(
      (o) => (o.rewrittenClause = `${clause("auto-renewal").counterOffer.rewrittenClause} ${otherClause}`),
    );
    expect(flag.counterOffer).toEqual({ drafted: false, reason: "quotes_other_clause" });
    // The other flag's own counter-offer is untouched.
    expect(flagOf(report, "price_increase").counterOffer.drafted).toBe(true);
  });

  it("drops a request that quotes another flag's sentence", async () => {
    const otherClause = clause("early-termination-fee").sentences[0];
    const { flag } = await withDraft((o) => (o.request = `Could we also strike this: "${otherClause}"?`));
    expect(flag.counterOffer).toEqual({ drafted: false, reason: "quotes_other_clause" });
  });

  it("rejects the whole answer when a counter-offer has no request at all", async () => {
    // A missing field breaks the agreed shape, which is never turned into a report.
    const payload = tamperedPayload("adhesion-contract", (p) => {
      delete (candidate(p, "auto_renewal").counterOffer as { request?: string }).request;
    });
    await expect(run(payload)).rejects.toBeInstanceOf(ModelOutputError);
  });
});

describe("analysis prompt", () => {
  it("never asks the model whether the vendor will negotiate", async () => {
    const model = scriptedModel(payloadFromSidecar("adhesion-contract"));
    await analyze(adhesion, [], model);
    const system = model.requests[0].system;
    expect(system).toContain("Do not say or guess whether the vendor is likely to agree.");
    expect(system).not.toMatch(/(likely|willing) to (negotiate|accept)|chance of success/i);
  });
});
