import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Report } from "../analysis";
import { toStoredPayload } from "../library/payload";

// Per-user storage of documents and reports. Every call goes through a client
// acting as the signed-in user (anon key + session), so row-level security
// decides what is visible. Never pass a service-role client here.

export async function saveDocument(
  supabase: SupabaseClient,
  userId: string,
  doc: { name: string; text: string },
): Promise<string> {
  const { data, error } = await supabase
    .from("documents")
    .insert({ user_id: userId, name: doc.name, text: doc.text })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Could not save the document: ${error?.message ?? "no row returned"}`);
  return data.id as string;
}

// The analysis runs on the text as stored, not as posted, so every citation is
// checked against exactly what the library will show later.
export async function readDocumentText(supabase: SupabaseClient, documentId: string): Promise<string> {
  const { data, error } = await supabase.from("documents").select("text").eq("id", documentId).single();
  if (error || !data) throw new Error(`Could not read the document back: ${error?.message ?? "not found"}`);
  return data.text as string;
}

export async function saveReport(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
  report: Report,
  redLines: readonly string[],
): Promise<string> {
  const { data, error } = await supabase
    .from("reports")
    .insert({
      user_id: userId,
      document_id: documentId,
      // Versioned so the library can tell a report made by older code.
      payload: toStoredPayload(report),
      model_id: report.modelId,
      red_lines: redLines,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Could not save the report: ${error?.message ?? "no row returned"}`);
  return data.id as string;
}
