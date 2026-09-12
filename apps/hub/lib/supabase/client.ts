"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "./config";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function getSupabaseBrowserClient() {
  const { publishableKey, url } = getSupabasePublicConfig();
  browserClient ??= createBrowserClient(url, publishableKey);
  return browserClient;
}
