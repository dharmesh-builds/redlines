import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "../../../lib/supabase/env";
import { createClient } from "../../../lib/supabase/server";

// POST /auth/sign-out: ends the session and returns to the landing page.
// POST only, so a link or prefetch can't sign someone out.
export async function POST(request: Request) {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
