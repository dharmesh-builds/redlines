import "server-only";

import { ModelCallError, ModelNotConfiguredError, ModelOutputError } from "../analysis/errors";
import type { ModelPort, ModelRequest, ModelResponse } from "../analysis/model-port";

// Production model adapter. Calls OpenRouter's OpenAI-compatible endpoint from
// the server only. The model ID and key are read from the environment on every
// call; there is no default model.

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function readConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;
  const missing = [
    ...(apiKey ? [] : ["OPENROUTER_API_KEY"]),
    ...(model ? [] : ["OPENROUTER_MODEL"]),
  ];
  if (missing.length > 0 || !apiKey || !model) throw new ModelNotConfiguredError(missing);
  return { apiKey, model };
}

export function buildOpenRouterBody(model: string, request: ModelRequest) {
  return {
    model,
    messages: [
      { role: "system", content: request.system },
      { role: "user", content: request.prompt },
    ],
    // Fireworks serves the configured model with structured output; pinning it
    // without fallbacks means a request never lands on a provider that would
    // ignore the schema.
    provider: { order: ["fireworks"], allow_fallbacks: false, require_parameters: true },
    reasoning: { effort: "low" },
    response_format: {
      type: "json_schema",
      json_schema: { name: request.schemaName, strict: true, schema: request.schema },
    },
  };
}

export function createOpenRouterModel(): ModelPort {
  return {
    async generate(request: ModelRequest): Promise<ModelResponse> {
      const { apiKey, model } = readConfig();

      let res: Response;
      try {
        res = await fetch(OPENROUTER_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "X-Title": "Redline",
          },
          body: JSON.stringify(buildOpenRouterBody(model, request)),
        });
      } catch (err) {
        throw new ModelCallError(`Could not reach OpenRouter: ${(err as Error).message}`);
      }

      const raw = await res.text();
      if (!res.ok) {
        throw new ModelCallError(
          `OpenRouter returned ${res.status}: ${errorMessageFrom(raw)}`,
          res.status,
        );
      }

      let body: unknown;
      try {
        body = JSON.parse(raw);
      } catch {
        throw new ModelCallError("OpenRouter returned a response that is not JSON.", res.status);
      }

      const choice = (body as { choices?: { message?: { content?: unknown } }[] }).choices?.[0];
      const content = choice?.message?.content;
      if (typeof content !== "string" || content.trim() === "") {
        const apiError = (body as { error?: { message?: string } }).error?.message;
        throw new ModelCallError(
          apiError ? `OpenRouter error: ${apiError}` : "OpenRouter returned no message content.",
          res.status,
        );
      }

      let data: unknown;
      try {
        data = JSON.parse(content);
      } catch {
        throw new ModelOutputError(["the answer is not valid JSON"]);
      }

      const answeredBy = (body as { model?: unknown }).model;
      return { modelId: typeof answeredBy === "string" && answeredBy ? answeredBy : model, data };
    },
  };
}

function errorMessageFrom(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    if (parsed.error?.message) return parsed.error.message;
  } catch {
    // fall through to the raw text
  }
  return raw.slice(0, 300) || "no details";
}
