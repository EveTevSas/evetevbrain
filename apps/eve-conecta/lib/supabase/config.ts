import { z } from "zod";

const supabasePublicConfigSchema = z.object({
  publishableKey: z.string().min(1),
  url: z.string().url()
});

export function getSupabasePublicConfig() {
  const result = supabasePublicConfigSchema.safeParse({
    publishableKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL
  });

  if (!result.success) {
    throw new Error(
      "Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY para usar Supabase."
    );
  }

  return result.data;
}
