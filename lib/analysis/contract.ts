// The contract between the model and code: what the model returns.
// The model never returns severity, confidence or a verdict; code computes those
// (spec, "What the model returns"). Three views of one shape live here:
// the TypeScript type, the JSON schema sent with every request, and a
// hand-written validator that checks what actually came back.

export const CLAUSE_TYPES = [
  "auto_renewal",
  "price_increase",
  "minimum_commitment",
  "termination",
  "indemnity",
  "liability",
  "unilateral_change",
  "payment",
  "data",
  "boilerplate",
  "other",
] as const;

export type ClauseType = (typeof CLAUSE_TYPES)[number];

export const FEE_PERIODS = ["month", "quarter", "year"] as const;
export type FeePeriod = (typeof FEE_PERIODS)[number];

export type QuotedFigure = {
  value: number;
  label: string;
  sourceSentence: string;
};

export type PeriodicFee = {
  amount: number;
  period: FeePeriod;
  sourceSentence: string;
};

export type CounterOffer = {
  rewrittenClause: string;
  request: string;
};

export type CandidateFlag = {
  clauseType: ClauseType;
  sourceSentences: string[];
  explanation: string;
  figures: QuotedFigure[];
  capStated: boolean;
  periodicFee: PeriodicFee | null;
  undefinedTerms: string[];
  refersToOutsideTerms: boolean;
  matchedRedLine: string | null;
  counterOffer: CounterOffer;
};

export type SummaryPoint = {
  text: string;
  sourceSentences: string[];
};

export type Deadline = {
  days: number;
  referencePoint: string;
  sourceSentence: string;
};

export type IncorporatedTerm = {
  description: string;
  sourceSentence: string;
};

export type ModelOutput = {
  summaryPoints: SummaryPoint[];
  deadlines: Deadline[];
  incorporatedTerms: IncorporatedTerm[];
  candidateFlags: CandidateFlag[];
};

// ---------------------------------------------------------------------------
// JSON schema, written for strict structured output: every object lists all
// of its properties as required and forbids extra ones; optional values are
// nullable instead of absent.

type JsonSchema = Record<string, unknown>;

const str: JsonSchema = { type: "string" };
const strArray: JsonSchema = { type: "array", items: str };

function object(properties: Record<string, JsonSchema>): JsonSchema {
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

export const MODEL_OUTPUT_SCHEMA_NAME = "contract_analysis";

export const modelOutputSchema: JsonSchema = object({
  summaryPoints: {
    type: "array",
    items: object({ text: str, sourceSentences: strArray }),
  },
  deadlines: {
    type: "array",
    items: object({ days: { type: "integer" }, referencePoint: str, sourceSentence: str }),
  },
  incorporatedTerms: {
    type: "array",
    items: object({ description: str, sourceSentence: str }),
  },
  candidateFlags: {
    type: "array",
    items: object({
      clauseType: { type: "string", enum: [...CLAUSE_TYPES] },
      sourceSentences: strArray,
      explanation: str,
      figures: {
        type: "array",
        items: object({ value: { type: "number" }, label: str, sourceSentence: str }),
      },
      capStated: { type: "boolean" },
      periodicFee: {
        anyOf: [
          object({
            amount: { type: "number" },
            period: { type: "string", enum: [...FEE_PERIODS] },
            sourceSentence: str,
          }),
          { type: "null" },
        ],
      },
      undefinedTerms: strArray,
      refersToOutsideTerms: { type: "boolean" },
      matchedRedLine: { type: ["string", "null"] },
      counterOffer: object({ rewrittenClause: str, request: str }),
    }),
  },
});

// ---------------------------------------------------------------------------
// Validator. Returns every problem it finds, each with its path, so a bad
// response can be reported precisely instead of crashing later.

export type ValidationResult =
  | { ok: true; value: ModelOutput }
  | { ok: false; errors: string[] };

type Check = (value: unknown, path: string, errors: string[]) => void;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const isString: Check = (v, path, errors) => {
  if (typeof v !== "string") errors.push(`${path} must be a string`);
};

const isBoolean: Check = (v, path, errors) => {
  if (typeof v !== "boolean") errors.push(`${path} must be true or false`);
};

const isNumber: Check = (v, path, errors) => {
  if (typeof v !== "number" || !Number.isFinite(v)) errors.push(`${path} must be a number`);
};

const isInteger: Check = (v, path, errors) => {
  if (typeof v !== "number" || !Number.isInteger(v)) errors.push(`${path} must be a whole number`);
};

function oneOf(options: readonly string[]): Check {
  return (v, path, errors) => {
    if (typeof v !== "string" || !options.includes(v)) {
      errors.push(`${path} must be one of: ${options.join(", ")}`);
    }
  };
}

function nullable(check: Check): Check {
  return (v, path, errors) => {
    if (v !== null) check(v, path, errors);
  };
}

function arrayOf(check: Check): Check {
  return (v, path, errors) => {
    if (!Array.isArray(v)) {
      errors.push(`${path} must be a list`);
      return;
    }
    v.forEach((item, i) => check(item, `${path}[${i}]`, errors));
  };
}

function shape(fields: Record<string, Check>): Check {
  return (v, path, errors) => {
    if (!isObject(v)) {
      errors.push(`${path} must be an object`);
      return;
    }
    for (const [key, check] of Object.entries(fields)) {
      if (!(key in v)) errors.push(`${path}.${key} is missing`);
      else check(v[key], `${path}.${key}`, errors);
    }
  };
}

const checkModelOutput = shape({
  summaryPoints: arrayOf(shape({ text: isString, sourceSentences: arrayOf(isString) })),
  deadlines: arrayOf(shape({ days: isInteger, referencePoint: isString, sourceSentence: isString })),
  incorporatedTerms: arrayOf(shape({ description: isString, sourceSentence: isString })),
  candidateFlags: arrayOf(
    shape({
      clauseType: oneOf(CLAUSE_TYPES),
      sourceSentences: arrayOf(isString),
      explanation: isString,
      figures: arrayOf(shape({ value: isNumber, label: isString, sourceSentence: isString })),
      capStated: isBoolean,
      periodicFee: nullable(
        shape({ amount: isNumber, period: oneOf(FEE_PERIODS), sourceSentence: isString }),
      ),
      undefinedTerms: arrayOf(isString),
      refersToOutsideTerms: isBoolean,
      matchedRedLine: nullable(isString),
      counterOffer: shape({ rewrittenClause: isString, request: isString }),
    }),
  ),
});

export function validateModelOutput(value: unknown): ValidationResult {
  const errors: string[] = [];
  checkModelOutput(value, "output", errors);
  return errors.length === 0 ? { ok: true, value: value as ModelOutput } : { ok: false, errors };
}
