import assert from "node:assert/strict";
import { createLiveResultService } from "../src/services/liveResultService.js";
import {
  LiveResults,
  liveResultKind,
} from "../src/pages/results/LiveResults.js";
const calls = [];
const query = {
  then(resolve) {
    return Promise.resolve({ data: { id: "new" }, error: null }).then(resolve);
  },
};
for (const method of ["select", "eq", "in", "insert", "update", "single"])
  query[method] = (...args) => {
    calls.push([method, ...args]);
    return query;
  };
const service = createLiveResultService({
  from(table) {
    calls.push(["from", table]);
    return query;
  },
  rpc(name, args) {
    calls.push(["rpc", name, args]);
    return Promise.resolve({ data: null, error: null });
  },
});
await service.create("batches", "school-a", {
  offeringId: "offer",
  sessionId: "year",
  termId: "term",
  classId: "class",
  assessmentSchemeId: "scheme",
  gradingScaleId: "scale",
  status: "published",
  schoolId: "other",
});
const payload = calls.find((row) => row[0] === "insert")[1];
assert.equal(payload.school_id, "school-a");
assert.equal(payload.offering_id, "offer");
assert.equal(payload.status, undefined);
calls.length = 0;
await service.transition("batches", "batch", "submitted");
assert.deepEqual(calls[0], [
  "rpc",
  "transition_result_batch",
  { requested_batch: "batch", next_status: "submitted" },
]);
calls.length = 0;
await assert.rejects(() =>
  service.saveScores(
    "school-a",
    { id: "academic", assessmentSchemeId: "scheme" },
    [{ id: "c", name: "Test", maxScore: 10 }],
    { c: 11 },
    [],
  ),
);
assert.equal(calls.length, 0);
await service.saveScores(
  "school-a",
  { id: "academic", assessmentSchemeId: "scheme" },
  [{ id: "c", name: "Test", maxScore: 10 }],
  { c: 8 },
  [{ id: "score", componentId: "c", academicResultId: "academic" }],
);
assert.deepEqual(calls.find((row) => row[0] === "update")[1], { score: 8 });
assert.ok(
  calls.some(
    (row) => row[0] === "eq" && row[1] === "school_id" && row[2] === "school-a",
  ),
);
assert.equal(
  liveResultKind("/school/settings/grading", "subjectTeacher"),
  null,
);
assert.equal(
  liveResultKind("/teacher/results/entry", "subjectTeacher"),
  "results",
);
assert.equal(
  liveResultKind("/class-teacher/results", "classTeacher"),
  "results",
);
let requested = [];
const fixtures = {
  schemes: [{ id: "scheme", name: "<Custom>", version: 1, status: "draft" }],
  components: [],
  scales: [],
  bands: [],
  templates: [],
  batches: [
    {
      id: "batch",
      offeringId: "offer",
      classId: "class",
      termId: "term",
      version: 1,
      status: "draft",
    },
  ],
  reports: [],
  offerings: [{ id: "offer", subjectId: "subject" }],
  classes: [{ id: "class", name: "Year 1" }],
  subjects: [{ id: "subject", name: "Math" }],
  sessions: [],
  terms: [{ id: "term", name: "Term" }],
};
const reader = {
  async list(kind, school) {
    assert.equal(school, "school-a");
    requested.push(kind);
    return fixtures[kind];
  },
};
const configuration = await LiveResults(
  { role: "schoolAdmin", schoolId: "school-a" },
  "/school/settings/academic",
  reader,
);
assert.deepEqual(requested, ["schemes", "components"]);
assert.ok(configuration.html.includes("&lt;Custom&gt;"));
requested = [];
const teacher = await LiveResults(
  { role: "subjectTeacher", schoolId: "school-a" },
  "/teacher/results/entry",
  reader,
);
assert.ok(teacher.html.includes("Enter scores"));
assert.ok(!teacher.html.includes("Configure class subject"));
assert.ok(!teacher.html.includes("Add student"));
assert.ok(teacher.html.includes("Submit"));
fixtures.batches[0].status = "published";
const locked = await LiveResults(
  { role: "subjectTeacher", schoolId: "school-a" },
  "/teacher/results/submitted",
  reader,
);
assert.ok(!locked.html.includes("Enter scores"));
console.log(
  "PASS live results: scoped writes, workflow RPC, score validation, role routing, locked publication and configuration requests",
);
