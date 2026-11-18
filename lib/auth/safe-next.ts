// Where to send someone after sign-in. Only same-site paths are allowed, so a
// crafted link can't bounce a fresh session to another site.
export const DEFAULT_AFTER_SIGN_IN = "/analyze";

export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return DEFAULT_AFTER_SIGN_IN;
  }
  return next;
}
