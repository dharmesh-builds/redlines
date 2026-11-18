import { describe, expect, it } from "vitest";
import { isProtectedPath } from "./protected-paths";

describe("isProtectedPath", () => {
  it("protects the app and everything under it", () => {
    expect(isProtectedPath("/app")).toBe(true);
    expect(isProtectedPath("/app/")).toBe(true);
    expect(isProtectedPath("/app/library")).toBe(true);
  });

  it("leaves public pages open", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/sign-in")).toBe(false);
    expect(isProtectedPath("/auth/callback")).toBe(false);
  });

  it("does not match paths that only share a prefix", () => {
    expect(isProtectedPath("/apple")).toBe(false);
    expect(isProtectedPath("/application")).toBe(false);
  });
});
