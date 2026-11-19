import { describe, expect, it } from "vitest";
import { DEFAULT_AFTER_SIGN_IN, safeNextPath } from "./safe-next";

// Where the reader goes after sign-in. Only a path on this site is allowed:
// `next` is resolved with new URL(next, origin) in /auth/callback, so anything
// that resolves to another host must be refused (finding 9).

const ORIGIN = "https://redlines-seven.vercel.app";
const landsOnSite = (next: string) => new URL(safeNextPath(next), ORIGIN).origin === ORIGIN;

describe("safeNextPath", () => {
  it("keeps a same-site path, with its query and fragment", () => {
    expect(safeNextPath("/analyze")).toBe("/analyze");
    expect(safeNextPath("/app/documents/22a3dede-3530-4a03-96a6-8b2d11b71ca7?report=abc#q")).toBe(
      "/app/documents/22a3dede-3530-4a03-96a6-8b2d11b71ca7?report=abc#q",
    );
  });

  it("falls back for nothing, or for anything that isn't a path", () => {
    for (const next of [null, undefined, "", "analyze", "https://evil.example", "javascript:alert(1)"]) {
      expect(safeNextPath(next)).toBe(DEFAULT_AFTER_SIGN_IN);
    }
  });

  it("refuses protocol-relative and backslash tricks", () => {
    for (const next of ["//evil.example", "/\\evil.example", "\\\\evil.example"]) {
      expect(safeNextPath(next)).toBe(DEFAULT_AFTER_SIGN_IN);
    }
  });

  it("refuses a tab, newline or carriage return that the URL parser would strip (finding 9)", () => {
    // "/%09/evil.example" decodes to "/\t/evil.example"; new URL drops the tab
    // and reads "//evil.example" as another host.
    for (const next of ["/\t/evil.example/login", "/\n/evil.example", "/\r/evil.example", "/\t\t/evil.example"]) {
      expect(safeNextPath(next)).toBe(DEFAULT_AFTER_SIGN_IN);
      expect(landsOnSite(next)).toBe(true);
    }
  });

  it("never returns anything that resolves to another site", () => {
    const tricky = [
      "/%2F/evil.example",
      "/ /evil.example",
      "/\u0000/evil.example",
      "/\u007f/evil.example",
      "/.//evil.example",
      "/..//evil.example",
    ];
    for (const next of tricky) expect(landsOnSite(next)).toBe(true);
  });
});
