import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// STATIC SAFETY NET, NOT PROOF OF ISOLATION. This reads the SQL text of
// supabase/migrations/ and catches a migration that forgets to turn on
// row-level security or to write an owner-only policy. It can't tell whether
// a live database actually has RLS on, or whether the policies behave; only
// the real-instance suite (`npm run test:isolation`) shows that.

const MIGRATIONS = fileURLToPath(new URL("../../supabase/migrations/", import.meta.url));
const PER_USER_TABLES = ["documents", "reports", "red_lines"];
const COMMANDS = ["select", "insert", "update", "delete"] as const;
type Command = (typeof COMMANDS)[number];

type Policy = { table: string; command: Command | "all"; using: string; withCheck: string };
type Schema = { tables: Set<string>; rls: Map<string, boolean>; policies: Map<string, Policy> };

function readMigrations(): { name: string; sql: string }[] {
  return readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(MIGRATIONS, name), "utf8") }));
}

// Strip comments and dollar-quoted bodies (function code), then split into statements.
function statements(sql: string): string[] {
  return sql
    .replace(/\$([A-Za-z_]*)\$[\s\S]*?\$\1\$/g, "''")
    .replace(/--[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(";")
    .map((s) => s.replace(/\s+/g, " ").trim().toLowerCase())
    .filter(Boolean);
}

// Returns the table name if it's in the public schema (explicit or unqualified).
const IDENT = String.raw`(?:"?(\w+)"?\.)?"?(\w+)"?`;
function publicName(schema: string | undefined, name: string): string | null {
  return !schema || schema === "public" ? name : null;
}

// Text of a parenthesised expression that starts at `open` (an index of "(").
function balanced(text: string, open: number): string {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "(") depth++;
    if (text[i] === ")" && --depth === 0) return text.slice(open + 1, i);
  }
  return text.slice(open + 1);
}

function clause(stmt: string, keyword: RegExp): string {
  const m = keyword.exec(stmt);
  return m ? balanced(stmt, m.index + m[0].length - 1) : "";
}

function buildSchema(files: { name: string; sql: string }[]): Schema {
  const schema: Schema = { tables: new Set(), rls: new Map(), policies: new Map() };
  for (const { sql } of files) {
    for (const stmt of statements(sql)) {
      let m: RegExpExecArray | null;
      if ((m = new RegExp(String.raw`^create (?:unlogged )?table (?:if not exists )?${IDENT}`).exec(stmt))) {
        const t = publicName(m[1], m[2]);
        if (t) {
          schema.tables.add(t);
          if (!schema.rls.has(t)) schema.rls.set(t, false);
        }
      } else if ((m = new RegExp(String.raw`^drop table (?:if exists )?${IDENT}`).exec(stmt))) {
        const t = publicName(m[1], m[2]);
        if (t) schema.tables.delete(t);
      } else if (
        (m = new RegExp(String.raw`^alter table (?:if exists )?(?:only )?${IDENT} (enable|disable) row level security$`).exec(stmt))
      ) {
        const t = publicName(m[1], m[2]);
        if (t) schema.rls.set(t, m[3] === "enable");
      } else if ((m = new RegExp(String.raw`^create policy "?([\w ]+?)"? on ${IDENT}`).exec(stmt))) {
        const t = publicName(m[2], m[3]);
        if (!t) continue;
        const command = (/ for (select|insert|update|delete|all)\b/.exec(stmt)?.[1] ?? "all") as Policy["command"];
        schema.policies.set(`${t}.${m[1]}`, {
          table: t,
          command,
          using: clause(stmt, / using \(/),
          withCheck: clause(stmt, / with check \(/),
        });
      } else if ((m = new RegExp(String.raw`^drop policy (?:if exists )?"?([\w ]+?)"? on ${IDENT}`).exec(stmt))) {
        const t = publicName(m[2], m[3]);
        if (t) schema.policies.delete(`${t}.${m[1]}`);
      }
    }
  }
  return schema;
}

const usesUid = (expr: string) => /auth\.uid\(\)/.test(expr);

// For one table and command, true when some policy covers it and every
// expression that command needs references auth.uid().
function ownerOnly(schema: Schema, table: string, command: Command): boolean {
  return [...schema.policies.values()]
    .filter((p) => p.table === table && (p.command === command || p.command === "all"))
    .some((p) => {
      if (command === "insert") return usesUid(p.withCheck);
      if (command === "update") return usesUid(p.using) && (p.withCheck === "" || usesUid(p.withCheck));
      return usesUid(p.using);
    });
}

function problems(schema: Schema): string[] {
  const found: string[] = [];
  for (const t of schema.tables) if (!schema.rls.get(t)) found.push(`public.${t} has no "enable row level security"`);
  for (const t of PER_USER_TABLES) {
    if (!schema.tables.has(t)) found.push(`public.${t} is not created by any migration`);
    for (const c of COMMANDS) if (!ownerOnly(schema, t, c)) found.push(`public.${t} has no ${c} policy using auth.uid()`);
  }
  return found;
}

describe("migrations: static RLS safety net (not a substitute for `npm run test:isolation`)", () => {
  const files = readMigrations();

  it("enables row-level security on every public table and gives documents, reports and red_lines owner-only select, insert, update and delete policies", () => {
    expect(files.length).toBeGreaterThan(0);
    expect(problems(buildSchema(files))).toEqual([]);
  });

  it("would fail if a migration dropped its enable row level security line", () => {
    const withoutRls = files.map((f) => ({
      ...f,
      sql: f.sql.replace(/alter table public\.reports enable row level security;/, ""),
    }));
    expect(problems(buildSchema(withoutRls))).toEqual(['public.reports has no "enable row level security"']);
  });

  it("would fail if a later migration disabled row-level security", () => {
    const disabled = [...files, { name: "zz.sql", sql: "alter table public.red_lines disable row level security;" }];
    expect(problems(buildSchema(disabled))).toEqual(['public.red_lines has no "enable row level security"']);
  });

  it("would fail if a policy stopped checking auth.uid()", () => {
    const loosened = files.map((f) => ({
      ...f,
      sql: f.sql.replace(
        /(create policy "documents_delete_own"[^;]*using \()user_id = \(select auth\.uid\(\)\)/,
        "$1true",
      ),
    }));
    expect(problems(buildSchema(loosened))).toEqual(["public.documents has no delete policy using auth.uid()"]);
  });
});
