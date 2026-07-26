import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // En tests usamos la fuente de @evetev/shared (no requiere el build dist).
      "@evetev/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url))
    }
  },
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"]
  }
});
