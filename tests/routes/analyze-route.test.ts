import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../app/api/analyze/route";
import { ANALYZE_ERRORS } from "../../lib/api/analyze-contract";
import { MIN_DOCUMENT_CHARS } from "../../lib/document-input";
import { fixtureText, payloadFromSidecar } from "../support/scripted-model";

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

// The model is reached through fetch; that is the only thing stubbed here.
function stubModelReply(payload: unknown) {
  const fetchMock = vi.fn(async () =>
    Response.json({ model: "test-vendor/test-model", choices: [{ message: { content: JSON.stringify(payload) } }] }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  // Supabase not configured: analysis must still work, with nothing stored.
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test-key-not-real");
  vi.stubEnv("OPENROUTER_MODEL", "test-vendor/test-model");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/analyze", () => {
  it("analyses pasted text without Supabase, stores nothing, and returns only verified flags", async () => {
    const payload = payloadFromSidecar("adhesion-contract");
    payload.candidateFlags.push({
      ...payload.candidateFlags[0],
      sourceSentences: ["Vendor may charge Customer any amount at any time."],
      figures: [],
    });
    const fetchMock = stubModelReply(payload);

    const res = await post({ text: fixtureText("adhesion-contract") });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.saved).toBe(false);
    expect(body.report.flags).toHaveLength(7);
    expect(body.report.droppedFlagCount).toBe(1);
    expect(body.report.modelId).toBe("test-vendor/test-model");
    // the only outbound call is the model call
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an empty paste with a clear message and calls no model", async () => {
    const fetchMock = stubModelReply({});
    const res = await post({ text: "   " });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Paste the text of the agreement/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a very short paste and states the minimum", async () => {
    const fetchMock = stubModelReply({});
    const res = await post({ text: "Fees: $750 per month." });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain(`at least ${MIN_DOCUMENT_CHARS}`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a body that isn't JSON", async () => {
    const res = await post("not json");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(ANALYZE_ERRORS.badRequest);
  });

  it.each(["OPENROUTER_API_KEY", "OPENROUTER_MODEL"])("says analysis isn't set up when %s is unset", async (name) => {
    vi.stubEnv(name, "");
    const fetchMock = stubModelReply({});
    const res = await post({ text: fixtureText("adhesion-contract") });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe(ANALYZE_ERRORS.notConfigured);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows nothing when the model's answer is in the wrong shape", async () => {
    stubModelReply({ flags: "none" });
    const res = await post({ text: fixtureText("adhesion-contract") });
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe(ANALYZE_ERRORS.modelOutput);
    expect(body.report).toBeUndefined();
  });
});
