import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ClauseType, DeadlineRelation, FeePeriod, FigureUnit, ModelOutput } from "../../lib/analysis/contract";
import type { ModelPort, ModelRequest } from "../../lib/analysis/model-port";

// Scripted model adapter for tests. It answers with a payload built from a
// fixture sidecar (tests/fixtures/*.json), so the suite runs without a key.
// The model is the only thing a test stubs; everything after the port is real.

const FIXTURES = fileURLToPath(new URL("../fixtures/", import.meta.url));

type Sidecar = {
  periodicFee: { amount: number; period: FeePeriod; sentence: string } | null;
  clauses: {
    id: string;
    clauseType: ClauseType;
    sentences: string[];
    explanation: string;
    figures: { value: number; unit: FigureUnit; per: FeePeriod | null; label: string; sentence: string }[];
    costsMoney: boolean;
    capStated: boolean;
    expectedExposure: "unbounded" | "stated" | "unquantified" | "none";
    expectedSeverity: "high" | "medium" | "low";
    expectedConfidence: "high" | "medium" | "low";
    undefinedTerms: string[];
    refersToOutsideTerms: boolean;
    counterOffer: { rewrittenClause: string; request: string };
  }[];
  deadlines: { days: number; relation: DeadlineRelation; referencePoint: string; sentence: string }[];
  incorporatedTerms: { description: string; sentence: string }[];
  summaryPoints: { text: string; sentences: string[] }[];
};

export type FixtureName = "adhesion-contract" | "clean-contract";

export function fixtureText(name: FixtureName): string {
  return readFileSync(join(FIXTURES, `${name}.txt`), "utf8");
}

export function fixtureSidecar(name: FixtureName): Sidecar {
  return JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), "utf8")) as Sidecar;
}

/** The answer a perfect model would give for this fixture. */
export function payloadFromSidecar(name: FixtureName): ModelOutput {
  const sidecar = fixtureSidecar(name);
  const fee = sidecar.periodicFee
    ? {
        amount: sidecar.periodicFee.amount,
        period: sidecar.periodicFee.period,
        sourceSentence: sidecar.periodicFee.sentence,
      }
    : null;

  return {
    periodicFee: fee,
    summaryPoints: sidecar.summaryPoints.map((p) => ({ text: p.text, sourceSentences: p.sentences })),
    deadlines: sidecar.deadlines.map((d) => ({
      days: d.days,
      relation: d.relation,
      referencePoint: d.referencePoint,
      sourceSentence: d.sentence,
    })),
    incorporatedTerms: sidecar.incorporatedTerms.map((t) => ({
      description: t.description,
      sourceSentence: t.sentence,
    })),
    candidateFlags: sidecar.clauses.map((c) => ({
      clauseType: c.clauseType,
      sourceSentences: [...c.sentences],
      explanation: c.explanation,
      figures: c.figures.map((f) => ({
        value: f.value,
        unit: f.unit,
        per: f.per,
        label: f.label,
        sourceSentence: f.sentence,
      })),
      costsMoney: c.costsMoney,
      capStated: c.capStated,
      undefinedTerms: [...c.undefinedTerms],
      refersToOutsideTerms: c.refersToOutsideTerms,
      matchedRedLine: null,
      counterOffer: { ...c.counterOffer },
    })),
  };
}

/** A copy of the fixture payload with `change` applied, e.g. a fabricated flag. */
export function tamperedPayload(name: FixtureName, change: (payload: ModelOutput) => void): ModelOutput {
  const payload = structuredClone(payloadFromSidecar(name));
  change(payload);
  return payload;
}

/** Changes one word of `sentence` so it no longer appears in the document. */
export function changeOneWord(sentence: string, from: string, to: string): string {
  const changed = sentence.replace(new RegExp(`\\b${from}\\b`), to);
  if (changed === sentence) throw new Error(`"${from}" is not a word in: ${sentence}`);
  return changed;
}

export const SCRIPTED_MODEL_ID = "scripted/fixture-model";

export type ScriptedModel = ModelPort & { requests: ModelRequest[] };

/** A model port that answers every request with `data` (any value, valid or not). */
export function scriptedModel(data: unknown, modelId = SCRIPTED_MODEL_ID): ScriptedModel {
  const requests: ModelRequest[] = [];
  return {
    requests,
    async generate(request) {
      requests.push(request);
      return { modelId, data: structuredClone(data) };
    },
  };
}
