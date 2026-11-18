import type { Report } from "../analysis";

// Saved reports carry a payload version. Reports saved before versioning (and
// any with an older version) may lack fields this code relies on, such as
// confidence, the verdict, counter-offers or the summary. Rather than render
// those partially, the library shows a plain "made by an older version" note:
// a half-rendered report could hide a check the reader expects to see.
//
// Bump REPORT_PAYLOAD_VERSION whenever the shape of `Report` changes.
export const REPORT_PAYLOAD_VERSION = 1;

export type StoredReportPayload = Report & { payloadVersion: number };

export function toStoredPayload(report: Report): StoredReportPayload {
  return { ...report, payloadVersion: REPORT_PAYLOAD_VERSION };
}

export type ReadPayload = { kind: "current"; report: Report } | { kind: "outdated" };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// The parts ReportView reads without guarding. A payload marked current but
// missing any of them (hand-edited, truncated) is treated as outdated too.
function hasCurrentShape(p: Record<string, unknown>): boolean {
  const summary = p.summary;
  const verdict = p.verdict;
  if (typeof p.modelId !== "string") return false;
  if (typeof p.droppedFlagCount !== "number" || typeof p.candidateFlagCount !== "number") return false;
  if (!isObject(verdict) || typeof verdict.present !== "boolean") return false;
  if (
    !isObject(summary) ||
    !Array.isArray(summary.points) ||
    !Array.isArray(summary.deadlines) ||
    !Array.isArray(summary.incorporatedTerms) ||
    !Array.isArray(summary.notStated) ||
    typeof summary.droppedCount !== "number"
  ) {
    return false;
  }
  if (!Array.isArray(p.flags)) return false;
  return p.flags.every(
    (f) =>
      isObject(f) &&
      typeof f.severity === "string" &&
      isObject(f.exposure) &&
      isObject(f.confidence) &&
      isObject(f.counterOffer) &&
      Array.isArray(f.figures) &&
      Array.isArray(f.sourceSentences),
  );
}

export function readStoredPayload(payload: unknown): ReadPayload {
  if (!isObject(payload) || payload.payloadVersion !== REPORT_PAYLOAD_VERSION || !hasCurrentShape(payload)) {
    return { kind: "outdated" };
  }
  const { payloadVersion: _version, ...report } = payload;
  return { kind: "current", report: report as unknown as Report };
}
