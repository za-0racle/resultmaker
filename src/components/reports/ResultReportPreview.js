import {
  ReportHeader,
  StudentSummary,
  AcademicResultsTable,
  GradeKey,
  AffectiveDomain,
  PsychomotorDomain,
  RatingKey,
  AttendanceSummary,
  CommentsSection,
  SignatureSection,
  ReportFooter,
} from "./ReportSections.js";

export function ResultReportPreview(report) {
  if (!report) return "<p>No student records are available.</p>";
  const visible = report.configuration.sections;
  return `<article class="report-card"><div class="report-watermark">SAMPLE REPORT · FRONTEND PREVIEW</div>${ReportHeader(report)}${StudentSummary(report)}${AcademicResultsTable(report)}${visible.gradeKey ? GradeKey(report) : ""}<div class="report-domains">${visible.affective ? AffectiveDomain(report) : ""}${visible.psychomotor ? PsychomotorDomain(report) : ""}</div>${visible.affective || visible.psychomotor ? RatingKey(report) : ""}${visible.attendance ? AttendanceSummary(report) : ""}${visible.comments ? CommentsSection(report) : ""}${visible.signatures ? SignatureSection(report) : ""}${ReportFooter(report)}</article>`;
}
