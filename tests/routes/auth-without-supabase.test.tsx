import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import SignInPage from "../../app/(app)/sign-in/page";
import { GET as callback } from "../../app/auth/callback/route";
import { POST as signOut } from "../../app/auth/sign-out/route";
import { proxy } from "../../proxy";

// With NEXT_PUBLIC_SUPABASE_URL / ANON_KEY absent, nothing account-related may
// crash: sign-in says it isn't set up, and the rest redirects sensibly.

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("account features without Supabase", () => {
  it("the sign-in page says sign-in isn't set up and links to checking an agreement", async () => {
    const page = await SignInPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(page);
    expect(html).toContain("Sign-in isn\u2019t set up here yet");
    expect(html).toContain('href="/analyze"');
    expect(html).not.toContain('type="email"');
  });

  it("the auth callback sends the visitor to sign-in", async () => {
    const res = await callback(new Request("http://localhost/auth/callback?code=abc"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/sign-in");
  });

  it("sign-out returns to the landing page", async () => {
    const res = await signOut(new Request("http://localhost/auth/sign-out", { method: "POST" }));
    expect(res.status).toBe(303);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/");
  });

  it("the proxy still keeps /app behind sign-in", async () => {
    const res = await proxy(new NextRequest("http://localhost/app/library"));
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/sign-in");
    expect(location.searchParams.get("next")).toBe("/app/library");
  });

  it("the proxy lets public pages through", async () => {
    for (const path of ["/", "/analyze", "/sign-in"]) {
      const res = await proxy(new NextRequest(`http://localhost${path}`));
      expect(res.headers.get("location"), path).toBeNull();
    }
  });
});

describe("the sign-in page with Supabase configured", () => {
  it("shows the email form, and the expired-link message when the callback failed", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");
    const page = await SignInPage({ searchParams: Promise.resolve({ error: "link" }) });
    const html = renderToStaticMarkup(page);
    expect(html).toContain('type="email"');
    expect(html).toContain("expired or was already used");
  });
});
