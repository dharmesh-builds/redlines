import type { DocumentRow, LibraryRepository, ReportMeta, ReportRow } from "../../lib/library/repository";

// In-memory storage for library tests. It stands in for Supabase only; the
// behaviour under test (ordering, latest report, delete, old payloads) lives
// in lib/library and runs for real on top of it. Like the real queries, every
// method filters by user. It does NOT cascade deletes, so a test can see that
// the library removes reports itself.

type StoredDocument = DocumentRow & { userId: string; text: string };
type StoredReport = ReportRow & { userId: string; redLines: string[] };

export type MemoryLibrary = LibraryRepository & {
  documents: StoredDocument[];
  reports: StoredReport[];
  addDocument(userId: string, doc: { id: string; name: string; createdAt: string; text?: string }): void;
  addReport(userId: string, report: { id: string; documentId: string; modelId: string; createdAt: string; payload: unknown; redLines?: string[] }): void;
  unreachable: boolean;
};

export function memoryLibrary(): MemoryLibrary {
  const lib: MemoryLibrary = {
    documents: [],
    reports: [],
    unreachable: false,
    addDocument(userId, doc) {
      lib.documents.push({ userId, text: "", ...doc });
    },
    addReport(userId, report) {
      lib.reports.push({ userId, redLines: [], ...report });
    },
    async createDocument(userId, doc) {
      check();
      const id = crypto.randomUUID();
      lib.documents.push({ userId, id, name: doc.name, text: doc.text, createdAt: nextTime() });
      return id;
    },
    async readDocumentText(userId, documentId) {
      check();
      return lib.documents.find((d) => d.userId === userId && d.id === documentId)?.text ?? null;
    },
    async saveReport(userId, report) {
      check();
      const id = crypto.randomUUID();
      lib.reports.push({
        userId,
        id,
        documentId: report.documentId,
        modelId: report.modelId,
        createdAt: nextTime(),
        payload: structuredClone(report.payload),
        redLines: [...report.redLines],
      });
      return id;
    },
    async listDocuments(userId) {
      check();
      return lib.documents.filter((d) => d.userId === userId).map(({ id, name, createdAt }) => ({ id, name, createdAt }));
    },
    async findDocument(userId, documentId) {
      check();
      const d = lib.documents.find((x) => x.userId === userId && x.id === documentId);
      return d ? { id: d.id, name: d.name, createdAt: d.createdAt } : null;
    },
    async listReports(userId, documentId) {
      check();
      return lib.reports
        .filter((r) => r.userId === userId && r.documentId === documentId)
        .map(({ id, documentId: doc, modelId, createdAt }): ReportMeta => ({ id, documentId: doc, modelId, createdAt }));
    },
    async readReport(userId, reportId) {
      check();
      const r = lib.reports.find((x) => x.userId === userId && x.id === reportId);
      return r ? { id: r.id, documentId: r.documentId, modelId: r.modelId, createdAt: r.createdAt, payload: structuredClone(r.payload) } : null;
    },
    async deleteReports(userId, documentId) {
      check();
      lib.reports = lib.reports.filter((r) => !(r.userId === userId && r.documentId === documentId));
    },
    async deleteDocument(userId, documentId) {
      check();
      const before = lib.documents.length;
      lib.documents = lib.documents.filter((d) => !(d.userId === userId && d.id === documentId));
      return lib.documents.length < before;
    },
  };
  // Strictly increasing timestamps, so "latest report" is well defined even
  // when two are saved in the same millisecond.
  let clock = Date.parse("2026-11-18T12:00:00Z");
  function nextTime() {
    clock += 1000;
    return new Date(clock).toISOString();
  }
  function check() {
    if (lib.unreachable) throw new Error("connect ECONNREFUSED");
  }
  return lib;
}
