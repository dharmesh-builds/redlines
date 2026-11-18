import "server-only";

import { isSupabaseConfigured } from "../supabase/env";
import { getSignedInUser } from "../supabase/session";
import type { LibraryRepository } from "./repository";
import { supabaseLibraryRepository } from "./supabase-repository";

// Who is asking for the library, and the storage that acts as them.

export type LibraryAccess =
  | { kind: "not-configured" }
  | { kind: "signed-out" }
  | { kind: "ok"; userId: string; repo: LibraryRepository };

export async function libraryAccess(): Promise<LibraryAccess> {
  if (!isSupabaseConfigured()) return { kind: "not-configured" };
  const session = await getSignedInUser();
  if (!session) return { kind: "signed-out" };
  return { kind: "ok", userId: session.user.id, repo: supabaseLibraryRepository(session.supabase) };
}
