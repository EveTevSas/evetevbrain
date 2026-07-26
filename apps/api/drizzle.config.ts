import { defineConfig } from "drizzle-kit";

// Config para drizzle-kit (generate/push) contra Supabase.
// DATABASE_URL debe apuntar a un rol que respete RLS (ver supabase/README.md).
export default defineConfig({
  schema: "./src/database/schema.ts",
  out: "../../supabase/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? ""
  },
  schemaFilter: ["identity", "evepay"]
});
