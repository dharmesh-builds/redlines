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
import { buildSummary, verifyIncorporatedTerms, type Summary } from "./summary";
import { computeVerdict, type Verdict } from "./verdict";
import { checkCounterOffer, type CounterOfferShown } from "./counter-offer";
import { cleanRedLines, matchRedLine, withRedLine } from "./red-lines";

export type { Exposure, Severity, ShownFigure, TwelveMonthFee };
export type { Confidence, ConfidenceLevel, ConfidenceReason } from "./confidence";
export type {
  DeadlineShown,
  IncorporatedTermShown,
  NotStatedKind,
  NotStatedNote,
  Summary,
  SummaryPointShown,
} from "./summary";
export type { Verdict } from "./verdict";
export type { CounterOfferProblem, CounterOfferShown } from "./counter-offer";

// A flag as the reader sees it. Every source sentence, and the sentence behind
// every figure, has passed the verbatim check and is given as it reads in the
// document. Severity, exposure and confidence are computed by code.
export type Flag = {
  clauseType: ClauseType;
  // The severity shown: the higher of `builtInSeverity` and the red-line
  // severity (High when `matchedRedLine` is set). ADR 0003.
  severity: Severity;
  // What the money-exposure rules alone give this clause.
  builtInSeverity: Severity;
  // The user's red line this clause matches, exactly as the user wrote it,
  // or null. Only a red line the user supplied can appear here.
  matchedRedLine: string | null;
  exposure: Exposure;
  confidence: Confidence;
  figures: ShownFigure[];
  sourceSentences: string[];
  explanation: string;
  // The drafted rewrite and request to the vendor, replacing exactly the
  // verified source sentences above. When the draft fails the checks in
  // counter-offer.ts the flag is still shown, with `drafted: false`.
  counterOffer: CounterOfferShown;
};

export type Report = {
  modelId: string;
  // The red lines this analysis ran with (the snapshot a saved report keeps),
  // trimmed and without duplicates. Empty when it ran with none.
  redLines: string[];
  // The plain-English summary, deadlines, incorporated-term references and
  // what the document doesn't state. Every quote in it is verified.
  summary: Summary;
  // Present only when no flag is High or Medium. Computed by code from the
  // verified flags; names every verified incorporated-term reference as unread.
  verdict: Verdict;
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
 * from checks against the document (ADR 0004, ADR 0006). Each kept flag's
 * drafted counter-offer is checked by code and shown only if it passes; a
 * failed draft never removes the flag (see counter-offer.ts).
 * A flag the model says matches one of `redLines` is raised to High, but only
 * if the reported red line is one of those supplied (ADR 0003). Red lines
 * never lower a severity or remove a flag, and a red-line flag passes the
 * same quote checks as any other.
 * Throws ModelOutputError if the model's answer is not in the agreed shape,
 * so no report is ever built from it.
 */
export async function analyze(
  documentText: string,
  redLines: readonly string[],
  model: ModelPort,
): Promise<Report> {
  const lines = cleanRedLines(redLines);
  const response = await model.generate({
    system: ANALYSIS_SYSTEM_PROMPT,
    prompt: analysisPrompt(documentText, lines),
    schemaName: MODEL_OUTPUT_SCHEMA_NAME,
    schema: modelOutputSchema,
  });

  const result = validateModelOutput(response.data);
  if (!result.ok) throw new ModelOutputError(result.errors);

  const verifier = createVerifier(documentText);
  const line = twelveMonthFee(result.value.periodicFee, verifier);
  const incorporated = verifyIncorporatedTerms(result.value.incorporatedTerms, verifier);
  const context: FlagContext = {
    verifier,
    line,
    doc: indexDocument(documentText),
    // Where each verified incorporated-term reference sits. A flag quoting one
    // of these sentences refers to outside terms, whatever the model said.
    outsideAt: new Set(incorporated.map((t) => t.start)),
    redLines: lines,
  };
  const verified: { flag: Omit<Flag, "counterOffer">; draft: CandidateFlag["counterOffer"] }[] = [];

  for (const candidate of result.value.candidateFlags) {
    const flag = verifyFlag(candidate, context);
    if (flag) verified.push({ flag, draft: candidate.counterOffer });
  }
  // Counter-offers are checked once every displayed flag is known, so a draft
  // that quotes another flag's clause can be caught.
  const flags = rank(
    verified.map(({ flag, draft }, i): Flag => {
      const others = verified.flatMap((v, j) => (j === i ? [] : v.flag.sourceSentences));
      return { ...flag, counterOffer: checkCounterOffer(draft, flag.sourceSentences, others) };
    }),
  );

  const candidateFlagCount = result.value.candidateFlags.length;
  const summary = buildSummary(result.value, verifier, incorporated, {
    line,
    hasAutoRenewalFlag: flags.some((f) => f.clauseType === "auto_renewal"),
  });
  return {
    modelId: response.modelId,
    redLines: lines,
    summary,
    verdict: computeVerdict(flags, summary.incorporatedTerms, summary.points.length),
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
  redLines: readonly string[];
};

function verifyFlag(
  candidate: CandidateFlag,
  { verifier, line, doc, outsideAt, redLines }: FlagContext,
): Omit<Flag, "counterOffer"> | null {
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

  const { exposure, severity: builtInSeverity } = assess(candidate, figures, line);
  const matchedRedLine = matchRedLine(candidate.matchedRedLine, redLines);
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
    severity: withRedLine(builtInSeverity, matchedRedLine),
    builtInSeverity,
    matchedRedLine,
    exposure,
    confidence,
    figures: figures.map(({ symbol: _symbol, ...figure }) => figure),
    sourceSentences,
    explanation: candidate.explanation,
  };
}
