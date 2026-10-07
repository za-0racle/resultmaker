export const roleWorkspaces = {
  superAdmin: {
    label: "Platform Administrator",
    scope: "platform",
    home: "/platform",
  },
  schoolAdmin: {
    label: "School Administrator",
    scope: "school",
    home: "/school/dashboard",
  },
  subjectTeacher: {
    label: "Subject Teacher",
    scope: "teacher",
    home: "/teacher/dashboard",
  },
  classTeacher: {
    label: "Class Teacher",
    scope: "class-teacher",
    home: "/class-teacher/dashboard",
  },
  student: { label: "Student", scope: "student", home: "/student/dashboard" },
  parent: { label: "Parent", scope: "parent", home: "/parent/dashboard" },
};
export const workspaceKey = (workspace) =>
  `${workspace.schoolId || "platform"}:${workspace.role}`;
export function allowedWorkspace(workspaces, key) {
  return (
    workspaces.find((workspace) => workspaceKey(workspace) === key) || null
  );
}
export function canAccessScope(workspace, scope) {
  return Boolean(workspace && roleWorkspaces[workspace.role]?.scope === scope);
}
