import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReportView } from "../../app/(app)/analyze/analyze-form";
import { analyze } from "../../lib/analysis";
import { fixtureSidecar, fixtureText, scriptedModel, tamperedPayload } from "../support/scripted-model";

// The rendered verdict line: it leads the report when no flag is High or
// Medium, Low flags sit folded under it, and it never appears above a Medium.

const sidecar = fixtureSidecar("adhesion-contract");

const textOf = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

async function renderedWith(bands: ("high" | "medium" | "low")[]) {
  const payload = tamperedPayload("adhesion-contract", (p) => {
    p.candidateFlags = p.candidateFlags.filter((_, i) => bands.includes(sidecar.clauses[i].expectedSeverity));
  });
  const report = await analyze(fixtureText("adhesion-contract"), [], scriptedModel(payload));
  return renderToStaticMarkup(<ReportView report={report} saved={false} />);
}

const VERDICT = "Nothing in this document costs you money beyond what you agreed to.";

describe("report view: verdict line", () => {
  it("leads with the verdict, above the summary, naming the unread documents", async () => {
    const text = textOf(await renderedWith(["low"]));
    const verdictAt = text.indexOf(VERDICT);
    expect(verdictAt).toBeGreaterThanOrEqual(0);
    expect(verdictAt).toBeLessThan(text.indexOf("What this agreement says"));
    for (const t of sidecar.incorporatedTerms) expect(text.slice(verdictAt)).toContain(t.description);
  });

  it("folds the Low flags inside a disclosure labelled with their count", async () => {
    const html = await renderedWith(["low"]);
    const fold = html.match(/<details class="low-fold">([\s\S]*?)<\/details>/);
    expect(fold).not.toBeNull();
    const inside = fold![1];
    expect(textOf(inside)).toContain("2 low-severity flags");
    expect(inside.match(/class="flag-item"/g)).toHaveLength(2);
    for (const c of sidecar.clauses.filter((c) => c.expectedSeverity === "low")) {
      expect(textOf(inside)).toContain(c.sentences[0]);
    }
    // Nothing flagged sits outside the fold.
    expect(html.replace(fold![0], "")).not.toContain('class="flag-item"');
  });

  it("shows no verdict and no fold when there is a Medium flag", async () => {
    const html = await renderedWith(["low", "medium"]);
    expect(textOf(html)).not.toContain(VERDICT);
    expect(html).not.toContain("<details");
    expect(textOf(html)).toContain("4 flags, most costly first");
  });
});
