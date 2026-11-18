import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { copyShownText, ReportView } from "../../app/(app)/analyze/analyze-form";
import { analyze, type Report } from "../../lib/analysis";
import {
  fixtureSidecar,
  fixtureText,
  payloadFromSidecar,
  scriptedModel,
  tamperedPayload,
} from "../support/scripted-model";

// The rendered counter-offer: original -> proposed wording -> request, with a
// copy button for each part that copies exactly the text shown.

const planted = fixtureSidecar("adhesion-contract").clauses;

async function report(payload = payloadFromSidecar("adhesion-contract")) {
  return analyze(fixtureText("adhesion-contract"), [], scriptedModel(payload));
}
const render = (r: Report) => renderToStaticMarkup(<ReportView report={r} saved={false} />);

const decode = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

// The text of the element with this id in the rendered markup.
function textById(html: string, id: string): string | null {
  const match = html.match(new RegExp(`<p id="${id}"[^>]*>([^<]*)</p>`));
  return match ? decode(match[1]) : null;
}

function offerBlocks(html: string): string[] {
  return html.split('<div class="counter-offer">').slice(1).map((b) => b.split("</dd>")[0]);
}

describe("report view: counter-offers", () => {
  it("shows each flag's original, then the proposed wording, then the request", async () => {
    const html = render(await report());
    const blocks = offerBlocks(html);
    expect(blocks).toHaveLength(planted.length);
    for (const c of planted) {
      const block = blocks.find((b) => decode(b).includes(c.counterOffer.rewrittenClause));
      expect(block, c.id).toBeDefined();
      const text = decode(block!);
      const original = text.indexOf(c.sentences[0]);
      const rewrite = text.indexOf(c.counterOffer.rewrittenClause);
      const request = text.indexOf(c.counterOffer.request);
      expect(original).toBeGreaterThan(-1);
      expect(original).toBeLessThan(rewrite);
      expect(rewrite).toBeLessThan(request);
      for (const sentence of c.sentences) expect(text).toContain(sentence);
    }
    expect(html.match(/<dt>Ask for<\/dt>/g)).toHaveLength(planted.length);
  });

  it("gives each part a named copy button that targets exactly the text shown", async () => {
    const html = render(await report());
    const buttons = [...html.matchAll(/<button type="button" class="copy-button" aria-label="([^"]+)" aria-controls="([^"]+)">Copy<\/button>/g)];
    expect(buttons).toHaveLength(planted.length * 2);

    const copied = buttons.map(([, label, target]) => ({ label, text: textById(html, target) }));
    for (const c of planted) {
      expect(copied).toContainEqual({ label: "Copy the proposed wording", text: c.counterOffer.rewrittenClause });
      expect(copied).toContainEqual({ label: "Copy the email to the vendor", text: c.counterOffer.request });
    }
  });

  it("shows a plain note, and no copy buttons, when a flag's counter-offer was dropped", async () => {
    const payload = tamperedPayload("adhesion-contract", (p) => {
      p.candidateFlags.find((f) => f.clauseType === "auto_renewal")!.counterOffer.request = "";
    });
    const html = render(await report(payload));
    expect(html.match(/Redline couldn’t draft a counter-offer for this clause\./g)).toHaveLength(1);
    expect(html.match(/class="copy-button"/g)).toHaveLength((planted.length - 1) * 2);
  });
});

describe("copying a counter-offer part", () => {
  // Stubs for the browser APIs the copy button calls; the code under test is
  // copyShownText, the button's click handler.
  const request = planted[0].counterOffer.request;
  const target = { textContent: request };
  const selectAllChildren = vi.fn();

  function stubBrowser(writeText: (text: string) => Promise<void>) {
    vi.stubGlobal("document", { getElementById: (id: string) => (id === "flag-0-offer-request" ? target : null) });
    vi.stubGlobal("window", { getSelection: () => ({ selectAllChildren }) });
    vi.stubGlobal("navigator", { clipboard: { writeText } });
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    selectAllChildren.mockReset();
  });

  it("writes the shown text to the clipboard", async () => {
    const writeText = vi.fn(async () => {});
    stubBrowser(writeText);
    expect(await copyShownText("flag-0-offer-request")).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(request);
    expect(selectAllChildren).not.toHaveBeenCalled();
  });

  it("selects the text instead when the clipboard refuses", async () => {
    stubBrowser(async () => {
      throw new Error("denied");
    });
    expect(await copyShownText("flag-0-offer-request")).toBe("selected");
    expect(selectAllChildren).toHaveBeenCalledWith(target);
  });
});
