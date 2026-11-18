// Public Supabase settings. The URL and anon key are safe in the browser:
// row-level security, not secrecy, is what protects the data.
// The service-role key is deliberately absent here; it must never be imported
// into code that can reach the browser.

export function supabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (run `vercel env pull .env.local`).",
    );
  }
  return { url, anonKey };
}
