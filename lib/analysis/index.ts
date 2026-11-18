// Public interface of the Analysis module.
export {
  analyze,
  type Confidence,
  type CounterOfferProblem,
  type CounterOfferShown,
  type DeadlineShown,
  type IncorporatedTermShown,
  type NotStatedNote,
  type Summary,
  type SummaryPointShown,
  type ConfidenceLevel,
  type ConfidenceReason,
  type Exposure,
  type Flag,
  type Report,
  type Severity,
  type ShownFigure,
  type TwelveMonthFee,
  type Verdict,
} from "./analyze";
export { appearsVerbatim } from "./verbatim";
export type { ModelPort, ModelRequest, ModelResponse } from "./model-port";
export { ModelCallError, ModelNotConfiguredError, ModelOutputError } from "./errors";
export {
  CLAUSE_TYPES,
  modelOutputSchema,
  validateModelOutput,
  type ClauseType,
  type ModelOutput,
} from "./contract";
