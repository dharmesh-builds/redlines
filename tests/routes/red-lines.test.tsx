import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReportView } from "../../app/(app)/analyze/analyze-form";
import { DocumentView } from "../../app/(app)/app/documents/[id]/document-view";
import RedLinesPage from "../../app/(app)/app/red-lines/page";
import { RedLinesView } from "../../app/(app)/app/red-lines/red-lines-view";
import { POST as recheckRoute } from "../../app/api/documents/[id]/reports/route";
import { GET as listRoute, POST as createRoute } from "../../app/api/red-lines/route";
import { DELETE as deleteRoute, PATCH as updateRoute } from "../../app/api/red-lines/[id]/route";
import { analyze } from "../../lib/analysis";
import type { ModelOutput } from "../../lib/analysis/contract";
import { analyzeResponse, recheckDocumentResponse, type AnalyzeAccess } from "../../lib/api/analyze-api";
import { ANALYZE_ERRORS } from "../../lib/api/analyze-contract";
import { DOCUMENTS_ERRORS } from "../../lib/api/documents-api";
import {
  RED_LINES_API_ERRORS,
  createRedLineResponse,
  deleteRedLineResponse,
  listRedLinesResponse,
  updateRedLineResponse,
  type RedLineAccess,
} from "../../lib/api/red-lines-api";
import { loadDocument } from "../../lib/library/library";
import { toStoredPayload } from "../../lib/library/payload";
import { MAX_RED_LINES, MAX_RED_LINE_CHARS, RED_LINE_ERRORS, loadRedLines } from "../../lib/red-lines/red-lines";
import { proxy } from "../../proxy";
import { memoryLibrary, type MemoryLibrary } from "../support/memory-library";
import { memoryRedLines, type MemoryRedLines } from "../support/memory-red-lines";
import { fixtureText, payloadFromSidecar, scriptedModel } from "../support/scripted-model";

const ME = "11111111-1111-4111-8111-111111111111";
const SOMEONE_ELSE = "22222222-2222-4222-8222-222222222222";
const MISSING_ID = "cccccccc-0000-4000-8000-000000000009";

const textOf = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

let lines: MemoryRedLines;
let library: MemoryLibrary;
const redLineAccess = (): RedLineAccess => ({ kind: "ok", userId: ME, redLines: lines });
const account = (): AnalyzeAccess => ({ kind: "ok", userId: ME, library, redLines: lines });

