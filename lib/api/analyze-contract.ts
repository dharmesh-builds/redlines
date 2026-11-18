import type { Report } from "../analysis";

// What POST /api/analyze answers, shared by the route and the page.

export type AnalyzeResponse =
  | { report: Report; saved: true; documentId: string }
  | { report: Report; saved: false }
  | { error: string };

export const ANALYZE_ERRORS = {
  badRequest: "Redline couldn't read that request. Reload the page and try again.",
  notConfigured: "Analysis isn't set up on this server yet, so nothing was checked.",
  modelFailed: "The analysis didn't finish. Nothing was saved. Try again in a minute.",
  modelOutput:
    "The analysis came back in a form Redline couldn't check, so nothing is shown. Try again.",
  saveFailed: "Redline couldn't save this agreement to your account, so it didn't check it. Try again.",
} as const;
