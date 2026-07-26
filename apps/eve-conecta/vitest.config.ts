import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Alias local `@/` (equivale al `paths` de tsconfig; vitest no lo lee solo).
      "@": fileURLToPath(new URL(".", import.meta.url))
    }
  },
  test: {
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"]
  }
});
