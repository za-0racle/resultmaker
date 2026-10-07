import { escapeHtml as e, initials } from "../../utils/helpers.js";
import { Icon } from "../Icon.js";
import { Table } from "../Table.js";

export function ReportHeader(report) {
  return `<header class="report-header"><span class="report-logo" aria-label="School logo placeholder">${Icon("school")}</span><div><h2>${e(report.school.name)}</h2><p>${e(report.school.address)}</p><p>${e(report.school.phone)} · ${e(report.school.email)}</p><span>${e(report.school.motto)}</span><h3>${e(report.configuration.reportTitle)}</h3></div><span class="avatar profile-photo" aria-label="Student photo placeholder">${e(initials(report.student.name))}</span></header>`;
}
export function StudentSummary(report) {
  const fields = [
    ["Student name", report.student.name],
    ["Admission number", report.student.admissionNumber],
    ["Class", report.className],
    ["Academic session", report.session],
    ["Term", report.term],
    ["Number in class", report.numberInClass],
    ["Student average", report.average === null ? "—" : `${report.average}%`],
    ["Grade", report.grade],
    ["Position", report.position ?? "—"],
  ];
  return `<section class="report-student" aria-label="Student summary">${fields.map(([label, value]) => `<div><small>${e(label)}</small><strong>${e(value)}</strong></div>`).join("")}</section>`;
}
export function AcademicResultsTable(report) {
  return `<section class="report-section"><h3>Academic performance</h3>${Table(
    [
      "Subject",
      ...report.configuration.assessments.map((c) => `${c.label} / ${c.max}`),
      "Total",
      "Grade",
      "Remark",
    ],
    report.academicResults.map((row) => [
      e(row.subject),
      ...row.assessments.map((a) => a.score),
      row.total,
      e(row.grade),
      e(row.remark),
    ]),
  )}</section>`;
}
export function GradeKey(report) {
  return `<section class="report-section report-grade-key"><h3>Grade key</h3><div class="grade-key-items">${report.grading.map((band) => `<span><strong>${e(band.grade)}</strong> ${band.min}–${band.max} · ${e(band.remark)}</span>`).join("")}</div></section>`;
}
function Ratings(title, rows) {
  return `<section class="report-section"><h3>${title}</h3>${Table(
    ["Trait / skill", "Rating"],
    rows.map((row) => [e(row.label), row.rating ?? "—"]),
  )}</section>`;
}
export const AffectiveDomain = (report) =>
  Ratings("Affective domain", report.affectiveRatings);
export const PsychomotorDomain = (report) =>
  Ratings("Psychomotor domain", report.psychomotorRatings);
export function RatingKey(report) {
  return `<section class="report-section"><h3>Rating key</h3><p class="rating-key">${report.configuration.ratingScale.map((r) => `${r.value} — ${e(r.label)}`).join(" · ")}</p><p class="report-note">Unfilled ratings are shown as —.</p></section>`;
}
export function AttendanceSummary(report) {
  return `<section class="report-section"><h3>Attendance</h3><p>${report.attendance.present ?? "—"} days present / ${report.attendance.possible ?? "—"} school days</p></section>`;
}
export function CommentsSection(report) {
  return `<section class="report-comments report-section"><h3>Comments</h3><p><strong>Class teacher (${e(report.classTeacher)}):</strong> ${e(report.teacherComment)}</p><p><strong>Principal / head teacher:</strong> ${e(report.principalComment)}</p></section>`;
}
export function SignatureSection(report) {
  return `<section class="report-section"><h3>Administrative approval</h3><p>Date: ${e(report.date ?? "—")} · ${e(report.publicationStatus)}</p><div class="report-signatures"><span>Class teacher’s signature</span><span>Principal / head teacher’s signature & stamp</span></div></section>`;
}
export function ReportFooter(report) {
  return `<footer class="report-document-footer"><strong>${e(report.reportId)}</strong><p>ÈsìAyọ̀ the result maker</p><p class="report-note">Sample layout and academic scores. Ratings, attendance, ranking and signatures are placeholders. Verification ID and QR verification will be implemented after publication and backend design.</p></footer>`;
}
