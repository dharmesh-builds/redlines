import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Main suite: runs without any key. The model is always a scripted adapter.
export default defineConfig({
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./tests/support/empty-module.ts", import.meta.url)),
    },
  },
  test: {
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/.next/**"],
    environment: "node",
  },
});
