import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyze, ask, askOutputSchema, ModelCallError, ModelNotConfiguredError, ModelOutputError } from "../analysis";
import { fixtureSidecar, fixtureText, payloadFromSidecar } from "../../tests/support/scripted-model";
import { OPENROUTER_URL, createOpenRouterModel } from "./openrouter";

const TEST_KEY = "sk-or-test-key-not-real";
const TEST_MODEL = "test-vendor/test-model";

function openRouterReply(content: string, model = TEST_MODEL) {
  return new Response(
    JSON.stringify({ id: "gen-1", model, choices: [{ message: { role: "assistant", content } }] }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

const request = {
  system: "system text",
  prompt: "prompt text",
  schemaName: "contract_analysis",
  schema: { type: "object", properties: {}, required: [], additionalProperties: false },
};

beforeEach(() => {
  vi.stubEnv("OPENROUTER_API_KEY", TEST_KEY);
  vi.stubEnv("OPENROUTER_MODEL", TEST_MODEL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("OpenRouter adapter", () => {
  it("sends the pinned provider, low reasoning effort and a strict JSON schema", async () => {
    const fetchMock = vi.fn(async () => openRouterReply('{"ok":true}'));
    vi.stubGlobal("fetch", fetchMock);

    await createOpenRouterModel().generate(request);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(OPENROUTER_URL);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TEST_KEY}`);

    const body = JSON.parse(init.body as string);
    expect(body.model).toBe(TEST_MODEL);
    expect(body.messages).toEqual([
      { role: "system", content: "system text" },
      { role: "user", content: "prompt text" },
    ]);
    expect(body.provider).toEqual({ order: ["fireworks"], allow_fallbacks: false, require_parameters: true });
    expect(body.reasoning).toEqual({ effort: "low" });
    expect(body.max_tokens).toBe(16_000);
    expect(body.response_format).toEqual({
      type: "json_schema",
      json_schema: { name: "contract_analysis", strict: true, schema: request.schema },
    });
  });

  it("reads the model from OPENROUTER_MODEL at call time", async () => {
    const fetchMock = vi.fn(async () => openRouterReply("{}", "another/model"));
    vi.stubGlobal("fetch", fetchMock);
    const model = createOpenRouterModel();

    vi.stubEnv("OPENROUTER_MODEL", "another/model");
    const response = await model.generate(request);

    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.model).toBe("another/model");
    expect(response.modelId).toBe("another/model");
  });

  it.each(["OPENROUTER_API_KEY", "OPENROUTER_MODEL"])("throws a clear error when %s is unset", async (name) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv(name, "");

    const result = createOpenRouterModel().generate(request);
    await expect(result).rejects.toBeInstanceOf(ModelNotConfiguredError);
    await expect(result).rejects.toThrow(name);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("turns an HTTP error into a ModelCallError without echoing the key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: { message: "No endpoints found" } }), { status: 404 })),
    );
    const result = createOpenRouterModel().generate(request);
    await expect(result).rejects.toBeInstanceOf(ModelCallError);
    await expect(result).rejects.toThrow(/404: No endpoints found/);
    await expect(result).rejects.not.toThrow(TEST_KEY);
  });

  it("turns non-JSON message content into a ModelOutputError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => openRouterReply("Sure! Here is the analysis.")));
    await expect(createOpenRouterModel().generate(request)).rejects.toBeInstanceOf(ModelOutputError);
  });

  it("feeds analyze end to end, and the schema it sends is strict-mode compatible", async () => {
    const fetchMock = vi.fn(async () =>
      openRouterReply(JSON.stringify(payloadFromSidecar("adhesion-contract"))),
    );
    vi.stubGlobal("fetch", fetchMock);

    const report = await analyze(fixtureText("adhesion-contract"), [], createOpenRouterModel());
    expect(report.flags).toHaveLength(7);
    expect(report.modelId).toBe(TEST_MODEL);

    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    const problems: string[] = [];
    (function walk(node: unknown, path: string) {
      if (Array.isArray(node)) return node.forEach((n, i) => walk(n, `${path}[${i}]`));
      if (typeof node !== "object" || node === null) return;
      const schema = node as Record<string, unknown>;
      if (schema.type === "object") {
        const keys = Object.keys(schema.properties as object).sort();
        if (schema.additionalProperties !== false) problems.push(`${path} allows extra properties`);
        if (JSON.stringify([...(schema.required as string[])].sort()) !== JSON.stringify(keys)) {
          problems.push(`${path} does not require every property`);
        }
      }
      for (const [k, v] of Object.entries(schema)) walk(v, `${path}.${k}`);
    })(body.response_format.json_schema.schema, "schema");
    expect(problems).toEqual([]);
  });

  it("sends ask with the pinned provider, low reasoning and the strict answer schema", async () => {
    const sentence = fixtureSidecar("adhesion-contract").periodicFee!.sentence;
    const fetchMock = vi.fn(async () =>
      openRouterReply(
        JSON.stringify({ outcome: "answered", answer: "$750 a month, billed yearly.", sourceSentences: [sentence] }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const answer = await ask(fixtureText("adhesion-contract"), "How much is the fee?", createOpenRouterModel());
    expect(answer).toEqual({ kind: "answered", text: "$750 a month, billed yearly.", sources: [sentence] });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.model).toBe(TEST_MODEL);
    expect(body.provider).toEqual({ order: ["fireworks"], allow_fallbacks: false, require_parameters: true });
    expect(body.reasoning).toEqual({ effort: "low" });
    expect(body.max_tokens).toBe(16_000);
    expect(body.response_format).toEqual({
      type: "json_schema",
      json_schema: { name: "document_answer", strict: true, schema: askOutputSchema },
    });
    expect(body.messages[1].content).toContain("How much is the fee?");
  });
});
