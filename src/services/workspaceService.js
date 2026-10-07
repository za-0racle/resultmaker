import { getSupabaseClient } from "../lib/supabase/client.js";

async function unwrap(request) {
  const { data, error } = await request;
  if (error) throw error;
  return data;
}
export const workspaceService = {
  registerSchool: (name, slug) =>
    unwrap(
      getSupabaseClient().rpc("register_my_school", {
        school_name: name,
        school_slug: slug,
      }),
    ),
  async load(workspace) {
    const client = getSupabaseClient();
    if (workspace.role === "superAdmin")
      return {
        schools: await unwrap(
          client.from("schools").select("id,name,slug,status,archived_at").is("archived_at", null).order("name"),
        ),
      };
    const schoolId = workspace.schoolId;
    const [classes, subjects, assignments] = await Promise.all([
      unwrap(
        client
          .from("school_classes")
          .select("id,name")
          .eq("school_id", schoolId)
          .order("name"),
      ),
      unwrap(
        client
          .from("school_subjects")
          .select("id,name")
          .eq("school_id", schoolId)
          .order("name"),
      ),
      unwrap(
        client
          .from("teacher_assignments")
          .select("id,user_id,role,class_id,subject_id")
          .eq("school_id", schoolId),
      ),
    ]);
    if (workspace.role === "schoolAdmin") {
      const teachers = await unwrap(
        client.rpc("list_school_teacher_accounts", {
          requested_school: schoolId,
        }),
      );
      return { classes, subjects, assignments, teachers };
    }
    const role =
      workspace.role === "classTeacher" ? "class_teacher" : "subject_teacher";
    const scopedAssignments = assignments.filter((item) => item.role === role);
    return {
      assignments: scopedAssignments,
      classes: classes.filter((item) =>
        scopedAssignments.some((assignment) => assignment.class_id === item.id),
      ),
      subjects: subjects.filter((item) =>
        scopedAssignments.some(
          (assignment) => assignment.subject_id === item.id,
        ),
      ),
    };
  },
  createItem: (schoolId, kind, name) =>
    unwrap(
      getSupabaseClient().rpc("create_school_catalog_item", {
        requested_school: schoolId,
        item_kind: kind,
        item_name: name,
      }),
    ),
  assignTeacher: (schoolId, email, role, classId, subjectId) =>
    unwrap(
      getSupabaseClient().rpc("assign_school_teacher", {
        requested_school: schoolId,
        teacher_email: email,
        teacher_role: role,
        requested_class: classId,
        requested_subject: subjectId,
      }),
    ),
  removeAssignment: (id) =>
    unwrap(
      getSupabaseClient().rpc("remove_teacher_assignment", {
        requested_assignment: id,
      }),
    ),
  setSchoolStatus: (id, status) =>
    unwrap(
      getSupabaseClient().rpc("platform_set_school_status", {
        requested_school: id,
        requested_status: status,
      }),
    ),
  removeSchool: (id) =>
    unwrap(
      getSupabaseClient().rpc("platform_remove_school", {
        requested_school: id,
      }),
    ),
  createSchool: (name, slug, email) =>
    unwrap(
      getSupabaseClient().rpc("platform_create_school", {
        school_name: name,
        school_slug: slug,
        administrator_email: email,
      }),
    ),
};
