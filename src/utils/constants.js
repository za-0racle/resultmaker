export const roles = {
  superAdmin: "Super Admin",
  schoolAdmin: "School Admin",
  subjectTeacher: "Subject Teacher",
  classTeacher: "Class Teacher",
};
export const resultStatuses = [
  "Draft",
  "Submitted",
  "Under Review",
  "Approved",
  "Published",
];
export const scoreComponents = [
  { key: "ca1", label: "CA 1", max: 10 },
  { key: "ca2", label: "CA 2", max: 10 },
  { key: "assignment", label: "Assignment", max: 10 },
  { key: "exam", label: "Exam", max: 70 },
];
export const defaultGrading = [
  { min: 70, max: 100, grade: "A", remark: "Excellent" },
  { min: 60, max: 69, grade: "B", remark: "Very Good" },
  { min: 50, max: 59, grade: "C", remark: "Good" },
  { min: 40, max: 49, grade: "D", remark: "Fair" },
  { min: 0, max: 39, grade: "F", remark: "Needs improvement" },
];
