// Generates the extraction fixtures in this folder. Run it from anywhere:
//
//   node tests/fixtures/files/generate.mjs
//
// Output is deterministic (no dates, no randomness), so re-running it leaves
// git clean. It uses only Node built-ins: PDFs are written by hand (PDF is
// plain text plus a byte-offset table) and the DOCX is a store-only zip.
//
// The text-bearing files quote sentences from tests/fixtures/adhesion-contract.txt
// exactly, so tests can check them with the real verbatim checker.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const HERE = fileURLToPath(new URL("./", import.meta.url));
const sidecar = JSON.parse(readFileSync(new URL("../adhesion-contract.json", import.meta.url), "utf8"));
const contract = readFileSync(new URL("../adhesion-contract.txt", import.meta.url), "utf8");

// The planted sentences every text-bearing fixture carries, in contract order.
const PLANTED = [
  sidecar.periodicFee.sentence,
  sidecar.clauses[0].sentences[0], // auto-renewal
  sidecar.clauses[1].sentences[0], // customer indemnity
  sidecar.clauses[2].sentences[0], // unilateral change
  sidecar.clauses[3].sentences[0], // early termination fee
  sidecar.clauses[6].sentences[0], // governing law
];
for (const s of PLANTED) if (!contract.includes(s)) throw new Error(`Not in the contract: ${s}`);

const write = (name, bytes) => writeFileSync(HERE + name, bytes);

// ---------------------------------------------------------------- PDF

