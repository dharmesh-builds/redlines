// The storage port for red lines. Production uses the Supabase client acting
// as the signed-in user (supabase-repository.ts); tests use an in-memory
// implementation. Every method takes the user's ID and filters by it, on top
// of row-level security.

export type RedLineRow = { id: string; text: string; createdAt: string; updatedAt: string };

export interface RedLineRepository {
  /** Every red line of one user, in any order. */
  list(userId: string): Promise<RedLineRow[]>;
  create(userId: string, text: string): Promise<RedLineRow>;
  /** The updated row, or null when the user has no red line with this ID. */
  update(userId: string, id: string, text: string): Promise<RedLineRow | null>;
  /** True when a row was deleted. */
  remove(userId: string, id: string): Promise<boolean>;
}
