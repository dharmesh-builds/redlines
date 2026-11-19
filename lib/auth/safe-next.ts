// Where to send someone after sign-in. Only same-site paths are allowed, so a
// crafted link can't bounce a fresh session to another site.
export const DEFAULT_AFTER_SIGN_IN = "/analyze";

// Any site will do: only whether the path stays on it matters.
const PROBE_ORIGIN = "https://redline.invalid";

// Control characters and spaces. The URL parser silently drops tabs and
// newlines, so "/\t/evil.example" would become "//evil.example", another host
// (finding 9). A real path never contains them.
const UNSAFE = /[\u0000- \u007f\\]/;

export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || UNSAFE.test(next)) {
    return DEFAULT_AFTER_SIGN_IN;
  }
  // The callback resolves `next` with new URL(next, origin). Resolve it the
  // same way here and refuse anything that leaves the site.
  try {
    if (new URL(next, PROBE_ORIGIN).origin !== PROBE_ORIGIN) return DEFAULT_AFTER_SIGN_IN;
  } catch {
    return DEFAULT_AFTER_SIGN_IN;
  }
  return next;
}
