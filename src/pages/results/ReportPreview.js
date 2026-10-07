import { ResultReportPreview } from "../../components/reports/ResultReportPreview.js";
import { getMockResultReport } from "../../services/resultReportService.js";

export const ReportPreview = (studentId) =>
  ResultReportPreview(getMockResultReport(studentId));
