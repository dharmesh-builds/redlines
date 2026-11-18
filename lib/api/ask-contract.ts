import type { Answer } from "../analysis";

// What the two question routes answer, shared by the routes and the page.

export type AskResponse = { answer: Answer } | { error: string };

export const ASK_ERRORS = {
  badRequest: "Redline couldn't read that request. Reload the page and try again.",
  notConfigured: "Questions aren't set up on this server yet, so this one wasn't answered.",
  modelFailed: "Redline didn't get an answer this time. Try again in a minute.",
  modelOutput: "The answer came back in a form Redline couldn't check, so it isn't shown. Try asking again.",
} as const;
