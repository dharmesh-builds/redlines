// The storage port the library runs on. Production uses the Supabase client
// acting as the signed-in user (supabase-repository.ts); tests use an
// in-memory implementation. Every method takes the user's ID and the
// implementation filters by it, on top of row-level security.

export type DocumentRow = { id: string; name: string; createdAt: string };

export type ReportMeta = { id: string; documentId: string; modelId: string; createdAt: string };

export type ReportRow = ReportMeta & { payload: unknown };

export interface LibraryRepository {
  listDocuments(userId: string): Promise<DocumentRow[]>;
  findDocument(userId: string, documentId: string): Promise<DocumentRow | null>;
  /** Every report for one document, without payloads, in any order. */
  listReports(userId: string, documentId: string): Promise<ReportMeta[]>;
  readReport(userId: string, reportId: string): Promise<ReportRow | null>;
  deleteReports(userId: string, documentId: string): Promise<void>;
  /** True when a row was deleted. */
  deleteDocument(userId: string, documentId: string): Promise<boolean>;
}
