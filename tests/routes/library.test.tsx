import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyzeForm } from "../../app/(app)/analyze/analyze-form";
import { DocumentView } from "../../app/(app)/app/documents/[id]/document-view";
import LibraryPage from "../../app/(app)/app/page";
import DocumentPage from "../../app/(app)/app/documents/[id]/page";
import { LibraryView } from "../../app/(app)/app/library-view";
import { GET as listRoute } from "../../app/api/documents/route";
import { DELETE as deleteRoute, GET as documentRoute } from "../../app/api/documents/[id]/route";
import { analyze, type Report } from "../../lib/analysis";
import {
  DOCUMENTS_ERRORS,
  deleteDocumentResponse,
  documentResponse,
  listDocumentsResponse,
} from "../../lib/api/documents-api";
import type { LibraryAccess } from "../../lib/library/access";
import { loadDocument, loadLibrary } from "../../lib/library/library";
import { UNTITLED_DOCUMENT, defaultDocumentName, resolveDocumentName } from "../../lib/library/naming";
import { REPORT_PAYLOAD_VERSION, toStoredPayload } from "../../lib/library/payload";
import { proxy } from "../../proxy";
import { memoryLibrary, type MemoryLibrary } from "../support/memory-library";
import { fixtureSidecar, fixtureText, payloadFromSidecar, scriptedModel } from "../support/scripted-model";

const ME = "11111111-1111-4111-8111-111111111111";
const SOMEONE_ELSE = "22222222-2222-4222-8222-222222222222";
const DOC_A = "aaaaaaaa-0000-4000-8000-000000000001";
const DOC_B = "aaaaaaaa-0000-4000-8000-000000000002";
const DOC_C = "aaaaaaaa-0000-4000-8000-000000000003";
const OTHER_USERS_DOC = "bbbbbbbb-0000-4000-8000-000000000001";

const textOf = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

