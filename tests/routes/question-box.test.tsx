import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnswerView, QuestionBox } from "../../app/(app)/analyze/question-box";
import { POST as askRoute } from "../../app/api/ask/route";
import { POST as documentQuestionRoute } from "../../app/api/documents/[id]/questions/route";
import { askDocumentResponse } from "../../lib/api/ask-api";
import { ASK_ERRORS } from "../../lib/api/ask-contract";
import { DOCUMENTS_ERRORS } from "../../lib/api/documents-api";
import { DOCUMENT_TEXT_MESSAGES } from "../../lib/document-input";
import type { LibraryAccess } from "../../lib/library/access";
import { MAX_QUESTION_CHARS, QUESTION_MESSAGES } from "../../lib/question-input";
import { memoryLibrary, type MemoryLibrary } from "../support/memory-library";
import { changeOneWord, fixtureSidecar, fixtureText, scriptedModel } from "../support/scripted-model";

const ME = "11111111-1111-4111-8111-111111111111";
const SOMEONE_ELSE = "22222222-2222-4222-8222-222222222222";
const MY_DOC = "aaaaaaaa-0000-4000-8000-000000000001";
const THEIR_DOC = "bbbbbbbb-0000-4000-8000-000000000001";

const text = fixtureText("adhesion-contract");
const FEE = fixtureSidecar("adhesion-contract").periodicFee!.sentence;
const feeAnswer = { outcome: "answered", answer: "$750 a month, billed yearly in advance.", sourceSentences: [FEE] };
const notInDocument = { outcome: "not_in_document", answer: "", sourceSentences: [] };

const textOf = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

