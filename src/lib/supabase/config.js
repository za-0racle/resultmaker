export function readSupabaseConfig(environment) {
  const url = String(environment.VITE_SUPABASE_URL || "").trim();
  const key = String(
    environment.VITE_SUPABASE_PUBLISHABLE_KEY ||
      environment.VITE_SUPABASE_ANON_KEY ||
      "",
  ).trim();
  if (!url && !key) return { configured: false, url: null, key: null };
  if (!url || !key)
    throw new Error(
      "Set both VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.",
    );
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("VITE_SUPABASE_URL must be a valid project URL.");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  if (
    (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    !["", "/"].includes(parsed.pathname)
  )
    throw new Error(
      "Use the project URL without credentials, API paths, query parameters or fragments. HTTPS is required except for local development.",
    );
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    let role;
    try {
      const parts = key.split(".");
      if (parts.length !== 3) throw new Error("Not a legacy key");
      const payload = parts[1].replaceAll("-", "+").replaceAll("_", "/");
      role = JSON.parse(
        atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "=")),
      ).role;
    } catch {
      throw new Error(
        "Use a Supabase publishable key or legacy anon key. Secret and service-role keys must never be used in the frontend.",
      );
    }
    if (role !== "anon")
      throw new Error(
        "Only a publishable key or legacy anon key may be used in the frontend.",
      );
  }
  return { configured: true, url: parsed.origin, key };
}
