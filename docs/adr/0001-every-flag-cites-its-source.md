# ADR 0001: Every flag cites its source

Status: Accepted, 2026-11-17

## Decision
- Every risk flag must include the exact sentence from the uploaded document that it came from.
- The citation is checked against the stored document text before the flag is shown, and it must match verbatim.
- A flag whose source sentence cannot be shown is a bug, not a formatting choice. It is dropped, never shown uncited.

## Alternatives
- **Model's own words, no quote.** Fluent, but the reader cannot tell a real clause from a plausible invention.
- **Section or page reference only** ("see §7.2"). The reader can check it, but has to go hunting, and a wrong reference is easy to miss.
- **Paraphrase with a link to the clause.** A paraphrase can drift from what the clause says.
- **Quote when available, otherwise show the flag anyway.** This makes the trust guarantee optional, and uncited flags would creep in.

## Why
A reader can verify every flag themselves:
- the sentence exists in their document, word for word
- it says what the flag claims it says
- nothing in the flag depends on text that isn't there.

Without that check, the user has to trust the model. With it, they only have to read one sentence. That is the trust this version exists to prove (see `research/summary.md`: accuracy and trust are where existing tools are weakest).

## Consequences
- **Product: risks that come from something missing go unflagged for now.** Examples are no termination clause or no payment deadline; there is no sentence to cite. They need a separately designed treatment, which requires approval.
- **Product: a risk that spans clauses must cite each sentence involved,** or it is not flagged.
- **Product: more extracted text is needed, not better guesses.** A scanned file, or text that came out garbled, cannot produce valid flags. This is why OCR is excluded.
- **Build: the analysis must return structured output** with each quote kept separate from the explanation, not free prose.
- **Build: the check needs light text normalization** (whitespace, quote marks, hyphenation from PDFs) that never changes the words themselves.
- **Build: some recall is lost by design.** Real risks the model phrased badly get dropped. The UI should show only what passed the check.
- **Test: every flag in the test suite must pass the verbatim check.** A single uncited or mismatched flag fails the build.
- **Test: tests include an attempted fabrication,** such as a clause that is not in the document, and assert it is rejected.