// The model is reached through fetch; that is the only thing stubbed for the route files.
function stubModelReply(payload: unknown) {
  const fetchMock = vi.fn(async () =>
    Response.json({ model: "test-vendor/test-model", choices: [{ message: { content: JSON.stringify(payload) } }] }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test-key-not-real");
  vi.stubEnv("OPENROUTER_MODEL", "test-vendor/test-model");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/ask (no account, nothing stored)", () => {
  it("answers from the posted text without Supabase, citing the verified sentence", async () => {
    const fetchMock = stubModelReply(feeAnswer);
    const res = await askRoute(jsonRequest("http://localhost/api/ask", { text, question: "How much is the fee?" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      answer: { kind: "answered", text: feeAnswer.answer, sources: [FEE] },
    });
    // the only outbound call is the model call
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("answers not-in-document when the model's source isn't in the text", async () => {
    stubModelReply({ ...feeAnswer, sourceSentences: [changeOneWord(FEE, "month", "week")] });
    const res = await askRoute(jsonRequest("http://localhost/api/ask", { text, question: "How much is the fee?" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ answer: { kind: "not-in-document" } });
  });

  it("validates the question and calls no model", async () => {
    const fetchMock = stubModelReply(feeAnswer);
    const empty = await askRoute(jsonRequest("http://localhost/api/ask", { text, question: "   " }));
    expect(empty.status).toBe(400);
    expect((await empty.json()).error).toBe(QUESTION_MESSAGES.empty);

    const long = await askRoute(jsonRequest("http://localhost/api/ask", { text, question: "a".repeat(MAX_QUESTION_CHARS + 1) }));
    expect(long.status).toBe(400);
    expect((await long.json()).error).toBe(QUESTION_MESSAGES.tooLong);

    const missing = await askRoute(jsonRequest("http://localhost/api/ask", { text }));
    expect(missing.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("applies the analyse route's text limits", async () => {
    const fetchMock = stubModelReply(feeAnswer);
    const res = await askRoute(jsonRequest("http://localhost/api/ask", { text: "", question: "How much is the fee?" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(DOCUMENT_TEXT_MESSAGES.empty);
    const tooLong = await askRoute(
      jsonRequest("http://localhost/api/ask", { text: text.repeat(30), question: "How much is the fee?" }),
    );
    expect(tooLong.status).toBe(400);
    expect((await tooLong.json()).error).toBe(DOCUMENT_TEXT_MESSAGES.tooLong);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a body that isn't JSON", async () => {
    const res = await askRoute(jsonRequest("http://localhost/api/ask", "not json"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(ASK_ERRORS.badRequest);
  });

  it("returns 503 with a clear message when OpenRouter isn't configured", async () => {
    vi.stubEnv("OPENROUTER_MODEL", "");
    const fetchMock = stubModelReply(feeAnswer);
    const res = await askRoute(jsonRequest("http://localhost/api/ask", { text, question: "How much is the fee?" }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe(ASK_ERRORS.notConfigured);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns an error, not an answer, when the model's output is invalid", async () => {
    stubModelReply({ answer: "Probably $750." });
    const res = await askRoute(jsonRequest("http://localhost/api/ask", { text, question: "How much is the fee?" }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe(ASK_ERRORS.modelOutput);
    expect(body.answer).toBeUndefined();
  });
});

describe("POST /api/documents/:id/questions (stored document)", () => {
  let repo: MemoryLibrary;
  const access = (): LibraryAccess => ({ kind: "ok", userId: ME, repo });
  const ask = (id: string, body: unknown) =>
    jsonRequest(`http://localhost/api/documents/${id}/questions`, body);

  beforeEach(() => {
    repo = memoryLibrary();
    repo.addDocument(ME, { id: MY_DOC, name: "Tallyforge", createdAt: "2026-11-10T09:00:00Z", text });
    repo.addDocument(SOMEONE_ELSE, { id: THEIR_DOC, name: "Not mine", createdAt: "2026-11-10T09:00:00Z", text });
  });

  it("returns 503 when sign-in isn't configured, through the real route", async () => {
    const fetchMock = stubModelReply(feeAnswer);
    const res = await documentQuestionRoute(ask(MY_DOC, { question: "How much is the fee?" }), params(MY_DOC));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe(DOCUMENTS_ERRORS.notConfigured);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 401 when signed out", async () => {
    const model = scriptedModel(feeAnswer);
    const res = await askDocumentResponse(ask(MY_DOC, { question: "How much is the fee?" }), { kind: "signed-out" }, MY_DOC, model);
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe(DOCUMENTS_ERRORS.signedOut);
    expect(model.requests).toHaveLength(0);
  });

  it("answers from the stored text, read under the user's id", async () => {
    const model = scriptedModel(feeAnswer);
    const res = await askDocumentResponse(ask(MY_DOC, { question: "How much is the fee?" }), access(), MY_DOC, model);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ answer: { kind: "answered", text: feeAnswer.answer, sources: [FEE] } });
    expect(model.requests[0].prompt).toContain(FEE);
    // nothing is stored
    expect(repo.reports).toHaveLength(0);
    expect(repo.documents).toHaveLength(2);
  });

  it("checks sources against the stored text, not anything the browser sends", async () => {
    // A sentence that is only in the posted body, never in the stored text.
    const planted = changeOneWord(FEE, "month", "week");
    const model = scriptedModel({ ...feeAnswer, sourceSentences: [planted] });
    const res = await askDocumentResponse(
      ask(MY_DOC, { question: "How much is the fee?", text: `${text}\n${planted}` }),
      access(),
      MY_DOC,
      model,
    );
    expect(await res.json()).toEqual({ answer: { kind: "not-in-document" } });
    expect(model.requests[0].prompt).not.toContain(planted);
  });

  it("passes on not-in-document", async () => {
    const res = await askDocumentResponse(
      ask(MY_DOC, { question: "Is this clause enforceable?" }),
      access(),
      MY_DOC,
      scriptedModel(notInDocument),
    );
    expect(await res.json()).toEqual({ answer: { kind: "not-in-document" } });
  });

  it("returns 404 for another user's document, a missing one, or a bad id, and calls no model", async () => {
    const model = scriptedModel(feeAnswer);
    for (const id of [THEIR_DOC, "cccccccc-0000-4000-8000-000000000009", "not-an-id"]) {
      const res = await askDocumentResponse(ask(id, { question: "How much is the fee?" }), access(), id, model);
      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe(DOCUMENTS_ERRORS.notFound);
    }
    expect(model.requests).toHaveLength(0);
  });

  it("validates the question before reading anything", async () => {
    const model = scriptedModel(feeAnswer);
    const res = await askDocumentResponse(ask(MY_DOC, { question: "" }), access(), MY_DOC, model);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(QUESTION_MESSAGES.empty);
    expect(model.requests).toHaveLength(0);
  });

  it("returns 502 when the library can't be reached", async () => {
    repo.unreachable = true;
    const res = await askDocumentResponse(ask(MY_DOC, { question: "How much is the fee?" }), access(), MY_DOC, scriptedModel(feeAnswer));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe(DOCUMENTS_ERRORS.unavailable);
  });

  it("returns 502 on invalid model output", async () => {
    const res = await askDocumentResponse(ask(MY_DOC, { question: "How much is the fee?" }), access(), MY_DOC, scriptedModel([]));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe(ASK_ERRORS.modelOutput);
  });
});

describe("question box", () => {
  it("shows an answer with its quoted, highlighted source", () => {
    const html = renderToStaticMarkup(
      <AnswerView question="How much is the fee?" answer={{ kind: "answered", text: feeAnswer.answer, sources: [FEE] }} />,
    );
    expect(html).toContain(`<mark class="on">${FEE}</mark>`);
    expect(textOf(html)).toContain("Quoted word for word from your text");
  });

  it("says plainly when the document doesn't say", () => {
    const html = renderToStaticMarkup(<AnswerView question="Is this enforceable?" answer={{ kind: "not-in-document" }} />);
    expect(textOf(html)).toContain("The document doesn’t say.");
    expect(html).not.toContain("<mark");
  });

  it("keeps earlier answers on the page and says they aren't saved", () => {
    const html = renderToStaticMarkup(
      <QuestionBox
        target={{ kind: "document", documentId: MY_DOC }}
        initial={[
          { question: "Is this enforceable?", answer: { kind: "not-in-document" } },
          { question: "How much is the fee?", answer: { kind: "answered", text: feeAnswer.answer, sources: [FEE] } },
        ]}
      />,
    );
    const shown = textOf(html);
    expect(shown).toContain("Ask about this agreement");
    expect(shown).toContain("Is this enforceable?");
    expect(shown).toContain("How much is the fee?");
    expect(shown).toContain("They aren’t saved.");
  });
});
