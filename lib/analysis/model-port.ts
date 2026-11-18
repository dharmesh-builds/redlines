// The model port: the only way the Analysis module talks to a model.
// One operation: send a prompt plus the shape the answer must take, and get
// back parsed structured data. The production adapter calls OpenRouter
// (lib/model/openrouter.ts); tests supply scripted adapters.

export type ModelRequest = {
  system: string;
  prompt: string;
  schemaName: string;
  schema: Record<string, unknown>;
};

export type ModelResponse = {
  // The ID of the model that produced `data`, saved with every report.
  modelId: string;
  // Parsed JSON. Not yet checked against the schema; the caller validates it.
  data: unknown;
};

export interface ModelPort {
  generate(request: ModelRequest): Promise<ModelResponse>;
}
