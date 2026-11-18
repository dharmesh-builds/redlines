import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// `npm run test:isolation`: per-user isolation against a REAL Supabase
// instance (local stack or a dedicated test project). Never part of `npm test`.
// Reads test-only variables from the shell or .env.local; shell values win.
// See supabase/README.md for how to get them.

const fromFiles = loadEnv("", process.cwd(), "");
for (const [key, value] of Object.entries(fromFiles)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

const REQUIRED = ["SUPABASE_TEST_URL", "SUPABASE_TEST_ANON_KEY", "SUPABASE_TEST_SERVICE_ROLE_KEY"] as const;

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    [
      `Isolation tests not run: ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} not set.`,
      "",
      "These tests need a real Supabase instance with the migrations and supabase/seed.sql applied.",
      "Either:",
      "  1. Local stack (needs Docker): `npx supabase start`, then copy the printed values:",
      "       SUPABASE_TEST_URL              = API URL (http://127.0.0.1:54321)",
      "       SUPABASE_TEST_ANON_KEY         = anon / publishable key",
      "       SUPABASE_TEST_SERVICE_ROLE_KEY = service_role / secret key",
      "  2. A dedicated, throwaway test project (never production): its URL, anon key and",
      "     service-role key, with the migrations and supabase/seed.sql run in its SQL editor.",
      "",
      "Put them in .env.local or the shell. Never prefix them with NEXT_PUBLIC_.",
      "Details: supabase/README.md",
    ].join("\n"),
  );
  process.exit(1);
}

// The suite creates and deletes users. Refuse to point it at the app's own
// project unless that project is the local stack.
const testUrl = process.env.SUPABASE_TEST_URL!;
const appUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(testUrl);
if (!isLocal && appUrl && testUrl.replace(/\/+$/, "") === appUrl.replace(/\/+$/, "")) {
  console.error(
    "Isolation tests not run: SUPABASE_TEST_URL is the same project as NEXT_PUBLIC_SUPABASE_URL.\n" +
      "Use the local stack or a separate test project. The suite creates and deletes users.",
  );
  process.exit(1);
}

export default defineConfig({
  test: {
    include: ["tests/isolation/**/*.isolation.ts"],
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
