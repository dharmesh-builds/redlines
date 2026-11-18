import type { RedLineRepository, RedLineRow } from "../../lib/red-lines/repository";

// In-memory red-line storage for tests. It stands in for Supabase only; the
// behaviour under test (validation, ordering, duplicates, limits) lives in
// lib/red-lines and runs for real on top of it. Like the real queries, every
// method filters by user.

type StoredRedLine = RedLineRow & { userId: string };

export type MemoryRedLines = RedLineRepository & {
  rows: StoredRedLine[];
  unreachable: boolean;
  seed(userId: string, texts: string[]): RedLineRow[];
};

export function memoryRedLines(): MemoryRedLines {
  let clock = Date.parse("2026-11-01T09:00:00Z");
  const now = () => new Date((clock += 1000)).toISOString();
  const view = ({ userId: _u, ...row }: StoredRedLine): RedLineRow => ({ ...row });

  const repo: MemoryRedLines = {
    rows: [],
    unreachable: false,
    seed(userId, texts) {
      return texts.map((text) => {
        const at = now();
        const row = { userId, id: crypto.randomUUID(), text, createdAt: at, updatedAt: at };
        repo.rows.push(row);
        return view(row);
      });
    },
    async list(userId) {
      check();
      return repo.rows.filter((r) => r.userId === userId).map(view);
    },
    async create(userId, text) {
      check();
      return repo.seed(userId, [text])[0];
    },
    async update(userId, id, text) {
      check();
      const row = repo.rows.find((r) => r.userId === userId && r.id === id);
      if (!row) return null;
      row.text = text;
      row.updatedAt = now();
      return view(row);
    },
    async remove(userId, id) {
      check();
      const before = repo.rows.length;
      repo.rows = repo.rows.filter((r) => !(r.userId === userId && r.id === id));
      return repo.rows.length < before;
    },
  };
  function check() {
    if (repo.unreachable) throw new Error("connect ECONNREFUSED");
  }
  return repo;
}