function jsonRequest(method: string, body: unknown) {
  return new Request("http://localhost/api/red-lines", {
    method,
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

// A model that was given the red lines: it marks the early-termination fee
// (Medium on cost alone) and the arbitration clause (Low) as going against them.
const FEE_LINE = "No early termination fee";
const COURT_LINE = "Disputes go to court, not arbitration";
function modelAnswer(): ModelOutput {
  const payload = payloadFromSidecar("adhesion-contract");
  for (const flag of payload.candidateFlags) {
    if (flag.clauseType === "minimum_commitment") flag.matchedRedLine = FEE_LINE;
    if (flag.clauseType === "boilerplate" && flag.sourceSentences.length === 2) flag.matchedRedLine = COURT_LINE;
  }
  return payload;
}

function analyzeRequest(body: unknown) {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  lines = memoryRedLines();
  library = memoryLibrary();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("red-line CRUD through the routes", () => {
  it("adds, lists (oldest first), edits and deletes the user's red lines", async () => {
    const first = await createRedLineResponse(redLineAccess(), jsonRequest("POST", { text: "  No automatic   renewal " }));
    expect(first.status).toBe(201);
    const created = (await first.json()).redLine;
    expect(created.text).toBe("No automatic renewal");
    await createRedLineResponse(redLineAccess(), jsonRequest("POST", { text: "No uncapped indemnity" }));
    lines.seed(SOMEONE_ELSE, ["Someone else's red line"]);

    const listed = await (await listRedLinesResponse(redLineAccess())).json();
    expect(listed.redLines.map((r: { text: string }) => r.text)).toEqual(["No automatic renewal", "No uncapped indemnity"]);

    const edited = await updateRedLineResponse(redLineAccess(), created.id, jsonRequest("PATCH", { text: "No renewal without a reminder" }));
    expect(edited.status).toBe(200);
    expect((await edited.json()).redLine.text).toBe("No renewal without a reminder");

    const deleted = await deleteRedLineResponse(redLineAccess(), created.id);
    expect(deleted.status).toBe(200);
    const after = await (await listRedLinesResponse(redLineAccess())).json();
    expect(after.redLines.map((r: { text: string }) => r.text)).toEqual(["No uncapped indemnity"]);
    expect(lines.rows.filter((r) => r.userId === SOMEONE_ELSE)).toHaveLength(1);
  });

  it("rejects an empty, too long or duplicate red line, and stores nothing", async () => {
    lines.seed(ME, ["No automatic renewal"]);
    const cases: [unknown, string][] = [
      [{ text: "   " }, RED_LINE_ERRORS.empty],
      [{}, RED_LINE_ERRORS.empty],
      [{ text: 42 }, RED_LINE_ERRORS.empty],
      [{ text: "x".repeat(MAX_RED_LINE_CHARS + 1) }, RED_LINE_ERRORS.tooLong],
      [{ text: "  no AUTOMATIC renewal " }, RED_LINE_ERRORS.duplicate],
    ];
    for (const [body, message] of cases) {
      const res = await createRedLineResponse(redLineAccess(), jsonRequest("POST", body));
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect((await res.json()).error).toBe(message);
    }
    expect(lines.rows).toHaveLength(1);
    // Exactly at the limit is fine.
    expect((await createRedLineResponse(redLineAccess(), jsonRequest("POST", { text: "y".repeat(MAX_RED_LINE_CHARS) }))).status).toBe(201);
  });

  it("caps the list at the stated maximum", async () => {
    lines.seed(ME, Array.from({ length: MAX_RED_LINES }, (_, i) => `Red line number ${i + 1}`));
    const res = await createRedLineResponse(redLineAccess(), jsonRequest("POST", { text: "One more" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(RED_LINE_ERRORS.tooMany);
  });

  it("validates edits too, and won't let an edit duplicate another red line", async () => {
    const [a] = lines.seed(ME, ["No automatic renewal", "No uncapped indemnity"]);
    const dup = await updateRedLineResponse(redLineAccess(), a.id, jsonRequest("PATCH", { text: "NO UNCAPPED INDEMNITY" }));
    expect(dup.status).toBe(400);
    expect((await dup.json()).error).toBe(RED_LINE_ERRORS.duplicate);
    const empty = await updateRedLineResponse(redLineAccess(), a.id, jsonRequest("PATCH", { text: "" }));
    expect(empty.status).toBe(400);
    // Changing only the case of the same red line is allowed.
    const recased = await updateRedLineResponse(redLineAccess(), a.id, jsonRequest("PATCH", { text: "no automatic renewal" }));
    expect(recased.status).toBe(200);
  });

  it("says a missing, malformed or someone else's red line isn't in the list", async () => {
    const [theirs] = lines.seed(SOMEONE_ELSE, ["Their red line"]);
    for (const id of [MISSING_ID, "not-a-uuid", theirs.id]) {
      const edit = await updateRedLineResponse(redLineAccess(), id, jsonRequest("PATCH", { text: "Mine now" }));
      expect(edit.status, id).toBe(404);
      expect((await edit.json()).error).toBe(RED_LINES_API_ERRORS.notFound);
      expect((await deleteRedLineResponse(redLineAccess(), id)).status, id).toBe(404);
    }
    expect(lines.rows.find((r) => r.id === theirs.id)!.text).toBe("Their red line");
  });

  it("rejects a body that isn't JSON", async () => {
    const res = await createRedLineResponse(redLineAccess(), jsonRequest("POST", "not json"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(RED_LINES_API_ERRORS.badRequest);
  });

  it("reports a storage failure instead of claiming success", async () => {
    lines.unreachable = true;
    for (const res of [
      await listRedLinesResponse(redLineAccess()),
      await createRedLineResponse(redLineAccess(), jsonRequest("POST", { text: "No automatic renewal" })),
      await deleteRedLineResponse(redLineAccess(), MISSING_ID),
    ]) {
      expect(res.status).toBe(502);
      expect((await res.json()).error).toBe(RED_LINES_API_ERRORS.unavailable);
    }
  });

  it("asks a signed-out visitor to sign in, and touches no storage", async () => {
    lines.seed(ME, ["No automatic renewal"]);
    const out = { kind: "signed-out" } as const;
    for (const res of [
      await listRedLinesResponse(out),
      await createRedLineResponse(out, jsonRequest("POST", { text: "x" })),
      await updateRedLineResponse(out, lines.rows[0].id, jsonRequest("PATCH", { text: "x" })),
      await deleteRedLineResponse(out, lines.rows[0].id),
    ]) {
      expect(res.status).toBe(401);
      expect((await res.json()).error).toBe(RED_LINES_API_ERRORS.signedOut);
    }
    expect(lines.rows.map((r) => r.text)).toEqual(["No automatic renewal"]);
  });
});

describe("red lines when Supabase isn't configured", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  });

  it("the API says sign-in isn't set up", async () => {
    for (const res of [
      await listRoute(),
      await createRoute(jsonRequest("POST", { text: "No automatic renewal" })),
      await updateRoute(jsonRequest("PATCH", { text: "x" }), params(MISSING_ID)),
      await deleteRoute(new Request("http://localhost", { method: "DELETE" }), params(MISSING_ID)),
    ]) {
      expect(res.status).toBe(503);
      expect((await res.json()).error).toBe(RED_LINES_API_ERRORS.notConfigured);
    }
    const recheck = await recheckRoute(new Request("http://localhost", { method: "POST" }), params(MISSING_ID));
    expect(recheck.status).toBe(503);
    expect((await recheck.json()).error).toBe(DOCUMENTS_ERRORS.notConfigured);
  });

  it("the page and the proxy send the visitor to sign-in", async () => {
    await expect(RedLinesPage()).rejects.toMatchObject({ digest: expect.stringContaining("/sign-in?next=/app/red-lines") });
    const res = await proxy(new NextRequest("http://localhost/app/red-lines"));
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/sign-in");
    expect(location.searchParams.get("next")).toBe("/app/red-lines");
  });
});

describe("the red-line editor page", () => {
  it("lists the red lines with edit and delete for each", async () => {
    lines.seed(ME, ["No automatic renewal", "No uncapped indemnity"]);
    const html = renderToStaticMarkup(<RedLinesView list={await loadRedLines(lines, ME)} />);
    const text = textOf(html);
    expect(text.indexOf("No automatic renewal")).toBeLessThan(text.indexOf("No uncapped indemnity"));
    expect(html.match(/class="library-item red-line-item"/g)).toHaveLength(2);
    expect(text).toContain("Edit red line: No uncapped indemnity");
    expect(text).toContain("Delete red line: No automatic renewal");
    expect(text).toContain("Add a red line");
    expect(text).toContain(`2 of ${MAX_RED_LINES} used`);
    expect(text).toContain("Changing this list doesn’t change reports you’ve already saved");
  });

  it("shows an empty state", async () => {
    const text = textOf(renderToStaticMarkup(<RedLinesView list={await loadRedLines(lines, ME)} />));
    expect(text).toContain("No red lines yet");
    expect(text).toContain("Add a red line");
  });

  it("shows an error state, not a crash, when storage can't be reached", async () => {
    lines.unreachable = true;
    const html = renderToStaticMarkup(<RedLinesView list={await loadRedLines(lines, ME)} />);
    expect(textOf(html)).toContain("Your red lines didn’t load");
    expect(html).not.toContain('id="new-red-line"');
  });
});

describe("analysing with the user's red lines", () => {
  const text = fixtureText("adhesion-contract");

  it("signed in: loads the red lines, sends them, raises matches and stores the snapshot", async () => {
    lines.seed(ME, [FEE_LINE, COURT_LINE]);
    lines.seed(SOMEONE_ELSE, ["Not my red line"]);
    const model = scriptedModel(modelAnswer());
    const res = await analyzeResponse(analyzeRequest({ text, name: "Tallyforge" }), account(), model);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.saved).toBe(true);
    expect(body.report.redLines).toEqual([FEE_LINE, COURT_LINE]);
    expect(model.requests[0].prompt).toContain(FEE_LINE);
    expect(model.requests[0].prompt).not.toContain("Not my red line");

    const fee = body.report.flags.find((f: { clauseType: string }) => f.clauseType === "minimum_commitment");
    expect(fee).toMatchObject({ severity: "high", builtInSeverity: "medium", matchedRedLine: FEE_LINE });

    expect(library.reports).toHaveLength(1);
    expect(library.reports[0].redLines).toEqual([FEE_LINE, COURT_LINE]);
    expect((library.reports[0].payload as { redLines: string[] }).redLines).toEqual([FEE_LINE, COURT_LINE]);
  });

  // Signed out is refused outright (tests/routes/signed-in-only.test.tsx). Without
  // Supabase (local only) there is no account, so there are no red lines either.
  it("no Supabase: runs with no red lines, ignores any match the model reports, stores nothing", async () => {
    lines.seed(ME, [FEE_LINE]);
    const res = await analyzeResponse(analyzeRequest({ text }), { kind: "not-configured" }, scriptedModel(modelAnswer()));
    const body = await res.json();
    expect(body.saved).toBe(false);
    expect(body.report.redLines).toEqual([]);
    expect(body.report.flags.every((f: { matchedRedLine: unknown }) => f.matchedRedLine === null)).toBe(true);
    expect(library.documents).toHaveLength(0);
  });

  it("doesn't check or store anything when the red lines can't be read", async () => {
    lines.unreachable = true;
    const model = scriptedModel(modelAnswer());
    const res = await analyzeResponse(analyzeRequest({ text }), account(), model);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe(ANALYZE_ERRORS.redLinesFailed);
    expect(model.requests).toHaveLength(0);
    expect(library.documents).toHaveLength(0);
  });
});

describe("a saved report and its red lines", () => {
  const text = fixtureText("adhesion-contract");

  async function saveOne(): Promise<string> {
    const res = await analyzeResponse(analyzeRequest({ text, name: "Tallyforge" }), account(), scriptedModel(modelAnswer()));
    return (await res.json()).documentId;
  }

  it("shows the snapshot it ran with and the red line each raised flag matched", async () => {
    lines.seed(ME, [FEE_LINE, COURT_LINE]);
    const id = await saveOne();
    const detail = await loadDocument(library, ME, id);
    const html = renderToStaticMarkup(<DocumentView detail={detail} currentRedLines={[FEE_LINE, COURT_LINE]} />);
    const shown = textOf(html);
    expect(shown).toContain(`Checked against your red lines: ${FEE_LINE} ${COURT_LINE}`);
    expect(shown).toContain("Your red line");
    expect(shown).toContain(
      "Marked High because this clause goes against your red line. On cost alone, Redline would rate it Medium.",
    );
    expect(shown).toContain("On cost alone, Redline would rate it Low.");
    expect(shown).not.toContain("Your red lines have changed since this check");
    expect(shown).toContain("Check again with my current red lines");
  });

  it("says when a report ran with no red lines", async () => {
    const id = await saveOne();
    const shown = textOf(renderToStaticMarkup(<DocumentView detail={await loadDocument(library, ME, id)} currentRedLines={[]} />));
    expect(shown).toContain("No red lines were set when this check ran.");
    expect(shown).not.toContain("Your red line ");
  });

  it("re-running saves a second report with the current red lines and leaves the first as it was", async () => {
    lines.seed(ME, [FEE_LINE]);
    const id = await saveOne();
    const firstPayload = structuredClone(library.reports[0].payload);

    // Editing red lines re-runs nothing.
    lines.seed(ME, [COURT_LINE]);
    expect(library.reports).toHaveLength(1);
    const stale = textOf(
      renderToStaticMarkup(
        <DocumentView detail={await loadDocument(library, ME, id)} currentRedLines={[FEE_LINE, COURT_LINE]} />,
      ),
    );
    expect(stale).toContain("Your red lines have changed since this check.");
    expect(stale).toContain(`Checked against your red lines: ${FEE_LINE}`);

    const res = await recheckDocumentResponse(account(), id, scriptedModel(modelAnswer()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ saved: true, documentId: id });
    expect(body.report.redLines).toEqual([FEE_LINE, COURT_LINE]);

    expect(library.reports).toHaveLength(2);
    expect(library.reports[0].payload).toEqual(firstPayload);
    expect(library.reports[0].redLines).toEqual([FEE_LINE]);
    expect(library.reports[1].redLines).toEqual([FEE_LINE, COURT_LINE]);
    expect(library.reports.every((r) => r.documentId === id)).toBe(true);

    const detail = await loadDocument(library, ME, id);
    const fresh = textOf(
      renderToStaticMarkup(<DocumentView detail={detail} currentRedLines={[FEE_LINE, COURT_LINE]} rechecked />),
    );
    expect(fresh).toContain(`Checked against your red lines: ${FEE_LINE} ${COURT_LINE}`);
    expect(fresh).toContain("Checked again with your current red lines. Earlier reports are still saved.");
    expect(fresh).not.toContain("Your red lines have changed");
  });

  it("re-running analyses the stored text, not anything the browser sends", async () => {
    const id = await saveOne();
    const model = scriptedModel(modelAnswer());
    await recheckDocumentResponse(account(), id, model);
    expect(model.requests[0].prompt).toContain(text.trim().split("\n")[0]);
  });

  it("won't re-run someone else's, a missing or a malformed document", async () => {
    library.addDocument(SOMEONE_ELSE, { id: MISSING_ID, name: "Theirs", createdAt: "2026-11-01T00:00:00Z", text });
    for (const id of [MISSING_ID, "aaaaaaaa-0000-4000-8000-00000000000f", "nope"]) {
      const model = scriptedModel(modelAnswer());
      const res = await recheckDocumentResponse(account(), id, model);
      expect(res.status, id).toBe(404);
      expect(model.requests).toHaveLength(0);
    }
    expect(library.reports).toHaveLength(0);
    const out = await recheckDocumentResponse({ kind: "signed-out" }, MISSING_ID, scriptedModel(modelAnswer()));
    expect(out.status).toBe(401);
  });

  it("a report saved before red lines existed still shows the older-version note", async () => {
    const report = await analyze(text, [], scriptedModel(payloadFromSidecar("adhesion-contract")));
    const { redLines: _r, ...withoutRedLines } = toStoredPayload(report);
    const v1 = {
      ...withoutRedLines,
      payloadVersion: 1,
      flags: report.flags.map(({ builtInSeverity: _b, matchedRedLine: _m, ...f }) => f),
    };
    const docId = "aaaaaaaa-0000-4000-8000-000000000001";
    library.addDocument(ME, { id: docId, name: "Old", createdAt: "2026-11-01T00:00:00Z", text });
    library.addReport(ME, { id: "r-v1", documentId: docId, modelId: "vendor/old", createdAt: "2026-11-02T00:00:00Z", payload: v1 });
    const shown = textOf(renderToStaticMarkup(<DocumentView detail={await loadDocument(library, ME, docId)} currentRedLines={[]} />));
    expect(shown).toContain("This report was made by an older version of Redline");
    expect(shown).toContain("Check again with my current red lines");
  });

  it("the analyse page shows the snapshot only for a saved report", async () => {
    const report = await analyze(text, [FEE_LINE], scriptedModel(modelAnswer()));
    expect(textOf(renderToStaticMarkup(<ReportView report={report} saved showRedLines />))).toContain(
      `Checked against your red lines: ${FEE_LINE}`,
    );
    expect(textOf(renderToStaticMarkup(<ReportView report={report} saved={false} />))).not.toContain("Checked against");
  });
});
