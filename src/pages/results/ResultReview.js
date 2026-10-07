import { context } from "../../app/context.js";
import { resultService } from "../../services/resultService.js";
import {
  pageHeader,
  schoolRows,
  className,
  subjectName,
  teacherName,
} from "../shared.js";
import { Table } from "../../components/Table.js";
import { Badge } from "../../components/Badge.js";
import { Card } from "../../components/Card.js";
import { Button } from "../../components/Button.js";
import { toast } from "../../components/Toast.js";
import { escapeHtml } from "../../utils/helpers.js";
let status = "";
export async function ResultReview(mode = "all") {
  let rows = await resultService.getResults();
  if (mode === "published") rows = rows.filter((r) => r.status === "Published");
  if (mode === "review")
    rows = rows.filter((r) =>
      ["Submitted", "Under Review", "Approved"].includes(r.status),
    );
  if (mode === "submitted")
    rows = rows.filter(
      (r) =>
        r.classId === context.assignedClassId &&
        r.subjectId === context.assignedSubjectId &&
        r.status !== "Draft",
    );
  if (mode === "class")
    rows = rows.filter((r) => r.classId === context.assignedClassId);
  if (mode === "teacher")
    rows = rows.filter(
      (r) =>
        r.classId === context.assignedClassId &&
        r.subjectId === context.assignedSubjectId,
    );
  if (status) rows = rows.filter((r) => r.status === status);
  const admin = !["class", "teacher", "submitted"].includes(mode);
  const tabs = admin
    ? '<nav class="tabs" aria-label="Result views"><a href="/school/results" data-link>All results</a><a href="/school/results/review" data-link>Review queue</a><a href="/school/results/published" data-link>Published</a></nav>'
    : "";
  return `${pageHeader(mode === "published" ? "Published results" : mode === "review" ? "Result review" : "Results", "From first draft to a result you can stand behind.", Button("Enter scores", { href: admin ? "/school/results/entry" : "/teacher/results/entry", icon: "plus" }), "Results")}${tabs}${Card(
    `<div class="list-toolbar"><h2>${rows.length} subject result batches</h2><label for="result-status" class="sr-only">Filter result status</label><select id="result-status"><option value="">All statuses</option>${["Draft", "Submitted", "Under Review", "Approved", "Published"].map((s) => `<option ${s === status ? "selected" : ""}>${s}</option>`).join("")}</select></div>${Table(
      [
        "Subject / class",
        "Teacher",
        "Students",
        "Completion",
        "Status",
        ...(admin ? ["Next step"] : []),
      ],
      rows.map((r) => [
        `${subjectName(r.subjectId)}<small>${className(r.classId)} · ${escapeHtml(schoolRows("terms").find((t) => t.id === r.termId)?.name ?? "Unknown term")}</small>`,
        teacherName(r.teacherId),
        schoolRows("students").filter((s) => s.classId === r.classId).length,
        `<div class="table-progress"><progress max="100" value="${r.completion}" aria-label="Completion"></progress>${r.completion}%</div>`,
        Badge(r.status),
        ...(admin
          ? [
              r.status === "Submitted"
                ? `<button class="button secondary small" data-review="${r.id}" data-status="Under Review">Start review</button>`
                : r.status === "Under Review"
                  ? `<button class="button secondary small" data-review="${r.id}" data-status="Approved">Approve</button>`
                  : r.status === "Approved"
                    ? `<button class="button primary small" data-review="${r.id}" data-status="Published">Publish locally</button>`
                    : r.status === "Published"
                      ? '<span class="helper-text">Complete</span>'
                      : '<span class="helper-text">Awaiting teacher</span>',
            ]
          : []),
      ]),
    )}`,
  )}`;
}
export function bindResultReview(rerender) {
  document.querySelector("#result-status")?.addEventListener("change", (e) => {
    status = e.target.value;
    rerender();
  });
  document.querySelectorAll("[data-review]").forEach(
    (b) =>
      (b.onclick = async () => {
        await resultService.updateResult(b.dataset.review, {
          status: b.dataset.status,
        });
        toast(
          `Result marked ${b.dataset.status.toLowerCase()} in the prototype.`,
        );
        rerender();
      }),
  );
}
