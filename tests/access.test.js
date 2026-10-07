import test from "node:test";
import assert from "node:assert/strict";
import {
  allowedWorkspace,
  canAccessScope,
  roleWorkspaces,
} from "../src/app/access.js";
test("workspace selection requires the exact assigned school and role", () => {
  const assigned = [
    { schoolId: "a", role: "schoolAdmin" },
    { schoolId: "b", role: "subjectTeacher" },
  ];
  assert.equal(allowedWorkspace(assigned, "a:schoolAdmin"), assigned[0]);
  assert.equal(allowedWorkspace(assigned, "b:schoolAdmin"), null);
  assert.equal(allowedWorkspace(assigned, "platform:superAdmin"), null);
  assert.equal(allowedWorkspace([], "a:schoolAdmin"), null);
});
test("each role is restricted to its workspace scope", () => {
  for (const [role, workspace] of Object.entries(roleWorkspaces)) {
    for (const other of Object.values(roleWorkspaces)) {
      assert.equal(
        canAccessScope({ role }, other.scope),
        workspace.scope === other.scope,
      );
    }
  }
  assert.equal(canAccessScope(null, "school"), false);
  assert.equal(canAccessScope({ role: "forged" }, "platform"), false);
});
