// Limits on a question for the question box, shared by the page (to answer at
// once) and the API routes (which are the real check).

// About five long sentences. A question is one thing to look up; a longer
// paste is more likely a second document or instructions than a question.
export const MAX_QUESTION_CHARS = 500;

export const QUESTION_MESSAGES = {
  empty: "Type a question about this agreement first.",
  tooLong: `Keep the question under ${MAX_QUESTION_CHARS} characters. Ask one thing at a time.`,
} as const;

export type QuestionCheck = { ok: true; question: string } | { ok: false; message: string };

export function checkQuestion(input: unknown): QuestionCheck {
  const question = typeof input === "string" ? input.trim() : "";
  if (question.length === 0) return { ok: false, message: QUESTION_MESSAGES.empty };
  if (question.length > MAX_QUESTION_CHARS) return { ok: false, message: QUESTION_MESSAGES.tooLong };
  return { ok: true, question };
}
