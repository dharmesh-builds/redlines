import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fixtureText } from "../support/scripted-model";

// Seam 3: per-user isolation, against a REAL Supabase instance. Nothing here is
// mocked. Two real users sign in with the anon key, exactly as the app's
// clients do, so every query below goes through row-level security.
// The service-role key is used only to create and delete the two test users
// and to read the RLS flags; it is never used to read or write user rows.
// Run with `npm run test:isolation` (see supabase/README.md).

const url = process.env.SUPABASE_TEST_URL!;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY!;
const serviceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY!;

const TABLES = ["documents", "reports", "red_lines"] as const;
type Table = (typeof TABLES)[number];

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(url, serviceKey, clientOptions);

type TestUser = { id: string; client: SupabaseClient };
const createdUserIds: string[] = [];

async function createSignedInUser(label: string): Promise<TestUser> {
  const email = `isolation-${label}-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`Could not create test user ${label}: ${error?.message}`);
  createdUserIds.push(data.user.id);

  const client = createClient(url, anonKey, clientOptions);
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error || !signIn.data.session) throw new Error(`Test user ${label} could not sign in: ${signIn.error?.message}`);
  return { id: data.user.id, client };
}

let a: TestUser;
let b: TestUser;
const aRows = {} as Record<Table, Record<string, unknown>>;

// One harmless column change per table, used for B's update attempts.
const updates: Record<Table, Record<string, unknown>> = {
  documents: { name: "Changed by user B" },
  reports: { model_id: "changed-by-user-b" },
  red_lines: { text: "Changed by user B" },
};

async function readAsA(table: Table) {
  const { data, error } = await a.client.from(table).select("*").order("created_at");
  expect(error).toBeNull();
  return data ?? [];
}

beforeAll(async () => {
  a = await createSignedInUser("a");
  b = await createSignedInUser("b");

  const document = await a.client
    .from("documents")
    .insert({ user_id: a.id, name: "Adhesion fixture", text: fixtureText("adhesion-contract") })
    .select("*")
    .single();
  if (document.error) throw new Error(`A could not create a document: ${document.error.message}`);
  aRows.documents = document.data;

  const report = await a.client
    .from("reports")
    .insert({ user_id: a.id, document_id: document.data.id, payload: { flags: [] }, model_id: "isolation-test", red_lines: [] })
    .select("*")
    .single();
  if (report.error) throw new Error(`A could not create a report: ${report.error.message}`);
  aRows.reports = report.data;

  const redLine = await a.client
    .from("red_lines")
    .insert({ user_id: a.id, text: "No automatic renewal" })
    .select("*")
    .single();
  if (redLine.error) throw new Error(`A could not create a red line: ${redLine.error.message}`);
  aRows.red_lines = redLine.data;
});

afterAll(async () => {
  // Deleting the users cascades to their rows.
  for (const id of createdUserIds) await admin.auth.admin.deleteUser(id);
});

describe("row-level security is on", () => {
  it("is enabled on documents, reports and red_lines (pg_class.relrowsecurity)", async () => {
    const { data, error } = await admin.rpc("test_only_rls_status");
    if (error) {
      throw new Error(
        `Could not read RLS flags (${error.message}). Apply supabase/seed.sql (test-only) to this instance; ` +
          "the local stack loads it on `npx supabase start` / `npx supabase db reset`.",
      );
    }
    const status = Object.fromEntries((data as { table_name: string; rls_enabled: boolean }[]).map((r) => [r.table_name, r.rls_enabled]));
    expect(status).toEqual({ documents: true, reports: true, red_lines: true });
  });

  it("does not let a signed-in user call the test-only RLS function", async () => {
    const { error } = await b.client.rpc("test_only_rls_status");
    expect(error).not.toBeNull();
  });
});

describe.each(TABLES)("user B and user A's %s", (table) => {
  it("B's select returns nothing", async () => {
    const byId = await b.client.from(table).select("*").eq("id", aRows[table].id);
    expect(byId.error).toBeNull();
    expect(byId.data).toEqual([]);

    const byOwner = await b.client.from(table).select("*").eq("user_id", a.id);
    expect(byOwner.error).toBeNull();
    expect(byOwner.data).toEqual([]);

    const all = await b.client.from(table).select("*");
    expect(all.error).toBeNull();
    expect(all.data).toEqual([]);
  });

  it("B's update affects 0 rows and A's row is unchanged", async () => {
    const result = await b.client.from(table).update(updates[table], { count: "exact" }).eq("id", aRows[table].id).select("*");
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
    expect(result.count).toBe(0);

    expect(await readAsA(table)).toEqual([aRows[table]]);
  });

  it("B's delete affects 0 rows and A's row is still there", async () => {
    const byId = await b.client.from(table).delete({ count: "exact" }).eq("id", aRows[table].id);
    expect(byId.error).toBeNull();
    expect(byId.count).toBe(0);

    const byOwner = await b.client.from(table).delete({ count: "exact" }).eq("user_id", a.id);
    expect(byOwner.error).toBeNull();
    expect(byOwner.count).toBe(0);

    expect(await readAsA(table)).toEqual([aRows[table]]);
  });

  it("a signed-out (anon) client sees nothing", async () => {
    const anon = createClient(url, anonKey, clientOptions);
    const { data } = await anon.from(table).select("*");
    expect(data ?? []).toEqual([]);
  });
});

describe("user B can't insert rows owned by user A", () => {
  it("documents", async () => {
    const { error } = await b.client.from("documents").insert({ user_id: a.id, name: "Planted", text: "Planted by B." });
    expect(error?.code).toBe("42501");
  });

  it("reports", async () => {
    const { error } = await b.client
      .from("reports")
      .insert({ user_id: a.id, document_id: aRows.documents.id, payload: {}, model_id: "planted" });
    expect(error?.code).toBe("42501");
  });

  it("reports owned by B that point at A's document", async () => {
    const { error } = await b.client
      .from("reports")
      .insert({ user_id: b.id, document_id: aRows.documents.id, payload: {}, model_id: "planted" });
    expect(error?.code).toBe("42501");
  });

  it("red_lines", async () => {
    const { error } = await b.client.from("red_lines").insert({ user_id: a.id, text: "Planted by B" });
    expect(error?.code).toBe("42501");
  });

  it("left A with exactly the rows A created", async () => {
    for (const table of TABLES) expect(await readAsA(table)).toEqual([aRows[table]]);
  });
});
