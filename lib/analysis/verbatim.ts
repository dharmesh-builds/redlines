// The verbatim check (ADR 0001). A quote passes only if it appears in the
// stored document text after normalization that never changes a word:
// - runs of whitespace collapse to one space
// - curly quotes become straight quotes
// - dash variants become "-"
// - a word broken across lines with a hyphen ("indem-\nnity") is rejoined.
// Case, spelling, punctuation and word order must all match.

const SINGLE_QUOTES = /[‘’‚‛′]/;
const DOUBLE_QUOTES = /[“”„‟″]/;
const DASHES = /[‐‑‒–—―−]/;
const WHITESPACE = /\s/;
const LETTER = /\p{L}/u;
// A hyphen (plain, U+2010 or non-breaking U+2011) that ends a line and is
// followed by a letter on the next line. En and em dashes are left alone: at a
// line end they are usually real dashes, not hyphenation.
const LINE_BREAK_HYPHEN = /[-‐‑][ \t]*\r?\n[ \t]*(?=\p{L})/uy;

type HyphenBreak = "join" | "keep";

type Normalized = {
  text: string;
  // For each character of `text`, the index of the source character it came from.
  origin: number[];
};

function normalize(source: string, hyphenBreak: HyphenBreak, unifyPunctuation = true): Normalized {
  let text = "";
  const origin: number[] = [];
  let i = 0;

  while (i < source.length) {
    const ch = source[i];

    if (LETTER.test(text.at(-1) ?? "")) {
      LINE_BREAK_HYPHEN.lastIndex = i;
      const brk = LINE_BREAK_HYPHEN.exec(source);
      if (brk) {
        if (hyphenBreak === "keep") {
          text += unifyPunctuation ? "-" : ch;
          origin.push(i);
        }
        i += brk[0].length;
        continue;
      }
    }

    if (WHITESPACE.test(ch)) {
      if (text.length > 0 && text.at(-1) !== " ") {
        text += " ";
        origin.push(i);
      }
      i += 1;
      continue;
    }

    let out = ch;
    if (unifyPunctuation) {
      if (SINGLE_QUOTES.test(ch)) out = "'";
      else if (DOUBLE_QUOTES.test(ch)) out = '"';
      else if (DASHES.test(ch)) out = "-";
    }
    text += out;
    origin.push(i);
    i += 1;
  }

  if (text.endsWith(" ")) {
    text = text.slice(0, -1);
    origin.pop();
  }
  return { text, origin };
}

export type VerbatimMatch = {
  // The matched passage as it reads in the document: the document's own
  // characters, with whitespace collapsed and line-break hyphens resolved.
  text: string;
  start: number;
  end: number;
};

/**
 * Prepares `documentText` for checking many quotes against it. `find` returns
 * the matching passage of the document, or null if the quote is not there word
 * for word. An empty quote never matches.
 */
export function createVerifier(documentText: string) {
  const docs = {
    join: normalize(documentText, "join"),
    keep: normalize(documentText, "keep"),
  };

  function find(quote: string): VerbatimMatch | null {
    for (const mode of ["join", "keep"] as const) {
      const needle = normalize(quote, mode).text;
      if (!/[\p{L}\p{N}]/u.test(needle)) return null;

      const doc = docs[mode];
      const at = doc.text.indexOf(needle);
      if (at === -1) continue;

      const start = doc.origin[at];
      const end = doc.origin[at + needle.length - 1] + 1;
      return { text: normalize(documentText.slice(start, end), mode, false).text, start, end };
    }
    return null;
  }

  return { find };
}

export function appearsVerbatim(documentText: string, quote: string): boolean {
  return createVerifier(documentText).find(quote) !== null;
}