let fixtureReport: Report;
let repo: MemoryLibrary;
const access = (): LibraryAccess => ({ kind: "ok", userId: ME, repo });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(async () => {
  fixtureReport = await analyze(fixtureText("adhesion-contract"), [], scriptedModel(payloadFromSidecar("adhesion-contract")));
  repo = memoryLibrary();
  // Inserted out of order on purpose.
  repo.addDocument(ME, { id: DOC_B, name: "Acme MSA", createdAt: "2026-11-10T09:00:00Z" });
  repo.addDocument(ME, { id: DOC_A, name: "Old hosting terms", createdAt: "2026-10-01T09:00:00Z" });
  repo.addDocument(ME, { id: DOC_C, name: "Newest renewal", createdAt: "2026-11-17T09:00:00Z" });
  repo.addDocument(SOMEONE_ELSE, { id: OTHER_USERS_DOC, name: "Not mine", createdAt: "2026-11-18T09:00:00Z" });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("library list", () => {
  it("lists the user's documents newest first, with name and date", async () => {
    const res = await listDocumentsResponse(access());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.documents.map((d: { name: string }) => d.name)).toEqual(["Newest renewal", "Acme MSA", "Old hosting terms"]);
    expect(body.documents[0].savedOn).toBe("17 Nov 2026");

    const html = renderToStaticMarkup(<LibraryView list={await loadLibrary(repo, ME)} />);
    const text = textOf(html);
    expect(text.indexOf("Newest renewal")).toBeLessThan(text.indexOf("Acme MSA"));
    expect(text.indexOf("Acme MSA")).toBeLessThan(text.indexOf("Old hosting terms"));
    expect(text).toContain("Saved 17 Nov 2026");
    expect(text).not.toContain("Not mine");
    expect(html).toContain(`href="/app/documents/${DOC_C}"`);
  });

  it("shows an empty state that points to checking an agreement", async () => {
    const html = renderToStaticMarkup(<LibraryView list={await loadLibrary(memoryLibrary(), ME)} />);
    expect(textOf(html)).toContain("No saved agreements yet");
    expect(html).toContain('href="/analyze"');
  });

  it("shows an error state, not a crash, when storage can't be reached", async () => {
    repo.unreachable = true;
    const list = await loadLibrary(repo, ME);
    expect(list.kind).toBe("unavailable");
    expect(textOf(renderToStaticMarkup(<LibraryView list={list} />))).toContain("Your library didn’t load");
    expect((await listDocumentsResponse(access())).status).toBe(502);
  });

  it("confirms a deletion when the library is reached from a delete", async () => {
    const html = renderToStaticMarkup(<LibraryView list={await loadLibrary(repo, ME)} deleted />);
    expect(textOf(html)).toContain("Agreement deleted, along with its reports.");
  });
});

describe("a saved document", () => {
  function addReports() {
    const stored = toStoredPayload(fixtureReport);
    repo.addReport(ME, { id: "r-middle", documentId: DOC_B, modelId: "vendor/model-two", createdAt: "2026-11-12T09:00:00Z", payload: stored });
    repo.addReport(ME, { id: "r-latest", documentId: DOC_B, modelId: "vendor/model-three", createdAt: "2026-11-15T09:00:00Z", payload: stored });
    repo.addReport(ME, { id: "r-first", documentId: DOC_B, modelId: "vendor/model-one", createdAt: "2026-11-10T09:00:00Z", payload: stored });
  }

  it("picks the latest report when there are several", async () => {
    addReports();
    const body = await (await documentResponse(access(), DOC_B)).json();
    expect(body.document.name).toBe("Acme MSA");
    expect(body.report.id).toBe("r-latest");
    expect(body.report.modelId).toBe("vendor/model-three");
    expect(body.report.report.flags).toHaveLength(fixtureReport.flags.length);
  });

  it("shows the saved report and the model ID it was produced with, without calling any model", async () => {
    addReports();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const html = renderToStaticMarkup(<DocumentView detail={await loadDocument(repo, ME, DOC_B)} />);
    const text = textOf(html);
    expect(text).toContain("Acme MSA");
    expect(text).toContain("Checked on 15 Nov 2026 with the model vendor/model-three");
    expect(text).not.toContain("vendor/model-one");
    expect(html.match(/class="flag-item"/g)).toHaveLength(fixtureReport.flags.length);
    const sidecar = fixtureSidecar("adhesion-contract");
    expect(text).toContain(sidecar.clauses.find((c) => c.expectedSeverity === "high")!.sentences[0]);
    expect(text).toContain("Delete this agreement");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("handles a document with no report yet", async () => {
    const detail = await loadDocument(repo, ME, DOC_A);
    expect(detail).toMatchObject({ kind: "ok", report: null });
    const text = textOf(renderToStaticMarkup(<DocumentView detail={detail} />));
    expect(text).toContain("No report saved for this agreement");
    expect(text).not.toContain("Checked on");
  });

  it("says an unknown, malformed or someone else's document isn't in the library", async () => {
    for (const id of ["cccccccc-0000-4000-8000-000000000009", "not-a-uuid", OTHER_USERS_DOC]) {
      expect((await documentResponse(access(), id)).status, id).toBe(404);
    }
    const text = textOf(renderToStaticMarkup(<DocumentView detail={await loadDocument(repo, ME, OTHER_USERS_DOC)} />));
    expect(text).toContain("This agreement isn’t in your library");
  });
});

describe("reports saved by older code", () => {
  const renderWithPayload = async (payload: unknown) => {
    repo.addReport(ME, { id: "r-old", documentId: DOC_B, modelId: "vendor/old", createdAt: "2026-11-11T09:00:00Z", payload });
    return renderToStaticMarkup(<DocumentView detail={await loadDocument(repo, ME, DOC_B)} />);
  };
  const OLD_NOTE = "This report was made by an older version of Redline";

  it("new reports are stored with the current payload version", () => {
    expect(toStoredPayload(fixtureReport).payloadVersion).toBe(REPORT_PAYLOAD_VERSION);
  });

  it("shows a plain note for a report saved before payloads were versioned", async () => {
    const html = await renderWithPayload({ ...fixtureReport });
    expect(textOf(html)).toContain(OLD_NOTE);
    expect(html).not.toContain('class="flag-item"');
    expect(textOf(html)).toContain("with the model vendor/old");
  });

  it("does not crash on a walking-skeleton payload missing summary, verdict, confidence and counter-offers", async () => {
    const skeleton = {
      modelId: "vendor/old",
      flags: [{ clauseType: "auto_renewal", sourceSentences: [fixtureReport.flags[0].sourceSentences[0]], explanation: "Renews." }],
      candidateFlagCount: 1,
      droppedFlagCount: 0,
    };
    const html = await renderWithPayload(skeleton);
    expect(textOf(html)).toContain(OLD_NOTE);
  });

  it("treats a payload marked current but missing fields as old", async () => {
    const { verdict: _v, ...broken } = toStoredPayload(fixtureReport);
    expect(textOf(await renderWithPayload(broken))).toContain(OLD_NOTE);
  });
});

describe("deleting a document", () => {
  it("removes the document and all its reports, and leaves the rest", async () => {
    repo.addReport(ME, { id: "r1", documentId: DOC_B, modelId: "m", createdAt: "2026-11-10T10:00:00Z", payload: {} });
    repo.addReport(ME, { id: "r2", documentId: DOC_B, modelId: "m", createdAt: "2026-11-11T10:00:00Z", payload: {} });
    repo.addReport(ME, { id: "r3", documentId: DOC_C, modelId: "m", createdAt: "2026-11-17T10:00:00Z", payload: {} });

    const res = await deleteDocumentResponse(access(), DOC_B);
    expect(res.status).toBe(200);
    expect(repo.documents.map((d) => d.id)).not.toContain(DOC_B);
    expect(repo.reports.map((r) => r.id)).toEqual(["r3"]);
    expect((await documentResponse(access(), DOC_B)).status).toBe(404);
    const names = (await (await listDocumentsResponse(access())).json()).documents.map((d: { name: string }) => d.name);
    expect(names).toEqual(["Newest renewal", "Old hosting terms"]);
  });

  it("won't delete someone else's document", async () => {
    expect((await deleteDocumentResponse(access(), OTHER_USERS_DOC)).status).toBe(404);
    expect(repo.documents.map((d) => d.id)).toContain(OTHER_USERS_DOC);
  });

  it("reports a storage failure instead of claiming success", async () => {
    repo.unreachable = true;
    const res = await deleteDocumentResponse(access(), DOC_B);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe(DOCUMENTS_ERRORS.unavailable);
  });
});

describe("naming a document on upload", () => {
  const text = fixtureText("adhesion-contract");
  const firstLine = text.split("\n").find((l) => l.trim())!.trim();

  it("defaults to the uploaded file's name", () => {
    expect(defaultDocumentName({ fileName: "acme-msa.txt", text })).toBe("acme-msa.txt");
  });

  it("defaults to the first line of a paste, trimmed", () => {
    expect(defaultDocumentName({ text: `\n\n   ${firstLine}   \n${text}` })).toBe(firstLine);
    expect(defaultDocumentName({ text: "   \n  " })).toBe(UNTITLED_DOCUMENT);
  });

  it("the form offers a name field only to a signed-in reader", () => {
    const signedIn = renderToStaticMarkup(<AnalyzeForm saving={{ kind: "signed-in", email: "me@example.com" }} />);
    expect(signedIn).toContain('id="agreement-name"');
    expect(textOf(signedIn)).toContain("Name (optional)");
    for (const kind of ["anonymous", "unavailable"] as const) {
      expect(renderToStaticMarkup(<AnalyzeForm saving={{ kind }} />)).not.toContain('id="agreement-name"');
    }
  });

  it("uses the explicit name when there is one, and the default when it's blank", () => {
    expect(resolveDocumentName("  Acme, signed copy  ", { fileName: "acme-msa.txt", text })).toBe("Acme, signed copy");
    expect(resolveDocumentName("   ", { fileName: "acme-msa.txt", text })).toBe("acme-msa.txt");
    expect(resolveDocumentName(undefined, { text })).toBe(firstLine);
    expect(resolveDocumentName("x".repeat(500), { text })).toHaveLength(200);
  });
});

describe("library routes and pages when signed out or not configured", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  });

  it("the API says the library isn't available without Supabase", async () => {
    for (const res of [
      await listRoute(),
      await documentRoute(new Request("http://localhost"), params(DOC_B)),
      await deleteRoute(new Request("http://localhost", { method: "DELETE" }), params(DOC_B)),
    ]) {
      expect(res.status).toBe(503);
      expect((await res.json()).error).toBe(DOCUMENTS_ERRORS.notConfigured);
    }
  });

  it("the API asks a signed-out visitor to sign in, and touches no storage", async () => {
    for (const res of [
      await listDocumentsResponse({ kind: "signed-out" }),
      await documentResponse({ kind: "signed-out" }, DOC_B),
      await deleteDocumentResponse({ kind: "signed-out" }, DOC_B),
    ]) {
      expect(res.status).toBe(401);
      expect((await res.json()).error).toBe(DOCUMENTS_ERRORS.signedOut);
    }
    expect(repo.documents).toHaveLength(4);
  });

  it("the pages send the visitor to sign-in", async () => {
    await expect(LibraryPage({ searchParams: Promise.resolve({}) })).rejects.toMatchObject({
      digest: expect.stringContaining("/sign-in?next=/app"),
    });
    await expect(DocumentPage(params(DOC_B))).rejects.toMatchObject({
      digest: expect.stringContaining(`/sign-in?next=/app/documents/${DOC_B}`),
    });
  });

  it("the proxy keeps the library and documents behind sign-in", async () => {
    for (const path of ["/app", `/app/documents/${DOC_B}`]) {
      const res = await proxy(new NextRequest(`http://localhost${path}`));
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/sign-in");
      expect(location.searchParams.get("next")).toBe(path);
    }
  });
});
