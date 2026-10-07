import { context } from "../app/context.js";
import { state } from "../app/state.js";
import { getResultConfiguration } from "../data/resultConfiguration.js";
import { defaultGrading } from "../utils/constants.js";
import { gradeScore } from "../utils/formatters.js";

// The same report view model can be consumed by a future PDF renderer.
export function getMockResultReport(studentId) {
  const school = context.school;
  const students = state.students.filter((s) => s.schoolId === school.id);
  const student = students.find((s) => s.id === studentId) || students[0];
  if (!student) return null;
  const configuration = getResultConfiguration(school);
  const grading = school.grading || defaultGrading;
  const academicResults = state.subjects
    .filter(
      (s) => s.schoolId === school.id && s.classIds.includes(student.classId),
    )
    .slice(0, 8)
    .map((subject, index) => {
      const assessments = configuration.assessments.map((c) => ({
        key: c.key,
        score: Math.round(c.max * (0.72 + (index % 5) * 0.04)),
      }));
      const total = assessments.reduce((sum, c) => sum + c.score, 0);
      return {
        subject: subject.name,
        assessments,
        total,
        ...gradeScore(total, grading),
      };
    });
  const average = academicResults.length
    ? Math.round(
        academicResults.reduce((sum, r) => sum + r.total, 0) /
          academicResults.length,
      )
    : null;
  const assignedClass = state.classes.find(
    (c) => c.schoolId === school.id && c.id === student.classId,
  );
  return {
    school,
    student,
    configuration,
    grading,
    academicResults,
    session: context.academicSession.name,
    term: context.term.name,
    className: assignedClass?.name || "Unassigned",
    numberInClass: students.filter((s) => s.classId === student.classId).length,
    average,
    grade: average === null ? "—" : gradeScore(average, grading).grade,
    position: null,
    affectiveRatings: configuration.affectiveItems.map((label) => ({
      label,
      rating: null,
    })),
    psychomotorRatings: configuration.psychomotorItems.map((label) => ({
      label,
      rating: null,
    })),
    attendance: { present: null, possible: null },
    classTeacher:
      state.teachers.find(
        (t) => t.schoolId === school.id && t.id === assignedClass?.teacherId,
      )?.name || "Not assigned",
    teacherComment:
      state.comments[school.id]?.[student.id] ||
      "Shows a positive attitude to learning. Keep building on this progress.",
    principalComment: "A promising performance. Keep aiming higher.",
    publicationStatus: "Sample preview",
    reportId: `DEMO-${student.admissionNumber}`,
    date: null,
    isSample: true,
  };
}
