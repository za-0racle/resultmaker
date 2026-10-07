import { getSupabaseClient } from "../lib/supabase/client.js";
import { authService } from "./authService.js";

const roleNames = {
  school_admin: "schoolAdmin",
  subject_teacher: "subjectTeacher",
  class_teacher: "classTeacher",
  student: "student",
  parent: "parent",
};
export const membershipService = {
  async getMyMemberships(knownUser) {
    const user = knownUser || (await authService.getCurrentUser());
    if (!user) return [];
    const { data, error } = await getSupabaseClient()
      .from("school_memberships")
      .select("school_id, role, status, school:schools(id, name, slug, status)")
      .eq("user_id", user.id)
      .eq("status", "active");
    if (error) throw error;
    return data
      .filter((row) => row.school?.status === "active")
      .map((row) => ({
        schoolId: row.school_id,
        role: roleNames[row.role],
        school: row.school,
      }));
  },
};
