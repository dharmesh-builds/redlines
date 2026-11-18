import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./env";
import { createClient } from "./server";

// The signed-in user and a client acting as them, or null when Supabase isn't
// configured, nobody is signed in, or Supabase can't be reached. Callers treat
// null as "anonymous": analysis still works, nothing is stored.
export async function getSignedInUser(): Promise<{ supabase: SupabaseClient; user: User } | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return { supabase, user: data.user };
  } catch {
    return null;
  }
}
