import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentRow, LibraryRepository, ReportMeta, ReportRow } from "./repository";

// The library's storage on Supabase. `supabase` must act as the signed-in user
// (anon key + session) so row-level security scopes every query; each query
// also filters by user_id as a second guard. Never pass a service-role client.

type DocumentRecord = { id: string; name: string; created_at: string };
type ReportRecord = { id: string; document_id: string; model_id: string; created_at: string };

const toDocument = (r: DocumentRecord): DocumentRow => ({ id: r.id, name: r.name, createdAt: r.created_at });
const toMeta = (r: ReportRecord): ReportMeta => ({
  id: r.id,
  documentId: r.document_id,
  modelId: r.model_id,
  createdAt: r.created_at,
});

function fail(action: string, error: { message: string }): never {
  throw new Error(`Could not ${action}: ${error.message}`);
}

export function supabaseLibraryRepository(supabase: SupabaseClient): LibraryRepository {
  return {
    async listDocuments(userId) {
      const { data, error } = await supabase
        .from("documents")
        .select("id, name, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) fail("list documents", error);
      return (data as DocumentRecord[]).map(toDocument);
    },

    async findDocument(userId, documentId) {
      const { data, error } = await supabase
        .from("documents")
        .select("id, name, created_at")
        .eq("user_id", userId)
        .eq("id", documentId)
        .maybeSingle();
      if (error) fail("read the document", error);
      return data ? toDocument(data as DocumentRecord) : null;
    },

    async listReports(userId, documentId) {
      const { data, error } = await supabase
        .from("reports")
        .select("id, document_id, model_id, created_at")
        .eq("user_id", userId)
        .eq("document_id", documentId)
        .order("created_at", { ascending: false });
      if (error) fail("list reports", error);
      return (data as ReportRecord[]).map(toMeta);
    },

    async readReport(userId, reportId) {
      const { data, error } = await supabase
        .from("reports")
        .select("id, document_id, model_id, created_at, payload")
        .eq("user_id", userId)
        .eq("id", reportId)
        .maybeSingle();
      if (error) fail("read the report", error);
      if (!data) return null;
      const row = data as ReportRecord & { payload: unknown };
      return { ...toMeta(row), payload: row.payload } satisfies ReportRow;
    },

    async deleteReports(userId, documentId) {
      const { error } = await supabase.from("reports").delete().eq("user_id", userId).eq("document_id", documentId);
      if (error) fail("delete reports", error);
    },

    async deleteDocument(userId, documentId) {
      const { data, error } = await supabase
        .from("documents")
        .delete()
        .eq("user_id", userId)
        .eq("id", documentId)
        .select("id");
      if (error) fail("delete the document", error);
      return (data ?? []).length > 0;
    },
  };
}
