// Config ESLint base compartida (flat config, ESLint 9) — §8.
// TypeScript en modo estricto; nada de `any` sin justificación (§3).
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/.next/**", "**/out/**", "**/coverage/**", "**/node_modules/**"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ]
    }
  }
);
