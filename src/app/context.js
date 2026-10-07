import { school, academicSession, terms, teachers } from "../data/mockData.js";
import { state } from "./state.js";
import { getTenantFromHostname } from "../utils/helpers.js";
export const context = {
  user: { id: teachers[9].id, name: "Alex Morgan" },
  school: state.schools.find((s) => s.id === school.id),
  role: "schoolAdmin",
  academicSession,
  term: terms[0],
  tenant: getTenantFromHostname(),
  assignedClassId: state.classes[4].id,
  assignedSubjectId: state.subjects[0].id,
};
export function setContext(patch) {
  Object.assign(context, patch);
  document.dispatchEvent(new CustomEvent("contextchange", { detail: context }));
}
export function setRole(role) {
  setContext({
    role,
    user:
      role === "schoolAdmin" || role === "superAdmin"
        ? { id: teachers[9].id, name: "Alex Morgan" }
        : role === "classTeacher"
          ? { id: teachers[4].id, name: teachers[4].name }
          : { id: teachers[0].id, name: teachers[0].name },
  });
}
