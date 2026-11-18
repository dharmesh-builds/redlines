# 08: Question box

**What to build:** On a document's page, the user asks a question in plain English. `ask(documentText, question)` returns either an answer that cites its verified **source sentences**, or "the document doesn't say". Questions about enforceability, legality or market norms get "the document doesn't say" unless the document itself covers them. No general legal knowledge. Answers aren't stored.

**Blocked by:** 01

**Status:** done

- [x] `ask` returns answered (text + verified sources) or not-in-document
- [x] An answer whose sources fail verification becomes not-in-document
- [x] Runs server-side through the same model port; the browser never calls the model
- [x] T4: scripted "not in document" and scripted answers with fabricated sources both yield not-in-document
