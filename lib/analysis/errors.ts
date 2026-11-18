// Errors the Analysis module and its model adapters raise. Each carries a
// stable `code` so routes can turn it into a plain message for the reader.

export class ModelNotConfiguredError extends Error {
  readonly code = "model_not_configured";
  constructor(missing: string[]) {
    super(`The model is not configured: set ${missing.join(" and ")} in .env.local.`);
    this.name = "ModelNotConfiguredError";
  }
}

export class ModelCallError extends Error {
  readonly code = "model_call_failed";
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ModelCallError";
  }
}

// The model answered, but not in the agreed shape. Nothing from that answer is
// shown: a report is never built from output that failed validation.
export class ModelOutputError extends Error {
  readonly code = "model_output_invalid";
  constructor(readonly problems: string[]) {
    super(`The model's answer did not match the expected shape: ${problems.slice(0, 5).join("; ")}${problems.length > 5 ? ` (and ${problems.length - 5} more)` : ""}.`);
    this.name = "ModelOutputError";
  }
}
