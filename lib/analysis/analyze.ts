import {
  MODEL_OUTPUT_SCHEMA_NAME,
  modelOutputSchema,
  validateModelOutput,
  type CandidateFlag,
  type ClauseType,
} from "./contract";
import { ModelOutputError } from "./errors";
import type { ModelPort } from "./model-port";
import { ANALYSIS_SYSTEM_PROMPT, analysisPrompt } from "./prompt";
import { createVerifier } from "./verbatim";

// A flag as the reader sees it. Every source sentence has passed the verbatim
// check and is given as it reads in the document.
export type Flag = {
  clauseType: ClauseType;
  sourceSentences: string[];
  explanation: string;
};

export type Report = {
  modelId: string;
  flags: Flag[];
  // How many flags the model proposed, and how many were dropped because a
  // quote could not be found word for word in the document.
  candidateFlagCount: number;
  droppedFlagCount: number;
};

/**
 * Analyses one agreement. The model proposes; code decides what is shown.
 * A candidate flag is kept only if every sentence it quotes, including the
 * sentence behind each figure, appears verbatim in `documentText` (ADR 0001).
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
  const flags: Flag[] = [];

  for (const candidate of result.value.candidateFlags) {
    const flag = verifyFlag(candidate, verifier);
    if (flag) flags.push(flag);
  }

  const candidateFlagCount = result.value.candidateFlags.length;
  return {
    modelId: response.modelId,
    flags,
    candidateFlagCount,
    droppedFlagCount: candidateFlagCount - flags.length,
  };
}

function verifyFlag(
  candidate: CandidateFlag,
  verifier: ReturnType<typeof createVerifier>,
): Flag | null {
  if (candidate.sourceSentences.length === 0) return null;

  const sourceSentences: string[] = [];
  for (const quote of candidate.sourceSentences) {
    const match = verifier.find(quote);
    if (!match) return null;
    sourceSentences.push(match.text);
  }

  for (const figure of candidate.figures) {
    if (!verifier.find(figure.sourceSentence)) return null;
  }

  return {
    clauseType: candidate.clauseType,
    sourceSentences,
    explanation: candidate.explanation,
  };
}
