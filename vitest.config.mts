import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Let unit tests import modules marked `server-only` (Next's marker throws
    // outside a request scope); stub it with an empty module.
    alias: {
      "server-only": fileURLToPath(new URL("./src/lib/__test-stubs__/empty.ts", import.meta.url)),
    },
  },
});
