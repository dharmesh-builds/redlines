// The storage port the library runs on. Production uses the Supabase client
// acting as the signed-in user (supabase-repository.ts); tests use an
// in-memory implementation. Every method takes the user's ID and the
// implementation filters by it, on top of row-level security.

export type DocumentRow = { id: string; name: string; createdAt: string };

export type ReportMeta = { id: string; documentId: string; modelId: string; createdAt: string };

export type ReportRow = ReportMeta & { payload: unknown };

export type NewReport = {
  documentId: string;
  payload: unknown;
  modelId: string;
  // The red lines the report ran with, kept so a later edit can't change it.
  redLines: string[];
};

export interface LibraryRepository {
  /** Stores a document's extracted text (never the file) and returns its ID. */
  createDocument(userId: string, doc: { name: string; text: string }): Promise<string>;
  /** The stored text, as stored, or null when the user has no such document. */
  readDocumentText(userId: string, documentId: string): Promise<string | null>;
  /** Adds a report; earlier reports on the document are kept. Returns its ID. */
  saveReport(userId: string, report: NewReport): Promise<string>;
  listDocuments(userId: string): Promise<DocumentRow[]>;
  findDocument(userId: string, documentId: string): Promise<DocumentRow | null>;
  /** Every report for one document, without payloads, in any order. */
  listReports(userId: string, documentId: string): Promise<ReportMeta[]>;
  readReport(userId: string, reportId: string): Promise<ReportRow | null>;
  deleteReports(userId: string, documentId: string): Promise<void>;
  /** True when a row was deleted. */
  deleteDocument(userId: string, documentId: string): Promise<boolean>;
}
