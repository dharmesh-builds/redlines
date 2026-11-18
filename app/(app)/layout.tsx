import Link from "next/link";
import { isSupabaseConfigured } from "../../lib/supabase/env";
import { getSignedInUser } from "../../lib/supabase/session";
import { ThemeToggle } from "../theme-toggle";

// The app shell (.impeccable/surfaces/app-app-layout-tsx.md): the desk, the
// wordmark, links between the library and checking an agreement, and the
// account action. Checking an agreement works signed out; only saving needs an
// account.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const session = configured ? await getSignedInUser() : null;

  return (
    <>
      <header className="site-head">
        <Link href="/" className="wordmark">
          Redline
        </Link>
        <div className="head-actions">
          {session ? (
            <>
              <nav aria-label="Your account" className="head-nav">
                <Link href="/app" className="head-link">
                  Library
                </Link>
                <Link href="/app/red-lines" className="head-link">
                  Red lines
                </Link>
                <Link href="/analyze" className="head-link">
                  Check an agreement
                </Link>
              </nav>
              <form action="/auth/sign-out" method="post">
                <button type="submit" className="head-link head-button">
                  Sign out
                </button>
              </form>
            </>
          ) : configured ? (
            <Link href="/sign-in" className="head-link">
              Sign in
            </Link>
          ) : null}
          <ThemeToggle />
        </div>
      </header>
      <main className="app-main">{children}</main>
    </>
  );
}
