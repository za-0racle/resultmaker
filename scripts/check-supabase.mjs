import { readFile } from "node:fs/promises";
import { readSupabaseConfig } from "../src/lib/supabase/config.js";

async function loadEnv(file) {
  try {
    const text = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    return Object.fromEntries(
      text.split(/\r?\n/).flatMap((line) => {
        const match = line.match(
          /^\s*(?:export\s+)?(VITE_SUPABASE_(?:URL|PUBLISHABLE_KEY|ANON_KEY))\s*=\s*(.*?)\s*$/,
        );
        if (!match) return [];
        let value = match[2];
        if (/^["']/.test(value)) value = value.slice(1, -1);
        else value = value.replace(/\s+#.*$/, "");
        return [[match[1], value]];
      }),
    );
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

try {
  const config = readSupabaseConfig({
    ...(await loadEnv(".env")),
    ...(await loadEnv(".env.local")),
    ...process.env,
  });
  if (!config.configured)
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env.local and set the real project URL and publishable key.",
    );
  const response = await fetch(`${config.url}/auth/v1/settings`, {
    headers: { apikey: config.key },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      `Supabase Auth connection failed (HTTP ${response.status}). Check the project URL, publishable key and project status.`,
    );
  const settings = await response.json();
  if (!settings || typeof settings !== "object" || !settings.external)
    throw new Error(
      "The server did not return the expected Supabase Auth settings.",
    );
  console.log(
    "Supabase Auth endpoint is reachable with the configured public key.",
  );
  console.log(
    "This read-only check does not verify that migrations, RLS or school memberships have been applied.",
  );
} catch (error) {
  console.error(
    error.name === "TimeoutError"
      ? "Supabase connection timed out. Check your network and project status."
      : error.message,
  );
  process.exitCode = 1;
}
