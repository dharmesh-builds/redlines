import { NextResponse } from "next/server";
import { safeNextPath } from "../../../lib/auth/safe-next";
import { isSupabaseConfigured } from "../../../lib/supabase/env";
import { createClient } from "../../../lib/supabase/server";

// GET /auth/callback?code=...&next=/path
// The email link lands here. Exchanging the one-time code sets the session
// cookie; an expired or reused link goes back to sign-in with a message.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNextPath(url.searchParams.get("next"));
  const signIn = new URL("/sign-in", url.origin);

  if (!isSupabaseConfigured()) return NextResponse.redirect(signIn);

  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  signIn.searchParams.set("error", "link");
  signIn.searchParams.set("next", next);
  return NextResponse.redirect(signIn);
}
