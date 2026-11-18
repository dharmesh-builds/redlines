import { describe, expect, it } from "vitest";
import { ask, ModelOutputError } from ".";
import { changeOneWord, fixtureSidecar, fixtureText, scriptedModel } from "../../tests/support/scripted-model";

// T4: the question box never shows an answer it can't cite. Driven through
// `ask` with a scripted model; the fixture's sentences come from its sidecar.

const text = fixtureText("adhesion-contract");
const dataPoint = fixtureSidecar("adhesion-contract").summaryPoints.find((p) => p.text.startsWith("You own your data"))!;
const [OWNS_DATA, CAN_EXPORT] = dataPoint.sentences;
const FABRICATED = changeOneWord(CAN_EXPORT, "CSV", "XML");
const QUESTION = "Can we get our data out?";

const answered = (sourceSentences: string[]) =>
  scriptedModel({ outcome: "answered", answer: dataPoint.text, sourceSentences });

describe("ask (T4)", () => {
  it("returns an answer that cites a real sentence from the document, with that source", async () => {
    const model = answered([CAN_EXPORT]);
    const result = await ask(text, QUESTION, model);
    expect(result).toEqual({ kind: "answered", text: dataPoint.text, sources: [CAN_EXPORT] });
    expect(text).toContain(CAN_EXPORT);
    // the question and the document both reach the model, with the answer schema
    expect(model.requests[0].prompt).toContain(QUESTION);
    expect(model.requests[0].prompt).toContain(OWNS_DATA);
    expect(model.requests[0].schemaName).toBe("document_answer");
    expect(model.requests[0].system).toMatch(/no outside or general legal knowledge/);
  });

  it("keeps every source when all of them are verified", async () => {
    const result = await ask(text, QUESTION, answered([OWNS_DATA, CAN_EXPORT]));
    expect(result).toEqual({ kind: "answered", text: dataPoint.text, sources: [OWNS_DATA, CAN_EXPORT] });
  });

  it("passes on a scripted not-in-document outcome", async () => {
    const result = await ask(
      text,
      "Is the auto-renewal clause enforceable in Washington?",
      scriptedModel({ outcome: "not_in_document", answer: "", sourceSentences: [] }),
    );
    expect(result).toEqual({ kind: "not-in-document" });
  });

  it("turns an answer with a fabricated source into not-in-document", async () => {
    expect(text).not.toContain(FABRICATED);
    expect(await ask(text, QUESTION, answered([FABRICATED]))).toEqual({ kind: "not-in-document" });
  });

  it("turns an answer with one real and one fabricated source into not-in-document", async () => {
    expect(await ask(text, QUESTION, answered([CAN_EXPORT, FABRICATED]))).toEqual({ kind: "not-in-document" });
  });

  it("turns an answer with no sources into not-in-document", async () => {
    expect(await ask(text, QUESTION, answered([]))).toEqual({ kind: "not-in-document" });
  });

  it("turns an answer with blank text into not-in-document", async () => {
    const model = scriptedModel({ outcome: "answered", answer: "   ", sourceSentences: [CAN_EXPORT] });
    expect(await ask(text, QUESTION, model)).toEqual({ kind: "not-in-document" });
  });

  it("throws on output in the wrong shape instead of making up an answer", async () => {
    await expect(ask(text, QUESTION, scriptedModel({ answer: dataPoint.text }))).rejects.toBeInstanceOf(ModelOutputError);
    await expect(
      ask(text, QUESTION, scriptedModel({ outcome: "maybe", answer: "x", sourceSentences: [CAN_EXPORT] })),
    ).rejects.toBeInstanceOf(ModelOutputError);
    await expect(
      ask(text, QUESTION, scriptedModel({ outcome: "answered", answer: "x", sourceSentences: CAN_EXPORT })),
    ).rejects.toBeInstanceOf(ModelOutputError);
    await expect(ask(text, QUESTION, scriptedModel(null))).rejects.toBeInstanceOf(ModelOutputError);
  });
});
