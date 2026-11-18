import {
  MODEL_OUTPUT_SCHEMA_NAME,
  modelOutputSchema,
  validateModelOutput,
  type CandidateFlag,
  type ClauseType,
} from "./contract";
import { ModelOutputError } from "./errors";
import type { ModelPort } from "./model-port";
import {
  assess,
  rank,
  twelveMonthFee,
  verifyFigure,
  type Exposure,
  type Severity,
  type ShownFigure,
  type TwelveMonthFee,
} from "./exposure";
import { assessConfidence, indexDocument, type Confidence, type DocumentIndex } from "./confidence";
import { ANALYSIS_SYSTEM_PROMPT, analysisPrompt } from "./prompt";
import { createVerifier } from "./verbatim";

export type { Exposure, Severity, ShownFigure, TwelveMonthFee };
export type { Confidence, ConfidenceLevel, ConfidenceReason } from "./confidence";

// A flag as the reader sees it. Every source sentence, and the sentence behind
// every figure, has passed the verbatim check and is given as it reads in the
// document. Severity, exposure and confidence are computed by code.
export type Flag = {
  clauseType: ClauseType;
  severity: Severity;
  exposure: Exposure;
  confidence: Confidence;
  figures: ShownFigure[];
  sourceSentences: string[];
  explanation: string;
};

export type Report = {
  modelId: string;
  // Ranked: High, then Medium (unquantified first), then Low.
  flags: Flag[];
  // How many flags the model proposed, and how many were dropped because a
  // quote could not be found word for word in the document.
  candidateFlagCount: number;
  droppedFlagCount: number;
};

/**
 * Analyses one agreement. The model proposes; code decides what is shown.
 * A candidate flag is kept only if every sentence it quotes, including the
 * sentence behind each figure, appears verbatim in `documentText` (ADR 0001),
 * and each figure's number is written in its sentence. Exposure and severity
 * are then computed from those figures (ADR 0003, ADR 0006), and confidence
 * from checks against the document (ADR 0004, ADR 0006).
 * Throws ModelOutputError if the model's answer is not in the agreed shape,
 * so no report is ever built from it.
 */
export async function analyze(
  documentText: string,
  redLines: readonly string[],
  model: ModelPort,
): Promise<Report> {
  const response = await model.generate({
    system: ANALYSIS_SYSTEM_PROMPT,
    prompt: analysisPrompt(documentText, redLines),
    schemaName: MODEL_OUTPUT_SCHEMA_NAME,
    schema: modelOutputSchema,
  });

  const result = validateModelOutput(response.data);
  if (!result.ok) throw new ModelOutputError(result.errors);

  const verifier = createVerifier(documentText);
  const line = twelveMonthFee(result.value.periodicFee, verifier);
  const context: FlagContext = {
    verifier,
    line,
    doc: indexDocument(documentText),
    // Where each verified incorporated-term reference sits. A flag quoting one
    // of these sentences refers to outside terms, whatever the model said.
    outsideAt: new Set(
      result.value.incorporatedTerms
        .map((t) => verifier.find(t.sourceSentence)?.start)
        .filter((start): start is number => start !== undefined),
    ),
  };
  const verified: Flag[] = [];

  for (const candidate of result.value.candidateFlags) {
    const flag = verifyFlag(candidate, context);
    if (flag) verified.push(flag);
  }
  const flags = rank(verified);

  const candidateFlagCount = result.value.candidateFlags.length;
  return {
    modelId: response.modelId,
    flags,
    candidateFlagCount,
    droppedFlagCount: candidateFlagCount - flags.length,
  };
}

type FlagContext = {
  verifier: ReturnType<typeof createVerifier>;
  line: TwelveMonthFee | null;
  doc: DocumentIndex;
  outsideAt: Set<number>;
};

function verifyFlag(candidate: CandidateFlag, { verifier, line, doc, outsideAt }: FlagContext): Flag | null {
  if (candidate.sourceSentences.length === 0) return null;

  const sourceSentences: string[] = [];
  const sourceOffsets: number[] = [];
  for (const quote of candidate.sourceSentences) {
    const match = verifier.find(quote);
    if (!match) return null;
    sourceSentences.push(match.text);
    sourceOffsets.push(match.start);
  }

  const figures = [];
  for (const figure of candidate.figures) {
    const shown = verifyFigure(figure, verifier);
    if (!shown) return null;
    figures.push(shown);
  }

  const { exposure, severity } = assess(candidate, figures, line);
  const confidence = assessConfidence(
    {
      claimedUndefinedTerms: candidate.undefinedTerms,
      refersToOutsideTerms: candidate.refersToOutsideTerms || sourceOffsets.some((at) => outsideAt.has(at)),
      sourceOffsets,
      exposure,
    },
    doc,
  );
  return {
    clauseType: candidate.clauseType,
    severity,
    exposure,
    confidence,
    figures: figures.map(({ symbol: _symbol, ...figure }) => figure),
    sourceSentences,
    explanation: candidate.explanation,
  };
}
