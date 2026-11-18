import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// `npm run smoke`: runs the adhesion fixture through the REAL analyze with the
// REAL OpenRouter adapter. It costs money, so it is never part of `npm test`.
// Variables already set in the shell win over .env.local, so
// `OPENROUTER_API_KEY= npm run smoke` checks the missing-key path.

const fromFiles = loadEnv("", process.cwd(), "");
for (const [key, value] of Object.entries(fromFiles)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

const missing = ["OPENROUTER_API_KEY", "OPENROUTER_MODEL"].filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `Smoke run not started: ${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} not set. Add ${missing.length === 1 ? "it" : "them"} to .env.local.`,
  );
  process.exit(1);
}

export default defineConfig({
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./tests/support/empty-module.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/smoke/**/*.smoke.ts"],
    environment: "node",
    testTimeout: 300_000,
    // print console output as it comes, not just on failure
    silent: false,
  },
});
