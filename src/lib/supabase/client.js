import { createClient } from "@supabase/supabase-js";
import { readSupabaseConfig } from "./config.js";

let client;
export function getSupabaseConfig() {
  return readSupabaseConfig({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env
      .VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  });
}
export function getSupabaseClient() {
  const config = getSupabaseConfig();
  if (!config.configured)
    throw new Error(
      "Supabase is not configured. Add the project URL and publishable key to .env.local, then restart Vite.",
    );
  client ??= createClient(config.url, config.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      storageKey: "esiayo-supabase-auth",
    },
  });
  return client;
}
