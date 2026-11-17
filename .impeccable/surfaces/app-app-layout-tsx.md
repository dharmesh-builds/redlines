---
version: 1
slug: "app-app-layout-tsx"
primary_target: "app/(app)/layout.tsx"
related_targets: []
---

# Surface: app shell (signed in)

## Scope and mode
- **What it is:** the frame behind sign-in that holds every v1 feature. **Mode:** Operate.
- **Status:** brief only. No screen is built yet; tickets 01–10 build into it.

## Task
The reader brings one agreement, reads what it could cost them and when they have to act, checks any claim against its sentence, and leaves with a counter-offer or a decision. They come back to past documents and keep their own red lines. It is used at a desk, about once per agreement, often with the vendor's email open beside it.

## Regions the frame must hold
- **Input.** Upload a PDF with selectable text, a DOCX or a TXT, or paste text. Pasting was approved 2026-11-18 as part of feature 1. Show the extracted text before analysis.
- **Result:**
  - the verdict line, when there are no High or Medium flags
  - the plain-English summary, with deadlines and unread incorporated terms
  - flags ranked by severity, each with its source sentence, exposure figures, confidence label and counter-offer (rewritten clause plus a request to the vendor).
- **Question box.** Answers cite their sentences, or say "the document doesn't say".
- **Red lines.** An editable list, and the snapshot each report ran with.
- **Library.** Past documents with their saved reports.

## States to design
- empty library, first run
- extracting, and an unsupported file (scanned or image-only, encrypted, corrupt, wrong type)
- pasted text that's empty or too short
- analysing, and a model error
- report with only Low flags (the verdict line leads)
- report whose red lines are out of date
- question the document can't answer
- deleted document.

## How the world reaches here
- **The shared world is the Tabbed Contract.**
  - the document is the centre of the screen
  - flags are tabs on its edge
  - pulling a tab highlights the sentence and opens the flag.
- **Operate restraint:** the landing page's scale and motion step down; the document and its tabs stay.
- **Severity and confidence** are always text labels plus form, never colour alone. Never a bare "Low".

## Unresolved
- navigation between the library, red lines and an open document
- phone layout for long documents
- whether the summary sits above the document or beside it.
