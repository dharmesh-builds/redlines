import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnalyzeForm } from "../../app/(app)/analyze/analyze-form";
import { analyzeResponse } from "../../lib/api/analyze-api";
import { ANALYZE_ERRORS } from "../../lib/api/analyze-contract";
import { askTextResponse } from "../../lib/api/ask-api";
import { ASK_ERRORS } from "../../lib/api/ask-contract";
import { fixtureText, payloadFromSidecar, scriptedModel } from "../support/scripted-model";

// Analysis is for signed-in readers only. A signed-out request is refused
// before any model call, and the page asks the reader to sign in instead.

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("analysis needs a signed-in reader", () => {
  it("POST /api/analyze refuses a signed-out reader and calls no model", async () => {
    const model = scriptedModel(payloadFromSidecar("adhesion-contract"));
    const res = await analyzeResponse(
      jsonRequest("http://localhost/api/analyze", { text: fixtureText("adhesion-contract") }),
      { kind: "signed-out" },
      model,
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: ANALYZE_ERRORS.signedOut });
    expect(model.requests).toHaveLength(0);
  });

  it("POST /api/ask refuses a signed-out reader and calls no model", async () => {
    const model = scriptedModel({});
    const res = await askTextResponse(
      jsonRequest("http://localhost/api/ask", { text: fixtureText("adhesion-contract"), question: "How much is the fee?" }),
      { kind: "signed-out" },
      model,
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: ASK_ERRORS.signedOut });
    expect(model.requests).toHaveLength(0);
  });

  it("the form tells a signed-out reader they need to sign in to check", () => {
    const html = renderToStaticMarkup(<AnalyzeForm saving={{ kind: "anonymous" }} />);
    expect(html).toContain("Sign in to check an agreement");
    expect(html).not.toContain("nothing is saved");
  });
});
