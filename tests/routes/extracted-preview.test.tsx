import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnalyzeForm, ExtractedPreview } from "../../app/(app)/analyze/analyze-form";
import { extractText } from "../../lib/extraction";
import { fixtureSidecar } from "../support/scripted-model";

// The analyse form shows the text read from a file before any check runs.
// Rendered on the server, as the other report tests are (no DOM library).

const textOf = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

describe("analyse form: extracted-text preview", () => {
  it("offers PDF, Word and text files", () => {
    const html = renderToStaticMarkup(<AnalyzeForm saving={{ kind: "anonymous" }} />);
    expect(html).toMatch(/type="file"[^>]*accept="[^"]*\.pdf,\.docx,\.txt/);
    expect(textOf(html)).toContain("Choose a PDF, Word or text file");
  });

  it("shows the text read from a PDF, read-only, before the check runs", async () => {
    const file = new File([readFileSync(new URL("../fixtures/files/text-layer.pdf", import.meta.url))], "order-form.pdf");
    const extracted = await extractText(file);
    if (!extracted.ok) throw new Error(extracted.message);

    const html = renderToStaticMarkup(
      <ExtractedPreview source={{ fileName: "order-form.pdf", format: extracted.format }} text={extracted.text} />,
    );
    const text = textOf(html);
    expect(text).toContain("Text from order-form.pdf");
    expect(html).toMatch(/<textarea[^>]*readonly/i);
    expect(text).toContain(fixtureSidecar("adhesion-contract").clauses[2].sentences[0]);
    expect(text).toContain("The file stays on your computer.");
    expect(text).toContain("Use different text");
  });
});
