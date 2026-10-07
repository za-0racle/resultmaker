import { state } from "../../app/state.js";
import { schoolService } from "../../services/schoolService.js";
import { pageHeader } from "../shared.js";
import { Card, CardHeader } from "../../components/Card.js";
import { Table } from "../../components/Table.js";
import { Badge } from "../../components/Badge.js";
import { Button } from "../../components/Button.js";
import { EmptyState } from "../../components/EmptyState.js";
import { toast } from "../../components/Toast.js";
import { escapeHtml } from "../../utils/helpers.js";
export async function Platform(kind = "overview", id) {
  const schools = await schoolService.getSchools();
  const table = Table(
    ["School", "Workspace", "Plan", "Status", "Actions"],
    schools.map((s) => [
      escapeHtml(s.name),
      `${escapeHtml(s.slug)}.resultmaker.com`,
      escapeHtml(s.plan),
      Badge(s.status),
      `<a href="/platform/schools/${s.id}" data-link class="text-link">View school →</a>`,
    ]),
  );
  if (kind === "school") {
    const s = await schoolService.getSchoolById(id);
    return !s
      ? EmptyState("School not found", "No matching mock school exists.")
      : `${pageHeader(s.name, "Platform-level school overview.", Button(s.status === "Suspended" ? "Restore school" : "Suspend school", { action: "suspend-school", variant: "secondary" }), "Schools")}${Card(`<dl class="details"><dt>Tenant slug</dt><dd>${escapeHtml(s.slug)}</dd><dt>Plan</dt><dd>${escapeHtml(s.plan)}</dd><dt>Status</dt><dd>${Badge(s.status)}</dd><dt>Contact email</dt><dd>${escapeHtml(s.email)}</dd></dl>`)}<p class="helper-text">Suspension changes the mock status only. Backend access controls are planned.</p>`;
  }
  const titles = {
    overview: "Platform overview",
    schools: "Schools",
    subscriptions: "Subscriptions",
    users: "Platform users",
    reports: "Platform reports",
    settings: "Platform settings",
  };
  const content =
    kind === "schools"
      ? Card(table)
      : kind === "overview"
        ? `<div class="stats-grid">${[
            ["Schools", schools.length],
            ["Active subscriptions", 1],
            ["Students", state.students.length],
            ["Plan", "Professional"],
          ]
            .map(([label, value]) =>
              Card(
                `<span class="stat-label">${label}</span><strong class="teacher-stat">${value}</strong>`,
                "stat-card",
              ),
            )
            .join(
              "",
            )}</div>${Card(`${CardHeader("School workspaces")}${table}`)}${Card(`${CardHeader("Plan management")}<div class="padded"><h3>Starter · Professional · Enterprise</h3><p>Illustrative plans. Billing integration and editable plan definitions are reserved for Phase 2.</p></div>`)}`
        : kind === "subscriptions"
          ? Card(
              Table(
                ["School", "Plan", "Billing", "Status"],
                schools.map((s) => [
                  escapeHtml(s.name),
                  s.plan,
                  "Mock subscription",
                  Badge("Active"),
                ]),
              ),
            )
          : kind === "users"
            ? Card(
                Table(
                  ["Name", "Role", "Scope"],
                  [
                    ["Alex Morgan", "Super Admin", "ÈsìAyọ̀ platform"],
                    [
                      "Alex Morgan",
                      "School Admin",
                      escapeHtml(schools[0].name),
                    ],
                  ],
                ),
              )
            : kind === "reports"
              ? Card(
                  `${CardHeader("Platform activity")}${Table(
                    ["Metric", "Mock value"],
                    [
                      ["Schools registered", 1],
                      ["Result batches", state.results.length],
                      [
                        "Completed imports",
                        state.imports.filter((i) => i.status === "Completed")
                          .length,
                      ],
                    ],
                  )}`,
                )
              : Card(
                  EmptyState(
                    "Platform configuration",
                    "Global plan rules, audit activity and platform preferences will be connected in Phase 2.",
                  ),
                );
  return `${pageHeader(titles[kind] || "Platform", "The wider picture of the ÈsìAyọ̀ community.", "", "Platform")}${content}`;
}
export function bindPlatform(id, rerender) {
  document
    .querySelector('[data-action="suspend-school"]')
    ?.addEventListener("click", async () => {
      const s = await schoolService.getSchoolById(id);
      await schoolService.updateSchool(id, {
        status: s.status === "Suspended" ? "Active" : "Suspended",
      });
      toast("Mock school status updated.");
      rerender();
    });
}
