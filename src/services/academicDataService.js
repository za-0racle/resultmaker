import { getSupabaseClient } from "../lib/supabase/client.js";

export function mapDatabaseRow(row) {
  if (Array.isArray(row)) return row.map(mapDatabaseRow);
  if (!row || typeof row !== "object") return row;
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
      value,
    ]),
  );
}

async function read(request) {
  const { data, error } = await request;
  if (error) throw error;
  return mapDatabaseRow(data);
}

// Explicit opt-in adapters. Existing prototype services remain unchanged.
export function createAcademicDataService(client = getSupabaseClient()) {
  const list = (table, schoolId, columns = "*") =>
    read(client.from(table).select(columns).eq("school_id", schoolId));
  const tables = {
    sessions: "academic_sessions",
    terms: "academic_terms",
    students: "students",
    enrollments: "student_enrollments",
    sections: "school_sections",
    classes: "school_classes",
    subjects: "school_subjects",
  };
  const allowed = {
    sessions: ["name", "startsOn", "endsOn", "status"],
    terms: ["name", "sessionId", "sortOrder", "startsOn", "endsOn", "status"],
    sections: ["name", "code", "status"],
    classes: ["name", "sectionId", "code", "status"],
    subjects: ["name", "sectionId", "code", "status"],
    students: [
      "admissionNumber",
      "firstName",
      "middleName",
      "lastName",
      "gender",
      "dateOfBirth",
      "classId",
      "status",
    ],
    enrollments: ["studentId", "classId", "sessionId", "status"],
  };
  const payload = (kind, schoolId, values) => ({
    school_id: schoolId,
    ...Object.fromEntries(
      allowed[kind]
        .filter((key) => Object.hasOwn(values, key))
        .map((key) => [
          key.replace(/[A-Z]/g, (letter) => "_" + letter.toLowerCase()),
          values[key],
        ]),
    ),
  });
  return {
    async save(kind, schoolId, values, id) {
      if (!tables[kind]) throw new Error("Unsupported academic record.");
      if (id && kind === "enrollments")
        throw new Error("Enrollment history cannot be reassigned.");
      if (!schoolId) throw new Error("Choose an assigned school workspace.");
      const data = payload(kind, schoolId, values);
      if (id) {
        delete data.school_id;
        return read(
          client
            .from(tables[kind])
            .update(data)
            .eq("school_id", schoolId)
            .eq("id", id)
            .select("id")
            .single(),
        );
      }
      if (kind === "classes" || kind === "subjects") {
        const created = await read(
          client.rpc("create_school_catalog_item", {
            requested_school: schoolId,
            item_kind: kind === "classes" ? "class" : "subject",
            item_name: values.name,
          }),
        );
        return { id: created };
      }
      return read(client.from(tables[kind]).insert(data).select("id").single());
    },
    classes: (schoolId) => list("school_classes", schoolId),
    subjects: (schoolId) => list("school_subjects", schoolId),
    sections: (schoolId) => list("school_sections", schoolId),
    enrollments: (schoolId) => list("student_enrollments", schoolId),
    sessions: (schoolId) => list("academic_sessions", schoolId),
    terms: (schoolId) => list("academic_terms", schoolId),
    students: (schoolId) => list("students", schoolId),
    teachers: (schoolId) => list("teachers", schoolId),
    assessmentSchemes: (schoolId) => list("assessment_schemes", schoolId),
    gradingScales: (schoolId) => list("grading_scales", schoolId),
    reports: (schoolId) =>
      list(
        "student_results",
        schoolId,
        "id,school_id,enrollment_id,session_id,term_id,class_id,status,version,published_at,template_id",
      ),
    publishedReport: (resultId) =>
      read(client.rpc("get_published_report", { requested_result: resultId })),
    transitionBatch: (batchId, nextStatus) =>
      read(
        client.rpc("transition_result_batch", {
          requested_batch: batchId,
          next_status: nextStatus,
        }),
      ),
    transitionReport: (resultId, nextStatus) =>
      read(
        client.rpc("transition_student_result", {
          requested_result: resultId,
          next_status: nextStatus,
        }),
      ),
  };
}
