import { getSupabaseClient } from "../lib/supabase/client.js";
import { mapDatabaseRow } from "./academicDataService.js";

const tables = {
  schemes: "assessment_schemes",
  components: "assessment_components",
  scales: "grading_scales",
  bands: "grading_scale_items",
  offerings: "subject_offerings",
  batches: "result_batches",
  reports: "student_results",
  academics: "academic_results",
  scores: "assessment_scores",
  templates: "result_templates",
  enrollments: "student_enrollments",
  students: "students",
  classes: "school_classes",
  subjects: "school_subjects",
  sessions: "academic_sessions",
  terms: "academic_terms",
};
const fields = {
  schemes: ["name", "version"],
  components: ["schemeId", "name", "maxScore", "weight", "sortOrder", "active"],
  scales: ["name", "version"],
  bands: ["scaleId", "minimumScore", "maximumScore", "grade", "remark"],
  offerings: [
    "sessionId",
    "classId",
    "subjectId",
    "assessmentSchemeId",
    "gradingScaleId",
  ],
  batches: [
    "offeringId",
    "sessionId",
    "termId",
    "classId",
    "assessmentSchemeId",
    "gradingScaleId",
  ],
  reports: ["enrollmentId", "sessionId", "termId", "classId", "templateId"],
  academics: [
    "studentResultId",
    "batchId",
    "sessionId",
    "termId",
    "classId",
    "assessmentSchemeId",
  ],
  templates: ["name", "version"],
};
const snake = (key) => key.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const reportColumns =
  "id,school_id,enrollment_id,session_id,term_id,class_id,status,version,published_at,template_id";
export function createLiveResultService(client = getSupabaseClient()) {
  async function read(request) {
    const { data, error } = await request;
    if (error) throw error;
    return mapDatabaseRow(data);
  }
  return {
    list(kind, schoolId, filters = {}) {
      if (!tables[kind] || !schoolId) throw Error("Choose a school workspace.");
      let query = client
        .from(tables[kind])
        .select(
          kind === "reports"
            ? reportColumns +
                ",enrollment:student_enrollments(student:students(first_name,last_name,admission_number))"
            : "*",
        )
        .eq("school_id", schoolId);
      for (const [key, value] of Object.entries(filters)) {
        if (
          ![
            "id",
            "batchId",
            "schemeId",
            "academicResultId",
            "studentResultId",
            "classId",
            "sessionId",
            "status",
          ].includes(key)
        )
          throw Error("Unsupported result filter.");
        if (Array.isArray(value) && !value.length) return Promise.resolve([]);
        query = Array.isArray(value)
          ? query.in(snake(key), value)
          : query.eq(snake(key), value);
      }
      return read(query);
    },
    create(kind, schoolId, values) {
      if (!fields[kind] || !schoolId) throw Error("Unsupported result record.");
      const payload = {
        school_id: schoolId,
        ...Object.fromEntries(
          fields[kind]
            .filter((k) => Object.hasOwn(values, k))
            .map((k) => [snake(k), values[k]]),
        ),
      };
      return read(
        client.from(tables[kind]).insert(payload).select("id").single(),
      );
    },
    editConfiguration(kind, schoolId, id, values) {
      if (!["components", "bands"].includes(kind))
        throw Error("Unsupported configuration edit.");
      const payload = Object.fromEntries(
        fields[kind]
          .filter(
            (k) =>
              Object.hasOwn(values, k) && !["schemeId", "scaleId"].includes(k),
          )
          .map((k) => [snake(k), values[k]]),
      );
      return read(
        client
          .from(tables[kind])
          .update(payload)
          .eq("school_id", schoolId)
          .eq("id", id)
          .select("id")
          .single(),
      );
    },
    activate(kind, schoolId, id) {
      if (!["schemes", "scales", "templates"].includes(kind))
        throw Error("Unsupported configuration.");
      return read(
        client
          .from(tables[kind])
          .update({ status: "active" })
          .eq("school_id", schoolId)
          .eq("id", id)
          .select("id")
          .single(),
      );
    },
    async saveScores(schoolId, academic, components, values, existing) {
      for (const component of components) {
        const value = values[component.id];
        if (value === "" || value == null) continue;
        const score = Number(value);
        if (
          !Number.isFinite(score) ||
          score < 0 ||
          score > Number(component.maxScore)
        )
          throw Error(
            `Enter a score from 0 to ${component.maxScore} for ${component.name}.`,
          );
      }
      for (const component of components) {
        const value = values[component.id];
        if (value === "" || value == null) continue;
        const old = existing.find(
          (row) =>
            row.academicResultId === academic.id &&
            row.componentId === component.id,
        );
        if (old)
          await read(
            client
              .from("assessment_scores")
              .update({ score: Number(value) })
              .eq("school_id", schoolId)
              .eq("id", old.id)
              .select("id")
              .single(),
          );
        else
          await read(
            client
              .from("assessment_scores")
              .insert({
                school_id: schoolId,
                academic_result_id: academic.id,
                assessment_scheme_id: academic.assessmentSchemeId,
                component_id: component.id,
                score: Number(value),
              })
              .select("id")
              .single(),
          );
      }
    },
    transition(kind, id, status) {
      if (!["batches", "reports"].includes(kind))
        throw Error("Unsupported workflow.");
      return read(
        client.rpc(
          kind === "batches"
            ? "transition_result_batch"
            : "transition_student_result",
          {
            [kind === "batches" ? "requested_batch" : "requested_result"]: id,
            next_status: status,
          },
        ),
      );
    },
    calculation: (id) =>
      read(client.rpc("calculate_academic_result", { requested_result: id })),
    publishedReport: (id) =>
      read(client.rpc("get_published_report", { requested_result: id })),
  };
}
