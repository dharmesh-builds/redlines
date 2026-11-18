import "server-only";

import type { LibraryRepository } from "../library/repository";
import { supabaseLibraryRepository } from "../library/supabase-repository";
import type { RedLineRepository } from "../red-lines/repository";
import { supabaseRedLineRepository } from "../red-lines/supabase-repository";
import { isSupabaseConfigured } from "../supabase/env";
import { getSignedInUser } from "../supabase/session";

// Who is asking, and the storage that acts as them: their library and their
// red lines, both through one client signed in as that user.

export type AccountAccess =
  | { kind: "not-configured" }
  | { kind: "signed-out" }
  | { kind: "ok"; userId: string; library: LibraryRepository; redLines: RedLineRepository };

export async function accountAccess(): Promise<AccountAccess> {
  if (!isSupabaseConfigured()) return { kind: "not-configured" };
  const session = await getSignedInUser();
  if (!session) return { kind: "signed-out" };
  return {
    kind: "ok",
    userId: session.user.id,
    library: supabaseLibraryRepository(session.supabase),
    redLines: supabaseRedLineRepository(session.supabase),
  };
}
