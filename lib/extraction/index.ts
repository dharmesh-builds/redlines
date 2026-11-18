// Extraction (browser). Turns a file the user picked into plain text, or says
// plainly why it can't. The file is read in memory here and never sent
// anywhere; only the text it yields goes on to the server.
//
// No OCR, ever: a PDF without a real text layer is refused, because a citation
// is worthless if the text it points at was guessed from pixels.
//
// pdfjs-dist and mammoth are loaded with dynamic imports, so they are only
// fetched when a file of that kind is picked and never run on the server.

export type ExtractedFormat = "pdf" | "docx" | "txt";
export type UnsupportedReason = "scanned" | "encrypted" | "corrupt" | "unsupported-type";

export type Extraction =
  | { ok: true; text: string; format: ExtractedFormat }
  | { ok: false; reason: UnsupportedReason; message: string };

/** What `extractText` needs from a file: a browser `File` fits. */
export type PickedFile = Blob & { name: string };

/**
 * A PDF counts as scanned (image-only) when it averages fewer than this many
 * non-whitespace characters per page. A real page of contract text has well
 * over a thousand; a scan has none, or a stray page number or stamp.
 */
export const SCANNED_CHARS_PER_PAGE = 20;

export const EXTRACTION_MESSAGES: Record<UnsupportedReason, string> = {
  scanned:
    "This PDF looks like a scan: it's a picture of the pages, with no text to read. Redline only reads PDFs with real text, because it quotes them word for word. If you have the Word file, or a PDF saved from it, use that.",
  encrypted:
    "This PDF is password-protected, so Redline can't open it. Save a copy without the password and choose that.",
  corrupt: "Redline couldn't open this file. It may be damaged or only partly downloaded. Download or export it again and choose the new copy.",
  "unsupported-type":
    "Redline reads PDF, Word (.docx) and plain-text (.txt) files. For anything else, copy the agreement's text and paste it above.",
};

const fail = (reason: UnsupportedReason): Extraction => ({ ok: false, reason, message: EXTRACTION_MESSAGES[reason] });

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function startsWith(bytes: Uint8Array, ascii: string, at = 0) {
  if (bytes.length < at + ascii.length) return false;
  for (let i = 0; i < ascii.length; i++) if (bytes[at + i] !== ascii.charCodeAt(i)) return false;
  return true;
}

/** pdf.js accepts a %PDF header anywhere in the first 1024 bytes. */
function hasPdfHeader(bytes: Uint8Array) {
  const limit = Math.min(bytes.length - 4, 1024);
  for (let i = 0; i < limit; i++) if (startsWith(bytes, "%PDF", i)) return true;
  return false;
}

const isZip = (bytes: Uint8Array) => startsWith(bytes, "PK\u0003\u0004");

type Kind = ExtractedFormat | "other";

/** Decides the format from the file's bytes first, then its name and type. */
function sniff(file: PickedFile, bytes: Uint8Array): { kind: Kind; claimed: Kind } {
  const name = file.name.toLowerCase();
  const claimed: Kind =
    name.endsWith(".pdf") || file.type === "application/pdf"
      ? "pdf"
      : name.endsWith(".docx") || file.type === DOCX_MIME
        ? "docx"
        : name.endsWith(".txt") || file.type === "text/plain"
          ? "txt"
          : "other";
  if (hasPdfHeader(bytes)) return { kind: "pdf", claimed };
  // A zip is only a Word file if it says it is one; .xlsx, .pptx and .zip are zips too.
  if (isZip(bytes)) return { kind: claimed === "docx" ? "docx" : "other", claimed };
  return { kind: claimed === "txt" ? "txt" : "other", claimed };
}

