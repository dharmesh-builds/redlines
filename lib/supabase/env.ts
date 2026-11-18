// Public Supabase settings. The URL and anon key are safe in the browser:
// row-level security, not secrecy, is what protects the data.
// The service-role key is deliberately absent here; it must never be imported
// into code that can reach the browser.
//
// Supabase is optional at runtime: without these two variables the app still
// starts and analyses a pasted agreement; only account features (sign-in,
// saving, the library, red lines) say they aren't available.

export type SupabasePublicEnv = { url: string; anonKey: string };

// Each variable is read by its full literal name so Next.js can inline it
// into browser bundles.
export function supabasePublicEnvOrNull(): SupabasePublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

export function isSupabaseConfigured(): boolean {
  return supabasePublicEnvOrNull() !== null;
}

export function supabasePublicEnv(): SupabasePublicEnv {
  const env = supabasePublicEnvOrNull();
  if (!env) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (run `vercel env pull .env.local`).",
    );
  }
  return env;
}
