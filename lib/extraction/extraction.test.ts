import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { appearsVerbatim } from "../analysis";
import { fixtureSidecar } from "../../tests/support/scripted-model";
import { extractText, type Extraction } from ".";

// Seam 2: fixture files go in through `extractText`, and the result is checked.
// The files are made by tests/fixtures/files/generate.mjs. Under Node, pdf.js
// runs without a web worker (it parses on the main thread by itself).

const FILES = new URL("../../tests/fixtures/files/", import.meta.url);

function picked(name: string, type = "") {
  return new File([readFileSync(new URL(name, FILES))], name, { type });
}

// The same planted sentences generate.mjs writes into the text-bearing files.
const sidecar = fixtureSidecar("adhesion-contract");
const PLANTED = [
  sidecar.periodicFee!.sentence,
  ...[0, 1, 2, 3, 6].map((i) => sidecar.clauses[i].sentences[0]),
];

function expectText(result: Extraction, format: "pdf" | "docx" | "txt") {
  if (!result.ok) throw new Error(`Expected text, got ${result.reason}: ${result.message}`);
  expect(result.format).toBe(format);
  for (const sentence of PLANTED) expect(appearsVerbatim(result.text, sentence), sentence).toBe(true);
  return result.text;
}

function expectRefused(result: Extraction, reason: string) {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.reason).toBe(reason);
  expect(result.message.length).toBeGreaterThan(20);
}

describe("extractText", () => {
  it("reads a PDF with a text layer, keeping every planted sentence quotable", async () => {
    const text = expectText(await extractText(picked("text-layer.pdf", "application/pdf")), "pdf");
    // Line breaks are kept and the hyphenated word is left as typeset; the
    // verbatim checker, not extraction, rejoins it.
    expect(text).toContain("indem-\nnify");
    expect(text).toContain("TALLYFORGE SUBSCRIPTION AGREEMENT\n\n");
  });

  it("reads a Word file, joining runs split by formatting", async () => {
    expectText(await extractText(picked("contract.docx")), "docx");
  });

  it("reads a plain-text file", async () => {
    expectText(await extractText(picked("contract.txt", "text/plain")), "txt");
  });

  it("refuses an image-only PDF as a scan, without trying OCR", async () => {
    const result = await extractText(picked("image-only.pdf"));
    expectRefused(result, "scanned");
    if (!result.ok) expect(result.message).toMatch(/scan/);
  });

  it("refuses a password-protected PDF", async () => {
    const result = await extractText(picked("encrypted.pdf"));
    expectRefused(result, "encrypted");
    if (!result.ok) expect(result.message).toMatch(/password/);
  });

  it("refuses a damaged PDF", async () => {
    expectRefused(await extractText(picked("corrupt.pdf")), "corrupt");
  });

  it("refuses a damaged Word file", async () => {
    expectRefused(await extractText(picked("corrupt.docx")), "corrupt");
  });

  it("refuses an image and an RTF file as the wrong type", async () => {
    expectRefused(await extractText(picked("scan.png", "image/png")), "unsupported-type");
    expectRefused(await extractText(picked("contract.rtf", "application/rtf")), "unsupported-type");
  });

  it("judges by the bytes, not the name: an image renamed .txt is refused", async () => {
    const bytes = readFileSync(new URL("scan.png", FILES));
    expectRefused(await extractText(new File([bytes], "contract.txt")), "unsupported-type");
  });

  it("judges by the bytes, not the name: a PDF named .bin is still read", async () => {
    const bytes = readFileSync(new URL("text-layer.pdf", FILES));
    expectText(await extractText(new File([bytes], "download.bin")), "pdf");
  });
});
