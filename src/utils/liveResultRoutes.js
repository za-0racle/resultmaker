export function liveResultKind(path, role) {
  if (role === "schoolAdmin") {
    if (path === "/school/settings/academic") return "schemes";
    if (path === "/school/settings/grading") return "scales";
    if (path === "/school/settings/templates") return "templates";
    if (/^\/school\/results(?:\/(entry|review|published))?$/.test(path))
      return "results";
  }
  if (
    role === "subjectTeacher" &&
    /^\/teacher\/results(?:\/(entry|submitted))?$/.test(path)
  )
    return "results";
  if (role === "classTeacher" && path === "/class-teacher/results")
    return "results";
  return null;
}
