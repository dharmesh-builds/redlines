// Which pages need a signed-in user. Everything under /app is the product
// (upload, reports, red lines, library); the landing page, sign-in and the
// auth callback stay public. An allowlist of public pages would be stricter,
// but would also lock static files and Next internals behind sign-in.

const PROTECTED_ROOTS = ["/app"];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROOTS.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`),
  );
}
