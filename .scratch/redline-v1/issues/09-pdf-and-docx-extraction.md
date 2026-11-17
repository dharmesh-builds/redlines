# 09: PDF and DOCX extraction

**What to build:** The user uploads a PDF with a text layer, or a DOCX, and the text is extracted in the browser. Other files get a clear "not supported" message with the reason, and no OCR fallback:
- a scanned or image-only PDF (almost no text relative to its page count)
- an encrypted PDF
- a corrupt file
- an unsupported type.

**Blocked by:** 01. Needs approval first: PDF and DOCX extraction libraries (log in `QUESTIONS.md`).

**Status:** ready-for-agent

- [ ] Extraction returns text + source format, or unsupported + reason
- [ ] The file never leaves the browser; only the extracted text is stored
- [ ] The user sees the extracted text before running analysis
- [ ] Extraction-seam tests with fixture files: text PDF, DOCX and TXT → text; image-only PDF → unsupported (scanned); encrypted PDF and wrong type → unsupported with reason
