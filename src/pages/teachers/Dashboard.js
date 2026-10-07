import { context } from "../../app/context.js";
import { state, persist } from "../../app/state.js";
import { pageHeader, schoolRows, className, subjectName } from "../shared.js";
import { Card, CardHeader } from "../../components/Card.js";
import { Table } from "../../components/Table.js";
import { Button } from "../../components/Button.js";
import { toast } from "../../components/Toast.js";
import { escapeHtml } from "../../utils/helpers.js";
export function TeacherDashboard(classTeacher = false) {
  const students = schoolRows("students").filter(
      (s) => s.classId === context.assignedClassId,
    ),
    results = schoolRows("results").filter(
      (r) => r.classId === context.assignedClassId,
    ),
    avg = Math.round(
      results.reduce((a, r) => a + r.completion, 0) / (results.length || 1),
    );
  return `${pageHeader(classTeacher ? "Your class, at a glance" : "Your teaching workspace", `Welcome, ${context.user.name}. Every learner’s progress starts with you.`, Button(classTeacher ? "Review class results" : "Enter scores", { href: classTeacher ? "/class-teacher/results" : "/teacher/results/entry", icon: "file" }), classTeacher ? "Class teacher" : "Subject teacher")}<div class="stats-grid">${[
    ["Assigned class", className(context.assignedClassId)],
    ["Students", students.length],
    ["Results completion", `${avg}%`],
    [
      classTeacher ? "Needs attention" : "Assigned subject",
      classTeacher ? "2 learners" : subjectName(context.assignedSubjectId),
    ],
  ]
    .map(([label, value]) =>
      Card(
        `<span class="stat-label">${label}</span><strong class="teacher-stat">${value}</strong>`,
        "stat-card",
      ),
    )
    .join(
      "",
    )}</div><div class="two-column">${Card(`${CardHeader("Teaching priorities")}<div class="settings-links"><a href="${classTeacher ? "/class-teacher/results" : "/teacher/results/entry"}" data-link><div><strong>${classTeacher ? "Review subject results" : "Complete your score sheet"}</strong><small>${className(context.assignedClassId)} · First Term</small></div><span>Open →</span></a><a href="${classTeacher ? "/class-teacher/comments" : "/teacher/results/submitted"}" data-link><div><strong>${classTeacher ? "Write class teacher comments" : "View submitted results"}</strong><small>Keep each learner moving forward</small></div><span>Open →</span></a></div>`)}${Card(
    `${CardHeader("Students requiring attention")}${Table(
      ["Student", "Focus area"],
      students
        .slice(0, 2)
        .map((s) => [
          escapeHtml(s.name),
          "Sample: monitor assignment completion",
        ]),
    )}<p class="padded helper-text">Attention indicators are illustrative mock data.</p>`,
  )}</div>`;
}
export function Comments() {
  const students = schoolRows("students").filter(
    (s) => s.classId === context.assignedClassId,
  );
  return `${pageHeader("Class teacher comments", "Thoughtful feedback for every learner.", "", "Class teacher")}${Card(
    `<form id="comments-form">${Table(
      ["Student", "Comment"],
      students.map((s) => [
        escapeHtml(s.name),
        `<textarea name="${s.id}" aria-label="Comment for ${escapeHtml(s.name)}" rows="2" maxlength="500">${escapeHtml(state.comments[context.school.id]?.[s.id] || "")}</textarea>`,
      ]),
    )}<div class="modal-actions">${Button("Save comments", { type: "submit" })}</div></form>`,
  )}`;
}
export function bindComments() {
  document.querySelector("#comments-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    state.comments[context.school.id] ??= {};
    Object.assign(
      state.comments[context.school.id],
      Object.fromEntries(new FormData(e.target)),
    );
    persist();
    toast("Class comments saved locally.");
  });
}
