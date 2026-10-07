import { getSupabaseClient } from "../lib/supabase/client.js";

// Identity comes from Supabase Auth; authorization comes from trusted memberships.
export const authService = {
  async signUp(email, password, name, school = null) {
    const { data, error } = await getSupabaseClient().auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name,
          ...(school
            ? {
                onboarding_school_name: school.name,
                onboarding_school_slug: school.slug,
              }
            : {}),
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) throw error;
    return data;
  },
  async signIn(email, password) {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },
  async getCurrentUser() {
    const { data, error } = await getSupabaseClient().auth.getUser();
    if (error?.name === "AuthSessionMissingError") return null;
    if (error) throw error;
    return data.user;
  },
  async signOut() {
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw error;
  },
  onAuthStateChange(callback) {
    return getSupabaseClient().auth.onAuthStateChange(callback).data
      .subscription;
  },
};
