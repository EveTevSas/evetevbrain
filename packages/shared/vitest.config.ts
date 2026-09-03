import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // dist/ lleva los .spec ya compilados: correrlos otra vez duplica los
    // tests y falla al no encontrar sus dependencias de desarrollo.
    exclude: ["dist/**", "node_modules/**"]
  }
});