export async function extractText(file: PickedFile): Promise<Extraction> {
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return fail("corrupt");
  }
  const { kind, claimed } = sniff(file, bytes);
  switch (kind) {
    case "pdf":
      return extractPdf(bytes);
    case "docx":
      return extractDocx(bytes);
    case "txt":
      return extractTxt(bytes);
    default:
      // Named .pdf or .docx but without that format's signature: a damaged file.
      return fail(claimed === "pdf" || claimed === "docx" ? "corrupt" : "unsupported-type");
  }
}

function extractTxt(bytes: Uint8Array): Extraction {
  // A NUL byte never appears in real text; this is a binary file renamed .txt.
  if (bytes.includes(0)) return fail("unsupported-type");
  // TextDecoder drops a UTF-8 byte-order mark by default.
  return { ok: true, text: new TextDecoder("utf-8").decode(bytes), format: "txt" };
}

async function extractDocx(bytes: Uint8Array): Promise<Extraction> {
  const mammoth = await import("mammoth");
  try {
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    // mammoth's browser build reads `arrayBuffer`; its Node build (used by the
    // tests) reads `buffer`. Both accept an ArrayBuffer, so pass it as both.
    const input = { arrayBuffer: buffer, buffer } as unknown as { arrayBuffer: ArrayBuffer };
    const { value } = await mammoth.extractRawText(input);
    return { ok: true, text: value.trimEnd(), format: "docx" };
  } catch {
    return fail("corrupt");
  }
}

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let pdfjsPromise: Promise<PdfJs> | null = null;

function loadPdfJs(): Promise<PdfJs> {
  // The legacy build: the modern one relies on very new built-ins (such as
  // Uint8Array.prototype.toHex) that older Safari and Node 24 lack. Same API.
  pdfjsPromise ??= import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjs) => {
    // In the browser, parse in a web worker the bundler emits as its own file.
    // Under Node (Vitest), pdf.js disables the worker by itself and parses
    // on the main thread, so nothing needs setting there.
    if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
    }
    return pdfjs;
  });
  return pdfjsPromise;
}

type TextItem = { str: string; hasEOL: boolean; transform: number[]; height: number };

/**
 * Joins one page's text items in content order. Each line ends in "\n"; a
 * vertical gap well over one line's height starts a new paragraph ("\n\n").
 * Words are never changed: a hyphen at a line end stays as it is, and the
 * verbatim checker rejoins it.
 */
function pageText(items: TextItem[]) {
  let out = "";
  let lastY: number | null = null;
  let lineHeight = 0;
  for (const item of items) {
    const y = item.transform[5];
    if (item.str) {
      if (lastY !== null && out.endsWith("\n") && lineHeight > 0 && lastY - y > lineHeight * 1.6) out += "\n";
      out += item.str;
      lastY = y;
      lineHeight = Math.max(item.height, Math.abs(item.transform[3])) * 1.2;
    }
    if (item.hasEOL && !out.endsWith("\n")) out += "\n";
  }
  return out.trimEnd();
}

async function extractPdf(bytes: Uint8Array): Promise<Extraction> {
  const pdfjs = await loadPdfJs();
  const task = pdfjs.getDocument({
    data: bytes,
    // Never fetch fonts, character maps or anything else over the network.
    disableFontFace: true,
    useSystemFonts: false,
    stopAtErrors: true,
    verbosity: 0,
  });
  try {
    const doc = await task.promise;
    const pages: string[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      pages.push(pageText(content.items.filter((i) => "str" in i) as TextItem[]));
      page.cleanup();
    }
    if (pages.length === 0) return fail("corrupt");
    const chars = pages.join("").replace(/\s+/g, "").length;
    if (chars / pages.length < SCANNED_CHARS_PER_PAGE) return fail("scanned");
    return { ok: true, text: pages.filter(Boolean).join("\n\n"), format: "pdf" };
  } catch (error) {
    if (error instanceof pdfjs.PasswordException || (error as { name?: string })?.name === "PasswordException") {
      return fail("encrypted");
    }
    return fail("corrupt");
  } finally {
    await task.destroy();
  }
}