/** Builds a PDF from object bodies (index 0 is object 1). Returns bytes. */
function buildPdf(objects, trailerExtra = "") {
  const parts = [Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1")];
  let offset = parts[0].length;
  const offsets = [];
  objects.forEach((body, i) => {
    const chunk = Buffer.concat([
      Buffer.from(`${i + 1} 0 obj\n`, "latin1"),
      typeof body === "string" ? Buffer.from(body, "latin1") : body,
      Buffer.from("\nendobj\n", "latin1"),
    ]);
    offsets.push(offset);
    offset += chunk.length;
    parts.push(chunk);
  });
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) xref += `${String(o).padStart(10, "0")} 00000 n \n`;
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R ${trailerExtra}>>\nstartxref\n${offset}\n%%EOF\n`;
  parts.push(Buffer.from(xref, "latin1"));
  return Buffer.concat(parts);
}

const streamObj = (dict, data) => {
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data, "latin1");
  return Buffer.concat([
    Buffer.from(`<< ${dict} /Length ${bytes.length} >>\nstream\n`, "latin1"),
    bytes,
    Buffer.from("\nendstream", "latin1"),
  ]);
};

const pdfString = (s) => `(${s.replace(/[\\()]/g, (c) => `\\${c}`)})`;

/** Greedy word wrap. `breakWord` splits that one word across lines with a hyphen. */
function wrap(text, width, breakWord) {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (word === breakWord && line) {
      const cut = Math.ceil(word.length / 2);
      lines.push(`${line} ${word.slice(0, cut)}-`);
      line = word.slice(cut);
      continue;
    }
    if (line && line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

/** A content stream: paragraphs of wrapped lines, a blank line between paragraphs. */
function textContent(paragraphs) {
  let ops = "BT\n/F1 11 Tf\n14 TL\n72 740 Td\n";
  paragraphs.forEach((p, i) => {
    if (i > 0) ops += "T*\n";
    for (const line of p.lines) ops += `${pdfString(line)} Tj\nT*\n`;
  });
  return `${ops}ET`;
}

/** Catalog, Pages, then per page: Page + Contents. Font is the last object. */
function pagedPdf(pageContents, { resources, extraObjects = [] } = {}) {
  const n = pageContents.length;
  const pageIds = pageContents.map((_, i) => 3 + i * 2);
  const fontId = 3 + n * 2;
  const res = resources ?? `<< /Font << /F1 ${fontId} 0 R >> >>`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${n} >>`,
  ];
  pageContents.forEach((content, i) => {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources ${res} /Contents ${pageIds[i] + 1} 0 R >>`,
    );
    objects.push(streamObj("", content));
  });
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objects.push(...extraObjects);
  return { objects, fontId };
}

// Text-layer PDF: two pages, sentences wrapped at 80 characters, with one word
// ("indemnify") hyphenated across a line break as typeset PDFs do.
const para = (text) => ({ lines: wrap(text, 80, "indemnify") });
const textPages = [
  textContent([para("TALLYFORGE SUBSCRIPTION AGREEMENT"), ...PLANTED.slice(0, 3).map(para)]),
  textContent(PLANTED.slice(3).map(para)),
];
const textPdf = buildPdf(pagedPdf(textPages).objects);
write("text-layer.pdf", textPdf);

// Image-only PDF: three pages, each a grey image plus a drawn box, no text at
// all. This is what a scanner produces.
{
  const n = 3;
  const imageId = 3 + n * 2 + 1; // after the font object
  const pixels = Buffer.alloc(16 * 16, 0xc8);
  const image = streamObj(
    "/Type /XObject /Subtype /Image /Width 16 /Height 16 /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode",
    deflateSync(pixels, { level: 9 }),
  );
  const draw = "q 468 0 0 612 72 108 cm /Im1 Do Q\n0.2 G 2 w 60 96 492 636 re S";
  const { objects } = pagedPdf(Array(n).fill(draw), {
    resources: `<< /XObject << /Im1 ${imageId} 0 R >> >>`,
    extraObjects: [image],
  });
  write("image-only.pdf", buildPdf(objects));
}

// Encrypted PDF: Standard security handler, revision 2 (RC4, 40-bit), with a
// user password, so it cannot be opened without one.
{
  const PAD = Buffer.from(
    "28bf4e5e4e758a4164004e56fffa01082e2e00b6d0683e802f0ca9fe6453697a",
    "hex",
  );
  const padded = (pw) => Buffer.concat([Buffer.from(pw, "latin1"), PAD]).subarray(0, 32);
  const md5 = (...bufs) => createHash("md5").update(Buffer.concat(bufs)).digest();
  const rc4 = (key, data) => {
    const s = [...Array(256).keys()];
    for (let i = 0, j = 0; i < 256; i++) {
      j = (j + s[i] + key[i % key.length]) & 255;
      [s[i], s[j]] = [s[j], s[i]];
    }
    const out = Buffer.alloc(data.length);
    for (let k = 0, i = 0, j = 0; k < data.length; k++) {
      i = (i + 1) & 255;
      j = (j + s[i]) & 255;
      [s[i], s[j]] = [s[j], s[i]];
      out[k] = data[k] ^ s[(s[i] + s[j]) & 255];
    }
    return out;
  };

  const userPw = "redline-user";
  const ownerPw = "redline-owner";
  const P = -44; // print and copy not allowed; any value works for the test
  const id = md5(Buffer.from("redline-encrypted-fixture"));
  const O = rc4(md5(padded(ownerPw)).subarray(0, 5), padded(userPw));
  const pBytes = Buffer.alloc(4);
  pBytes.writeInt32LE(P);
  const fileKey = md5(padded(userPw), O, pBytes, id).subarray(0, 5);
  const U = rc4(fileKey, PAD);
  const objectKey = (num) =>
    md5(fileKey, Buffer.from([num & 255, (num >> 8) & 255, (num >> 16) & 255, 0, 0])).subarray(0, 10);

  const { objects } = pagedPdf([textContent(PLANTED.slice(0, 2).map(para))]);
  // Encrypt each stream with its object's key (strings in these objects are names only).
  const encrypted = objects.map((body, i) => {
    if (typeof body === "string") return body;
    const text = body.toString("latin1");
    const start = text.indexOf("stream\n") + 7;
    const end = text.lastIndexOf("\nendstream");
    return streamObj("", rc4(objectKey(i + 1), body.subarray(start, end)));
  });
  const encryptId = encrypted.length + 1;
  encrypted.push(
    `<< /Filter /Standard /V 1 /R 2 /Length 40 /O <${O.toString("hex")}> /U <${U.toString("hex")}> /P ${P} >>`,
  );
  const hexId = id.toString("hex");
  write("encrypted.pdf", buildPdf(encrypted, `/Encrypt ${encryptId} 0 R /ID [<${hexId}> <${hexId}>] `));
}

// Corrupt PDF: the text PDF cut off partway through its first page, so the
// header is right but the rest of the file is missing.
write("corrupt.pdf", textPdf.subarray(0, 180));

// ---------------------------------------------------------------- DOCX

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

/** A store-only (no compression) zip with a fixed date, so output is stable. */
function zip(entries) {
  const DOS_TIME = 0;
  const DOS_DATE = (2026 - 1980) << 9 | (11 << 5) | 18;
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, content] of entries) {
    const data = Buffer.from(content, "utf8");
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, data);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

const xml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const run = (text, bold = false) =>
  `<w:r>${bold ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t xml:space="preserve">${xml(text)}</w:t></w:r>`;
// One paragraph per sentence. The indemnity sentence is split across runs with
// a bold word, the way Word stores formatting changes mid-sentence.
const docxParagraphs = ["TALLYFORGE SUBSCRIPTION AGREEMENT", ...PLANTED].map((s) => {
  const at = s.indexOf("indemnify");
  const runs =
    at === -1 ? run(s) : run(s.slice(0, at)) + run("indemnify", true) + run(s.slice(at + "indemnify".length));
  return `<w:p>${runs}</w:p>`;
});
const docx = zip([
  [
    "[Content_Types].xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  ],
  [
    "_rels/.rels",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  ],
  [
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${docxParagraphs.join("")}</w:body></w:document>`,
  ],
]);
write("contract.docx", docx);

// Corrupt DOCX: the zip cut off partway, so its directory is missing.
write("corrupt.docx", docx.subarray(0, Math.floor(docx.length / 3)));

// ---------------------------------------------------------------- others

// Plain text: the planted sentences, one paragraph each.
write("contract.txt", ["TALLYFORGE SUBSCRIPTION AGREEMENT", ...PLANTED].join("\n\n") + "\n");

// Wrong type: a real 8x8 PNG (a photo of a contract, as far as Redline knows).
{
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(8, 0);
  ihdr.writeUInt32BE(8, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // greyscale
  const rows = Buffer.alloc(8 * 9, 0xc8);
  for (let r = 0; r < 8; r++) rows[r * 9] = 0; // filter byte per row
  write(
    "scan.png",
    Buffer.concat([
      Buffer.from("89504e470d0a1a0a", "hex"),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(rows, { level: 9 })),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

// Wrong type: an RTF file, which is text on disk but not a format Redline reads.
write("contract.rtf", `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Helvetica;}}\\f0\\fs22 ${PLANTED[0]}\\par }\n`);

console.log("Wrote extraction fixtures to", HERE);
