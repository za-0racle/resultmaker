import assert from "node:assert/strict";
import { createAcademicDataService } from "../src/services/academicDataService.js";
import {
  LiveAcademic,
  academicKind,
} from "../src/pages/school/LiveAcademic.js";

const calls = [];
const request = {
  then(resolve) {
    return Promise.resolve({ data: { id: "record" }, error: null }).then(
      resolve,
    );
  },
};
for (const method of ["update", "insert", "eq", "select", "single"])
  request[method] = (...args) => {
    calls.push([method, ...args]);
    return request;
  };
const client = {
  from(table) {
    calls.push(["from", table]);
    return request;
  },
  rpc(name, args) {
    calls.push(["rpc", name, args]);
    return Promise.resolve({ data: "class-id", error: null });
  },
};
const service = createAcademicDataService(client);
await service.save(
  "students",
  "school-a",
  {
    firstName: "Ada",
    lastName: "Test",
    admissionNumber: "001",
    schoolId: "school-b",
    userId: "privileged",
  },
  "student-a",
);
assert.deepEqual(calls.find((row) => row[0] === "update")[1], {
  admission_number: "001",
  first_name: "Ada",
  last_name: "Test",
});
assert.ok(
  calls.some(
    (row) => row[0] === "eq" && row[1] === "school_id" && row[2] === "school-a",
  ),
);
assert.ok(
  calls.some(
    (row) => row[0] === "eq" && row[1] === "id" && row[2] === "student-a",
  ),
);
calls.length = 0;
await service.save("terms", "school-a", {
  name: "Term",
  sessionId: "year",
  sortOrder: 1,
});
assert.deepEqual(calls.find((row) => row[0] === "insert")[1], {
  school_id: "school-a",
  name: "Term",
  session_id: "year",
  sort_order: 1,
});
await service.save("classes", "school-a", { name: "Year 1" });
assert.ok(
  calls.some(
    (row) =>
      row[0] === "rpc" &&
      row[1] === "create_school_catalog_item" &&
      row[2].requested_school === "school-a",
  ),
);
await assert.rejects(() =>
  service.save("enrollments", "school-a", {}, "enrollment-a"),
);
assert.equal(academicKind("/school/students/import"), null);
assert.equal(academicKind("/school/students/student-a"), "profile");
assert.equal(academicKind("/teacher/students"), null);
const fixtures = {
  sessions: [{ id: "year", name: "Year" }],
  terms: [],
  classes: [{ id: "class", name: "Year 1" }],
  subjects: [],
  sections: [],
  students: [
    {
      id: "student-a",
      firstName: "<Ada>",
      lastName: "Test",
      admissionNumber: "001",
      classId: "class",
      status: "active",
    },
  ],
  enrollments: [
    {
      studentId: "student-a",
      classId: "class",
      sessionId: "year",
      status: "active",
    },
  ],
};
const reader = Object.fromEntries(
  Object.keys(fixtures).map((key) => [
    key,
    async (schoolId) => {
      assert.equal(schoolId, "school-a");
      return fixtures[key];
    },
  ]),
);
const requested = [];
const measured = Object.fromEntries(
  Object.entries(reader).map(([key, read]) => [
    key,
    async (schoolId) => {
      requested.push(key);
      return read(schoolId);
    },
  ]),
);
await LiveAcademic(
  { schoolId: "school-a" },
  "/school/academic-sessions",
  measured,
);
assert.deepEqual(requested, ["sessions"]);
requested.length = 0;
await LiveAcademic({ schoolId: "school-a" }, "/school/students", measured);
assert.deepEqual(requested, ["students", "classes"]);
const page = await LiveAcademic(
  { schoolId: "school-a" },
  "/school/students",
  reader,
);
assert.ok(page.html.includes("&lt;Ada&gt;"));
assert.ok(!page.html.includes("<Ada>"));
assert.ok(page.html.includes("live-student-search"));
const profile = await LiveAcademic(
  { schoolId: "school-a" },
  "/school/students/student-a",
  reader,
);
assert.ok(profile.html.includes("Enrollment history"));
assert.ok(profile.html.includes("live-enrollment-form"));
const missing = await LiveAcademic(
  { schoolId: "school-a" },
  "/school/students/other-school-id",
  reader,
);
assert.ok(missing.html.includes("Student not found"));
console.log(
  "PASS live academics: scoped writes, payload allowlists, catalog RPC, enrollment history, routes and escaping",
);
