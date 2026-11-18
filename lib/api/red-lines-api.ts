import {
  addRedLine,
  deleteRedLine,
  editRedLine,
  loadRedLines,
  type RedLineRepository,
  type SaveResult,
} from "../red-lines/red-lines";

// Handlers behind /api/red-lines and /api/red-lines/[id]. They take the
// resolved access (user + storage) so the route files stay thin and the
// behaviour can be driven with any storage.

export const RED_LINES_API_ERRORS = {
  notConfigured: "Sign-in isn’t set up here, so you can’t keep red lines.",
  signedOut: "Sign in to see and edit your red lines.",
  notFound: "That red line isn’t in your list. It may have been deleted.",
  unavailable: "Redline couldn’t reach your red lines. Try again in a minute.",
  badRequest: "Redline couldn’t read that request. Reload the page and try again.",
} as const;

export type RedLineAccess =
  | { kind: "not-configured" }
  | { kind: "signed-out" }
  | { kind: "ok"; userId: string; redLines: RedLineRepository };

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function denied(access: Exclude<RedLineAccess, { kind: "ok" }>) {
  return access.kind === "not-configured"
    ? json({ error: RED_LINES_API_ERRORS.notConfigured }, 503)
    : json({ error: RED_LINES_API_ERRORS.signedOut }, 401);
}

async function readText(request: Request): Promise<{ ok: true; text: unknown } | { ok: false }> {
  try {
    const body = (await request.json()) as unknown;
    if (typeof body !== "object" || body === null) return { ok: false };
    return { ok: true, text: (body as { text?: unknown }).text };
  } catch {
    return { ok: false };
  }
}

function saved(result: SaveResult, created: boolean) {
  switch (result.kind) {
    case "saved":
      return json({ redLine: result.redLine }, created ? 201 : 200);
    case "invalid":
      return json({ error: result.message }, 400);
    case "not-found":
      return json({ error: RED_LINES_API_ERRORS.notFound }, 404);
    case "unavailable":
      return json({ error: RED_LINES_API_ERRORS.unavailable }, 502);
  }
}

export async function listRedLinesResponse(access: RedLineAccess) {
  if (access.kind !== "ok") return denied(access);
  const list = await loadRedLines(access.redLines, access.userId);
  if (list.kind === "unavailable") return json({ error: RED_LINES_API_ERRORS.unavailable }, 502);
  return json({ redLines: list.redLines });
}

export async function createRedLineResponse(access: RedLineAccess, request: Request) {
  if (access.kind !== "ok") return denied(access);
  const body = await readText(request);
  if (!body.ok) return json({ error: RED_LINES_API_ERRORS.badRequest }, 400);
  return saved(await addRedLine(access.redLines, access.userId, body.text), true);
}

export async function updateRedLineResponse(access: RedLineAccess, id: string, request: Request) {
  if (access.kind !== "ok") return denied(access);
  const body = await readText(request);
  if (!body.ok) return json({ error: RED_LINES_API_ERRORS.badRequest }, 400);
  return saved(await editRedLine(access.redLines, access.userId, id, body.text), false);
}

export async function deleteRedLineResponse(access: RedLineAccess, id: string) {
  if (access.kind !== "ok") return denied(access);
  const result = await deleteRedLine(access.redLines, access.userId, id);
  if (result.kind === "not-found") return json({ error: RED_LINES_API_ERRORS.notFound }, 404);
  if (result.kind === "unavailable") return json({ error: RED_LINES_API_ERRORS.unavailable }, 502);
  return json({ deleted: true });
}
