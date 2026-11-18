import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { RedLineRepository, RedLineRow } from "./repository";

// Red lines on Supabase. `supabase` must act as the signed-in user (anon key +
// session) so row-level security scopes every query; each query also filters
// by user_id as a second guard. Never pass a service-role client.

type RedLineRecord = { id: string; text: string; created_at: string; updated_at: string };

const COLUMNS = "id, text, created_at, updated_at";

const toRow = (r: RedLineRecord): RedLineRow => ({
  id: r.id,
  text: r.text,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

function fail(action: string, error: { message: string }): never {
  throw new Error(`Could not ${action}: ${error.message}`);
}

export function supabaseRedLineRepository(supabase: SupabaseClient): RedLineRepository {
  return {
    async list(userId) {
      const { data, error } = await supabase
        .from("red_lines")
        .select(COLUMNS)
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error) fail("list red lines", error);
      return (data as RedLineRecord[]).map(toRow);
    },

    async create(userId, text) {
      const { data, error } = await supabase
        .from("red_lines")
        .insert({ user_id: userId, text })
        .select(COLUMNS)
        .single();
      if (error || !data) fail("add the red line", error ?? { message: "no row returned" });
      return toRow(data as RedLineRecord);
    },

    async update(userId, id, text) {
      const { data, error } = await supabase
        .from("red_lines")
        .update({ text, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("id", id)
        .select(COLUMNS)
        .maybeSingle();
      if (error) fail("update the red line", error);
      return data ? toRow(data as RedLineRecord) : null;
    },

    async remove(userId, id) {
      const { data, error } = await supabase
        .from("red_lines")
        .delete()
        .eq("user_id", userId)
        .eq("id", id)
        .select("id");
      if (error) fail("delete the red line", error);
      return (data ?? []).length > 0;
    },
  };
}
