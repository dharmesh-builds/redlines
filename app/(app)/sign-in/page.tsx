import Link from "next/link";
import { safeNextPath } from "../../../lib/auth/safe-next";
import { isSupabaseConfigured } from "../../../lib/supabase/env";
import { SignInForm } from "./sign-in-form";


type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <section className="app-panel" aria-labelledby="sign-in-title">
        <h1 id="sign-in-title" className="app-title">
          Sign-in isn&rsquo;t set up here yet
        </h1>
        <p className="app-lede">You can still check an agreement. Nothing you paste will be saved.</p>
        <Link href="/analyze" className="cta">
          Check an agreement
        </Link>
      </section>
    );
  }

  const linkFailed = first(params.error) === "link";
  return (
    <section className="app-panel" aria-labelledby="sign-in-title">
      <h1 id="sign-in-title" className="app-title">
        Sign in
      </h1>
      <p className="app-lede">
        We&rsquo;ll email you a link to sign in, so there&rsquo;s no password. Once you&rsquo;re in, you can
        check agreements, and each one stays in your library with its report.
      </p>
      {linkFailed ? (
        <p className="form-error" role="alert">
          That sign-in link has expired or was already used. Enter your email for a new one.
        </p>
      ) : null}
      <SignInForm next={safeNextPath(first(params.next))} />
    </section>
  );
}
