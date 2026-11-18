import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReportView } from "../../app/(app)/analyze/analyze-form";
import { analyze } from "../../lib/analysis";
import { fixtureText, payloadFromSidecar, scriptedModel } from "../support/scripted-model";

// The rendered report: confidence is a fact line in words, severity a tab, and
// no level ever appears without saying which of the two it is.

async function renderedReport() {
  const report = await analyze(fixtureText("adhesion-contract"), [], scriptedModel(payloadFromSidecar("adhesion-contract")));
  return renderToStaticMarkup(<ReportView report={report} saved={false} />);
}

const textOf = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

describe("report view: confidence", () => {
  it("never shows a bare High, Medium or Low", async () => {
    const text = textOf(await renderedReport());
    const bare = [...text.matchAll(/\b(High|Medium|Low)\b(?! (severity|confidence)\b)/gi)].map((m) =>
      text.slice(Math.max(0, m.index - 30), m.index + 30),
    );
    expect(bare).toEqual([]);
  });

  it("shows every flag's confidence, and the reason for Low", async () => {
    const html = await renderedReport();
    const text = textOf(html);
    expect(text.match(/Confidence (High|Medium|Low) confidence/g)).toHaveLength(7);
    expect(text).toContain('Low confidence The clause uses "Customer Materials", which the document never defines.');
    expect(text).toContain("Low confidence It combines clauses 9.1 and 9.2.");
  });

  it("puts confidence in the fact list, never on a severity tab", async () => {
    const html = await renderedReport();
    for (const tab of html.match(/<button[^>]*class="tab[^"]*"[^>]*>[^<]*<\/button>/g) ?? []) {
      expect(tab).toMatch(/severity</);
      expect(tab).not.toMatch(/confidence/i);
    }
    expect(html).toMatch(/<dt>Confidence<\/dt><dd><span class="confidence-level">Low confidence<\/span>/);
  });
});
