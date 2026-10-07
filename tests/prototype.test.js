import test from "node:test";
import assert from "node:assert/strict";
globalThis.window = { location: { hostname: "localhost" } };
globalThis.document = { dispatchEvent() {} };
globalThis.CustomEvent = class {
  constructor(type, init) {
    this.type = type;
    this.detail = init.detail;
  }
};
const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) || null,
  setItem: (key, value) => store.set(key, value),
};
const { context } = await import("../src/app/context.js");
const { state } = await import("../src/app/state.js");
const { studentService } = await import("../src/services/studentService.js");
const { getTenantFromHostname } = await import("../src/utils/helpers.js");
const { gradeScore } = await import("../src/utils/formatters.js");
const { defaultGrading } = await import("../src/utils/constants.js");
const { validScore } = await import("../src/utils/validators.js");
const { routes, matchRoute } = await import("../src/app/router.js");
const { getResultConfiguration, validateAssessmentComponents } =
  await import("../src/data/resultConfiguration.js");
const { getMockResultReport } =
  await import("../src/services/resultReportService.js");
const { ResultReportPreview } =
  await import("../src/components/reports/ResultReportPreview.js");

test("school assessment configuration validates totals and stays independent", () => {
  const first = getResultConfiguration(context.school);
  first.assessments[0].label = "Custom test";
  assert.equal(
    getResultConfiguration(context.school).assessments[0].label,
    "CA 1",
  );
  assert.equal(
    validateAssessmentComponents([
      { key: "test", label: "Test", max: 30 },
      { key: "exam", label: "Exam", max: 70 },
    ]),
    null,
  );
  assert.ok(
    validateAssessmentComponents([
      { key: "test", label: "Test", max: 20 },
      { key: "exam", label: "Exam", max: 70 },
    ]),
  );
  assert.ok(
    validateAssessmentComponents([
      { key: "test", label: "Test", max: 30 },
      { key: "exam", label: "Test", max: 70 },
    ]),
  );
});

test("report composes configurable sections and escapes editable content", () => {
  const report = getMockResultReport(state.students[0].id);
  assert.equal(report.school.id, context.school.id);
  assert.equal(report.academicResults.length > 0, true);
  assert.equal(report.configuration.assessments.length, 4);
  const preview = ResultReportPreview(report);
  for (const title of [
    "Grade key",
    "Affective domain",
    "Psychomotor domain",
    "Rating key",
    "Attendance",
    "Comments",
    "Administrative approval",
  ])
    assert.ok(preview.includes(title), title);
  report.configuration.sections.affective = false;
  report.configuration.reportTitle = "<img src=x onerror=alert(1)>";
  const customized = ResultReportPreview(report);
  assert.equal(customized.includes("Affective domain"), false);
  assert.ok(customized.includes("&lt;img"));
  assert.equal(customized.includes("<img"), false);
  assert.ok(customized.includes("DEMO-"));
});

test("seed quantities and tenant ownership are consistent", () => {
  for (const [collection, count] of Object.entries({
    schools: 1,
    students: 20,
    teachers: 10,
    classes: 6,
    subjects: 10,
    sessions: 1,
    terms: 3,
    results: 18,
  }))
    assert.equal(state[collection].length, count, collection);
  for (const key of [
    "students",
    "teachers",
    "classes",
    "subjects",
    "sessions",
    "terms",
    "results",
  ])
    for (const row of state[key]) {
      assert.equal(row.schoolId, context.school.id);
      assert.match(
        row.id,
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    }
});
test("hostname parser produces a hint and handles development/apex hosts", () => {
  assert.deepEqual(getTenantFromHostname("goshen.resultmaker.com"), {
    slug: "goshen",
  });
  assert.deepEqual(getTenantFromHostname("localhost", "demo-school"), {
    slug: "demo-school",
    development: true,
  });
  assert.equal(getTenantFromHostname("resultmaker.com").slug, null);
  assert.equal(getTenantFromHostname("www.resultmaker.com").slug, null);
  assert.equal(getTenantFromHostname("goshen.attacker.com").slug, null);
});
test("grading boundaries map correctly and are configurable", () => {
  for (const [score, grade] of [
    [0, "F"],
    [39, "F"],
    [40, "D"],
    [49, "D"],
    [50, "C"],
    [59, "C"],
    [60, "B"],
    [69, "B"],
    [70, "A"],
    [100, "A"],
  ])
    assert.equal(gradeScore(score, defaultGrading).grade, grade);
  assert.equal(
    gradeScore(80, [{ min: 0, max: 100, grade: "Pass", remark: "Custom" }])
      .grade,
    "Pass",
  );
});

test("score limits reject missing, negative, fractional and oversized values", () => {
  assert.equal(validScore("", 10), false);
  assert.equal(validScore(-1, 10), false);
  assert.equal(validScore(11, 10), false);
  assert.equal(validScore(5.5, 10), false);
  assert.equal(validScore("invalid", 10), false);
  assert.equal(validScore(0, 10), true);
  assert.equal(validScore(10, 10), true);
  assert.equal(validScore(70, 70), true);
});
test("required routes match with detail parameters and static import precedence", () => {
  assert.equal(routes.length, 50);
  for (const item of routes)
    assert.ok(matchRoute(item.path.replace(":id", "example-uuid")), item.path);
  assert.equal(matchRoute("/school/students/import").kind, "import");
  assert.equal(
    matchRoute("/school/students/example-uuid").params.id,
    "example-uuid",
  );
  assert.equal(matchRoute("/school/dashboard/").scope, "school");
  assert.equal(matchRoute("/does-not-exist"), null);
});
test("mock service isolates tenants, protects identity, and returns copies", async () => {
  const first = (await studentService.getStudents())[0],
    originalSchool = context.school;
  first.name = "Changed copy";
  assert.notEqual(
    (await studentService.getStudentById(first.id)).name,
    first.name,
  );
  const created = await studentService.createStudent({
    name: "Test student",
    admissionNumber: "TEST-001",
    classId: state.classes[0].id,
    schoolId: "forged",
    id: "forged",
  });
  assert.equal(created.schoolId, originalSchool.id);
  assert.notEqual(created.id, "forged");
  await studentService.updateStudent(created.id, {
    name: "Updated",
    schoolId: "forged",
    id: "forged",
  });
  assert.equal(
    (await studentService.getStudentById(created.id)).schoolId,
    originalSchool.id,
  );
  assert.equal(
    (await studentService.getStudentById(created.id)).name,
    "Updated",
  );
  context.school = { id: "different-school" };
  try {
    assert.equal((await studentService.getStudents()).length, 0);
    assert.equal(await studentService.getStudentById(created.id), null);
    await assert.rejects(
      studentService.updateStudent(created.id, { name: "Blocked" }),
    );
  } finally {
    context.school = originalSchool;
    state.students.splice(
      state.students.findIndex((s) => s.id === created.id),
      1,
    );
  }
});
