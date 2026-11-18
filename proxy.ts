import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isProtectedPath } from "./lib/auth/protected-paths";

// Runs before every matched request. Two jobs:
// 1. Refresh the Supabase session cookie so server code sees a live session.
// 2. Send signed-out visitors away from pages that need an account.
// This is an optimistic check only; data is protected by row-level security.

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Not configured yet (e.g. before `vercel env pull`): public pages keep working,
  // and account pages go to sign-in, which says sign-in isn't set up.
  if (!url || !anonKey) {
    return isProtectedPath(request.nextUrl.pathname)
      ? redirectToSignIn(request)
      : NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() revalidates the token with Supabase; getSession() would trust the cookie as-is.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath(request.nextUrl.pathname)) return redirectToSignIn(request);

  return response;
}

function redirectToSignIn(request: NextRequest) {
  const signIn = request.nextUrl.clone();
  signIn.pathname = "/sign-in";
  signIn.search = "";
  signIn.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(signIn);
}

export const config = {
  // Skip static assets and image optimisation; run on everything else.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
