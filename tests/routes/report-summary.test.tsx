import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReportView } from "../../app/(app)/analyze/analyze-form";
import { analyze } from "../../lib/analysis";
import { fixtureSidecar, fixtureText, payloadFromSidecar, scriptedModel } from "../support/scripted-model";

// The rendered report opens with the summary, then deadlines, then the
// documents Redline hasn't read, then the flags. Every item shows its quote.

const textOf = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

async function rendered(name: "adhesion-contract" | "clean-contract") {
  const report = await analyze(fixtureText(name), [], scriptedModel(payloadFromSidecar(name)));
  return textOf(renderToStaticMarkup(<ReportView report={report} saved={false} />));
}

describe("report view: summary", () => {
  it("shows summary, deadlines, unread documents, then flags, in that order", async () => {
    const text = await rendered("adhesion-contract");
    const order = [
      "What this agreement says",
      "Deadlines",
      "Other documents it pulls in",
      "7 flags, most costly first",
    ].map((heading) => text.indexOf(heading));
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("shows each deadline as days plus reference point, with its quote", async () => {
    const text = await rendered("adhesion-contract");
    expect(text).toContain("60 days before the renewal date");
    for (const d of fixtureSidecar("adhesion-contract").deadlines) expect(text).toContain(d.sentence);
  });

  it("marks every incorporated term as not read by Redline, with its quote", async () => {
    const text = await rendered("adhesion-contract");
    expect(text.match(/Redline hasn[’']t read this document/g)).toHaveLength(2);
    for (const t of fixtureSidecar("adhesion-contract").incorporatedTerms) expect(text).toContain(t.sentence);
  });

  it("leaves out the unread-documents section when there are none", async () => {
    const text = await rendered("clean-contract");
    expect(text).toContain("What this agreement says");
    expect(text).not.toContain("Other documents it pulls in");
  });
});
