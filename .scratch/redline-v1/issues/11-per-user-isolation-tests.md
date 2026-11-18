# 11: Per-user isolation tests

**What to build:** Proof that no user can reach another user's data. With two signed-in users against a Supabase instance, user B can't read, update or delete user A's documents, reports or red lines.

**Blocked by:** 07, 10. Needs approval first: Supabase CLI / local stack (log in `QUESTIONS.md`).

**Status:** blocked: the suite is written (`npm run test:isolation`) but has never run, because there is no Supabase instance (no Docker, no test project). See BUILD-REPORT.md.

- [ ] Tests run against a real Supabase instance with row-level security enabled, not mocks
- [ ] B can't select, update or delete A's documents, reports or red lines
- [ ] A test fails if row-level security is turned off on any of the three tables
